const {expect} = require('chai');
const Redis = require('ioredis');
const SessionToken = require('../index');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const cronCb = function(size) {
    console.log('clear ', size);
};

const VALUE = {name:'sunny',id:1};


describe('crontab test',function() {
    it.skip('generate and wait for crontab callback',function(done) {
        const sessionToken = new SessionToken({
            expireTime:7200,//the time of seconds before the session data expired
            redisKeyPrefix:'myprefix:mytoken:',//the redis key's prefix
            redis:redisClient,//the redis client object,
            crontabStr:'* * * * *',
            cacheClearCallback:cronCb
        });
        sessionToken.generate(VALUE,function(err) {//save session
            if (err) {
                return done(err);
            }
            setTimeout(function() {
                done();
            },60*1000);
            
        });
    });
});