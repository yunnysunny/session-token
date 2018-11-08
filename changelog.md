# 0.5.2

1. Bump native-linked-list to 0.3.1 to add support for node 10.

# 0.5.0

1. Bump node-slogger to 1.0.2.
2. Don't refresh the expired time in `get` function.

# 0.4.2

1. Bump node-slogger to 0.5.2.

# 0.4.1

1. Bump node-slogger to 0.5.1.

# 0.4.0

1. Add the ability of idle checking to remove the expired items in memory.

# 0.3.7

1. Fixed the issue of not adding the element to lru list when the count of the lru list does not come up to the SessionToken's `maxSize` limit.
2. Add parameter of `showMemSizeInterval` to show the current size of cache used in memory.

# 0.3.6

1. Use node-cron to do clear task to fix the bug of not triggering the crontab event.

# 0.3.5

1. Add parameter of `cacheClearCallback`, which will be called when the memory cache is cleared.

# 0.3.4

1. Fixed the issue of not triggering the delete operation to other node of cluster.

# 0.3.3 

1. Add the feature of disabling the memory cache.

# 0.3.2

1. Add the clusterId parameter to the constructor function.

# 0.3.1
1. Fixed the issue of saving the data having none expired time.

# 0.3.0
1. Add the feature of notifing the operation of update between processes using session-token.
2. Can set the parameter of `option.expireTime` to zero.