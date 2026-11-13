'use strict';

const TownBuildArt=(()=>{
  function draw(ctx,w,interiors,lit,{polygon,ellipse,line}){
    const box=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,width,height);};
    for(const b of TownBuild.buildings(w)){
      const {x,y,path}=TownBuild.plots[b.plot];
      const {width,height,roof,capacity}=TownBuild.types[b.type];
      const left=x-width/2,right=x+width/2,top=y-height;
      line(ctx,[[x,y],...path],'#8a8c5b',8);
      line(ctx,[[x,y],...path],'#c8b28a',5);
      ellipse(ctx,x+5,y+3,width*.61,7,'#3e50355c');
      if(!b.finished){
        polygon(ctx,[[left,y],[right,y],[right+8,y-8],[left+8,y-8]],'#ac9270');
        line(ctx,[[left,y],[left,y-20],[right,y-20],[right,y]],'#9a704a',2);
        line(ctx,[[left,y-3],[right,y-20]],'#806442',2);
        for(let i=0;i<4;i++)line(ctx,[[left+8+i*5,y-3],[left+19+i*5,y-3]],'#e0b67a',2);
        continue;
      }
      polygon(ctx,[[right,y],[right+9,y-8],[right+9,top-8],[right,top]],'#92765c');
      box(left,top,width,height,'#80674f');
      box(left+2,top+1,width-4,height-3,interiors?'#e2c59b':'#dfc9a0');
      if(interiors){
        box(left+2,y-8,width-4,6,'#c19c70');
        for(let i=0;i<capacity;i++){
          const bed=x-15+i*19;
          box(bed,y-18,10,11,'#946b4b');box(bed+1,y-17,8,8,i?'#a8a568':'#bd826c');
          box(bed+2,y-17,6,2,'#f6edcf');
          box(bed+12,y-25,7,5,lit?'#ffd48e':'#8caaa0');
        }
      }else{
        for(let i=0;i<capacity;i++){
          const door=left+6+i*25;
          box(door,y-16,8,15,'#78503b');box(door+11,y-21,7,7,lit?'#ffd18a':'#678f87');
          line(ctx,[[door+14,y-21],[door+14,y-14]],'#edce9b',1);
        }
      }
      const eave=interiors?top+1:top+9;
      polygon(ctx,[[left-4,eave],[x-5,top-13],[right+3,eave]],roof);
      polygon(ctx,[[x-5,top-13],[x+5,top-20],[right+12,eave-8],[right+3,eave]],'#6b554a');
      for(let i=0;i<3;i++){
        const offset=i*3;
        line(ctx,[[x-13-offset,top-6+offset],[x+8+offset,top-6+offset]],'#e3af8c75',.8);
      }
      line(ctx,[[left-4,eave],[right+3,eave],[right+12,eave-8]],'#574c3b',1.3);
      ellipse(ctx,right-2,y+2,5,2.5,'#8f654a');ellipse(ctx,right-2,y-.5,3.5,2.5,'#81985b');
    }
  }
  function mark(ctx,w,type,{polygon,line}){
    for(const [id,{x,y}] of TownBuild.plots.entries()){
      const occupied=TownBuild.house(w,id);
      const [left,top,right,bottom]=TownBuild.bounds(id,occupied?.type??type);
      const open=TownBuild.canPlace(w,id,type);
      const points=[[left,top+9],[left+9,top],[right,top],[right,bottom-8],[right-9,bottom],[left,bottom]];
      polygon(ctx,points,open?'#edf5bd70':'#8a5a4d58');
      line(ctx,[...points,points[0]],open?'#eef4bb':'#ebae92',2);
      ctx.font='700 12px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#263d31';ctx.fillText(occupied?'已占用':String(id+1),x,y-15);
    }
  }
  return {draw,mark};
})();
