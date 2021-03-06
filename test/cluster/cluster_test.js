const {expect} = require('chai');
// const cluster = require('cluster');
const Redis = require('ioredis');
// const cp = require('child_process');
const mochaSpawn = require('mocha-spawn');
// const Q = require('q');
const SessionToken = require('../../index');
const {nodes,FIRST_VALUE,VALUE_UPDATE} = require('./config');
const redisClient = new Redis(nodes);//connect to the redis server of localhost:6379
const redisSub = new Redis(nodes);//the redis client for subscribe
const sessionToken = new SessionToken({
    expireTime:7200,//the time of seconds before the session data expired
    redisKeyPrefix:'mycluster:mytoken:',//the redis key's prefix
    redis:redisClient,//the redis client object
    subRedis:redisSub
});
console.log(process.execArgv);

let childProcess = null;
let firstToken = null;
let secondToken = null;
// const childGenerateDefered = Q.defer();
// const childGeneratePromise = childGenerateDefered.promise;
// const childUpdateDefered = Q.defer();
// const childUpdatePromise = childUpdateDefered.promise;
// const childDeleteDefered = Q.defer();
// const childDeletePromise = childDeleteDefered.promise;

const _sendToChild = function(act,token) {
    // childProcess.send({act,token});
    childProcess.send(act,token);
    console.log('send to child',act,token);
};
// console.log('is worker master',cluster.isWorker);
describe('cluster test in master process',function() {
    this.timeout(99999);

    childProcess = mochaSpawn.before.start({
        script:__dirname+'/worker.js'
    });  
    childProcess.after.stop(); 
    // before(function(done) {
    //     // cluster.setupMaster({
    //     //     exec : __dirname+'/worker.js',
    //     //     //args :['--debug-brk=6857'],
    //     //     // silent : true
    //     // });
    //     // cluster.fork();
    //     // cluster.on('fork',function(worker) {
    //     //     console.log('child worker',worker.process.pid);
    //     //     childProcess = worker;
    //     //     done();
    //     //     worker.on('message',function(message) {
    //     //         console.log('message from child',message);
    //     //     });
    //     // });
    //     childProcess = cp.fork(__dirname+'/worker.js',[],{execArgv:['--debug-brk=6857']});
    //     done();
    // });
    it ('should generate success',function(done) {
        sessionToken.generate(FIRST_VALUE,function(err,tokenViaCreate) {//save session
            if (err) {
                return done(err);
            }
            _sendToChild('generate',tokenViaCreate);
            firstToken = tokenViaCreate;
            done();
        });
    });
    it('should get the same data from child process afeter generate',function(done) {
        childProcess.on('child-get-after-generate',function(err,value) {
            console.log('child-get-after-generate',err,value);
            if (err) {
                return done(err);
            }
            expect(value.name).to.be.equal(FIRST_VALUE.name);
            expect(value.id).to.be.equal(FIRST_VALUE.id);
            done();
        });
    });
    it('should update success',function(done) {
        sessionToken.update(firstToken,VALUE_UPDATE,function(err) {
            if (err) {
                return done(err);
            }
            
            _sendToChild('update',firstToken);
            done();
        });
    });
    it('should get the same data from child process after update',function(done) {
        childProcess.on('child-get-after-update',function(err,value) {
            if (err) {
                return done(err);
            }
            expect(value).to.have.property('name').and.equal(VALUE_UPDATE.name);
            done();
        });
    });
    it ('should generate again success',function(done) {
        childProcess.on('child-get-after-generate2',function(err,value) {
            if (err) {
                return done(err);
            }
            expect(value.name).to.be.equal(FIRST_VALUE.name);
            expect(value.id).to.be.equal(FIRST_VALUE.id);
            done();
        });
        sessionToken.generate(FIRST_VALUE,function(err,tokenViaCreate) {//save session
            if (err) {
                return done(err);
            }
            _sendToChild('generate2',tokenViaCreate);
            secondToken = tokenViaCreate;
            // done();
        });
    });
    // it('should get the same value form child process again',function(done) {
        
    // });
    it('shold delete token success',function(done) {
        sessionToken.delete(secondToken,function(err) {
            if (err) {
                return done(err);
            }
            _sendToChild('delete',secondToken);
            done();
        });
    });
    it('should get value of `false` in child process after delete',function(done) {
        childProcess.on('child-get-after-delete',function(err,obj) {
            if (err) {
                return done(err);
            }
            expect(obj).equal(false);
            done();
        });
    });
});

