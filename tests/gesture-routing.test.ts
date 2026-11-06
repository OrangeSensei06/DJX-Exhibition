import test from 'node:test';
import assert from 'node:assert/strict';
import { initialExperience, initialSurfaces, initialVision } from '../shared/protocol';
import type { Snapshot } from '../shared/protocol';
import { canTurnPage, gestureContextKey, reversalReady, routeGesture } from '../shared/gestureRouting';

function state(chapter = 1): Snapshot {
  return {
    welcome: false, interaction: {completed:false,pageReadyAt:0},
    auto:{active:false,runId:0,stage:'Ready'},handoff:{chapter,phase:'idle',startedAt:0},
    jewels:{active:chapter===5,phase:'WAIT',generation:0,command:null,commandId:0},
    motifs:{active:chapter===4,phase:'WAIT',blooms:0,generation:0,command:null,commandId:0},
    architecture:{active:chapter===3,phase:'WAIT',generation:0,command:null,commandId:0},
    biryaniVideo:{phase:'book',startedAt:0,reverseFrom:7.5},
    fashion:{startedAt:0,look:'red',switchedAt:0,exitingAt:0,nextChapter:chapter!==2},
    sequence:0,experience:initialExperience,vision:initialVision,displays:[],assignments:{book:0,vertical:0},connected:[],fullscreen:{book:false,vertical:false},surfaces:initialSurfaces,
  };
}
const fire = (s: Snapshot, name: Parameters<typeof routeGesture>[1]['name'], detail = '', now = 20000) => routeGesture(s,{name,detail},now);
for(let chapter=1;chapter<=5;chapter++) {
  test(`chapter ${chapter}: browsing in either direction and one-time swipe-up`,()=>{
    const s=state(chapter);
    assert.deepEqual(fire(s,'swipe-left'),{channel:'navigate',action:'next'});
    assert.deepEqual(fire(s,'swipe-right'),{channel:'navigate',action:'previous'});
    assert.deepEqual(fire(s,'swipe-up'),{channel:'lift',action:'lift'});
    s.handoff.phase='lifting';
    for(const name of ['swipe-up','swipe-left','swipe-right'] as const) assert.equal(fire(s,name),null);
    s.handoff.phase='away';
    assert.equal(fire(s,'swipe-up'),null);
    assert.equal(canTurnPage(s,20000),false);
  });
}
test('biryani gestures are ordered, outward horizontal only, with a LIST reversal gate',()=>{
  const s=state();s.handoff.phase='away';s.biryaniVideo.phase='IDLE';
  assert.deepEqual(fire(s,'vertical-opposite'),{channel:'biryani-video',action:'separate'});
  assert.equal(fire(s,'hands-apart'),null);assert.equal(fire(s,'swipe-right'),null);
  s.biryaniVideo.phase='EXPLODING';assert.equal(fire(s,'vertical-opposite'),null);
  s.biryaniVideo.phase='STACKED';
  assert.deepEqual(fire(s,'hands-apart'),{channel:'biryani-video',action:'list'});
  assert.equal(fire(s,'hands-together'),null);
  s.biryaniVideo.phase='LIST';assert.equal(reversalReady(s,20000),true);
  for(const name of ['swipe-left','swipe-right'] as const) assert.ok(fire(s,name));
  s.biryaniVideo.phase='RETURN';assert.equal(fire(s,'swipe-left'),null);
});
test('dresses require a snap, with reveal and switch timing locks',()=>{
  const s=state(2);s.handoff.phase='away';s.fashion.startedAt=10000;
  assert.equal(fire(s,'snap','',14000),null);assert.equal(canTurnPage(s,20000),false);
  assert.deepEqual(fire(s,'snap'),{channel:'fashion',action:'switch'});
  s.interaction.completed=true;s.fashion.switchedAt=19500;
  assert.equal(canTurnPage(s,20000),false);assert.equal(fire(s,'snap'),null);
  assert.equal(canTurnPage(s,20500),true);s.fashion.exitingAt=20500;
  assert.equal(canTurnPage(s,21000),false);
});
test('door push enters and returns; navigation waits for the round trip',()=>{
  const s=state(3);s.handoff.phase='away';s.architecture.phase='idle';
  assert.deepEqual(fire(s,'push'),{channel:'architecture',action:'open'});
  assert.equal(canTurnPage(s,20000),false);
  s.architecture.phase='opening';assert.equal(fire(s,'push'),null);
  s.architecture.phase='inside';assert.deepEqual(fire(s,'push'),{channel:'architecture',action:'return'});
  assert.equal(fire(s,'swipe-left'),null);
  s.architecture.phase='leaving';assert.equal(fire(s,'push'),null);
  s.architecture.phase='idle';s.interaction.completed=true;assert.ok(fire(s,'swipe-right'));
});
test('scroll opens with opposite vertical motion; navigation cannot skip opening it',()=>{
  const s=state(4);s.handoff.phase='away';s.motifs.phase='SCROLL_READY';
  assert.equal(canTurnPage(s,20000),false);
  assert.deepEqual(fire(s,'vertical-opposite'),{channel:'motifs',action:'open'});
  assert.equal(fire(s,'hands-apart'),null);
  s.motifs.phase='SCROLL_OPEN';assert.equal(fire(s,'swipe-left'),null);
  s.motifs.phase='CONTENT_VISIBLE';assert.ok(fire(s,'swipe-left'));
});
test('jewellery accepts deliberate index-finger sweeps, not swirls, and locks while rotating',()=>{
  const s=state(5);s.handoff.phase='away';s.jewels.phase='READY';
  assert.equal(fire(s,'finger-left','swirl counter-clockwise'),null);
  assert.equal(fire(s,'finger-right','sweep 0.13 m'),null);
  assert.deepEqual(fire(s,'finger-left','index-sweep 0.13 m'),{channel:'jewels',action:'left'});
  assert.deepEqual(fire(s,'finger-right','index-sweep 0.14 m'),{channel:'jewels',action:'right'});
  assert.equal(canTurnPage(s,20000),false);
  s.interaction.completed=true;s.jewels.phase='ROTATING';assert.equal(fire(s,'finger-left','index-sweep 0.13 m'),null);
  assert.equal(canTurnPage(s,20000),false);s.jewels.phase='READY';assert.equal(canTurnPage(s,20000),true);
});
test('automatic mode, page-turn settling, and handoff block input; context keys ignore vision broadcasts',()=>{
  const s=state();const key=gestureContextKey(s);
  s.sequence++;s.vision={...s.vision,fps:45};assert.equal(gestureContextKey(s),key);
  s.auto.active=true;assert.equal(fire(s,'swipe-up'),null);
  s.auto.active=false;s.interaction.pageReadyAt=22000;assert.equal(fire(s,'swipe-left'),null);
  s.interaction.pageReadyAt=0;s.handoff.phase='returning';assert.equal(fire(s,'swipe-up'),null);
  assert.notEqual(gestureContextKey(s),key);
});
