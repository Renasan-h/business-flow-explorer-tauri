import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markerAlongRoute, pointAlongRoute } from '../src/playback/playbackRoute.ts';
const a={x:0,y:0}, b={x:100,y:0}, c={x:100,y:300};
for (const [name, points, progress, expected] of [
 ['start',[a,b,c],0,a], ['corner',[a,b,c],.25,b], ['distance',[a,b,c],.5,{x:100,y:100}], ['end',[a,b,c],1,c], ['reverse',[c,b,a],.75,b], ['duplicate',[a,a,b],.5,{x:50,y:0}], ['zero',[a,a],.5,a], ['clamp',[a,b],2,b], ['negative',[a,b],-1,a], ['empty',[],.5,a],
]) test(name,()=>assert.deepEqual(pointAlongRoute(points,progress),expected));

for (const [name, points, progress, expected] of [
 ['marker start',[a,b],0,{x:12,y:0}],
 ['marker end',[a,b],1,{x:88,y:0}],
 ['marker reverse',[b,a],0,{x:88,y:0}],
 ['marker corner',[a,b,c],.5,{x:100,y:100}],
 ['marker short',[a,{x:10,y:0}],1,{x:5,y:0}],
 ['marker duplicate',[a,a,b],0,{x:12,y:0}],
 ['marker zero',[a,a],1,a],
 ['marker empty',[],0,a],
]) test(name,()=>assert.deepEqual(markerAlongRoute(points,progress),expected));

import { routeConnection, routeViaWaypoints, offsetRoute } from '../src/connectionRouting.ts';
import { nodeSize, containsNodePoint } from '../src/editor/nodeGeometry.ts';

const nodes = [
 { id: 'a', position: { x: 0, y: 0 }, width: 200, height: 100 },
 { id: 'b', position: { x: 600, y: 0 }, width: 100, height: 60 },
 { id: 'obstacle', position: { x: 300, y: 0 }, width: 100, height: 100 },
];
const orthogonal = points => points.slice(1).every((p,i) => p.x === points[i].x || p.y === points[i].y);
test('custom size straight endpoints', () => {
 assert.deepEqual(routeConnection(nodes,'a','b'), [{x:100,y:0},{x:550,y:0}]);
});
test('orthogonal obstacle avoidance', () => {
 const points = routeConnection(nodes,'a','b','orthogonal');
 assert.ok(points.length > 2);
 assert.ok(orthogonal(points));
 assert.deepEqual(points[0],{x:100,y:0});
 assert.deepEqual(points.at(-1),{x:550,y:0});
 for (const [i,p] of points.slice(1).entries()) {
  const q = points[i];
  assert.ok(p.x === q.x
   ? !(p.x > 250 && p.x < 350 && Math.max(p.y,q.y)>-50 && Math.min(p.y,q.y)<50)
   : !(p.y > -50 && p.y < 50 && Math.max(p.x,q.x)>250 && Math.min(p.x,q.x)<350));
 }
});
test('manual forward and reverse waypoints', () => {
 for (const [from,to,y] of [['a','b',-150],['b','a',150]]) {
  const waypoint = {x:300,y};
  const points = routeViaWaypoints(nodes,from,to,[waypoint]);
  assert.ok(orthogonal(points));
  assert.ok(points.some(p=>p.x===waypoint.x && p.y===waypoint.y));
 }
});
test('opposite straight lanes', () => {
 assert.deepEqual(offsetRoute(routeConnection(nodes,'a','b'),-12),[{x:100,y:-12},{x:550,y:-12}]);
 assert.deepEqual(offsetRoute(routeConnection(nodes,'b','a'),-12),[{x:550,y:12},{x:100,y:12}]);
});
test('default size and custom hit bounds', () => {
 assert.deepEqual(nodeSize({}),{width:150,height:76});
 assert.deepEqual(nodeSize(nodes[0]),{width:200,height:100});
 assert.equal(containsNodePoint(nodes[0],{x:100,y:50}),true);
 assert.equal(containsNodePoint(nodes[0],{x:101,y:50}),false);
 assert.equal(containsNodePoint(nodes[0],{x:100,y:51}),false);
});
