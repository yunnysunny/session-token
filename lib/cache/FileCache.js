const slogger = require('node-slogger');
const fs = require('fs');
const path = require('path');
const TokenCacheItem  = require('../util/TokenCacheItem');
const AbstractCache = require('./AbstractCache');

module.exports = class FileCache extends AbstractCache {
    constructor(option) {
        super(option);
        this._saveDir = option.saveDir;
        this._encoder = option.encoder || JSON.stringify;
        this._decoder = option.decoder || JSON.parse;
        this._scan();
    }
    _getFilePath(token) {
        return path.join(this._saveDir, `${token}.json`);
    }
    save(token,value,callback = function() {}) {
        const filename = this._getFilePath(token);
        fs.writeFile(
            filename, 
            this._encoder(value), 
            function(err) {
                callback(err, !!err);
        });
    }
    remove(token, callback) {
        const filename = this._getFilePath(token);
        fs.unlink(filename, function(err) {
            callback(err, !!err);
        });
    }
    get(token, callback) {
        const filename = this._getFilePath(token);
        const _this = this;
        fs.readFile(filename, function(err, data) {
            if (err) {
                return callback(err);
            }
            try {
                data = _this._decoder(data.toString());
            } catch (e) {
                slogger.warn(`dirty token data from ${filename}`, data);
                return callback(e);
            }
            callback(null, data);
        });
    }
    _scan() {

    }
    idleCheck() {
        
    }
    refresh(token) {
        // const filename = this._getFilePath(token);
        // const _this = this;
        // fs.stat(filename, function(err, stat) {
        //     if (err) {
        //         return slogger.warn(`get file ${filename} info error`, err);
        //     }
        // });
    }
    getSize(callback) {
        fs.readdir(this._saveDir, function(err, files) {
            if (err) {
                return callback(err);
            }
            return callback(null, files.length);
        });
    }
};