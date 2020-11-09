module.exports = class TokenCacheItem {
    constructor(expire, session) {
        this.expire = expire;
        this.session = session;
    }
    
};