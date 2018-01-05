const Q = require('q');

var deferred = Q.defer();
const promise = deferred.promise;
setTimeout(deferred.resolve, 1000);
promise.then(function() {
    console.log('promise resolved.');
});