const crypto = require('crypto');
const slogger = require('node-slogger');
const async = require('neo-async');
const later = require('later');
const LRUList = require('native-linked-list').LRUList;

const REDIS_KEY_SUB_SESSION_TOKEN = 'pubSubSessionToken:';
const OPERATION_ADD = '0';
const OPERATION_DEL = '1';


/**
 * SessionToken callback function.
 *
 * @callback SessionTokenCallback
 * @param {Error} err
 * @param {Object|String|undefined} data
 */

/**
 *
 * @param {Object} option
 * @param {Number} option.expireTime Expiration time in second
 * @param {String} option.redisKeyPrefix The prefix of redis key to save session data
 * @param {Object} option.reids The redis client used to save session data
 * @param {Object=} option.subReis The subscribe redis client to receive delete operation form other node.js process, it's useful when you start node in cluster mode.
 * @param {String=} option.crontabStr Crontab string, use for clearing the memeory cache.
 * @param {Number=} option.maxSize The max size of the cache in memory.
 * @param {Boolean=} option.useLru Whether to use LRU algorithm to delete the elder elements. It only takes effect when `option.maxSize` is greater than zero.
 * @returns {SessionToken}
 * @constructor
 */
function SessionToken({expireTime, redisKeyPrefix, redis, subReis,crontabStr,maxSize,useLru}) {
    this.expireTime = expireTime;
    this.redisKeyPrefix = redisKeyPrefix;
    this.redis = redis;
    this.data = new Map();
    if (crontabStr) {
        this._addClearHandler(crontabStr);
    }
    this.subReis = subReis;
    this.pubSubName = REDIS_KEY_SUB_SESSION_TOKEN + redisKeyPrefix;
    this.maxSize = Number(maxSize) || 0;
    this.useLru = useLru || false;
    this._lruList = null;
    if (this.useLru && this.maxSize) {
        this._lruList = new LRUList(this.maxSize);
    }
    this._subscribePromise = null;
    this._subscribeSuccess = false;
    this._subRedisMessage();
    return this;
}
SessionToken.prototype._subRedisMessage = function() {
    if (!this.subReis) {
        return;
    }
    this._subscribePromise = this.subReis.subscribe(this.pubSubName);
    const data = this.data;
    this.subReis.on('message',function(channel, message) {
        const [operation,token] = message.split(',');
        if (operation === OPERATION_DEL) {
            data.delete(token);
        }
    });
};
SessionToken.prototype._addClearHandler = function(cron) {
    const s = later.parse.cron(cron);
    const _this = this;
    later.setTimeout(function  cleanTokenSchedule() {
        _this.data.clear();
    }, s);
};

SessionToken.prototype._saveTokenToMem = function(token,value,expireTime=0) {
    this.data.set(token,{
        expire: new Date().getTime() + (expireTime || this.expireTime) * 1000,
        session : value
    });
};

SessionToken.prototype._addToLru = function(token) {
    const _this = this;
    return this._lruList.addOne(token,function(isTailRemoved,removedTailValue) {
        if (isTailRemoved) {
            _this.data.delete(removedTailValue);
        }
    });
};

