# SessionToken
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
    redis:redisClient,//the redis client object
    subReis:redisSub
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

See the [api](doc/api) doc.

## 4. License

[MIT](LICENSE)

