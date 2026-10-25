(() => {
  'use strict';
  const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a),pad=n=>String(n).padStart(2,'0');
  let renderer,assets={},textures={},state='loading',previousState='menu',wave=0,kills=0,lives=3,stageStartKills=0,ammo=12,reloading=0,shotCooldown=0,flash=0,damage=0,hit=0,elapsed=0,spawnClock=0,spawned=0,waveKills=0,announcementTime=0,fireHeld=false,firePointer=null,drag=null,joyPointer=null,joy={x:0,y:0},yaw=0,pitch=0,lastTime=0,lastRender=0,raf=0,best=0,startedOnce=false;
  const stages=[
    {name:'霧の入口',count:30,speed:.78,interval:1.75,fog:.023,fogColor:[.055,.094,.079],tint:[.95,1.08,.96],lamp:[.72,.91,.54],awning:[.22,.36,.25],accent:'#e5674e'},
    {name:'蒼い停電',count:36,speed:.90,interval:1.63,fog:.030,fogColor:[.035,.075,.15],tint:[.72,.94,1.3],lamp:[.35,.7,1],awning:[.16,.25,.49],accent:'#69c3e5'},
    {name:'赤い警報',count:42,speed:1.02,interval:1.51,fog:.025,fogColor:[.15,.045,.035],tint:[1.35,.72,.57],lamp:[1,.22,.12],awning:[.5,.15,.12],accent:'#ff7059'},
    {name:'紫煙の路地',count:48,speed:1.14,interval:1.39,fog:.033,fogColor:[.10,.045,.15],tint:[1.08,.77,1.35],lamp:[.7,.38,1],awning:[.34,.19,.43],accent:'#c49bec'},
    {name:'琥珀の封鎖',count:54,speed:1.26,interval:1.27,fog:.028,fogColor:[.16,.105,.035],tint:[1.34,1.06,.63],lamp:[1,.65,.17],awning:[.48,.34,.12],accent:'#edbd69'},
    {name:'最後の夜明け',count:60,speed:1.38,interval:1.15,fog:.021,fogColor:[.22,.28,.31],tint:[1.27,1.28,1.19],lamp:[1,.87,.69],awning:[.39,.44,.47],accent:'#d6dfba'}
  ];
  const totalZombies=stages.reduce((sum,s)=>sum+s.count,0),player={x:0,z:7},keys=new Set(),enemies=[],particles=[],obstacles=[];
  let fireAim=null,stageTime=0,ambienceClock=0,warningClock=0,blast=0;
  const sound=window.DSSound?new window.DSSound():null,barrels=[];
  const tactics=[
    ['正面突破','基本の追跡型。移動と照準を覚えよう。'],
    ['路地からの包囲','青い回り込み型が左右から接近。レーダーで側面を確認。'],
    ['突進を見切れ','赤い敵は光ってから突進。横移動でかわし、隙を狙え。'],
    ['装甲の群れ','琥珀色の耐久型はHP4。遅い間に距離を取り、頭部を狙え。'],
    ['誘い込んで一掃','赤いドラム缶を撃つと半径4.5mの敵を一掃。自分は半径2.4mの外へ。'],
    ['全方位の最終戦','回り込み・突進・耐久型の混成。背後の敵に振り向いて対処。']
  ];
  const weapons=[
    {name:'ハンドガン',short:'HANDGUN',tag:'精密射撃',capacity:12,interval:.24,reload:1.65,damage:1,head:2,range:42,targets:1,color:'#e8c59b',sound:'shot',description:'12発 / 頭部2ダメージ。扱いやすい初期装備。',icon:'M8 18h40v9H30l-3 15H16l2-15H8z'},
    {name:'サブマシンガン',short:'SMG',tag:'高速連射',capacity:24,interval:.10,reload:1.8,damage:1,head:2,range:32,targets:1,color:'#7ed6df',sound:'smg',description:'24発 / ハンドガンの2.4倍の連射速度。回り込む敵に。',icon:'M5 17h43v10H33l2 14h-9l-3-14h-8v10H7V25H5zM48 20h10v4H48z'},
    {name:'ショットガン',short:'SHOTGUN',tag:'近距離・散弾',capacity:6,interval:.68,reload:2.1,damage:3,head:4,range:18,targets:3,cone:.20,color:'#f4ac70',sound:'shotgun',description:'6発 / 射程18m。広い照準範囲の敵へ最大3体同時攻撃。',icon:'M3 27l13-9h42v6H24l-9 9H3zM27 25h17v5H27z'},
    {name:'貫通ライフル',short:'PIERCE RIFLE',tag:'長射程・貫通',capacity:10,interval:.42,reload:2,damage:3,head:4,range:55,targets:3,pierce:true,color:'#bdaceb',sound:'rifle',description:'10発 / 射程55m。一直線の敵を最大3体貫通。頭部4ダメージ。',icon:'M3 23h11l8-5h35v6H32l-4 7h-8l1-7-10 9H3zM29 12h13v4H29z'},
    {name:'グレネードランチャー',short:'GRENADE',tag:'着弾・範囲攻撃',capacity:4,interval:.95,reload:2.4,damage:4,head:4,range:35,targets:1,splash:3.8,color:'#e8cf72',sound:'launcher',description:'4発 / 着弾地点の半径3.8mへ4ダメージ。自爆なし。',icon:'M4 20h12l8-7h31v18H30l-4 8H16l3-12-10 9H4zM31 17v10M39 17v10M47 17v10'},
    {name:'パルスライフル',short:'PULSE RIFLE',tag:'高速・貫通',capacity:30,interval:.13,reload:2.2,damage:2,head:3,range:48,targets:2,pierce:true,color:'#8ce7b0',sound:'pulse',description:'30発 / 連射で最大2体貫通。混成の群れを制圧する最終装備。',icon:'M3 20h15l7-7h26v7h9v8H35l-4 10H19l3-12H12l-9 9zM31 17h14v5H31z'}
  ];
  let weaponIndex=0,unlockedStage=1,magazines=weapons.map(w=>w.capacity);
  const weapon=()=>weapons[weaponIndex];
  const shotStyles=[
    {kick:.045,life:.13,width:.035,fan:1,length:.38,body:.12,label:'単発 · 精密射撃'},
    {kick:.018,life:.09,width:.027,fan:1,length:.58,body:.12,label:'高速連射'},
    {kick:.16,life:.18,width:.035,fan:7,length:.95,body:.15,label:'散弾 · 最大3体'},
    {kick:.11,life:.2,width:.05,fan:1,length:1.15,body:.12,label:'貫通 · 最大3体'},
    {kick:.2,life:.24,width:.12,fan:1,length:.7,body:.25,label:'爆発 · 半径3.8m'},
    {kick:.025,life:.16,width:.065,fan:2,length:.95,body:.16,label:'光線連射 · 2体貫通'}
  ];
  const shotLines=[],blastRings=[];
  let recoil=0,feedbackClock=0,shotFeedback='',soundReturnState='menu';
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  function emitShot(impact){
    const w=weapon(),style=shotStyles[weaponIndex],color=rgb(w.color),origin=[player.x+.32*Math.cos(yaw)-.72*Math.sin(yaw),1.3,player.z-.32*Math.sin(yaw)-.72*Math.cos(yaw)];
    recoil=Math.min(.24,recoil+style.kick);let end;
    if(impact)end=[impact.x,impact.hp===undefined?.6:1.45,impact.z];
    else{const d=renderer.target.map((n,i)=>n-renderer.camera[i]),len=Math.hypot(...d)||1;end=origin.map((n,i)=>n+d[i]/len*w.range);end[1]=Math.max(.1,end[1]);}
    for(let i=0;i<style.fan;i++){const offset=weaponIndex===2?(i-3)*w.range*.055:weaponIndex===5?(i-.5)*.12:0;shotLines.push({from:origin.slice(),to:[end[0]+Math.cos(yaw)*offset,end[1]+(weaponIndex===2?Math.sin(i*2)*.25:0),end[2]-Math.sin(yaw)*offset],color,width:style.width,life:style.life,max:style.life,arc:weaponIndex===4});}
    if(shotLines.length>24)shotLines.splice(0,shotLines.length-24);
    $('crosshair').setAttribute('data-weapon',w.sound);$('fire').style.borderColor=w.color;
  }
  function paintShotEffects(objects){
    if(!startedOnce||state==='menu')return;
    for(const line of shotLines){const segments=4,delta=line.to.map((n,i)=>n-line.from[i]),horizontal=Math.hypot(delta[0],delta[2]);for(let j=0;j<segments;j++){const t=(j+.5)/segments;objects.push(renderer.object({x:line.from[0]+delta[0]*t,y:line.from[1]+delta[1]*t+(line.arc?Math.sin(t*Math.PI)*1.6:0),z:line.from[2]+delta[2]*t,w:line.width,h:line.width,d:horizontal/segments+.03,rot:Math.atan2(delta[0],delta[2]),color:[...line.color,Math.min(1,line.life/line.max*1.4)],emissive:1,transparent:true}));}}
    for(const ring of blastRings){const radius=ring.radius*(1-ring.life/.5),alpha=ring.life/.5;for(let j=0;j<12;j++){const a=j*Math.PI/6;objects.push(renderer.object({x:ring.x+Math.sin(a)*radius,y:.16,z:ring.z+Math.cos(a)*radius,w:.09,h:.12,d:Math.max(.12,radius*.55),rot:a+Math.PI/2,color:[1,.64,.16,alpha],emissive:1,transparent:true}));}}
  }
  function closeSoundSettings(){if(state!=='sound-settings')return;state=soundReturnState;clearInput();$('modal').classList.add('hidden');}
  function openSoundSettings(){
    if(!sound||!['menu','playing','paused'].includes(state))return;soundReturnState=state;state='sound-settings';clearInput();sound.stop();
    showModal('SOUND CHECK','音量と武器の音。','<p>「音を出す」で消音解除とテスト音を再生します。</p><label class="sound-volume">音量 <input id="sound-volume" type="range" min="0" max="100" value="'+Math.round(sound.volume*100)+'" aria-label="ゲームの音量"></label><div class="sound-actions"><button id="audio-enable">音を出す・テスト</button><button id="audio-mute">消音</button></div><output id="sound-feedback" role="status"></output><p id="sound-test-result"></p><p>武器の音を聴き比べる</p><div class="sound-samples">'+weapons.map((w,i)=>'<button id="sound-sample-'+i+'">'+w.name+'</button>').join('')+'</div><p class="sound-help">聞こえない場合は、ブラウザのタブの消音とPCの音量・出力先も確認してください。</p>',soundReturnState==='playing'?'ゲームに戻る':'閉じる',closeSoundSettings);
    $('audio-enable').onclick=async()=>{const ready=await sound.enable();if(ready){tone('test');$('sound-test-result').textContent='テスト音を再生しました。聞こえるか確認してください。';}else $('sound-test-result').textContent='音声を開始できませんでした。ブラウザの音声許可を確認してください。';};
    $('audio-mute').onclick=()=>{sound.mute();$('sound-test-result').textContent='消音にしました。';};
    $('sound-volume').oninput=e=>sound.setVolume(Number(e.target.value)/100);
    weapons.forEach((w,i)=>{$('sound-sample-'+i).onclick=async()=>{if(await sound.enable()){tone(w.sound);$('sound-test-result').textContent=w.name+'の発射音を再生しました。';}};});sound.status();
  }
  const weaponIcon=w=>'<svg viewBox="0 0 64 48" aria-hidden="true"><path d="'+w.icon+'"/></svg>';
  function weaponCard(index,reward=false){const w=weapons[index];return '<div class="weapon-reward" style="--weapon-color:'+w.color+'">'+weaponIcon(w)+'<div><small>'+(reward?'STAGE BONUS / 新武器を獲得':'EQUIPMENT')+'</small><strong>'+w.name+'</strong><span>'+w.description+'</span></div></div>';}
  function updateWeaponHUD(){const w=weapon();$('weapon-name').textContent=w.name;$('weapon-capacity').textContent='/ '+w.capacity;$('weapon-mode').textContent=shotStyles[weaponIndex].label;$('weapon-switch').disabled=unlockedStage<=1;$('weapon-switch').setAttribute('aria-label','武器を選ぶ。現在 '+w.name+'。獲得 '+unlockedStage+'種類');$('weapon-icon').innerHTML=weaponIcon(w);document.body.style.setProperty('--weapon-color',w.color);document.body.style.setProperty('--weapon-rgb',rgb(w.color).map(n=>Math.round(n*255)).join(','));$('crosshair').setAttribute('data-weapon',w.sound);}
  function equipWeapon(index){if(!['playing','arsenal'].includes(state)||!Number.isInteger(index)||index<0||index>=unlockedStage||index===weaponIndex)return false;magazines[weaponIndex]=ammo;weaponIndex=index;ammo=magazines[index];reloading=0;shotCooldown=Math.max(shotCooldown,.3);fireHeld=false;firePointer=null;fireAim=null;updateHUD();saveRun();tone('reload');return true;}
  function closeArsenal(){if(state!=='arsenal')return;state='playing';clearInput();$('modal').classList.add('hidden');unlockSound();}
  function openArsenal(){if(state!=='playing')return;state='arsenal';clearInput();if(sound)sound.stop();saveRun();const cards=weapons.map((w,i)=>'<button id="equip-'+i+'" class="weapon-choice '+(i===weaponIndex?'selected':'')+'" '+(i>=unlockedStage?'disabled':'')+' style="--weapon-color:'+w.color+'">'+weaponIcon(w)+'<strong>'+w.name+'</strong><span>'+(i>=unlockedStage?'STAGE '+pad(i)+' クリアで獲得':i===weaponIndex?'装備中 · '+ammo+'/'+w.capacity:shotStyles[i].label+' · '+magazines[i]+'/'+w.capacity)+'</span></button>').join('');showModal('BONUS ARSENAL','獲得した武器を選ぶ。','<p>武器を選ぶ間は一時停止。装弾数は武器ごとに保持。<br>PCでは数字キー1〜6でも切り替えられます。</p><div class="weapon-grid">'+cards+'</div>','ゲームに戻る',closeArsenal);for(let i=0;i<unlockedStage;i++)$('equip-'+i).onclick=()=>{equipWeapon(i);closeArsenal();};}
  let eliteIndex=-1,eliteNotice=0,eliteHUDKey='';
  function eliteStats(stage=wave){return {hp:6+4*(stage-1),speedBonus:.08+stage*.02,multiplier:.85+stage*.04};}
  function updateEliteHUD(){
    const elite=enemies.find(e=>e.kind==='elite'&&!e.dead),key=elite?wave+':'+elite.hp:eliteNotice>0?'defeated':'hidden';if(key===eliteHUDKey)return;eliteHUDKey=key;
    $('elite-panel').classList.toggle('hidden',key==='hidden');if(key==='hidden')return;
    $('elite-label').textContent=elite?'強化個体 · STAGE '+pad(wave):'強化個体を撃破';$('elite-health').textContent=elite?'HP '+Math.max(0,elite.hp)+' / '+elite.maxHp:'脅威を排除した';$('elite-bar').style.width=elite?Math.max(0,elite.hp/elite.maxHp*100)+'%':'0%';
  }
  const runKey='dead-signal-run-v1';
  let savedRun=readRun();
  function completedBefore(stage){return stages.slice(0,stage-1).reduce((sum,s)=>sum+s.count,0);}
  function readRun(){try{const r=JSON.parse(localStorage.getItem(runKey));if(r&&r.version===1&&Number.isInteger(r.stage)&&r.stage>=1&&r.stage<=stages.length&&Number.isInteger(r.lives)&&r.lives>=1&&r.lives<=3&&r.kills===completedBefore(r.stage)&&Number.isFinite(r.elapsed)&&r.elapsed>=0&&r.elapsed<=100000000)return{version:1,stage:r.stage,lives:r.lives,kills:r.kills,elapsed:r.elapsed,weapon:Number.isInteger(r.weapon)&&r.weapon>=0&&r.weapon<r.stage?r.weapon:r.stage-1};}catch{}return null;}
  function updateResumeUI(){if(state==='loading'||state==='error')return;$('start-label').textContent=savedRun?`つづきから · STAGE ${pad(savedRun.stage)}`:'サバイバルを開始';$('new-run').classList.toggle('hidden',!savedRun);$('resume-note').classList.toggle('hidden',!savedRun);$('device-note').classList.toggle('hidden',!!savedRun);$('resume-note').textContent=savedRun?`残機 ${savedRun.lives}/3 · ステージの最初から再開`:'';}
  function clearSavedRun(){savedRun=null;try{localStorage.removeItem(runKey);}catch{}updateResumeUI();}
  function saveRun(stage=wave){if(stage<1||stage>stages.length||lives<1){clearSavedRun();return;}const r={version:1,stage,lives,kills:completedBefore(stage),elapsed:Math.floor(elapsed),weapon:stage>wave?stage-1:weaponIndex};try{localStorage.setItem(runKey,JSON.stringify(r));savedRun=r;}catch{savedRun=null;try{localStorage.removeItem(runKey);}catch{}}updateResumeUI();}
  try{const value=Number(localStorage.getItem('dead-signal-best')||0);if(Number.isInteger(value)&&value>=0&&value<=totalZombies)best=value;}catch{}
  let loadedImages=0;
  const image=src=>new Promise((resolve,reject)=>{const i=new Image(),finish=(ok,message)=>{clearTimeout(timeout);i.onload=null;i.onerror=null;ok?resolve(i):reject(new Error(message));},timeout=setTimeout(()=>finish(false,'画像の読み込みに時間がかかっています。通信を確認して再読み込みしてください。'),45000);i.onload=()=>{loadedImages++;if(state==='loading')$('start-label').textContent=`画像を準備中… ${loadedImages}/3`;finish(true);};i.onerror=()=>finish(false,'画像を読み込めませんでした。通信を確認して再読み込みしてください。');i.src=src;});
  function unlockSound(){if(sound){sound.unlock();sound.status();}}
  function tone(type){if(sound)sound.play(type);}
  function rotatePlayer(angle){if(state!=='playing')return;yaw=Math.atan2(Math.sin(yaw+angle),Math.cos(yaw+angle));pitch=0;updateCamera();render();}
  function makeCharacterTexture(img,kind){const c=document.createElement('canvas');c.width=512;c.height=1024;const ctx=c.getContext('2d');
    // Clip the supplied turnaround images to hand-traced front/back silhouettes.
    // Coordinates are expressed against the 2048 × 1143 reference image.
    let p,rect;if(kind==='zombie'){rect=[65,63,640,1015];p=[[392,67],[424,79],[447,109],[453,145],[439,192],[441,228],[483,243],[519,267],[547,319],[570,369],[603,411],[629,457],[654,501],[673,548],[690,583],[691,627],[679,652],[666,652],[662,620],[650,605],[645,633],[631,620],[625,589],[610,558],[591,526],[564,500],[551,537],[540,570],[521,593],[510,626],[515,690],[508,764],[497,829],[505,912],[514,986],[530,1028],[539,1051],[532,1072],[464,1073],[439,1057],[441,1023],[439,954],[427,884],[412,823],[400,775],[385,742],[369,807],[356,874],[350,952],[345,1011],[346,1040],[334,1068],[291,1076],[241,1069],[239,1046],[258,1016],[263,951],[270,885],[271,826],[268,762],[275,694],[278,629],[260,605],[251,568],[249,528],[237,490],[213,516],[183,548],[164,570],[150,609],[143,638],[125,651],[121,627],[108,649],[88,640],[80,617],[86,580],[99,544],[108,513],[118,481],[137,442],[160,407],[187,367],[205,325],[229,288],[265,267],[304,252],[333,239],[337,206],[327,175],[325,137],[336,100],[358,79]];}else{rect=[1555,45,425,1055];p=[[1745,48],[1790,51],[1809,77],[1838,93],[1837,115],[1818,141],[1802,163],[1796,182],[1827,196],[1869,218],[1899,253],[1915,302],[1918,349],[1904,395],[1908,453],[1919,484],[1935,511],[1946,554],[1947,607],[1934,638],[1948,685],[1944,727],[1936,782],[1945,840],[1946,898],[1940,951],[1942,991],[1963,1029],[1968,1061],[1958,1083],[1923,1092],[1877,1081],[1863,1052],[1873,1012],[1869,960],[1848,916],[1834,864],[1820,805],[1802,744],[1779,709],[1747,711],[1729,753],[1708,800],[1702,853],[1679,903],[1666,952],[1669,990],[1669,1032],[1661,1055],[1612,1061],[1570,1049],[1568,1024],[1594,992],[1608,955],[1606,910],[1594,869],[1596,826],[1608,789],[1612,727],[1621,678],[1646,622],[1668,575],[1665,534],[1643,500],[1635,461],[1603,440],[1575,417],[1568,378],[1570,346],[1590,314],[1615,287],[1633,245],[1651,216],[1689,198],[1705,177],[1697,150],[1665,127],[1662,107],[1682,88],[1707,78],[1718,55]];}
    ctx.save();ctx.beginPath();p.forEach(([x,y],i)=>{const xx=(x-rect[0])/rect[2]*512,yy=(y-rect[1])/rect[3]*1024;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.closePath();ctx.clip();const scale=img.width/2048;ctx.drawImage(img,rect[0]*scale,rect[1]*scale,rect[2]*scale,rect[3]*scale,0,0,512,1024);ctx.restore();return renderer.texture(c);
  }
  function setupScene(){const r=renderer,ct=DSEngine.canvasTexture;
    textures.ground=ct(r,512,(c,s)=>{c.fillStyle='#404741';c.fillRect(0,0,s,s);let seed=71;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};for(let i=0;i<16000;i++){const n=50+rng()*55;c.fillStyle=`rgba(${n},${n+7},${n},${.06+rng()*.14})`;c.fillRect(rng()*s,rng()*s,1+rng()*4,1+rng()*3);}for(let i=0;i<35;i++){c.beginPath();let x=rng()*s,y=rng()*s;c.moveTo(x,y);for(let j=0;j<7;j++){x+=rng()*45-22;y+=rng()*40;c.lineTo(x,y);}c.strokeStyle='#15251c88';c.lineWidth=rng()*2+1;c.stroke();}});
    textures.shutter=ct(r,256,(c,s)=>{c.fillStyle='#566055';c.fillRect(0,0,s,s);for(let y=0;y<s;y+=9){c.fillStyle='#28392f';c.fillRect(0,y,s,2);c.fillStyle='#7a817044';c.fillRect(0,y+2,s,1);}for(let i=0;i<80;i++){c.fillStyle='#151d1666';c.fillRect(rand(0,s),rand(0,s),rand(1,4),rand(15,80));}});
    textures.wall=ct(r,256,(c,s)=>{c.fillStyle='#586252';c.fillRect(0,0,s,s);for(let i=0;i<1300;i++){c.fillStyle=Math.random()<.5?'#1e342329':'#9b9e7e13';c.fillRect(rand(0,s),rand(0,s),rand(1,9),rand(3,30));}c.strokeStyle='#213b2d';for(let i=0;i<7;i++){c.beginPath();c.moveTo(rand(0,s),0);c.lineTo(rand(0,s),s);c.stroke();}});
    textures.shadow=ct(r,128,(c,s)=>{const g=c.createRadialGradient(s/2,s/2,3,s/2,s/2,s/2);g.addColorStop(0,'#000a');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(0,0,s,s);});
    textures.zombie=makeCharacterTexture(assets.zombie,'zombie');textures.player=makeCharacterTexture(assets.survivor,'player');textures.street=r.texture(assets.street);
    const signs=['七番商店街','たばこ','食堂','喫茶 月灯','古書 山田','薬','青果','居酒屋'];textures.signs=signs.map((label,i)=>ct(r,256,(c,s)=>{c.fillStyle=i%3===1?'#683a30':'#b0b69b';c.fillRect(0,0,s,s);c.strokeStyle='#2d3b2d';c.lineWidth=10;c.strokeRect(4,4,248,248);c.fillStyle=i%3===1?'#b5bda3':'#273c30';c.textAlign='center';c.textBaseline='middle';c.font=`700 ${label.length>4?37:52}px serif`;c.fillText(label,128,132,225);for(let j=0;j<90;j++){c.fillStyle='#2b34251b';c.fillRect(rand(0,s),rand(0,s),rand(2,15),rand(2,20));}}));
    // Real perspective geometry forms the navigable street. The supplied street
    // photograph appears again at the far end, beyond the playable space.
    r.add({x:0,y:-.13,z:-39,w:14,h:.25,d:112,color:[.65,.72,.61,1],tex:textures.ground});
    r.add({x:0,y:12,z:-105,w:75,h:42,d:1,quad:true,tex:textures.street,emissive:1});
    for(let side of[-1,1]){r.add({x:side*6.1,y:.07,z:-38,w:1.5,h:.25,d:111,color:[.4,.47,.39,1],tex:textures.wall});r.add({x:side*5.25,y:.015,z:-38,w:.08,h:.06,d:111,color:[.63,.67,.55,1]});
      for(let i=0;i<13;i++){const z=11-i*8,h=7.5+(i%3)*1.3,facade=side<0?.7:1;
        r.add({x:side*9,y:h/2,z,w:5,h,d:7.9,color:[.55*facade,.62*facade,.51*facade,1],tex:textures.wall});
        r.add({x:side*6.42,y:1.65,z,w:.09,h:3,d:5.8,color:[.7,.79,.68,1],tex:textures.shutter});
        r.add({x:side*6.36,y:3.6,z,w:.22,h:.65,d:6.2,color:[.8,.83,.71,1],tex:textures.signs[(i+(side>0?3:0))%8]});
        r.add({x:side*5.94,y:3.25,z,w:1.2,h:.17,d:6.3,rot:side*.05,color:i%2?[.18,.29,.23,1]:[.35,.33,.25,1]});
        for(let j of[-1,1]){r.add({x:side*6.4,y:5.6,z:z+j*1.9,w:.1,h:1.6,d:1.25,color:[.08,.16,.12,1]});r.add({x:side*6.31,y:5.6,z:z+j*1.9,w:.1,h:.06,d:1.3,color:[.4,.47,.35,1]});}
        r.add({x:side*6.32,y:2,z:z+3.6,w:.12,h:4,d:.17,color:[.25,.34,.25,1]});
        if(i%2===0){r.add({x:side*5.7,y:2.6,z:z-2.7,w:.09,h:5.2,d:.09,color:[.2,.27,.2,1]});r.add({x:side*5.1,y:5.15,z:z-2.7,w:1.3,h:.07,d:.09,color:[.3,.37,.26,1]});r.add({x:side*4.5,y:4.78,z:z-2.7,w:.32,h:.6,d:.32,color:[.77,.87,.55,1],emissive:1});r.add({x:side*4.5,y:5.1,z:z-2.7,w:.47,h:.08,d:.47,color:[.2,.28,.19,1]});r.add({x:side*4.5,y:4.44,z:z-2.7,w:.38,h:.07,d:.38,color:[.22,.3,.19,1]});}
        if(i%3===1){r.add({x:side*5.85,y:4.65,z:z+2.2,w:.9,h:2.2,d:.17,color:[.68,.76,.59,1],tex:textures.signs[i%8]});}
        if(i%3===0){const x=side*4.9,zz=z-1;r.add({x,y:.46,z:zz,w:.7,h:.9,d:.8,color:[.31,.35,.24,1],tex:textures.wall});obstacles.push({x,z:zz,r:.65});r.add({x:side*5.1,y:.18,z:z+1,w:.5,h:.35,d:.7,color:[.2,.25,.19,1]});}
      }
    }
    // Abandoned vending machines and road markings.
    for(let side of[-1,1]){const z=side<0?-9:-41;r.add({x:side*5.6,y:1.15,z,w:.9,h:2.3,d:.85,color:[.56,.63,.53,1]});r.add({x:side*5.6,y:1.45,z:z+.44,w:.7,h:1.1,d:.02,color:[.5,.78,.69,1],emissive:.9});for(let row=0;row<3;row++)for(let col=0;col<5;col++)r.add({x:side*5.6-.27+col*.13,y:1.14+row*.29,z:z+.46,w:.07,h:.19,d:.02,color:col%2?[.5,.44,.27,1]:[.32,.51,.45,1],emissive:.6});}
    for(let i=0;i<18;i++)r.add({x:0,y:.01,z:7-i*6,w:.065,h:.012,d:1.8,color:[.5,.52,.36,.35],transparent:true});
    for(let i=0;i<22;i++)r.add({x:rand(-4.5,4.5),y:.018,z:rand(-86,10),w:rand(.08,.28),h:.02,d:rand(.12,.35),rot:rand(0,6),color:[.37,.41,.32,1]});
  }
  function announce(title,small='',time=3){$('announcement-title').textContent=title;$('announcement-small').textContent=small;$('announcement').style.opacity='1';announcementTime=time;}
  function updateHUD(){updateEliteHUD();updateWeaponHUD();const stage=stages[wave-1]||stages[0];$('lives').textContent=lives;$('lives-bar').style.width=(lives/3*100)+'%';$('lives-bar').style.background=lives<=1?'#e5674e':'#c3d9b4';$('ammo').textContent=ammo;$('ammo').style.color=ammo===0?'#e5674e':'';$('ammo-status').textContent=reloading>0?'装填中…':ammo===0?'リロードしてください':feedbackClock>0?shotFeedback:'リロード弾薬は無制限';$('kills').textContent=pad(kills);$('wave-label').textContent=`STAGE ${pad(wave)} / 06`;$('stage-name').textContent=stage.name;$('enemies-label').textContent=`残り ${Math.max(0,stage.count-waveKills)} / ${stage.count} 体`;$('wave-progress').style.width=(waveKills/stage.count*100)+'%';}
  function applyStage(){const stage=stages[wave-1];renderer.setAtmosphere(stage);document.body.style.setProperty('--stage-accent',stage.accent);for(const o of renderer.objects){if(!o.originalColor)o.originalColor=o.color.slice();if(o.emissive>.5)o.color=[...stage.lamp,o.originalColor[3]];else if(o.h<.2&&o.y>3&&o.y<3.5)o.color=[...stage.awning,1];}}
  function beginStage(){state='playing';eliteIndex=Math.floor(rand(stages[wave-1].count*.3,stages[wave-1].count*.65));eliteNotice=0;eliteHUDKey='';recoil=0;feedbackClock=0;shotFeedback='';shotLines.length=0;blastRings.length=0;stageTime=0;ambienceClock=0;warningClock=0;blast=0;stageStartKills=kills;spawned=0;waveKills=0;spawnClock=1.4;if(wave>unlockedStage)weaponIndex=wave-1;unlockedStage=wave;magazines=weapons.map(w=>w.capacity);ammo=weapon().capacity;reloading=0;shotCooldown=0;flash=0;damage=0;hit=0;enemies.length=0;particles.length=0;player.x=0;player.z=wave>1?-12:7;yaw=0;pitch=0;clearInput();applyStage();setupBarrels();$('stage-tactic').textContent=tactics[wave-1][0];$('modal').classList.add('hidden');announce(`STAGE ${pad(wave)}`,`${stages[wave-1].name} · ${weapon().name}を装備`,4);tone('wave');updateHUD();updateCamera();saveRun();render();}
  function startWave(){if(wave>=stages.length)return;wave++;beginStage();}
  function showGame(){unlockSound();startedOnce=true;$('landing').classList.add('hidden');$('hud').classList.remove('hidden');$('pause').classList.remove('hidden');document.body.classList.add('playing');$('game-tip').style.opacity='1';$('game-tip').textContent='左右90°・振り向きで全周照準 / 赤いレーダー表示は危険';}
  function start(){if(!renderer||['loading','error','graphics-lost'].includes(state))return;lives=3;kills=0;wave=0;elapsed=0;weaponIndex=0;unlockedStage=1;showGame();startWave();}
  function resumeSaved(){if(!renderer||['loading','error','graphics-lost'].includes(state))return;if(!savedRun){start();return;}const r=savedRun;lives=r.lives;kills=r.kills;wave=r.stage;elapsed=r.elapsed;weaponIndex=r.weapon;unlockedStage=r.stage;showGame();beginStage();}
  function clearInput(){keys.clear();fireHeld=false;firePointer=null;fireAim=null;drag=null;joyPointer=null;joy.x=joy.y=0;$('stick').style.transform='';}
  function setupBarrels(){barrels.length=0;if(wave>=3)for(const [x,z] of [[-2.5,-6],[2.5,-23],[-2,-43],[2,-64]])barrels.push({x,z,used:false});}
  function enemyKind(index){if(index===eliteIndex)return 'elite';if(wave===1)return 'walker';if(wave===2)return index%2?'walker':'flanker';if(wave===3)return index%3?'walker':'runner';if(wave===4)return index%2?'walker':'armored';return ['flanker','runner','walker','armored'][index%4];}
  function spawnZombie(){
    const stage=stages[wave-1],kind=enemyKind(spawned),side=kind==='flanker'||(wave>=5&&spawned%3===0);
    let z=clamp(player.z-(side?rand(-8,8):rand(17,34)),-85,7),x=side?(spawned%2?-4.5:4.5):clamp(player.x+rand(-4.3,4.3),-4.4,4.4);
    if(wave===6&&spawned%5===4)z=clamp(player.z+rand(9,16),-85,9);
    if(Math.hypot(x-player.x,z-player.z)<7){z=clamp(player.z>-35?player.z-12:player.z+12,-85,9);x=clamp(player.x+rand(-3,3),-4.4,4.4);}
    const elite=kind==='elite',maxHp=elite?eliteStats().hp:kind==='armored'?4:2;enemies.push({x,z,kind,hp:maxHp,maxHp,speed:stage.speed+(elite?eliteStats().speedBonus:0)+rand(0,.10),phase:rand(0,7),cycle:0,charging:false,hit:0,dead:0});spawned++;if(elite){tone('warning');updateEliteHUD();}
  }
  function damageEnemy(e,amount){if(e.dead)return;e.hp-=amount;e.hit=.15;hit=.18;if(e.hp<=0){e.dead=.01;kills++;waveKills++;if(e.kind==='elite'){eliteNotice=2.5;tone('reward');}}if(e.kind==='elite')updateEliteHUD();}
  function detonate(barrel){
    if(barrel.used)return;barrel.used=true;blast=.45;tone('blast');
    for(const e of enemies)if(!e.dead&&Math.hypot(e.x-barrel.x,e.z-barrel.z)<4.5)damageEnemy(e,10);
    // Barrels are tactical: lure enemies close, then leave the blast zone.
    if(Math.hypot(player.x-barrel.x,player.z-barrel.z)<2.4){loseLife();return;}
    if(waveKills===stages[wave-1].count)clearStage();
  }
  function updateThreats(){
    const radar=$('radar'),marks=[];let closest=Infinity;
    for(const e of enemies){if(e.dead)continue;const dx=e.x-player.x,dz=e.z-player.z,dist=Math.hypot(dx,dz);closest=Math.min(closest,dist);if(dist>24)continue;const right=dx*Math.cos(yaw)-dz*Math.sin(yaw),forward=-dx*Math.sin(yaw)-dz*Math.cos(yaw),scale=Math.min(1,dist/24)*29;const angle=Math.atan2(right,forward);marks.push('<i style="left:'+ (36+Math.sin(angle)*scale)+'px;top:'+(36-Math.cos(angle)*scale)+'px;background:'+(dist<7?'#ff7059':e.kind==='elite'?'#ff7bb5':e.kind==='armored'?'#edbd69':'#bdcdb0')+'"></i>');}
    radar.innerHTML='<span>▲</span>'+marks.join('');$('threat-label').textContent=closest<7?'接近 '+closest.toFixed(1)+'m':closest<24?'敵影 '+closest.toFixed(0)+'m':'周囲を警戒';
    radar.classList.toggle('urgent',closest<7);
    if(closest<7&&warningClock<=0){tone('warning');warningClock=3;}
  }
  function shoot(){
    if(state!=='playing'||shotCooldown>0||reloading>0)return;if(ammo<=0){reload();return;}
    const w=weapon();ammo--;magazines[weaponIndex]=ammo;shotCooldown=w.interval;flash=.1;tone(w.sound);
    let barrelTarget=null,barrelDepth=Infinity;
    for(const b of barrels){if(b.used||Math.hypot(b.x-player.x,b.z-player.z)>w.range)continue;const p=renderer.project(b.x,.6,b.z),top=renderer.project(b.x,1.2,b.z),bottom=renderer.project(b.x,0,b.z),half=Math.abs(top.y-bottom.y)/2;if(p.w>0&&Math.abs(p.x)<half*.7+.01&&Math.abs(p.y)<half+.02&&p.w<barrelDepth){barrelTarget=b;barrelDepth=p.w;}}
    const candidates=[];
    for(const e of enemies){if(e.dead||Math.hypot(e.x-player.x,e.z-player.z)>w.range)continue;const p=renderer.project(e.x,1.22,e.z),head=renderer.project(e.x,2.25,e.z),foot=renderer.project(e.x,.06,e.z);if(p.w<=0||p.w>=barrelDepth)continue;const halfH=Math.abs(head.y-foot.y)*.5,halfW=halfH*.52+.012+(w.cone||0),centerY=(head.y+foot.y)/2;if(Math.abs(p.x)<halfW&&Math.abs(centerY)<halfH+.025)candidates.push({e,depth:p.w});}
    candidates.sort((a,b)=>a.depth-b.depth);
    const targets=candidates.slice(0,w.targets);emitShot((w.pierce?targets[targets.length-1]:targets[0])?.e||barrelTarget);let hitCount=targets.length;
    if(barrelTarget&&(!targets.length||(w.pierce&&targets.length<w.targets)))detonate(barrelTarget);
    if(state!=='playing'){updateHUD();return;}
    if(w.splash&&targets.length){const center=targets[0].e;blast=.35;tone('blast');hitCount=0;for(const e of enemies)if(!e.dead&&Math.hypot(e.x-center.x,e.z-center.z)<=w.splash){damageEnemy(e,w.damage);hitCount++;}blastRings.push({x:center.x,z:center.z,radius:w.splash,life:.5});}
    else for(const {e} of targets){const headshot=Math.abs(renderer.project(e.x,2,e.z).y)<.11;damageEnemy(e,headshot?w.head:w.damage);}
    if(targets.length){tone('hit');const target=targets[0].e;for(let i=0;i<(renderer.mobile?3:5);i++)particles.push({x:target.x,y:1.3,z:target.z,vx:rand(-1.4,1.4),vy:rand(.3,1.8),vz:rand(-1,1),life:.35});}
    shotFeedback=hitCount>0?shotStyles[weaponIndex].label+' · '+hitCount+'体命中':shotStyles[weaponIndex].label+' · 射程'+w.range+'m';feedbackClock=.8;
    if(waveKills===stages[wave-1].count)clearStage();
    if(ammo===0&&state==='playing')reload();updateHUD();
  }
  function reload(){if(state!=='playing'||reloading>0||ammo===weapon().capacity)return;reloading=weapon().reload;tone('reload');updateHUD();}
  function clearStage(){clearInput();render();if(wave===stages.length){finish(true);return;}state='stage-clear';saveRun(wave+1);tone('reward');const next=stages[wave];showModal('STAGE CLEAR',`STAGE ${pad(wave)} 突破。`,`<p>${stages[wave-1].name}の${stages[wave-1].count}体を撃破。<br>残機 ${lives} / 3 を引き継いで次の商店街へ。</p>${weaponCard(wave,true)}<div class="next-stage" style="--preview-accent:${next.accent}"><small>NEXT / STAGE ${pad(wave+1)}</small><strong>${next.name}</strong><span>ゾンビ ${next.count}体 · ${tactics[wave][0]}</span><p>${tactics[wave][1]}</p></div>`,'新武器を装備して次へ',startWave,true);}
  function retryStage(){if(state!=='caught')return;kills=stageStartKills;beginStage();}
  function loseLife(){if(state!=='playing')return;lives--;damage=.7;clearInput();tone('hurt');updateHUD();saveRun();render();if(lives===0){finish(false);return;}state='caught';showModal('CONTACT — LIFE LOST','接触した。',`<p>ゾンビに触れると、その挑戦は終了。<br>残機は <strong class="life-count">${lives} / 3</strong>。<br>STAGE ${pad(wave)}「${stages[wave-1].name}」の最初から再挑戦。</p><p class="warning">このステージの撃破数と弾倉をリセット。<br>あと${lives}回やられたら、ステージ1へ戻る。</p>`,'同じステージに再挑戦',retryStage,true);}
  function finish(win){state=win?'win':'gameover';clearInput();clearSavedRun();if(kills>best){best=kills;try{localStorage.setItem('dead-signal-best',String(best));}catch{}}showModal(win?'SIGNAL RESTORED':'GAME OVER',win?'夜明けは、来た。':'残機を使い切った。',`<p>${win?'6つの商店街、全270体を突破。<br>霧の向こうから、救助の無線が聞こえる。':'3回接触したため、この探索は終了。<br>ステージ1から、もう一度出発しよう。'}</p><div class="result-stats"><div><span>${pad(kills)}</span><small>ELIMINATED / ${totalZombies}</small></div><div><span>${Math.floor(elapsed/60)}:${pad(Math.floor(elapsed%60))}</span><small>SURVIVAL TIME</small></div><div><span>${pad(best)}</span><small>BEST</small></div></div>`,'ステージ1から始める',start,true);}
  function showModal(eyebrow,title,body,label,action,secondary=false){$('modal-eyebrow').textContent=eyebrow;$('modal-title').textContent=title;$('modal-body').innerHTML=body;$('modal-button-label').textContent=label;$('modal-primary').onclick=action;$('modal-secondary').classList.toggle('hidden',!secondary);$('modal').classList.remove('hidden');$('modal-primary').focus({preventScroll:true});document.querySelector('.modal-card').scrollTop=0;}
  function closeModal(){if(state==='graphics-lost')return;unlockSound();if(state==='paused'){state=previousState;clearInput();}$('modal').classList.add('hidden');}
  function pause(){if(state==='sound-settings'){closeSoundSettings();return;}if(state==='arsenal'){closeArsenal();return;}if(state==='playing'){previousState='playing';state='paused';clearInput();if(sound)sound.stop();saveRun();showModal('TRANSMISSION PAUSED','ひと息、つこう。','<p>ゲームは一時停止中。<br>このまま戻れば、その場から再開。<br>再読み込み後は、記録したステージの最初から。</p>','ゲームに戻る',closeModal,true);}else if(state==='paused')closeModal();}
  function goMenu(){if(sound)sound.stop();state='menu';clearInput();document.body.classList.remove('playing');$('landing').classList.remove('hidden');$('hud').classList.add('hidden');$('pause').classList.add('hidden');$('modal').classList.add('hidden');}
  function help(){if(!['menu','playing','paused'].includes(state))return;if(state==='playing'){previousState='playing';state='paused';clearInput();}const touch=matchMedia('(pointer:coarse)').matches;showModal('FIELD MANUAL','触れられずに、進め。',`<p>全6ステージ、計270体。接触で即1ミス。<br>残機3回を使い切るとステージ1からやり直し。<br>残機があれば同じステージの最初から再挑戦。</p><div class="control-row"><span>移動</span><b>${touch?'左下のスティック':'W A S D / 矢印キー'}</b></div><div class="control-row"><span>視点・照準</span><b>${touch?'右スワイプ / 左右90°・振り向き':'ドラッグ / Q・Eで90° / Xで背後'}</b></div><div class="control-row"><span>射撃</span><b>${touch?'FIREボタンを長押し':'SPACE / 画面をクリック'}</b></div><div class="control-row"><span>リロード / 一時停止</span><b>${touch?'⟳ / Ⅱ ボタン':'R / ESC'}</b></div><p>ステージ突破で新武器を獲得。装弾数・威力は武器ごとに変化。<br>画面右の武器ボタン / PCは数字1〜6で切り替え。<br>ショットガンは近距離、ライフルは貫通、グレネードは範囲攻撃。<br>各面に1体だけ強化個体が混ざる。ピンク色の大柄な敵で、体力バー付き。<br>体力は面ごとに6・10・14・18・22・26へ増え、移動も速くなる。<br>2面は回り込み、3面は赤い敵の突進、4面はHP4の耐久型。<br>5・6面は混成。3面以降の赤いドラム缶は射撃で爆発。<br>半径4.5mの敵を倒すが、自分も2.4m以内なら1ミス。<br>左のレーダーは上が前方。赤い点は7m以内の敵。<br>音は開始時に有効。右上の音声設定で音量調整・テスト再生。全6面計270体。</p>`,'了解した',closeModal);}
  function movePlayer(dx,dz){const nextX=clamp(player.x+dx,-4.6,4.6),nextZ=clamp(player.z+dz,-82,10);if(!obstacles.some(o=>Math.hypot(nextX-o.x,player.z-o.z)<o.r+.25))player.x=nextX;if(!obstacles.some(o=>Math.hypot(player.x-o.x,nextZ-o.z)<o.r+.25))player.z=nextZ;}
  function updateCamera(){const back=[Math.sin(yaw),Math.cos(yaw)],height=3.05+pitch+recoil;renderer.camera=[clamp(player.x+back[0]*4.6,-5.15,5.15),height,player.z+back[1]*4.6];renderer.target=[player.x-back[0]*13,1.1+pitch*3+recoil*2.5,player.z-back[1]*13];}
  function update(dt){if(state!=='playing')return;elapsed+=dt;stageTime+=dt;eliteNotice=Math.max(0,eliteNotice-dt);updateEliteHUD();recoil*=Math.exp(-dt*14);if(feedbackClock>0){feedbackClock-=dt;if(feedbackClock<=0)updateHUD();}for(let i=shotLines.length-1;i>=0;i--){shotLines[i].life-=dt;if(shotLines[i].life<=0)shotLines.splice(i,1);}for(let i=blastRings.length-1;i>=0;i--){blastRings[i].life-=dt;if(blastRings[i].life<=0)blastRings.splice(i,1);}warningClock-=dt;ambienceClock-=dt;blast=Math.max(0,blast-dt);if(ambienceClock<=0){tone('ambience');ambienceClock=2.4;}shotCooldown=Math.max(0,shotCooldown-dt);flash=Math.max(0,flash-dt);damage=Math.max(0,damage-dt);hit=Math.max(0,hit-dt);announcementTime-=dt;if(announcementTime<=0)$('announcement').style.opacity='0';if(elapsed>10)$('game-tip').style.opacity='0';
    if(reloading>0){reloading-=dt;if(reloading<=0){reloading=0;ammo=weapon().capacity;magazines[weaponIndex]=ammo;updateHUD();}}
    let mx=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),mz=joy.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);const len=Math.max(1,Math.hypot(mx,mz));mx/=len;mz/=len;if(keys.has('KeyZ'))yaw+=dt*2.2;if(keys.has('KeyC'))yaw-=dt*2.2;const speed=3.1*dt;movePlayer((mx*Math.cos(yaw)+mz*Math.sin(yaw))*speed,(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*speed);updateCamera();if(enemies.some(e=>!e.dead&&Math.hypot(player.x-e.x,player.z-e.z)<=1.05)){loseLife();return;}if(fireHeld||keys.has('Space'))shoot();
    if(state!=='playing')return;
    const stage=stages[wave-1],active=enemies.reduce((n,e)=>n+!e.dead,0),activeLimit=renderer.mobile?10:14;
    if(spawned<stage.count&&active<activeLimit){spawnClock-=dt;if(spawnClock<=0){spawnZombie();spawnClock=stage.interval;}}
    for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.hit=Math.max(0,e.hit-dt);if(e.dead){e.dead+=dt;if(e.dead>1)enemies.splice(i,1);continue;}let dx=player.x-e.x,dz=player.z-e.z,dist=Math.hypot(dx,dz);if(dist<=1.05){loseLife();return;}e.phase+=dt*4*(e.speed/.78);let vx=dx/dist,vz=dz/dist;for(const other of enemies){if(other===e||other.dead)continue;const ox=e.x-other.x,oz=e.z-other.z,od=Math.hypot(ox,oz);if(od<.8&&od>.01){vx+=ox/od*(.8-od);vz+=oz/od*(.8-od);}}let factor=e.kind==='elite'?eliteStats().multiplier:e.kind==='armored'?.65:1;e.cycle=(e.cycle||0)+dt;
      if(e.kind==='flanker'){const weave=Math.sin(e.phase*.6)*.7;vx+=(-dz/dist)*weave;vz+=(dx/dist)*weave;}
      if(e.kind==='runner'){const cycle=e.cycle%5,wasCharging=e.charging;e.charging=cycle>=2.6&&cycle<3.4;if(e.charging&&!wasCharging){e.chargeX=dx/dist;e.chargeZ=dz/dist;}const rushing=cycle>=3.4&&cycle<4.2;factor=e.charging?.15:rushing?2.5:.8;if(rushing){vx=e.chargeX??dx/dist;vz=e.chargeZ??dz/dist;}}
      const movement=Math.max(1,Math.hypot(vx,vz));e.x=clamp(e.x+vx/movement*e.speed*factor*dt,-4.8,4.8);e.z=clamp(e.z+vz/movement*e.speed*factor*dt,-86,11);if(Math.hypot(player.x-e.x,player.z-e.z)<=1.05){loseLife();return;}}
    updateThreats();
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*4;}
  }
  function render(){if(!renderer)return;const objects=[],r=renderer;const shadow=(x,z,w=1.5)=>{const o=r.object({x,y:.03,z,w,h:w*.65,d:1,quad:true,tex:textures.shadow,transparent:true}); // Ground plane rotation is drawn with a thin box for a stable mobile path.
      o.quad=false;o.h=.012;o.d=w*.65;o.tex=textures.shadow;o.color=[.18,.23,.18,.35];objects.push(o);};
    if(startedOnce&&state!=='menu'){for(const b of barrels){if(b.used)continue;objects.push(r.object({x:b.x,y:.6,z:b.z,w:.72,h:1.2,d:.72,color:[.65,.12,.055,1],emissive:.3}));objects.push(r.object({x:b.x,y:.72,z:b.z,w:.76,h:.14,d:.76,color:[1,.6,.12,1],emissive:.7}));}shadow(player.x,player.z,1);const bob=(Math.abs(joy.x)+Math.abs(joy.y)+Number(keys.has('KeyW'))+Number(keys.has('KeyS')))>0?Math.sin(elapsed*10)*.035:0;objects.push(r.object({x:player.x-.25*Math.cos(yaw),y:.96+bob,z:player.z+.25*Math.sin(yaw),w:.92,h:1.95,d:1,quad:true,tex:textures.player,rot:yaw,transparent:true,emissive:.38}));
      const held=weapon(),model=shotStyles[weaponIndex],long=weaponIndex>=2;const gx=player.x+.32*Math.cos(yaw)-.48*Math.sin(yaw),gz=player.z-.32*Math.sin(yaw)-.48*Math.cos(yaw);
      objects.push(r.object({x:gx,y:1.18,z:gz,w:model.body,h:model.body,d:model.length,rot:yaw,color:[.2,.24,.22,1]}));
      if(weaponIndex>0)objects.push(r.object({x:gx,y:1.23,z:gz,w:.13,h:.035,d:long?.55:.27,rot:yaw,color:[...rgb(held.color),1],emissive:.8}));
      for(const e of enemies){shadow(e.x,e.z);const dead=e.dead>0,drop=dead?e.dead*1.8:0;const dy=dead?0:Math.sin(e.phase)*.035;const rot=Math.atan2(r.camera[0]-e.x,r.camera[2]-e.z);objects.push(r.object({x:e.x,y:1.19+dy-drop,z:e.z,w:e.kind==='elite'?1.95:e.kind==='armored'?1.8:1.52,h:2.4*(dead?1-e.dead*.25:1),d:1,quad:true,tex:textures.zombie,rot:rot+Math.sin(e.phase*.5)*.018,color:e.hit>0?[1,.55,.4,dead?1-e.dead:1]:[...(e.kind==='elite'?[1,.38,.5]:e.charging?[1,.3,.16]:e.kind==='runner'?[1,.6,.5]:e.kind==='armored'?[1,.84,.42]:e.kind==='flanker'?[.55,.85,1]:[.93,1,.92]),dead?1-e.dead:1],transparent:true,emissive:.7,gray:(e.kind==='elite'||e.hit>0)?0:((e.kind==='walker'||!e.kind)?0.72:0.3),lift:e.kind==='elite'?0.02:((r.mobile||window.innerWidth<=760)?0.1:0.065)}));
        if(e.kind==='elite'&&!dead){const ratio=Math.max(0,e.hp/e.maxHp);objects.push(r.object({x:e.x,y:2.66,z:e.z,w:1.65,h:.12,d:1,quad:true,rot,color:[.08,.025,.04,1],emissive:1,transparent:true}));objects.push(r.object({x:e.x+.05*Math.sin(rot)-.75*(1-ratio)*Math.cos(rot),y:2.66,z:e.z+.05*Math.cos(rot)+.75*(1-ratio)*Math.sin(rot),w:Math.max(.01,1.5*ratio),h:.065,d:1,quad:true,rot,color:[1,.24,.43,1],emissive:1,transparent:true}));}
      }
      for(const p of particles)objects.push(r.object({x:p.x,y:p.y,z:p.z,w:.04,h:.04,d:.04,color:[.55,.19,.13,p.life*2],transparent:true}));
    }else{r.camera=[.4,2.5,12];r.target=[0,2,-30];}
    paintShotEffects(objects);r.flash=Math.max(flash>0?flash*8:0,blast*2);r.render(objects);$('damage-flash').style.opacity=String(damage);$('muzzle-flash').style.opacity=String(flash*5);$('hitmarker').style.opacity=hit>0?'1':'0';$('crosshair').style.transform=`translate(-50%,-50%) scale(${1+recoil*4})`;
  }
  function renderDue(t){if(!renderer.mobile){lastRender=t;return true;}const interval=1000/30,delta=t-lastRender;if(delta<interval)return false;lastRender=t-(delta%interval);return true;}
  function frame(t){const dt=Math.min((t-lastTime)/1000||0,.05);lastTime=t;update(dt);if(state==='playing'&&renderDue(t))render();raf=requestAnimationFrame(frame);}

  $('start').addEventListener('click',()=>savedRun?resumeSaved():start());$('new-run').addEventListener('click',start);$('help').addEventListener('click',help);$('pause').addEventListener('click',pause);$('reload').addEventListener('click',reload);$('weapon-switch').addEventListener('click',openArsenal);$('modal-secondary').addEventListener('click',goMenu);
  $('sound').addEventListener('click',openSoundSettings);document.addEventListener('pointerdown',()=>{if(sound&&sound.enabled)unlockSound();});
  $('turn-left').addEventListener('click',()=>rotatePlayer(Math.PI/2));$('turn-right').addEventListener('click',()=>rotatePlayer(-Math.PI/2));$('turn-back').addEventListener('click',()=>rotatePlayer(Math.PI));
  for(const id of ['start','new-run','fire','modal-primary'])$(id).addEventListener('pointerdown',unlockSound);
  document.addEventListener('keydown',e=>{if(sound&&sound.enabled)unlockSound();if(state==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){pause();return;}if(state!=='playing')return;keys.add(e.code);if(!e.repeat){if(e.code==='KeyQ')rotatePlayer(Math.PI/2);if(e.code==='KeyE')rotatePlayer(-Math.PI/2);if(e.code==='KeyX')rotatePlayer(Math.PI);}if(e.code==='KeyR')reload();if(!e.repeat&&/^Digit[1-6]$/.test(e.code))equipWeapon(Number(e.code.slice(-1))-1);if(!e.repeat&&e.code==='KeyF')openArsenal();});document.addEventListener('keyup',e=>keys.delete(e.code));
  function joyMove(e){if(e.pointerId!==joyPointer)return;const rect=$('joystick').getBoundingClientRect(),max=rect.width*.32;let x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;const l=Math.hypot(x,y);if(l>max){x=x/l*max;y=y/l*max;}joy.x=x/max;joy.y=y/max;$('stick').style.transform=`translate(${x}px,${y}px)`;}
  // Each control belongs to the pointer that started it. Extra fingers must not
  // steal a stick/aim drag or release a different finger's held fire button.
  $('joystick').addEventListener('pointerdown',e=>{if(state!=='playing'||joyPointer!==null||e.button>0)return;e.preventDefault();joyPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joyMove(e);});$('joystick').addEventListener('pointermove',joyMove);const joyEnd=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;joy.x=joy.y=0;$('stick').style.transform='';};for(const ev of['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(ev,joyEnd);
  $('fire').addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing'||firePointer!==null||e.button>0)return;firePointer=e.pointerId;fireAim={x:e.clientX,y:e.clientY};$('fire').setPointerCapture(e.pointerId);fireHeld=true;shoot();});$('fire').addEventListener('pointermove',e=>{if(e.pointerId!==firePointer||!fireAim||state!=='playing')return;yaw-=(e.clientX-fireAim.x)*.008;pitch=clamp(pitch-(e.clientY-fireAim.y)*.007,-.65,.75);fireAim={x:e.clientX,y:e.clientY};updateCamera();});for(const ev of['pointerup','pointercancel','lostpointercapture'])$('fire').addEventListener(ev,e=>{if(e.pointerId!==firePointer)return;firePointer=null;fireAim=null;fireHeld=false;});
  // HUD's empty areas pass through to the canvas. Dragging aims, tapping fires.
  function lookStart(e){if(state!=='playing'||drag!==null||e.button>0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,target:e.currentTarget};e.currentTarget.setPointerCapture(e.pointerId);}
  function lookMove(e){if(!drag||drag.id!==e.pointerId||state!=='playing')return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;yaw-=dx*.008;pitch=clamp(pitch-dy*.007,-.65,.75);drag.x=e.clientX;drag.y=e.clientY;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;updateCamera();}
  function lookEnd(e){if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&e.type==='pointerup')shoot();drag=null;}
  for(const el of[$('world'),$('look-zone')]){el.addEventListener('pointerdown',lookStart);el.addEventListener('pointermove',lookMove);for(const ev of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,lookEnd);el.addEventListener('contextmenu',e=>e.preventDefault());}
  window.addEventListener('blur',()=>{if(state==='playing')pause();clearInput();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});window.addEventListener('resize',()=>{clearInput();if(renderer)renderer.resize();});
  window.addEventListener('pagehide',()=>{if(state==='playing')pause();else if(state==='paused')saveRun();clearInput();});
  $('world').addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);if(state==='playing'||state==='paused')saveRun();state='graphics-lost';clearInput();showModal('GRAPHICS INTERRUPTED','描画が中断された。','<p>ブラウザの描画機能が中断されました。<br>再読み込み後、「つづきから」で記録した<br>ステージの最初から再開できます。</p>','再読み込み',()=>location.reload());});
  async function init(){try{renderer=new DSEngine.Renderer($('world'));const results=await Promise.all([image('assets/street.jpeg'),image('assets/survivor.jpeg'),image('assets/zombie.jpeg')]);if(state==='graphics-lost')return;[assets.street,assets.survivor,assets.zombie]=results;setupScene();state='menu';$('start').disabled=false;if(sound)sound.status();updateResumeUI();requestAnimationFrame(frame);}catch(e){if(state==='graphics-lost')return;state='error';$('start-label').textContent='再読み込み';$('start').disabled=false;$('start').onclick=()=>location.reload();$('load-error').textContent=e.message;console.error(e);}}
  init();
})();
