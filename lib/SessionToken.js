const crypto = require('crypto');
const slogger = require('node-slogger');
const async = require('neo-async');
const later = require('later');
const LRUList = require('native-linked-list').LRUList;

const REDIS_KEY_SUB_SESSION_TOKEN = 'pubSubSessionToken:';
const OPERATION_ADD = '0';
const OPERATION_DEL = '1';
const OPERATION_MODIFY = '2';
const RAND_BYTES = 4;
const clusterId = crypto.randomBytes(RAND_BYTES).toString('hex');
const MESSAGE_HEAD_LEN = RAND_BYTES * 2 + 1;

const _parseMessage = function(originalMessage) {
    const result = {
        clusterId:'',
        operation:'',
        token:'',
        value:''
    };
    if (!originalMessage || originalMessage.length <= MESSAGE_HEAD_LEN) {
        return result;
    }
    result.clusterId = originalMessage.substr(0,MESSAGE_HEAD_LEN-1);
    if (result.clusterId === clusterId) {
        return result;
    }
    const message = originalMessage.substr(MESSAGE_HEAD_LEN);
    
    var step = 0;
    var tokenBegin = 0;
    for (var i=0,len=message.length;i<len;i++) {
        const charNow = message.charAt(i);
        if (charNow === ',') {
            step++;
            if (step === 1) {
                result.operation = message.substr(0,i);
                tokenBegin = i+1;
            } else if (step === 2) {
                result.token = message.substring(tokenBegin,i);
                result.value = message.substr(i+1)
                break;
            }
        }
        
    }
    if (step === 1) {//has no value
        result.token = message.substr(tokenBegin);
    }
    return result;
}

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
 * @param {Number=} option.expireTime Expiration time in second, default is 0, which will be not expired, but when you set the paramter of `option.crontabStr`, it will be cleared at some time still.
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
    const _this = this;
    this.subReis.on('message',function(channel, message) {
        const result = _parseMessage( message );
        const clusterNow = result.clusterId;
        if (clusterId === clusterNow) {
            slogger.trace('the message belongs to current cluster, ignore it.');
            return;
        }
        const operation = result.operation;
        const token =result.token;
        if (operation === OPERATION_DEL) {
            data.delete(token);
        } else if (operation === OPERATION_MODIFY) {
            const value = result.value;
            if (!value) {
                return slogger.warn('the current opreation is update, but has none value');
            }
            if (data.has(token)) {
                try {
                    _this._saveTokenToMem(token,JSON.parse(value));
                } catch (e) {
                    slogger.warn('the updated value may be invalid',e,token,value);
                }
                
            }
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
    if (this.expireTime) {
        this.data.set(token,{
            expire: new Date().getTime() + (expireTime || this.expireTime) * 1000,
            session : value
        });
    } else {
        this.data.set(token,{
            expire:0,
            session:value
        });
    }
    
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
            const setCallback = function (err) {
                if (err) {
                    slogger.error('save token failed', err);
                    callback('save token failed');
                    return;
                }
                
                callback(false, str);
                _self._addCache(str, value);
            };
            if (expireTime > 0) {
                _self.redis.set(key, valueStr, 'NX', 'EX', expireTime, setCallback);
            } else {
                _self.redis.set(key, valueStr, 'NX', setCallback);
            }
            
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
    const _self = this;
    const valueStr = JSON.stringify(value);
    const setCallback = function (err) {

        if (err) {
            slogger.error('save token failed', err);
            callback('save token failed');
            return;
        }
        callback(false);
        _self._addCache(token, value);
        _self._pubRedisMessage(OPERATION_MODIFY+','+token+','+valueStr);
    };
    if (expireTime > 0) {
        this.redis.set(keyName, valueStr, 'XX', 'EX', expireTime, setCallback);
    } else {
        this.redis.set(keyName, valueStr, 'XX', setCallback); 
    }
    
};

/**
 * Refresh the expire time of session data saved in redis and memeory.
 * 
 * @param {String} token
 * @param {SessionTokenCallback} callback
 */
SessionToken.prototype.refresh = function (token, callback) {
    const expireTime = this.expireTime;
    if (expireTime == 0) {
        return callback(false);
    }
    const keyName = this.redisKeyPrefix + token;
    
    const _self = this;

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
            if ((_self.expireTime === 0 || item.expire > new Date().getTime()) && item.session) {
                hitCache = true;
                return callback(null,item.session);
            }
            _self.data.delete(token);
            if (_self.useLru) {
                _self._lruList.remove(token);
            }
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
            if (_self.expireTime > 0) {
                _self.redis.ttl(keyName,function(err,expire) {//the data was get from redis
                    if (err) {
                        return slogger.error('set expired time failed',err);
                    }
                    _self._addCache(token,value,expire);
                    
                });
            } else {
                _self._addCache(token,value);
            }
            
        }
    ], callback);
};

SessionToken.prototype._pubRedisMessage = function(message) {
    this.redis.publish(this.pubSubName,clusterId + ',' + message);
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
        if (_this.useLru) {
            _this._lruList.remove(token);
        }
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