const crypto = require('crypto');
const slogger = require('node-slogger');
const async = require('neo-async');
const cronNode = require('node-cron');

const REDIS_KEY_SUB_SESSION_TOKEN = 'pubSubSessionToken:';
const OPERATION_ADD = '0';
const OPERATION_DEL = '1';
const OPERATION_MODIFY = '2';
const RAND_BYTES = 4;

const MESSAGE_HEAD_LEN = RAND_BYTES * 2 + 1;

class TokenCacheItem {
    constructor(expire, session) {
        this.expire = expire;
        this.session = session;
    }
    
}

/**
 * The callback function , which will be triggered when new message form redis subscription.
 *
 * @callback SubscribeCallback
 * @param {String} operation
 * @param {String} token
 * @param {String=} value
 */

/**
 * The callback function ,which will be called when data is cached into memory.
 *
 * @callback CacheWriteCallback
 * @param {String} token
 * @param {String} value
 */

/**
 * The callback function, which will be called when data is cleared.
 * 
 * @callback CacheClearCallback
 * @param {Number} size The size of data cached in memory.
 */

/**
 * @typedef SessionTokenOption
 * 
 * @param {Number} [expireTime=0] Expiration time in second, default is 0, which will be not expired, but when you set the paramter of `option.crontabStr`, it will be cleared at some time still.
 * @param {String} redisKeyPrefix The prefix of redis key to save session data
 * @param {Object} reids The redis client used to save session data
 * @param {Object=} subRedis The subscribe redis client to receive delete operation form other node.js process, it's useful when you start node in cluster mode.
 * @param {String=} crontabStr Crontab string, use for clearing the memeory cache.
 * @param {Number} [maxSize=0] The max size of the cache in memory, default is 0, which will not limit the size of cache in memory. When it passed as -1, the cache in memory will be disabled.
 * @param {String=} clusteId An id of current process, when not set, it will use random string.  When do the operation of delete or update, SessionToken will publish a message, which is started with a perfix of current clusterId, to redis. Then all the  processes will receive the message  and read the clusterId of the message to check whether it from self. But when the subRedis is not set, the `clusterId` is useless now.
 * @param {SubscribeCallback=} subscribeCallback The callback function , which will be triggered when new message form redis subscription.
 * @param {CacheWriteCallback=} cacheWriteCallback
 * @param {CacheClearCallback=} cacheClearCallback
 * @param {Number} [showMemSizeInterval=0] To show the current count of cache in memeory at `showMemSizeInterval` ms. When passed 0 , it will disabled.
 * @param {Number} [idleCheckInterval=0] The interval of checking whether the item cached in memory is expired, default is 0, which will disable the checking. Only If both the parameter of `expireTime` and `idleCheckInterval` is  greater than 0 , the SesssionToken will enable the process of checking.
 * @param {Number} [idleCheckPerCount=30] The count of items to check in one loop of the idle checking.
 * @param {Float} [memLifecycleRatio=1.0] The lifecycle of the memeory cache, default is 1.0 , which means that it equals to the lifecycle of redis cache. 
 */

/**
 * SessionToken callback function.
 *
 * @callback SessionTokenCallback
 * @param {Error} err
 * @param {Object|String|undefined} data
 * @param {Boolean} hitMemCache
 */

/**
 *
 * @param {SessionTokenOption} option
 
 * @returns {SessionToken}
 * @constructor
 */
