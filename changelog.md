# v1.0.0
## Breaking Changes

1. The parameter of `subReis` has been renamed to `subRedis`.
2. Removing all code associated with lru.

# v0.6.2
## Remove

1. Remove LRU algorithm.

## Add

1. Use class TokenCacheItem to save session data in memory.

# v0.6.1
## Fix

1. Fix the problem of not setting the expired time in the function of update when `ignoreRefresh` set true.

# v0.6.0
## Add

1. Add the parameter of `memLifecycleRatio` to set the lifecycle of the cache of memeory.
2. Add the parameter of `ignoreRefresh` to the function of `update` to ignore the refresh operation of update.

# v0.5.2
## Modify
1. Bump native-linked-list to 0.3.1 to add support for node 10.

# v0.5.0
## Modify
1. Bump node-slogger to 1.0.2.
2. Don't refresh the expired time in `get` function.

# v0.4.2
## Modify
1. Bump node-slogger to 0.5.2.

# v0.4.1
## Modify
1. Bump node-slogger to 0.5.1.

# v0.4.0
## Add
1. Add the ability of idle checking to remove the expired items in memory.

# v0.3.7
## Fix
1. Fixed the issue of not adding the element to lru list when the count of the lru list does not come up to the SessionToken's `maxSize` limit.
## Add
1. Add parameter of `showMemSizeInterval` to show the current size of cache used in memory.

# v0.3.6
## Add
1. Use node-cron to do clear task to fix the bug of not triggering the crontab event.

# v0.3.5
## Add
1. Add parameter of `cacheClearCallback`, which will be called when the memory cache is cleared.

# v0.3.4
## Fix
1. Fixed the issue of not triggering the delete operation to other node of cluster.

# v0.3.3
## Add
1. Add the feature of disabling the memory cache.

# v0.3.2
## Add
1. Add the clusterId parameter to the constructor function.

# v0.3.1
## Fix
1. Fixed the issue of saving the data having none expired time.

# 0.3.0
## Add
1. Add the feature of notifing the operation of update between processes using session-token.
2. Can set the parameter of `option.expireTime` to zero.