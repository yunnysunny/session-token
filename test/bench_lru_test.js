const {expect} = require('chai');
const async = require('neo-async');
const Redis = require('ioredis');
const SessionToken = require('../index');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const redisSub = new Redis();//the redis client for subscribe
const MAX_SIZE = 8192;
const sessionToken = new SessionToken({
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

describe('lru benchmark test',function() {
    it ('should generate '+LOOP_SIZE+'th tokens success',function(done) {
        async.times(LOOP_SIZE,function(n,next) {
            if (n > MAX_SIZE) {
                // console.log('may overflow now');
            }
            sessionToken.generate(VALUE,function(err/*,tokenViaCreate*/) {//save session
                if (err) {
                    return next(err);
                }
                
                next();
            });
        },function(err) {
            if (err) {
                return done(err);
            }
            console.log(sessionToken._lruList.size(),sessionToken.data.size);
            //expect(sessionToken.data.size).to.be.lte(MAX_SIZE);
            
            done();
        });
        
    });
});