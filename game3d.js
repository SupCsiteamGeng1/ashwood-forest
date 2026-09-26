import * as THREE from 'three';

const SAVE_KEY = 'ashwood-3d-save-v1';
const logEl = document.getElementById('log');
function log(msg, cls='sys'){ const d=document.createElement('div'); d.className=cls; d.textContent=msg; logEl.prepend(d); while(logEl.children.length>7) logEl.lastChild.remove(); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b120e);
scene.fog = new THREE.FogExp2(0x0b120e, 0.018);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8aa88a, 0x1a1208, 0.7));
const sun = new THREE.DirectionalLight(0xffe6b0, 1.05);
sun.position.set(30, 40, 10);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180, 40, 40), new THREE.MeshStandardMaterial({ color: 0x1d2a18, roughness: 0.95 }));
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x3a2614 }));
  trunk.position.y = 0.8; trunk.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), new THREE.MeshStandardMaterial({ color: 0x163016 }));
  leaf.position.y = 2.2; leaf.castShadow = true;
  g.add(trunk, leaf); g.position.set(x, 0, z); scene.add(g);
}
for (let i = 0; i < 90; i++) {
  const a = Math.random()*Math.PI*2, r = 8 + Math.random()*70;
  makeTree(Math.cos(a)*r, Math.sin(a)*r);
}
function makeChar(color, scale=1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28*scale, 0.55*scale, 4, 8), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 0.7*scale; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22*scale, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc9a227 }));
  head.position.y = 1.25*scale; g.add(body, head); return g;
}
const heroMesh = makeChar(0x2a2e38, 1); scene.add(heroMesh);
const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), new THREE.MeshStandardMaterial({ color: 0xd8c48a, metalness: 0.6 }));
sword.position.set(0.35, 0.85, 0.35); heroMesh.add(sword);
const hero = { x:0, z:0, yaw:0, lvl:1, exp:0, next:80, str:8, vit:8, agi:8, int:6, luk:5, pts:0, hp:0, maxHp:0, mp:0, maxMp:0, atkCd:0, dead:false };
function recalc(){ hero.maxHp=90+hero.vit*12+(hero.lvl-1)*8; hero.maxMp=28+hero.int*6; hero.hp=Math.min(hero.hp||hero.maxHp,hero.maxHp); hero.mp=Math.min(hero.mp||hero.maxMp,hero.maxMp); }
recalc(); hero.hp=hero.maxHp; hero.mp=hero.maxMp;
const types = [
  { name:'Imp', color:0x6a2a22, hp:38, exp:18, spd:2.2, dmg:[4,8], s:0.7 },
  { name:'Wolf', color:0x3a3a44, hp:62, exp:28, spd:3.1, dmg:[7,12], s:0.85 },
  { name:'Brute', color:0x3d4a28, hp:120, exp:48, spd:1.5, dmg:[12,20], s:1.25 },
  { name:'Wraith', color:0x4a5a72, hp:80, exp:36, spd:2.6, dmg:[8,14], s:0.9 }
];
const enemies = [];
function spawn(kind, n, r0) {
  for (let i=0;i<n;i++){
    const t = types[kind]; const a = Math.random()*Math.PI*2, r = r0 + Math.random()*12;
    const mesh = makeChar(t.color, t.s); mesh.position.set(Math.cos(a)*r, 0, Math.sin(a)*r); scene.add(mesh);
    enemies.push({ mesh, name:t.name, hp:t.hp, maxHp:t.hp, exp:t.exp, spd:t.spd, dmg:t.dmg, alive:true, atkCd:0, wander:Math.random()*6 });
  }
}
spawn(0,6,14); spawn(1,5,22); spawn(2,3,30); spawn(3,4,38);
const keys = {};
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key==='c'||e.key==='C') toggleStats();
  if (e.key==='1') cast(1); if (e.key==='2') cast(2); if (e.key==='3') cast(3);
  if (e.key==='F5'){ e.preventDefault(); saveGame(true); }
  if (e.key==='F9'){ e.preventDefault(); loadGame(true); }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()]=false);
