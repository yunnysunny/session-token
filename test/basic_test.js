const {expect} = require('chai');
const Redis = require('ioredis');
const SessionToken = require('../index');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const redisSub = new Redis();//the redis client for subscribe
class Wrapper {
    constructor(item) {
        this.name = item.name;
        this.id = item.id;
    }
    get desc() {
        return this.name + ':' + this.id;
    }
}
const sessionToken = new SessionToken({
    expireTime:7200,//the time of seconds before the session data expired
    redisKeyPrefix:'myprefix:mytoken:',//the redis key's prefix
    redis:redisClient,//the redis client object
    subRedis:redisSub,
    wrapperClass: Wrapper
});
const VALUE = {name:'sunny',id:1};
const VALUE_UPDATE = {name:'sunny_new',id:1};
let token = null;
const GIVEN_ID = Math.random() + '';

describe('basic test',function() {
    it ('should generate with given id success',function(done) {
        sessionToken.generate(VALUE,function(err) {//save session
            if (err) {
                return done(err);
            }
            done();
        }, GIVEN_ID);
    });

    it ('should get with given id success',function(done) {
        sessionToken.get(GIVEN_ID,function(err,obj) {
            if (err) {
                return done(err);
            }
            expect(obj).to.have.property('name').and.equal(VALUE.name);
            done();
        });
    });

    it ('should generate success',function(done) {
        sessionToken.generate(VALUE,function(err,tokenViaCreate) {//save session
            if (err) {
                return done(err);
            }
            token = tokenViaCreate;
            done();
        });
    });

    it ('should get success',function(done) {
        sessionToken.get(token,function(err,obj) {
            if (err) {
                return done(err);
            }
            expect(obj).to.have.property('name').and.equal(VALUE.name);
            done();
        });
    });

    it('should update success',function(done) {
        sessionToken.update(token,VALUE_UPDATE,function(err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });
    it('should get new data success',function(done) {
        sessionToken.get(token,function(err,obj) {
            if (err) {
                return done(err);
            }
            expect(obj).to.have.property('name').and.equal(VALUE_UPDATE.name);
            expect(obj.desc).to.be.equal(obj.name + ':' + obj.id);
            done();
        });
    });

    it('should refresh expire time success',function(done) {
        sessionToken.refresh(token,function(err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    it('shold delete token success',function(done) {
        sessionToken.delete(token,function(err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    it ('should call get with no data',function(done) {
        sessionToken.get(token,function(err,obj) {
            if (err) {
                return done(err);
            }
            expect(obj).equal(false);
            done();
        });
    });
});