const {expect} = require('chai');
const async = require('neo-async');
const Redis = require('ioredis');
const slogger = require('node-slogger');
const SessionToken = require('../index');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const redisSub = new Redis();//the redis client for subscribe
const MAX_SIZE = 8192;
const sessionTokenWithLru = new SessionToken({
    expireTime:7200,//the time of seconds before the session data expired
    redisKeyPrefix:'myprefix:mylrutoken:',//the redis key's prefix
    redis:redisClient,//the redis client object
    subReis:redisSub,
    maxSize:MAX_SIZE,
    useLru:true,
    //showMemSizeInterval:10*1000
});

const sessionTokenWithoutLru = new SessionToken({
    expireTime:7200,//the time of seconds before the session data expired
    redisKeyPrefix:'myprefix:mynolrutoken:',//the redis key's prefix
    redis:redisClient,//the redis client object
    subReis:redisSub,
    maxSize:MAX_SIZE,
    //showMemSizeInterval:10*1000
});

const VALUE = {name:'sunny',id:1};
const LOOP_SIZE = 102400;
const LruToken = new Array(LOOP_SIZE);
slogger.init({level:'warn'});

describe('lru benchmark test',function() {
    it ('should generate '+LOOP_SIZE+'th tokens success',function(done) {
        async.times(LOOP_SIZE,function(n,next) {
            if (n > MAX_SIZE) {
                // console.log('may overflow now');
            }
            sessionTokenWithLru.generate(VALUE,function(err,tokenViaCreate) {//save session
                if (err) {
                    return next(err);
                }
                LruToken[n] = tokenViaCreate;
                next();
            });
        },function(err) {
            if (err) {
                return done(err);
            }
            console.log(sessionTokenWithLru._lruList.size(),sessionTokenWithLru.data.size);
            //expect(sessionToken.data.size).to.be.lte(MAX_SIZE);
            
            done();
        });
        
    });
    it('remove all data create via lru session token',function(done) {
        async.each(LruToken,function(token,next) {
            sessionTokenWithLru.delete(token,next);
        },done);
    });
    it('bench for none lur',function(done) {
        async.times(LOOP_SIZE,function(n,next) {
            sessionTokenWithoutLru.generate(VALUE,function(err,tokenViaCreate) {//save session
                if (err) {
                    return next(err);
                }
                LruToken[n] = tokenViaCreate;
                next();
            });
        },done);
    });
    it('remove all data create via none lru session token',function(done) {
        async.each(LruToken,function(token,next) {
            sessionTokenWithoutLru.delete(token,next);
        },done);
    });
    it('recovery log level',function(done) {
        slogger.init({level:'trace'});
        done();
    });
});