import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointAlongRoute } from '../src/playback/playbackRoute.ts';
const a={x:0,y:0}, b={x:100,y:0}, c={x:100,y:300};
for (const [name, points, progress, expected] of [
 ['start',[a,b,c],0,a], ['corner',[a,b,c],.25,b], ['distance',[a,b,c],.5,{x:100,y:100}], ['end',[a,b,c],1,c], ['reverse',[c,b,a],.75,b], ['duplicate',[a,a,b],.5,{x:50,y:0}], ['zero',[a,a],.5,a], ['clamp',[a,b],2,b], ['negative',[a,b],-1,a], ['empty',[],.5,a],
]) test(name,()=>assert.deepEqual(pointAlongRoute(points,progress),expected));
