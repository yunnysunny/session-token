// const {expect} = require('chai');
const async = require('neo-async');
const Redis = require('ioredis');
const slogger = require('node-slogger');
const SessionToken = require('../index');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const redisSub = new Redis();//the redis client for subscribe
const MAX_SIZE = 8192;

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
const GET_LOOP_SIZE = LOOP_SIZE / 10;


describe('none lru benchmark test',function() {
    before(function() {
        slogger.init({level:'warn'});
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
    it('get test without lru',function(done) {
        async.times(GET_LOOP_SIZE,function(n,next) {
            sessionTokenWithoutLru.get(LruToken[GET_LOOP_SIZE-1-n],next);
        },done);
    });
    it('get test without lru again',function(done) {
        async.times(GET_LOOP_SIZE,function(n,next) {
            sessionTokenWithoutLru.get(LruToken[n],next);
        },done);
    });
    it('remove all data create via none lru session token',function(done) {
        async.each(LruToken,function(token,next) {
            sessionTokenWithoutLru.delete(token,next);
        },done);
    });
    it('recovery log level',function(done) {
        setTimeout(function() {
            slogger.init({level:'trace'});
            done();
        },3000);
    });
});