const REDIS_CLUSTER = process.env.REDIS_CLUSTER.split(',');
const nodes = new Array(REDIS_CLUSTER.length);
let i = 0;
for (const item of REDIS_CLUSTER) {
    const [host,port] = item.split(':');
    nodes[i++] = {host,port};
}
exports.nodes = nodes;

exports.FIRST_VALUE = {name:'sunny',id:1};
exports.VALUE_UPDATE = {name:'sunny_new',id:1};
exports.SECOND_VALUE = {name:'SECOND',id:2};