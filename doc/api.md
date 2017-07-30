## Classes

<dl>
<dt><a href="#SessionToken">SessionToken</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
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

| Param | Type | Description |
| --- | --- | --- |
| option | <code>Object</code> |  |
| option.expireTime | <code>Number</code> | Expiration time in second |
| option.redisKeyPrefix | <code>String</code> | The prefix of redis key to save session data |
| option.reids | <code>Object</code> | The redis object |
| option.subReis | <code>Object</code> | The subscribe redis client to receive delete operation form other node.js process, it's useful when you start node in cluster mode. |
| option.crontabStr | <code>String</code> \| <code>undefined</code> | Crontab string, use for clearing the memeory cache. |

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

<a name="SessionTokenCallback"></a>

## SessionTokenCallback : <code>function</code>
SessionToken callback function.

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| err | <code>Error</code> | 
| data | <code>Object</code> \| <code>String</code> \| <code>undefined</code> | 

