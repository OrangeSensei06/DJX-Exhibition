import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InactivityTimer} from '../shared/inactivity';
test('absence resets only after a complete minute',()=>{
 const timer=new InactivityTimer(1000);
 assert.equal(timer.expired(60_999),false);
 assert.equal(timer.expired(61_000),true);
});
test('each detection restarts the entire absence interval',()=>{
 const timer=new InactivityTimer(0);
 timer.touch(59_000);
 assert.equal(timer.expired(60_000),false);
 assert.equal(timer.expired(118_999),false);
 assert.equal(timer.expired(119_000),true);
 timer.touch(120_000);
 assert.equal(timer.expired(120_000),false);
});
