const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const {TownCamera}=vm.runInNewContext(readFileSync(join(__dirname,'..','town-camera.js'),'utf8')+'\n({TownCamera})');

test('zoom preserves the world point under the pointer and constrains panning',()=>{
  const camera=TownCamera.create();
  const focus={x:320,y:270};
  camera.zoom(2,focus);
  const point=camera.world(focus.x,focus.y);
  assert.equal(point.x,focus.x);
  assert.equal(point.y,focus.y);
  camera.pan(-1e4,-1e4);
  assert.equal(camera.x,-TownCamera.width);
  assert.equal(camera.y,-TownCamera.height);
  camera.zoom(100,focus);
  assert.equal(camera.scale,3);
  camera.reset();
  assert.deepEqual([camera.scale,camera.x,camera.y],[1,0,0]);
});

test('a two-pointer pinch scales the map and suppresses the synthetic click',()=>{
  const listeners=new Map();
  const canvas={
    clientWidth:480,clientHeight:310,
    getBoundingClientRect:()=>({left:0,top:0,width:480,height:310}),
    setPointerCapture(){},
    classList:{add(){},remove(){}},
    addEventListener(name,handler){listeners.set(name,handler);}
  };
  const camera=TownCamera.create();
  const fire=(name,pointerId,clientX,clientY)=>listeners.get(name)({pointerId,clientX,clientY,button:0});
  TownCamera.bind(canvas,camera,()=>{});
  fire('pointerdown',1,200,150);
  fire('pointerdown',2,280,150);
  fire('pointermove',2,320,150);
  assert.equal(camera.scale,1.5);
  const point=camera.world(520,300);
  assert.equal(point.x,480);
  assert.equal(point.y,300);
  fire('pointerup',1);
  fire('pointerup',2);
  let suppressed=false;
  listeners.get('click')({detail:1,stopImmediatePropagation(){suppressed=true;}});
  assert.equal(suppressed,true);
});

test('scene shortcuts center the camera and clamp near map boundaries',()=>{
  const camera=TownCamera.create();
  camera.centerAt(550,357,2);
  const center=camera.screen(550,357);
  assert.deepEqual([center.x,center.y],[480,310]);
  camera.centerAt(0,620,2);
  assert.deepEqual([camera.x,camera.y],[0,-620]);
});