SessionToken.prototype._addCache = function(token,value,expireTime=0) {

    if (this.maxSize > 0) {
        if (this.data.size < this.maxSize) {
            return this._saveTokenToMem(token,value,expireTime);
        }
        if (this.useLru) {
            this._saveTokenToMem(token,value,expireTime);
            return this._addToLru(token);
        }
    } else {
        this._saveTokenToMem(token,value,expireTime);
    }
};
/**
 * Genrate a new token and save its associated data in redis and memeory.
 * 
 * @param {Object} value The value of session
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.generate = function (value, callback) {
    var _self =this;
    let str = '';
    async.waterfall([
        function (callback) {
            crypto.randomBytes(16, function (err, buf) {
                if (err) {
                    slogger.error('create random failed', err);
                    callback('create random failed');
                    return;
                }
                str = buf.toString('hex');
                const key = _self.redisKeyPrefix + str;

                callback(null, key, JSON.stringify(value), str);
            });
        },
        function (key, valueStr, str, callback) {
            const expireTime = _self.expireTime;
            _self.redis.set(key, valueStr, 'NX', 'EX', expireTime, function (err) {
                if (err) {
                    slogger.error('save token failed', err);
                    callback('save token failed');
                    return;
                }
                
                callback(false, str);
                _self._addCache(str, value);
            });
        }
    ], callback);
};


/**
 * Update the content of session.
 * 
 * @param {String} token
 * @param {Object} value The value of session
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.update = function (token, value, callback) {
    const keyName = this.redisKeyPrefix + token;
    const expireTime = this.expireTime;
    let _self = this;

    this.redis.set(keyName, JSON.stringify(value), 'XX', 'EX', expireTime, function (err) {

        if (err) {
            slogger.error('save token failed', err);
            callback('save token failed');
            return;
        }
        callback(false);
        _self._addCache(token, value);
    });
};

/**
 * Refresh the expire time of session data saved in redis and memeory.
 * 
 * @param {String} token
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.refresh = function (token, callback) {
    const keyName = this.redisKeyPrefix + token;
    const expireTime = this.expireTime;
    let _self = this;

    this.redis.expire([keyName, expireTime], function (err) {
        if (err) {
            slogger.error('extend token expired time failed', err);
            return callback('extend token expired time failed');
        }
        callback(false);
        const session = _self.data.get(token);
        if (session) {
            _self._addCache(token,session.value);
        }
    });
};

/**
 * Get session data via token
 * 
 * @param {String} token
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.get = function (token, callback) {
    const keyName = this.redisKeyPrefix + token;
    let _self = this;
    let hitCache = false;//seq++;
    async.waterfall([
        function(callback) {//slogger.time(`map.get:${seq}`);
            const item = _self.data.get(token);//slogger.timeEnd(`map.get:${seq}`);
            if (!item) {
                return callback(null,false);
            }
            if (item.expire > new Date().getTime() && item.session) {
                hitCache = true;
                return callback(null,item.session);
            }
            _self.data.delete(token);
            return callback(null,false);
        },
        function (sessionValue,callback) {
            if (sessionValue) {
                return callback(null,sessionValue);
            }
            _self.redis.get(keyName, function (err, reply) {
                if (err) {
                    slogger.error('get token associated session failed', err);
                    callback('get token associated session failed');
                    return;
                }
                if (!reply) {
                    return callback(false, false);
                }
                var value;
                try {
                    value = JSON.parse(reply);
                } catch (e) {
                    slogger.error('invalid token associated data',e,reply);
                    return callback('invalid token associated data');
                }
                callback(null, value);
            });
        },
        function(value,callback) {
            callback(null, value);
            // console.log('get session',value);
            if (hitCache) {//the data is get from memory
                if (this.useLru) {
                    this._addToLru(token);
                }
                return;
            }//console.log(`cache miss:${seq}`);
            _self.redis.ttl(keyName,function(err,expire) {//the data was get from redis
                if (err) {
                    return slogger.error('set expired time failed',err);
                }
                _self._addCache(token,value,expire);
                
            });
        }
    ], callback);
};

SessionToken.prototype._pubRedisMessage = function(message) {
    this.reis.publish(this.pubSubName,message);
};

/**
 * Delete session data via token
 * 
 * @param {String} token
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.delete = function(token,callback) {
    const keyName = this.redisKeyPrefix + token;
    const _this = this;

    this.redis.del(keyName,function(err,reply) {
        if (err) {
            slogger.error('delete token associated data failed',err);
            return callback('delete token associated data failed');
        }
        _this.data.delete(token);
        callback(false);
        if (!_this.subReis) {
            return;
        }
        if (reply === '1') {
            const message = '1,'+token;
            if (_this._subscribeSuccess) {
                return _this._pubRedisMessage(message);
            }
            
            _this._subscribePromise.then(function() {
                _this._subscribeSuccess = true;
                _this._pubRedisMessage(message);
            });
        }
        
    });
};

module.exports = SessionToken;