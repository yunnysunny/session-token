PATH := ./redis-git/src:${PATH}
REDIS_DIR := redis-3.2.11
F1_EXISTS := $(shell [ ! -e $(REDIS_DIR)/src/redis-server ] && echo 1 || echo 0 )

# CLUSTER REDIS NODES
define NODE1_CONF
daemonize yes
protected-mode no 
port 7000
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node1.pid
logfile /tmp/redis_cluster_node1.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node1.conf
endef

define NODE2_CONF
daemonize yes
protected-mode no
port 7001
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node2.pid
logfile /tmp/redis_cluster_node2.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node2.conf
endef

define NODE3_CONF
daemonize yes
protected-mode no
port 7002
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node3.pid
logfile /tmp/redis_cluster_node3.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node3.conf
endef

define NODE4_CONF
daemonize yes
protected-mode no
port 7003
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node4.pid
logfile /tmp/redis_cluster_node4.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node4.conf
endef

define NODE5_CONF
daemonize yes
protected-mode no
port 7004
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node5.pid
logfile /tmp/redis_cluster_node5.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node5.conf
endef

define NODE6_CONF
daemonize yes
protected-mode no
port 7005
cluster-node-timeout 5000
pidfile /tmp/redis_cluster_node6.pid
logfile /tmp/redis_cluster_node6.log
save ""
appendonly no
cluster-enabled yes
cluster-config-file /tmp/redis_cluster_node6.conf
endef

export NODE1_CONF
export NODE2_CONF
export NODE3_CONF
export NODE4_CONF
export NODE5_CONF
export NODE6_CONF

help:
	@echo "Please use 'make <target>' where <target> is one of"
	@echo "  start             starts a test redis cluster"
	@echo "  cleanup           cleanup config files after redis cluster"
	@echo "  stop              stops all redis servers"
	@echo "  travis-run        starts the redis cluster and runs your tests"
	@echo "  travis-install    install redis from 'unstable' branch"

start: cleanup
	echo "$$NODE1_CONF" | $(REDIS_DIR)/src/redis-server -
	echo "$$NODE2_CONF" | $(REDIS_DIR)/src/redis-server -
	echo "$$NODE3_CONF" | $(REDIS_DIR)/src/redis-server -
	echo "$$NODE4_CONF" | $(REDIS_DIR)/src/redis-server -
	echo "$$NODE5_CONF" | $(REDIS_DIR)/src/redis-server -
	echo "$$NODE6_CONF" | $(REDIS_DIR)/src/redis-server -

cleanup:
	- rm -vf /tmp/redis_cluster_node*.conf 2>/dev/null
	- rm -f /tmp/redis_cluster_node1.conf
	- rm dump.rdb appendonly.aof - 2>/dev/null

stop:
	kill `cat /tmp/redis_cluster_node1.pid` || true
	kill `cat /tmp/redis_cluster_node2.pid` || true
	kill `cat /tmp/redis_cluster_node3.pid` || true
	kill `cat /tmp/redis_cluster_node4.pid` || true
	kill `cat /tmp/redis_cluster_node5.pid` || true
	kill `cat /tmp/redis_cluster_node6.pid` || true
	make cleanup

travis-run:
	# Start all cluster nodes
	make start
	sleep 5

	# Join all nodes in the cluster
	echo "yes" | ruby $(REDIS_DIR)/src/redis-trib.rb create --replicas 1 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005
	sleep 5

	#########
	# Run your tests/code here
	# For example: py.test
	npm install
	npm run test
	#########

	# Kill all redis nodes and do cleanup
	#make stop

travis-install:
	@if [ ! -e $(REDIS_DIR)/src/redis-server ]; then wget http://download.redis.io/releases/$(REDIS_DIR).tar.gz && tar -xzvf $(REDIS_DIR).tar.gz && make -C $(REDIS_DIR) -j4 &&	sleep 3; fi
	gem install redis

	
