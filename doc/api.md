## Classes

<dl>
<dt><a href="#SessionToken">SessionToken</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#SessionTokenOption">SessionTokenOption</a></dt>
<dd></dd>
<dt><a href="#SessionTokenCallback">SessionTokenCallback</a> : <code>function</code></dt>
<dd><p>SessionToken callback function.</p>
</dd>
</dl>

<a name="SessionToken"></a>

## SessionToken
**Kind**: global class  

* [SessionToken](#SessionToken)
    * [new SessionToken(option)](#new_SessionToken_new)
    * [.generate(value, callback)](#SessionToken+generate)
    * [.update(token, value, callback)](#SessionToken+update)
    * [.refresh(token, callback)](#SessionToken+refresh)
    * [.get(token, callback)](#SessionToken+get)
    * [.delete(token, callback)](#SessionToken+delete)

<a name="new_SessionToken_new"></a>

### new SessionToken(option)

| Param | Type |
| --- | --- |
| option | [<code>SessionTokenOption</code>](#SessionTokenOption) | 

<a name="SessionToken+generate"></a>

### sessionToken.generate(value, callback)
Genrate a new token and save its associated data in redis and memeory.

**Kind**: instance method of [<code>SessionToken</code>](#SessionToken)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> | The value of session |
| callback | [<code>SessionTokenCallback</code>](#SessionTokenCallback) |  |

<a name="SessionToken+update"></a>

### sessionToken.update(token, value, callback)
Update the content of session.

**Kind**: instance method of [<code>SessionToken</code>](#SessionToken)  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> |  |
| value | <code>Object</code> | The value of session |
| callback | [<code>SessionTokenCallback</code>](#SessionTokenCallback) |  |

<a name="SessionToken+refresh"></a>

### sessionToken.refresh(token, callback)
Refresh the expire time of session data saved in redis and memeory.

**Kind**: instance method of [<code>SessionToken</code>](#SessionToken)  

| Param | Type |
| --- | --- |
| token | <code>String</code> | 
| callback | [<code>SessionTokenCallback</code>](#SessionTokenCallback) | 

<a name="SessionToken+get"></a>

### sessionToken.get(token, callback)
Get session data via token

**Kind**: instance method of [<code>SessionToken</code>](#SessionToken)  

| Param | Type |
| --- | --- |
| token | <code>String</code> | 
| callback | [<code>SessionTokenCallback</code>](#SessionTokenCallback) | 

<a name="SessionToken+delete"></a>

### sessionToken.delete(token, callback)
Delete session data via token

**Kind**: instance method of [<code>SessionToken</code>](#SessionToken)  

| Param | Type |
| --- | --- |
| token | <code>String</code> | 
| callback | [<code>SessionTokenCallback</code>](#SessionTokenCallback) | 

<a name="SessionTokenOption"></a>

## SessionTokenOption
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| [expireTime] | <code>Number</code> | Expiration time in second, default is 0, which will be not expired, but when you set the paramter of `option.crontabStr`, it will be cleared at some time still. |
| redisKeyPrefix | <code>String</code> | The prefix of redis key to save session data |
| reids | <code>Object</code> | The redis client used to save session data |
| [subReis] | <code>Object</code> | The subscribe redis client to receive delete operation form other node.js process, it's useful when you start node in cluster mode. |
| [crontabStr] | <code>String</code> | Crontab string, use for clearing the memeory cache. |
| [maxSize] | <code>Number</code> | The max size of the cache in memory. |
| [useLru] | <code>Boolean</code> | Whether to use LRU algorithm to delete the elder elements. It only takes effect when `option.maxSize` is greater than zero. |
| [clusteId] | <code>String</code> | An id of current process, when not set, it will use random string.  When do the operation of delete or update, SessionToken will publish a message, which is started with a perfix of current clusterId, to redis. Then all the  processes will receive the message  and read the cluster of the message to check whether it from self. But when the subReis is not set, the `clusterId` is useless now. |

<a name="SessionTokenCallback"></a>

## SessionTokenCallback : <code>function</code>
SessionToken callback function.

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| err | <code>Error</code> | 
| data | <code>Object</code> \| <code>String</code> \| <code>undefined</code> | 