function SessionToken({expireTime, redisKeyPrefix, redis, subRedis,crontabStr,maxSize,clusteId,subscribeCallback,cacheWriteCallback,cacheClearCallback,showMemSizeInterval,idleCheckInterval,idleCheckPerCount,memLifecycleRatio}) {
    this.expireTime = expireTime;
    this._memLifecycleRatio = Math.min(parseFloat(memLifecycleRatio) || 1, 1);
    this.redisKeyPrefix = redisKeyPrefix;
    this.redis = redis;
    this.data = new Map();
    this.cacheClearCallback = typeof(cacheClearCallback) === 'function' ? cacheClearCallback : function(){};
    if (crontabStr) {
        this._addClearHandler(crontabStr);
    }
    this.subRedis = subRedis;
    this.pubSubName = REDIS_KEY_SUB_SESSION_TOKEN + redisKeyPrefix;
    this.maxSize = Number(maxSize) || 0;

    this._subscribePromise = null;
    this._subscribeSuccess = false;
    this.clusterId = clusteId || crypto.randomBytes(RAND_BYTES).toString('hex');
    this._subscribeCallback = subscribeCallback || function(){};
    this._cacheWriteCallback = typeof(cacheWriteCallback) === 'function' ? cacheWriteCallback : function() {};
    this._subRedisMessage();
    if (showMemSizeInterval > 0) {
        this._showDebugInfo(showMemSizeInterval);
    }
    this._idleCheckPerCount = idleCheckPerCount || 30;
    if (idleCheckInterval > 0 && expireTime > 0) {
        this._idleCheckInterval = idleCheckInterval;
        this._idleCheck();
    }
    
    this._historyDataSize = 0;
    return this;
}
SessionToken.prototype._showDebugInfo = function(showMemSizeInterval) {
    const _this = this;
    setInterval(function() {
        console.log('current size of data',_this.data.size);
    },showMemSizeInterval);
};
SessionToken.prototype._idleCheck = function() {
    const _data = this.data;
    const idleCheckPerCount = this._idleCheckPerCount;
    setInterval(function() {
        const size = _data.size;
        if (!size) {
            return;
        }
        const keys = _data.keys();
        const now = Date.now();
        const _this = this;
        for (var i=0;i<idleCheckPerCount;i++) {
            const key = keys.next();
            if (!key) {
                return;
            }
            const token = key.value;
            if (!token) {
                return;
            }
            const value = _data.get(token);
            if (!value) {
                _data.delete(token);
                return slogger.debug('dirty key-value',token);
            }
            if (value.expire <= now) {
                _data.delete(token);
                //slogger.trace(token + 'is expired',_data.size);
            }
        }
    },this._idleCheckInterval);
    
    

};
SessionToken.prototype._parseMessage = function(originalMessage) {
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
    if (result.clusterId === this.clusterId) {
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
};

SessionToken.prototype._subRedisMessage = function() {
    if (!this.subRedis) {
        return;
    }
    this._subscribePromise = this.subRedis.subscribe(this.pubSubName);
    // const data = this.data;
    const _this = this;
    if (typeof(this._subscribeCallback) !== 'function') {
        this._subscribeCallback = function() {};
    }
    this.subRedis.on('message',function(channel, message) {
        const result = _this._parseMessage( message );
        const clusterNow = result.clusterId;
        if (_this.clusterId === clusterNow) {
            slogger.trace('the message belongs to current cluster, ignore it.');
            return;
        }
        const operation = result.operation;
        const token =result.token;
        if (operation === OPERATION_DEL) {
            _this.data.delete(token);
        } else if (operation === OPERATION_MODIFY) {
            const value = result.value;
            if (!value) {
                return slogger.warn('the current opreation is update, but has none value');
            }
            if (_this.data.has(token)) {
                try {
                    _this._addCache(token,JSON.parse(value));
                } catch (e) {
                    slogger.warn('the updated value may be invalid',e,token,value);
                }
                
            } else {
                //console.log('not in current memeory',_this.data);
            }
        }
        _this._subscribeCallback(operation,token,result.value);
    });
};
SessionToken.prototype._addClearHandler = function(cron) {
    const _this = this;

    cronNode.schedule(cron,function() {
        _this.cacheClearCallback(_this.data.size,_this._historyDataSize);
        _this.data.clear();
        _this._historyDataSize = 0;
    });
};

SessionToken.prototype._saveTokenToMem = function(token,value,expireTime=0) {
    const data = new TokenCacheItem(0,value);
    if (this.expireTime) {
        data.expire = new Date().getTime() + (expireTime || this.expireTime) * 1000 * this._memLifecycleRatio;
    } else {
        
    }
    this.data.set(token,data);//console.log(this.clusterId,'set',token,data);
    this._cacheWriteCallback(token,data);
    this._historyDataSize++;
};



SessionToken.prototype._addCache = function(token,value,expireTime=0) {
    if (this.maxSize === -1) {//the cache in memeory is disabled
        return;
    }
    if (this.maxSize > 0) {//with a fixed size limit

        if (this.data.size < this.maxSize) {
            return this._saveTokenToMem(token,value,expireTime);
        }
        
        slogger.debug('maxsize overflow', this.data.size , this.maxSize);
    } else {//without limit
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
                _self._addCache(str, value);
                callback(false, str);
                
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
 * @param {Boolean} [ignoreRefresh=false] if set true, it will not refresh the expire time of the key.
 */
SessionToken.prototype.update = function (token, value, callback, ignoreRefresh) {
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
        if (!ignoreRefresh) {
            this.redis.set(keyName, valueStr, 'XX', 'EX', expireTime, setCallback);
        } else {
            async.waterfall([
                function(next) {
                    _self.redis.ttl(keyName,function(err,reply) {
                        if (err) {
                            return next(err);
                        }
                        return next(false,Number(reply));
                    });
                },
                function(ttl,next) {
                    _self.redis.set(keyName, valueStr, 'XX', 'EX', ttl, next);
                }
            ],setCallback);
        }
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
            
            // console.log('get session',value);
            if (hitCache) {//the data is get from memory
                callback(null, value,hitCache);
                return ;
            }//console.log(`cache miss:${seq}`);
            // if (_self.expireTime > 0) {
            //     _self.redis.ttl(keyName,function(err,expire) {//the data was get from redis
            //         if (err) {
            //             return slogger.error('set expired time failed',err);
            //         }
            //         _self._addCache(token,value,expire);
            //         callback(null, value,hitCache);
            //     });
            // } else {
            _self._addCache(token,value);
            callback(null, value,hitCache);
            // }
            
        }
    ], callback);
};

SessionToken.prototype._pubRedisMessage = function(message) {
    this.redis.publish(this.pubSubName,this.clusterId + ',' + message);
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
            slogger.error('delete token associated data failed',err,keyName);
            return callback('delete token associated data failed');
        }
        _this.data.delete(token);

        if (Number(reply) === 1) {
            _this._pubRedisMessage(OPERATION_DEL+','+token);
        }
        callback(false);
    });
};

module.exports = SessionToken;