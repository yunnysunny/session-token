/**
 * @class AbstractCache
 */
module.exports = class AbstractCache {
    constructor(option) {
        this._maxSize = option.maxSize;
    }
    save(token,value,callback) {
        throw new Error('not supported');
    }
    remove(token, callback=function() {}) {
        throw new Error('not supported');
    }
    removeAll() {
        throw new Error('not supported');
    }
    get(token) {
        throw new Error('not supported');
    }
    idleCheck() {
        throw new Error('not supported');
    }
    update() {
        throw new Error('not supported');
    }
    getSize(callback) {
        throw new Error('not supported');
    }
    refresh(token, expired, callback) {
        throw new Error('not supported');
    }
};