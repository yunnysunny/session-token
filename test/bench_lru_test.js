// const {expect} = require('chai');
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

const VALUE = {name:'sunny',id:1};
const LOOP_SIZE = 10240;
const LruToken = new Array(LOOP_SIZE);
const GET_LOOP_SIZE = LOOP_SIZE / 10;


describe('lru benchmark test',function() {
    before(function() {
        slogger.init({level:'warn'});
    });
    it ('should generate '+LOOP_SIZE+'th tokens with lru success',function(done) {
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
    it('get test with lru',function(done) {
        async.times(GET_LOOP_SIZE,function(n,next) {
            sessionTokenWithLru.get(LruToken[n],next)
        },done);
    });
    it('get test with lru again',function(done) {
        async.times(GET_LOOP_SIZE,function(n,next) {
            sessionTokenWithLru.get(LruToken[GET_LOOP_SIZE-1-n],next)
        },done);
    });
    it('remove all data create via lru session token',function(done) {
        async.each(LruToken,function(token,next) {
            sessionTokenWithLru.delete(token,next);
        },done);
    });

    it('recovery log level',function(done) {
        setTimeout(function() {
            slogger.init({level:'trace'});
            done();
        },3000);
    });
});