# SessionToken

[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]

[npm-url]: https://npmjs.org/package/session-token
[travis-image]: https://img.shields.io/travis/yunnysunny/session-token.svg?style=flat-square
[travis-url]: https://travis-ci.org/yunnysunny/session-token
[coveralls-image]: https://img.shields.io/coveralls/yunnysunny/session-token.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/yunnysunny/session-token?branch=master
[david-image]: https://img.shields.io/david/yunnysunny/session-token.svg?style=flat-square
[david-url]: https://david-dm.org/yunnysunny/session-token
[node-image]: https://img.shields.io/badge/node.js-%3E=_6-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/

[![NPM](https://nodei.co/npm/session-token.png?downloads=true)](https://nodei.co/npm/session-token/)  
A library to create token and save associated session data in redis easily.

## 1. Install

```npm install session-token --save```

## 2. How to use

First, you should have a redis server, because SessionToken save all the token data in redis. And then you can create a SessionToken object.

```javascript
const SessionToken = require('session-token');
const Redis = require('ioredis');
const async = require('neo-async');
const redisClient = new Redis();//connect to the redis server of localhost:6379
const redisSub = new Redis();//the redis client for subscribe
const sessionToken = new SessionToken({
    expireTime:7200,//the time of seconds before the session data expired
    redisKeyPrefix:'myprefix:mytoken:',//the redis key's prefix
    redis:redisClient,//the redis client used to save session data
    subRedis:redisSub,//The subscribe redis client to receive delete operation
    maxSize:1000000,// The max size of the cache in memory.
});
```
**code 2.1**

After creating the object of SessionToken, you can generate token and it will save the session data to the reids.

```javascript
let token = null;
async.waterfall([
    function(next) {
        sessionToken.generate({name:'sunny',id:1},function(err,tokenViaCreate) {//save session
            if (err) {
                next(err);
                return console.error(err);
            }
            token = tokenViaCreate;
            next();
        });
    },
    function(next) {
        sessionToken.get(token,function(err,data) {//get session data via token
            if (err) {
                next(err);
                return console.error(err);
            }
            next();
        });
    }
]);

```

## 3. Api

See [here](https://github.com/yunnysunny/session-token/blob/master/docs/api.md).

## 4. License

[MIT](LICENSE)