let camYaw = 0.6, camPitch = 0.55, dragging=false;
addEventListener('mousedown', e => { if(e.button===2||e.button===1) dragging=true; if(e.button===0) swing(); });
addEventListener('mouseup', () => dragging=false);
addEventListener('mousemove', e => { if(!dragging) return; camYaw -= e.movementX*0.005; camPitch = Math.max(0.2, Math.min(1.2, camPitch + e.movementY*0.004)); });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('resize', () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
const skills = {1:{cd:0,max:.35,mp:0},2:{cd:0,max:4,mp:12},3:{cd:0,max:5,mp:16}};
function atk(){ const crit=Math.random()<(0.05+hero.luk*0.008); return {d:Math.round((10+hero.str*2.2+hero.lvl)*(crit?1.8:1)*(0.9+Math.random()*0.22)), crit}; }
function nearest(range){ let best=null, bd=range; for (const en of enemies){ if(!en.alive) continue; const d=Math.hypot(en.mesh.position.x-hero.x, en.mesh.position.z-hero.z); if(d<bd){ bd=d; best=en; } } return best; }
function deal(en, dmg, crit){
  en.hp -= dmg; log((crit?'CRIT ':'')+dmg+' -> '+en.name, crit?'gold':'dmg');
  if(en.hp<=0){ en.alive=false; en.mesh.visible=false; hero.exp += en.exp; log(en.name+' +'+en.exp+' EXP','gold'); while(hero.exp>=hero.next) levelUp(); setTimeout(()=>{ en.alive=true; en.hp=en.maxHp; en.mesh.visible=true; }, 14000); }
}
function swing(){ if(hero.dead||hero.atkCd>0) return; hero.atkCd=Math.max(0.28,0.5-hero.agi*0.01); const {d,crit}=atk(); const en=nearest(3.2); if(en) deal(en,d,crit); else log('miss','sys'); }
function whirl(){ const {d,crit}=atk(); for(const en of enemies){ if(!en.alive) continue; if(Math.hypot(en.mesh.position.x-hero.x,en.mesh.position.z-hero.z)<5) deal(en, Math.round(d*1.3), crit); } }
function dash(){ hero.x += Math.sin(hero.yaw)*6; hero.z += Math.cos(hero.yaw)*6; const {d,crit}=atk(); const en=nearest(4); if(en) deal(en, Math.round(d*1.55), crit); }
function cast(id){ if(hero.dead) return; const s=skills[id]; if(!s||s.cd>0) return; if(hero.mp<s.mp){ log('no MP','sys'); return; } hero.mp-=s.mp; s.cd=s.max; if(id===1) swing(); if(id===2) whirl(); if(id===3) dash(); }
function levelUp(){ hero.exp-=hero.next; hero.lvl++; hero.next=Math.round(70*Math.pow(1.22,hero.lvl-1)); hero.pts+=5; recalc(); hero.hp=hero.maxHp; hero.mp=hero.maxMp; log('LEVEL UP '+hero.lvl,'gold'); document.getElementById('statModal').classList.add('show'); refreshStats(); }
function saveGame(m){ localStorage.setItem(SAVE_KEY, JSON.stringify({hero:{x:hero.x,z:hero.z,lvl:hero.lvl,exp:hero.exp,next:hero.next,str:hero.str,vit:hero.vit,agi:hero.agi,int:hero.int,luk:hero.luk,pts:hero.pts,hp:hero.hp,mp:hero.mp}})); if(m) log('saved','gold'); }
function loadGame(m){ const raw=localStorage.getItem(SAVE_KEY); if(!raw){ if(m) log('no save','sys'); return; } Object.assign(hero, JSON.parse(raw).hero); recalc(); hero.dead=false; if(m) log('loaded Lv.'+hero.lvl,'gold'); }
loadGame(false); setInterval(()=>{ if(!hero.dead) saveGame(false); }, 10000);
document.getElementById('revive').onclick=()=>{ hero.dead=false; hero.x=0; hero.z=0; hero.hp=hero.maxHp*0.6; document.getElementById('deadModal').classList.remove('show'); };
function toggleStats(){ document.getElementById('statModal').classList.toggle('show'); refreshStats(); }
function refreshStats(){ const map={pts:'pts',mStr:'str',mVit:'vit',mAgi:'agi',mInt:'int',mLuk:'luk'}; for(const id in map) document.getElementById(id).textContent=hero[map[id]]; document.querySelectorAll('.row button').forEach(b=>b.disabled=hero.pts<=0); }
document.getElementById('closeStat').onclick=()=>document.getElementById('statModal').classList.remove('show');
document.querySelectorAll('.row button').forEach(b=>b.onclick=()=>{ if(hero.pts<=0)return; hero[b.dataset.st]++; hero.pts--; recalc(); refreshStats(); });
document.querySelectorAll('.sk').forEach(el=>el.onclick=()=>{ if(el.id==='btnSave') saveGame(true); else if(el.id==='btnC') toggleStats(); else cast(+el.dataset.sk); });
const clock = new THREE.Clock();
function tick(){
  const dt = Math.min(0.05, clock.getDelta()); requestAnimationFrame(tick);
  if(!hero.dead){
    hero.atkCd=Math.max(0,hero.atkCd-dt); for(const k of Object.keys(skills)) skills[k].cd=Math.max(0,skills[k].cd-dt);
    let mx=0,mz=0; if(keys.w) mz+=1; if(keys.s) mz-=1; if(keys.a) mx-=1; if(keys.d) mx+=1;
    const spd = 6 + hero.agi*0.12, fy = camYaw;
    if(mx||mz){ const l=Math.hypot(mx,mz)||1; mx/=l; mz/=l; hero.x += (Math.sin(fy)*mz + Math.cos(fy)*mx)*spd*dt; hero.z += (Math.cos(fy)*mz - Math.sin(fy)*mx)*spd*dt; hero.yaw = Math.atan2(Math.sin(fy)*mz + Math.cos(fy)*mx, Math.cos(fy)*mz - Math.sin(fy)*mx); }
    hero.x=Math.max(-80,Math.min(80,hero.x)); hero.z=Math.max(-80,Math.min(80,hero.z));
    hero.hp=Math.min(hero.maxHp, hero.hp+dt*(1.1+hero.vit*0.08)); hero.mp=Math.min(hero.maxMp, hero.mp+dt*(1.3+hero.int*0.1));
    for(const en of enemies){
      if(!en.alive) continue; en.atkCd=Math.max(0,en.atkCd-dt);
      const dx=hero.x-en.mesh.position.x, dz=hero.z-en.mesh.position.z, d=Math.hypot(dx,dz);
      if(d<18){ if(d>2.1){ en.mesh.position.x += dx/d*en.spd*dt; en.mesh.position.z += dz/d*en.spd*dt; } else if(en.atkCd<=0){ const dmg=en.dmg[0]+Math.floor(Math.random()*(en.dmg[1]-en.dmg[0]+1)); hero.hp-=dmg; en.atkCd=1.2; log(en.name+' hit '+dmg,'dmg'); if(hero.hp<=0){ hero.dead=true; hero.hp=0; document.getElementById('deadModal').classList.add('show'); } } }
      else { en.wander += dt; en.mesh.position.x += Math.cos(en.wander)*0.6*dt; en.mesh.position.z += Math.sin(en.wander*0.7)*0.6*dt; }
    }
  }
  heroMesh.position.set(hero.x,0,hero.z); heroMesh.rotation.y = hero.yaw;
  const dist = 9;
  camera.position.set(hero.x + Math.sin(camYaw)*dist*Math.cos(camPitch-0.2), 2.2+Math.sin(camPitch)*8, hero.z + Math.cos(camYaw)*dist*Math.cos(camPitch-0.2));
  camera.lookAt(hero.x, 1.1, hero.z);
  document.getElementById('lvl').textContent=hero.lvl;
  document.getElementById('hpTxt').textContent=Math.floor(hero.hp)+'/'+hero.maxHp;
  document.getElementById('mpTxt').textContent=Math.floor(hero.mp)+'/'+hero.maxMp;
  document.getElementById('expTxt').textContent=Math.floor(hero.exp)+'/'+hero.next;
  document.getElementById('hpFill').style.width=(100*hero.hp/hero.maxHp)+'%';
  document.getElementById('mpFill').style.width=(100*hero.mp/hero.maxMp)+'%';
  document.getElementById('expFill').style.width=(100*hero.exp/hero.next)+'%';
  document.getElementById('sStr').textContent=hero.str; document.getElementById('sVit').textContent=hero.vit; document.getElementById('sAgi').textContent=hero.agi; document.getElementById('sInt').textContent=hero.int; document.getElementById('sLuk').textContent=hero.luk;
  document.getElementById('ptsLabel').textContent=hero.pts?('+'+hero.pts):'';
  renderer.render(scene, camera);
}
tick();
