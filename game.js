(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('mini');
  const mctx = mini.getContext('2d');
  const MAP_W = 3200, MAP_H = 2400, TILE = 64;
  const SAVE_KEY = 'ashwood-forest-save-v1';
  const keys = Object.create(null);
  const mouse = { x: 0, y: 0, down: false };
  const cam = { x: 0, y: 0 };
  const floats = [], particles = [], trees = [], rocks = [], graves = [], enemies = [];
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const dist = (ax,ay,bx,by) => Math.hypot(ax-bx, ay-by);
  const rand = (a,b) => a + Math.random() * (b-a);
  const randInt = (a,b) => a + Math.floor(Math.random() * (b-a+1));
  function hash(x,y){ const n = Math.sin(x*12.9898+y*78.233)*43758.5453; return n-Math.floor(n); }
  function resize(){ canvas.width=innerWidth; canvas.height=innerHeight; mini.width=148; mini.height=148; }
  addEventListener('resize', resize); resize();
  addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key==='c'||e.key==='C') toggleStats();
    if (e.key==='1') cast(1); if (e.key==='2') cast(2); if (e.key==='3') cast(3);
    if (e.key==='F5'){ e.preventDefault(); saveGame(true); }
    if (e.key==='F9'){ e.preventDefault(); loadGame(true); }
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; });
  canvas.addEventListener('mousedown', e => { if(e.button!==0) return; mouse.down=true; setTarget(); });
  addEventListener('mouseup', () => mouse.down=false);
  function setTarget(){
    hero.tx=cam.x+mouse.x; hero.ty=cam.y+mouse.y; hero.moving=true;
    hero.target = enemies.find(en => en.alive && dist(hero.tx,hero.ty,en.x,en.y)<42) || null;
  }
  const hero = { x:400,y:400,tx:400,ty:400,r:16,moving:false,target:null,lvl:1,exp:0,next:80,str:8,vit:8,agi:8,int:6,luk:5,pts:0,hp:0,maxHp:0,mp:0,maxMp:0,atkCd:0,facing:0,gold:0,dead:false };
  function recalc(){ hero.maxHp=80+hero.vit*12+(hero.lvl-1)*8; hero.maxMp=24+hero.int*6+(hero.lvl-1)*3; hero.hp=Math.min(hero.hp||hero.maxHp,hero.maxHp); hero.mp=Math.min(hero.mp||hero.maxMp,hero.maxMp); }
  recalc(); hero.hp=hero.maxHp; hero.mp=hero.maxMp;
  function atkDmg(){ const base=10+hero.str*2.2+hero.lvl; const crit=Math.random()<(0.05+hero.luk*0.008); return { d:Math.round(base*(crit?1.8:1)*rand(0.9,1.12)), crit }; }
  function speed(){ return 2.15+hero.agi*0.07; }
  function expNeed(lv){ return Math.round(70*Math.pow(1.22,lv-1)); }
  function saveGame(manual){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({ hero:{ x:hero.x,y:hero.y,lvl:hero.lvl,exp:hero.exp,next:hero.next,str:hero.str,vit:hero.vit,agi:hero.agi,int:hero.int,luk:hero.luk,pts:hero.pts,hp:hero.hp,mp:hero.mp,gold:hero.gold }, enemies:enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,alive:e.alive})) })); if(manual) log('\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e01\u0e21\u0e41\u0e25\u0e49\u0e27','gold'); }
    catch(e){ log('\u0e40\u0e0b\u0e1f\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08','dmg'); }
  }
  function loadGame(manual){
    const raw=localStorage.getItem(SAVE_KEY); if(!raw){ if(manual) log('\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e0b\u0e1f','sys'); return false; }
    try{
      const data=JSON.parse(raw); Object.assign(hero,data.hero); recalc();
      hero.hp=Math.min(data.hero.hp,hero.maxHp); hero.mp=Math.min(data.hero.mp,hero.maxMp);
      hero.tx=hero.x; hero.ty=hero.y; hero.moving=false; hero.target=null; hero.dead=false;
      if(data.enemies&&data.enemies.length===enemies.length) data.enemies.forEach((s,i)=>{ enemies[i].x=s.x; enemies[i].y=s.y; enemies[i].hp=s.hp; enemies[i].alive=s.alive; });
      document.getElementById('deadModal').classList.remove('show');
      if(manual) log('load Lv.'+hero.lvl,'heal'); if(typeof ui==='function') ui(); return true;
    }catch(e){ return false; }
  }
  (function gen(){ let s=90210; function rng(){ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; } for(let i=0;i<220;i++) trees.push({x:80+rng()*(MAP_W-160),y:80+rng()*(MAP_H-160),s:0.85+rng()*0.5}); for(let i=0;i<40;i++) rocks.push({x:rng()*MAP_W,y:rng()*MAP_H,s:0.6+rng()*0.8}); for(let i=0;i<8;i++) graves.push({x:600+rng()*2000,y:500+rng()*1400}); })();
  const types={ imp:{name:'Imp',col:'#6a2a22',hp:38,exp:18,spd:0.7,dmg:[4,8],r:13}, wolf:{name:'Wolf',col:'#3a3a44',hp:62,exp:28,spd:1.15,dmg:[7,12],r:15}, brute:{name:'Brute',col:'#3d4a28',hp:120,exp:48,spd:0.55,dmg:[12,20],r:20}, wraith:{name:'Wraith',col:'#4a5a72',hp:80,exp:36,spd:0.95,dmg:[8,14],r:14} };
  function spawn(cx,cy,kind,n){ const t=types[kind]; for(let i=0;i<n;i++) enemies.push({kind,name:t.name,col:t.col,x:cx+rand(-90,90),y:cy+rand(-90,90),r:t.r,hp:t.hp,maxHp:t.hp,exp:t.exp,spd:t.spd,dmg:t.dmg,alive:true,wanderA:Math.random()*Math.PI*2,atkCd:0,aggro:false,hitFlash:0}); }
  spawn(700,520,'imp',5); spawn(1180,780,'wolf',4); spawn(1600,500,'imp',4); spawn(900,1200,'brute',2); spawn(1900,1100,'wolf',5); spawn(2300,700,'wraith',3); spawn(2100,1600,'brute',3); spawn(1400,1700,'imp',6); spawn(2600,1400,'wraith',4); spawn(600,1800,'wolf',3);
  const logEl=document.getElementById('log');
  function log(msg,cls=''){ const d=document.createElement('div'); d.className=cls; d.textContent=msg; logEl.prepend(d); while(logEl.children.length>8) logEl.removeChild(logEl.lastChild); }
  log('Ashwood Forest','sys'); if(loadGame(false)) log('Save loaded','heal');
  setInterval(()=>{ if(!hero.dead) saveGame(false); },10000);
  const skills={ 1:{cd:0,max:0.35,mp:0}, 2:{cd:0,max:4.2,mp:12}, 3:{cd:0,max:5.5,mp:16} };
  function cast(id){ if(hero.dead) return; const s=skills[id]; if(!s||s.cd>0) return; if(hero.mp<s.mp){ log('No MP','sys'); return; } hero.mp-=s.mp; s.cd=s.max; if(id===1) swing(1); if(id===2) whirl(); if(id===3) dash(); }
  function swing(mult){ const {d,crit}=atkDmg(); let hit=0; for(const en of enemies){ if(!en.alive) continue; if(dist(hero.x,hero.y,en.x,en.y)<52+en.r){ deal(en,Math.round(d*mult),crit); hit++; } } if(!hit) log('miss','sys'); burst(hero.x,hero.y,'#e8dcc0',8); }
  function whirl(){ for(const en of enemies){ if(!en.alive) continue; if(dist(hero.x,hero.y,en.x,en.y)<90+en.r){ const {d,crit}=atkDmg(); deal(en,Math.round(d*1.35),crit); } } burst(hero.x,hero.y,'#c9a227',22); }
  function dash(){ const ang=Math.atan2((hero.target?hero.target.y:hero.ty)-hero.y,(hero.target?hero.target.x:hero.tx)-hero.x); hero.x=clamp(hero.x+Math.cos(ang)*140,30,MAP_W-30); hero.y=clamp(hero.y+Math.sin(ang)*140,30,MAP_H-30); hero.tx=hero.x; hero.ty=hero.y; for(const en of enemies){ if(!en.alive) continue; if(dist(hero.x,hero.y,en.x,en.y)<70+en.r){ const {d,crit}=atkDmg(); deal(en,Math.round(d*1.6),crit); } } burst(hero.x,hero.y,'#7aa0d4',16); }
  function deal(en,dmg,crit){ en.hp-=dmg; en.hitFlash=0.18; en.aggro=true; floatTxt(en.x,en.y-20,(crit?'CRIT ':'')+dmg, crit?'#ffd36a':'#ff6b5a'); if(en.hp<=0) kill(en); }
  function kill(en){ en.alive=false; en.hp=0; hero.exp+=en.exp; log(en.name+' +'+en.exp+' EXP','gold'); burst(en.x,en.y,en.col,18); while(hero.exp>=hero.next) levelUp(); setTimeout(()=>{ en.alive=true; en.hp=en.maxHp; en.aggro=false; },14000); }
  function levelUp(){ hero.exp-=hero.next; hero.lvl++; hero.next=expNeed(hero.lvl); hero.pts+=5; recalc(); hero.hp=hero.maxHp; hero.mp=hero.maxMp; log('LEVEL UP '+hero.lvl,'gold'); document.getElementById('statModal').classList.add('show'); refreshStats(); }
  function floatTxt(x,y,t,c){ floats.push({x,y,t,c,life:1}); }
  function burst(x,y,c,n){ for(let i=0;i<n;i++) particles.push({x,y,vx:rand(-2.2,2.2),vy:rand(-2.6,1.2),life:0.5,c}); }
  function die(){ hero.dead=true; hero.hp=0; document.getElementById('deadModal').classList.add('show'); }
  document.getElementById('revive').onclick=()=>{ hero.dead=false; hero.x=400; hero.y=400; hero.tx=400; hero.ty=400; hero.hp=hero.maxHp*0.6; hero.mp=hero.maxMp*0.5; document.getElementById('deadModal').classList.remove('show'); };
  function update(dt){
    if(hero.dead) return;
    hero.atkCd=Math.max(0,hero.atkCd-dt); for(const k of Object.keys(skills)) skills[k].cd=Math.max(0,skills[k].cd-dt);
    let mx=0,my=0; if(keys.w||keys.arrowup) my-=1; if(keys.s||keys.arrowdown) my+=1; if(keys.a||keys.arrowleft) mx-=1; if(keys.d||keys.arrowright) mx+=1;
    if(mx||my){ const l=Math.hypot(mx,my)||1; hero.tx=hero.x+(mx/l)*40; hero.ty=hero.y+(my/l)*40; hero.moving=true; }
    if(mouse.down) setTarget();
    if(hero.moving){ const dx=hero.tx-hero.x, dy=hero.ty-hero.y, d=Math.hypot(dx,dy); if(d<4) hero.moving=false; else { const sp=speed(); hero.x+=(dx/d)*sp; hero.y+=(dy/d)*sp; hero.facing=Math.atan2(dy,dx); } }
    hero.x=clamp(hero.x,24,MAP_W-24); hero.y=clamp(hero.y,24,MAP_H-24);
    if(hero.target&&hero.target.alive){ const d=dist(hero.x,hero.y,hero.target.x,hero.target.y); if(d<50+hero.target.r&&hero.atkCd<=0){ cast(1); hero.atkCd=Math.max(0.28,0.55-hero.agi*0.012); } } else hero.target=null;
    hero.hp=Math.min(hero.maxHp,hero.hp+dt*(1.2+hero.vit*0.08)); hero.mp=Math.min(hero.maxMp,hero.mp+dt*(1.4+hero.int*0.1));
    for(const en of enemies){
      if(!en.alive) continue; en.atkCd=Math.max(0,en.atkCd-dt); en.hitFlash=Math.max(0,en.hitFlash-dt);
      const d=dist(en.x,en.y,hero.x,hero.y); if(d<220) en.aggro=true; if(en.aggro&&d>520) en.aggro=false;
      if(en.aggro){ const ang=Math.atan2(hero.y-en.y,hero.x-en.x); if(d>28+en.r){ en.x+=Math.cos(ang)*en.spd; en.y+=Math.sin(ang)*en.spd; } else if(en.atkCd<=0){ const dmg=randInt(en.dmg[0],en.dmg[1]); hero.hp-=dmg; floatTxt(hero.x,hero.y-22,'-'+dmg,'#ff8a7a'); en.atkCd=1.15; if(hero.hp<=0) die(); } }
      else { en.wanderA+=(Math.random()-0.5)*0.2; en.x+=Math.cos(en.wanderA)*en.spd*0.45; en.y+=Math.sin(en.wanderA)*en.spd*0.45; }
      en.x=clamp(en.x,40,MAP_W-40); en.y=clamp(en.y,40,MAP_H-40);
    }
    for(const f of floats){ f.y-=28*dt; f.life-=dt; } for(let i=floats.length-1;i>=0;i--) if(floats[i].life<=0) floats.splice(i,1);
    for(const p of particles){ p.x+=p.vx; p.y+=p.vy; p.life-=dt; } for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);
    cam.x=clamp(hero.x-canvas.width/2,0,MAP_W-canvas.width); cam.y=clamp(hero.y-canvas.height/2,0,MAP_H-canvas.height); ui();
  }
  function onScreen(x,y,pad){ return x>cam.x-pad&&x<cam.x+canvas.width+pad&&y>cam.y-pad&&y<cam.y+canvas.height+pad; }
  function draw(){
    const w=canvas.width,h=canvas.height; ctx.fillStyle='#1a2214'; ctx.fillRect(0,0,w,h);
    const sx=Math.floor(cam.x/TILE)*TILE, sy=Math.floor(cam.y/TILE)*TILE;
    for(let y=sy;y<cam.y+h+TILE;y+=TILE) for(let x=sx;x<cam.x+w+TILE;x+=TILE){ const n=hash(x,y); ctx.fillStyle=n>0.55?'#24301c':n>0.3?'#1c2816':'#162012'; ctx.fillRect(x-cam.x,y-cam.y,TILE+1,TILE+1); }
    const drawables=enemies.filter(e=>e.alive).map(e=>({z:e.y,kind:'e',e})); drawables.push({z:hero.y,kind:'h'}); trees.forEach(t=>{ if(onScreen(t.x,t.y,80)) drawables.push({z:t.y+10,kind:'t',t}); }); drawables.sort((a,b)=>a.z-b.z);
    for(const d of drawables){ if(d.kind==='t'){ const x=d.t.x-cam.x,y=d.t.y-cam.y,s=d.t.s; ctx.fillStyle='#2a1c10'; ctx.fillRect(x-5*s,y-8,10*s,18*s); ctx.fillStyle='#163016'; ctx.beginPath(); ctx.arc(x,y-22*s,22*s,0,Math.PI*2); ctx.fill(); } else if(d.kind==='e'){ const en=d.e,x=en.x-cam.x,y=en.y-cam.y; ctx.fillStyle=en.hitFlash>0?'#fff':en.col; ctx.beginPath(); ctx.arc(x,y-4,en.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#111'; ctx.fillRect(x-14,y-en.r-14,28,4); ctx.fillStyle='#c23b2e'; ctx.fillRect(x-14,y-en.r-14,28*(en.hp/en.maxHp),4); } else { const x=hero.x-cam.x,y=hero.y-cam.y; ctx.fillStyle='#2a2e38'; ctx.beginPath(); ctx.arc(x,y-4,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#8b1e1e'; ctx.beginPath(); ctx.arc(x,y-18,6,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#d8c48a'; ctx.lineWidth=3; const a=hero.facing; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*8,y+Math.sin(a)*8-4); ctx.lineTo(x+Math.cos(a)*26,y+Math.sin(a)*26-8); ctx.stroke(); } }
    for(const f of floats){ ctx.globalAlpha=Math.max(0,f.life); ctx.fillStyle=f.c; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText(f.t,f.x-cam.x,f.y-cam.y); ctx.globalAlpha=1; }
    const s=148/Math.max(MAP_W,MAP_H); mctx.fillStyle='#10140c'; mctx.fillRect(0,0,148,148); mctx.fillStyle='#8b1e1e'; for(const e of enemies) if(e.alive) mctx.fillRect(e.x*s,e.y*s,3,3); mctx.fillStyle='#f0c14a'; mctx.fillRect(hero.x*s-2,hero.y*s-2,5,5);
  }
  function ui(){ document.getElementById('lvl').textContent=hero.lvl; document.getElementById('hpTxt').textContent=Math.floor(hero.hp)+'/'+hero.maxHp; document.getElementById('mpTxt').textContent=Math.floor(hero.mp)+'/'+hero.maxMp; document.getElementById('expTxt').textContent=Math.floor(hero.exp)+'/'+hero.next; document.getElementById('hpFill').style.width=(100*hero.hp/hero.maxHp)+'%'; document.getElementById('mpFill').style.width=(100*hero.mp/hero.maxMp)+'%'; document.getElementById('expFill').style.width=(100*hero.exp/hero.next)+'%'; document.getElementById('sStr').textContent=hero.str; document.getElementById('sVit').textContent=hero.vit; document.getElementById('sAgi').textContent=hero.agi; document.getElementById('sInt').textContent=hero.int; document.getElementById('sLuk').textContent=hero.luk; document.getElementById('ptsLabel').textContent=hero.pts?('+'+hero.pts):''; document.querySelectorAll('.sk').forEach(el=>{ const cd=el.querySelector('.cd'); if(!cd) return; const s=skills[el.dataset.sk]; if(s&&s.cd>0){ cd.style.display='flex'; cd.textContent=s.cd.toFixed(1);} else cd.style.display='none'; }); }
  function toggleStats(){ document.getElementById('statModal').classList.toggle('show'); refreshStats(); }
  function refreshStats(){ document.getElementById('pts').textContent=hero.pts; document.getElementById('mStr').textContent=hero.str; document.getElementById('mVit').textContent=hero.vit; document.getElementById('mAgi').textContent=hero.agi; document.getElementById('mInt').textContent=hero.int; document.getElementById('mLuk').textContent=hero.luk; document.querySelectorAll('.stat-row button').forEach(b=>b.disabled=hero.pts<=0); }
  document.getElementById('closeStat').onclick=()=>document.getElementById('statModal').classList.remove('show');
  document.querySelectorAll('.stat-row button').forEach(btn=>btn.onclick=()=>{ if(hero.pts<=0) return; hero[btn.dataset.st]++; hero.pts--; recalc(); refreshStats(); ui(); });
  document.querySelectorAll('.sk').forEach(el=>el.onclick=()=>{ if(el.id==='btnSave'){ saveGame(true); return; } if(el.id==='btnLoad'){ loadGame(true); return; } if(el.dataset.sk==='4') toggleStats(); else cast(+el.dataset.sk); });
  let last=performance.now();
  function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; update(dt); draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
