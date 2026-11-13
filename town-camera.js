'use strict';

const TownCamera=(()=>{
  const width=960,height=620,min=1,max=3;
  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
  function create(){
    let scale=min,x=0,y=0;
    const world=(px,py)=>({x:(px-x)/scale,y:(py-y)/scale});
    const screen=(wx,wy)=>({x:wx*scale+x,y:wy*scale+y});
    function constrain(){
      x=clamp(x,width*(1-scale),0);
      y=clamp(y,height*(1-scale),0);
    }
    function zoom(next,anchor,target=anchor){
      const point=world(anchor.x,anchor.y);
      scale=clamp(next,min,max);
      x=target.x-point.x*scale;
      y=target.y-point.y*scale;
      constrain();
    }
    function centerAt(wx,wy,next=scale){scale=clamp(next,min,max);x=width/2-wx*scale;y=height/2-wy*scale;constrain();}
    function pan(dx,dy){x+=dx;y+=dy;constrain();}
    return {get scale(){return scale;},get x(){return x;},get y(){return y;},
      world,screen,zoom,pan,centerAt,reset(){scale=min;x=0;y=0;}};
  }

  function bind(canvas,camera,changed){
    const pointers=new Map();
    let moved=false;
    const point=e=>{
      const rect=canvas.getBoundingClientRect();
      return {x:(e.clientX-rect.left)*width/rect.width,y:(e.clientY-rect.top)*height/rect.height};
    };
    const center=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const middle={x:width/2,y:height/2};
    function zoomBy(ratio){camera.zoom(camera.scale*ratio,middle);changed();}
    canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
      const anchor=point(e);
      camera.zoom(camera.scale*Math.exp(-pixels*.002),anchor);
      changed();
    },{passive:false});
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||pointers.size>=2)return;
      if(!pointers.size)moved=false;
      const start=point(e);
      pointers.set(e.pointerId,{start,last:start});
      canvas.setPointerCapture(e.pointerId);
      if(pointers.size===2)moved=true;
    });
    canvas.addEventListener('pointermove',e=>{
      const pointer=pointers.get(e.pointerId);
      if(!pointer)return;
      const next=point(e);
      const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];
      if(other){
        const oldDistance=distance(pointer.last,other.last);
        const newDistance=distance(next,other.last);
        if(oldDistance>1&&newDistance>1){
          camera.zoom(camera.scale*newDistance/oldDistance,center(pointer.last,other.last),center(next,other.last));
        }
      }else{
        if(!moved&&distance(pointer.start,next)<6*width/canvas.clientWidth)return;
        camera.pan(next.x-pointer.last.x,next.y-pointer.last.y);
      }
      pointer.last=next;
      moved=true;
      canvas.classList.add('is-panning');
      changed();
    });
    function release(e){
      pointers.delete(e.pointerId);
      if(!pointers.size)canvas.classList.remove('is-panning');
    }
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
    canvas.addEventListener('click',e=>{
      if(moved&&e.detail!==0){e.stopImmediatePropagation();moved=false;}
    },{capture:true});
    canvas.addEventListener('keydown',e=>{
      const arrows={ArrowLeft:[46,0],ArrowRight:[-46,0],ArrowUp:[0,46],ArrowDown:[0,-46]};
      if(Object.hasOwn(arrows,e.key))camera.pan(...arrows[e.key]);
      else if(e.key==='+'||e.key==='=')camera.zoom(camera.scale*1.2,middle);
      else if(e.key==='-')camera.zoom(camera.scale/1.2,middle);
      else if(e.key==='0')camera.reset();
      else return;
      e.preventDefault();
      changed();
    });
    return {point,zoomBy};
  }
  return {width,height,min,max,create,bind};
})();
