
/* ===================== LOCATION MODULE ===================== */
/* Approximate area centres & ground positions (sample data around Jaipur) */
const AREA={'Jaipur':[26.9124,75.7873],'Malviya Nagar':[26.8533,75.8113],'Mansarovar':[26.8560,75.7625],'Jagatpura':[26.8330,75.8650],'Vaishali Nagar':[26.9125,75.7425],'C-Scheme':[26.9065,75.8000],'Pratap Nagar':[26.7960,75.8230],'Raja Park':[26.9030,75.8330],'Tonk Road':[26.8680,75.7950],'JLN Marg':[26.8780,75.8030]};
const GC={g1:[26.9060,75.8040],g2:[26.8830,75.8120],g3:[26.8770,75.8000],g4:[26.8580,75.7600],g5:[26.8650,75.7960],g6:[26.8310,75.8700],g7:[26.9100,75.7440],g8:[26.8540,75.7690],g9:[26.8710,75.7940],g10:[26.9140,75.7400]};
const AV={p1:1,p2:0,p3:2,p4:1,p5:0,p6:2,p7:0,p8:1,p9:0,p10:2},AVL=['Available now','Available today','Available this week'];
const hh=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
/* privacy: players are only ever placed at their AREA centre + a ~400 m deterministic blur */
PLAYERS.forEach(p=>{const a=AREA[p.loc],h=hh(p.id);p.av=AV[p.id];p.k0=p.km;p.pos=[a[0]+((h%80)-40)/1e4,a[1]+(((h>>8)%80)-40)/1e4]});
GROUNDS.forEach(g=>{g.pos=GC[g.id];g.k0=g.km});
const G0=[...GROUNDS],P0=PLAYERS;
let LOC=null,MAPS=[],MS={},GSEL='g1',GD=day(0),N={r:5,sport:'',skill:'',av:'',mode:'both'};
try{GSEL=sessionStorage.getItem('sc_g')||'g1'}catch(e){}

/* ---- distance utility (haversine) ---- */
function distKm(a,b){const R=6371,r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]),h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const km1=k=>(Math.round(k*10)/10).toFixed(1);
function setLoc(pos,label,src){LOC={pos,label,src,far:distKm(pos,AREA.Jaipur)>60};if(window.onLocSet)onLocSet(pos);GROUNDS.forEach(x=>x.km=+km1(distKm(pos,x.pos)))}
function clearLoc(){LOC=null;GROUNDS.forEach(x=>x.km=x.k0);try{localStorage.removeItem('sc_manual')}catch(e){}toast('Location cleared');render()}
try{const a=localStorage.getItem('sc_manual');if(a&&AREA[a])setLoc(AREA[a],a,'manual')}catch(e){}

/* ---- reusable components ---- */
const DistanceBadge=k=>LOC?`<span class="badge g dist">📍 ${km1(k)} km away</span>`:'';
const LocationButton=(t='Near Me',c='btn')=>`<button class="${c}" onclick="nearMe()">📍 ${t}</button>`;
const GetDirectionsButton=(g,c='btn sec sm')=>g.address?`<button class="${c}" onclick="directions('${g.id}')">🧭 Get Directions</button>`:(g.sports?'<span class="mut" style="font-size:13px">📍 Location needs verification</span>':'');
function directions(id){const g=GROUNDS.find(x=>x.id===id);if(!g||!g.address)return;
 // Verified street address as the destination text — Google resolves this to the exact venue, never a hashed/guessed coordinate.
 window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.name+', '+g.address)}`,'_blank','noopener')}
const LocationPermission=()=>`<div style="text-align:center"><div style="font-size:48px">📍</div><h2 class="brand">SPORTS CONNECT wants to access your location.</h2><p class="mut" style="margin:8px 0 16px">Used only for distances, nearby discovery, map position and directions. Other users never see your exact location.</p><div class="row"><button class="btn sec full" onclick="manualPicker('No problem — pick your area instead.')">Not Now</button><button class="btn full" onclick="allowLoc()">Allow Location</button></div></div>`;
const ERR={0:'Your browser does not support location.',1:'Location permission was denied.',2:'Your location is unavailable right now.',3:'Getting your location took too long.'};
const mpL=q=>Object.keys(AREA).filter(a=>a.toLowerCase().includes(q.toLowerCase())).map(a=>`<button class="btn sec sm" onclick="pickArea('${a}')">${a==='Jaipur'?'🏙️':'📍'} ${a}</button>`).join('')||'<span class="mut">No match</span>';
function manualPicker(msg){openModal(`<h2 class="brand">Enter your location</h2>${msg?`<p class="mut">${esc(msg)}</p>`:''}<input placeholder="🔍 Search area, e.g. Malviya Nagar" oninput="$('#mpl').innerHTML=mpL(this.value)" style="margin-top:12px"><div id="mpl" class="row wp" style="margin-top:12px">${mpL('')}</div><button class="btn sec full" style="margin-top:16px" onclick="closeModal()">Close</button>`)}
function pickArea(a){setLoc(AREA[a],a,'manual');try{localStorage.setItem('sc_manual',a)}catch(e){}closeModal();toast('Showing results near '+a);afterLoc()}
function askLocation(){openModal(LocationPermission())}
function allowLoc(){if(!('geolocation' in navigator))return manualPicker(ERR[0]+' Pick your area instead.');
 openModal('<div style="text-align:center;padding:20px"><div style="font-size:40px">📡</div><b>Finding your location…</b></div>');
 navigator.geolocation.getCurrentPosition(p=>{setLoc([p.coords.latitude,p.coords.longitude],'your location','gps');closeModal();toast(LOC.far?'Location found (demo data is around Jaipur)':'Location updated');afterLoc()},
 e=>manualPicker((ERR[e.code]||'Something went wrong.')+' Pick your area instead — everything still works without GPS.'),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})}
const updateLoc=allowLoc;
function nearMe(){if(LOC&&LOC.src==='gps')return afterLoc();askLocation()}
function afterLoc(){const v=location.hash.slice(1)||'home';
 if(v==='grounds'){F.g.sort='near';render()}else if(v==='players'){F.p.sort='near';render()}else if(v==='ground'||v==='nearby')render();else go('nearby')}

/* ---- map ---- */
const ico=(c,h)=>L.divIcon({className:'',html:`<div class="mk ${c}">${h}</div>`,iconSize:c==='u'?[34,34]:[34,34],iconAnchor:[17,17],popupAnchor:[0,-16]});
const gPopup=g=>`<div class="pop"><b>${esc(g.name)}</b><div>${(g.sports||[g.sport]).map(x=>(SP[x]||'')+' '+x).join(', ')}</div><div class="row">${typeof venueActions==='function'?venueActions(g,true):''}${GetDirectionsButton(g)}</div></div>`;
const pPopup=p=>`<div class="pop"><b>${esc(p.name)}</b><div>${SP[p.sport]||''} ${p.sport} · ${p.skill}</div><div>📍 ${LOC?`~${km1(p.km)} km away · `:''}Near ${p.loc}</div><div class="row"><button class="btn sm" onclick="viewProfile('${p.id}')">View Profile</button></div></div>`;
function MapView(id,o,h=380){MS[id]=o;return `<div class="mapbox"><div class="scmap" id="${id}" style="height:${h}px"></div></div>`}
function mountMaps(){MAPS=MAPS.filter(m=>document.body.contains(m.getContainer())||(m.remove(),false));
 document.querySelectorAll('.scmap:not([data-m])').forEach(el=>{el.dataset.m=1;const o=MS[el.id]||{};
  if(!window.L){el.innerHTML='<div class="mapfail">The interactive map needs an internet connection to load. Distances and lists still work.</div>';return}
  const m=L.map(el,{scrollWheelZoom:false}).setView(LOC?LOC.pos:AREA.Jaipur,12),pts=[];m.once('click',()=>m.scrollWheelZoom.enable());
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
  (o.grounds||[]).forEach(g=>{L.marker(g.pos,{icon:ico('g','🏟️'),title:g.name}).addTo(m).bindPopup(gPopup(g));pts.push(g.pos)});
  (o.players||[]).filter(p=>p.pos).forEach(p=>{L.marker(p.pos,{icon:ico('p','👤'),title:p.name}).addTo(m).bindPopup(pPopup(p));pts.push(p.pos)});
  if(LOC){L.marker(LOC.pos,{icon:ico('u',''),zIndexOffset:900}).addTo(m).bindPopup('<b>You are here 📍</b>');pts.push(LOC.pos);
   if(o.radius)L.circle(LOC.pos,{radius:o.radius*1000,color:'#059669',weight:1,fillOpacity:.05}).addTo(m)}
  if(pts.length>1)m.fitBounds(pts,{padding:[30,30],maxZoom:15});else if(pts.length)m.setView(pts[0],15);
  setTimeout(()=>m.invalidateSize(),250);MAPS.push(m)})}

/* ---- ground details ---- */
function openGround(id){GSEL=id;try{sessionStorage.setItem('sc_g',id)}catch(e){}closeModal();go('ground')}
const bdg=(a,c='')=>a.map(x=>`<span class="badge ${c}">${x}</span>`).join('');
views.ground=()=>{const g=GROUNDS.find(x=>x.id===GSEL)||GROUNDS[0];if(!g||!g.sports)return `<div class="pg">${empty('Loading…','One moment.')}</div>`;
 const free=typeof isFree==='function'&&isFree(g);
 return `<div class="pg"><a class="mut" style="cursor:pointer" onclick="go('grounds')">← All grounds</a><div class="card" style="margin-top:10px"><div class="pad">
 <div class="row sb wp"><h2 class="brand">${esc(g.name)}</h2>${free?'<span class="badge g">FREE</span>':''}</div>
 <div>${bdg(g.sports.map(x=>(SP[x]||'')+' '+x),'g')}</div>${g.phone?`<p class="mut" style="margin-top:8px">Contact: ${g.phone}</p>`:''}
 <h3 style="margin:18px 0 8px">📍 Location</h3><p class="mut" style="margin-bottom:8px">${esc(g.loc)}, Jaipur</p>${MapView('gm_'+g.id,{grounds:[g]},260)}
 <div class="row wp" style="margin:12px 0">${GetDirectionsButton(g)}</div>
 <div style="margin-top:16px">${typeof venueActions==='function'?venueActions(g):''}</div></div></div></div>`};

/* ---- list wrappers (Near Me sorting, details button, real distance) ---- */
const _lg=LIST.g;LIST.g=()=>{GROUNDS.splice(0,GROUNDS.length,...(F.g.sort==='near'&&LOC?[...G0].sort((a,b)=>a.km-b.km):G0));
 return _lg().replace(/(<button class="btn" onclick="bookGround\('(g\d+)'\)">Book Ground<\/button>)/g,`<span class="row"><button class="btn sec" onclick="openGround('$2')">Details</button>$1</span>`)
  .replace(/· ([\d.]+) km away <span class="tag">sample<\/span>/g,(m,k)=>`· ${k} km away${LOC?'':' <span class="tag">sample</span>'}`)};
const _lp=LIST.p;LIST.p=()=>{PLAYERS.splice(0,PLAYERS.length,...(F.p.sort==='near'&&LOC?[...P0].sort((a,b)=>a.km-b.km):P0));return _lp()};
const nmBar=k=>`<div class="row wp" style="margin-bottom:12px">${LocationButton('Near Me')}${F[k].sort==='near'&&LOC?`<span class="badge g">Sorted nearest first · ${esc(LOC.label)}</span><button class="btn sec sm" onclick="F['${k}'].sort='';render()">Reset order</button><button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button>`:''}</div><div class="grid" id="list">`;
const _vg=views.grounds;views.grounds=()=>_vg().replace('<div class="grid" id="list">',nmBar('g'))
 .replace(/<div class="card pad" style="margin-top:18px"><b>📍 Map<\/b>.*?<\/div><\/div>/,`<div style="margin-top:26px"><div class="row sb wp" style="margin-bottom:10px"><div><h3 style="font-size:24px">Find Grounds Near You</h3><p class="mut">${LOC?'Distances from '+esc(LOC.label):'Allow location to see how far each ground is.'}</p></div>${LOC?'<button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button>':LocationButton()}</div>${MapView('gmap_all',{grounds:G0})}</div>`);
const _vp=views.players;views.players=()=>_vp().replace('<div class="grid" id="list">',nmBar('p'));

/* ---- nearby page ---- */
const nbG=()=>GROUNDS; // ground-venue addresses are verified text, not device-distance GPS, so we list all of them here rather than filter by a fake radius
var nbP=()=>PLAYERS.filter(p=>p.km<=N.r&&(!N.sport||p.sport===N.sport)&&(!N.skill||p.skill===N.skill)&&(!N.av||(N.av==='now'?p.av===0:N.av==='today'?p.av<=1:true))).sort((a,b)=>a.km-b.km);
const NearbyGrounds=a=>a.length?a.map(g=>`<div class="card pad"><div class="row sb"><b>${esc(g.name)}</b>${typeof isFree==='function'&&isFree(g)?'<span class="badge g">FREE</span>':''}</div><div style="margin:8px 0">${(g.sports||[g.sport]).map(x=>`<span class="badge">${SP[x]||''} ${x}</span>`).join('')}</div><div class="row wp">${typeof venueActions==='function'?venueActions(g,true):''}${GetDirectionsButton(g)}</div></div>`).join(''):empty('No grounds listed yet','Check back soon.');
var PlayerCard=(p,i)=>`<div class="card pad"><div class="row">${avatar(p,i)}<div><b>${esc(p.name)}</b><div class="mut">📍 Near ${p.loc} · ~${km1(p.km)} km away</div></div></div><div style="margin:10px 0"><span class="badge g">${SP[p.sport]||''} ${p.sport}</span><span class="badge">⭐ ${p.skill}</span><span class="badge a">★ ${p.rating}</span><span class="badge ${p.av===0?'g':''}">🟢 ${AVL[p.av]}</span></div>
 <div class="row wp"><button class="btn sec sm" onclick="viewProfile('${p.id}')">View Profile</button>${S.invites[p.id]?`<button class="btn sec sm" disabled>Invite ${S.invites[p.id]}</button>`:`<button class="btn sm" onclick="invite('${p.id}')">Invite to Match</button>`}</div></div>`;
var NearbyPlayers=a=>a.length?a.map(PlayerCard).join(''):empty(`No players within ${N.r} km`,'Try a wider distance or different filters.');
const nbMap=()=>`<div class="row wp" style="margin-bottom:10px">${[['both','🏟️+👤 Both'],['grounds','🏟️ Grounds'],['players','👤 Players']].map(([k,t])=>`<button class="btn sm ${N.mode===k?'':'sec'}" onclick="nbSet('mode','${k}')">${t}</button>`).join('')}<span class="mut">Players are shown by approximate area only.</span></div>${MapView('nbm'+Date.now(),{grounds:N.mode==='players'?[]:nbG(),players:N.mode==='grounds'?[]:nbP(),radius:N.r},400)}`;
function nbSet(k,v){N[k]=k==='r'?+v:v;$('#nbMap').innerHTML=nbMap();$('#nbG').innerHTML=NearbyGrounds(nbG());$('#nbP').innerHTML=NearbyPlayers(nbP());$('#nbR').textContent=`📍 ${N.r} km radius`;mountMaps()}
const nbSel=(k,opts,ph)=>`<select onchange="nbSet('${k}',this.value)"><option value="">${ph}</option>${opts.map(([v,t])=>`<option value="${v}" ${N[k]===v?'selected':''}>${t}</option>`).join('')}</select>`;
function LocationSettings(){const u=me(),vis=u&&u.vis;return `<div class="card pad" style="margin-top:22px"><b>🔒 Location Visibility</b><p class="mut" style="margin-top:4px">Your location is only used for distances, nearby discovery, map position and directions. Others never see exact coordinates or live movement.</p>
 <label class="sw"><input type="checkbox" ${vis?'checked':''} onchange="setVis(this.checked)"><span>Appear in Nearby Players</span></label><p class="mut">${vis?'🟢 Nearby players can see your name, sport, skill and approximate distance.':'🔒 Hidden (default) — you will not appear in anyone\'s Nearby Players.'}</p>
 <div class="row wp" style="margin-top:10px"><button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button><button class="btn sec sm" onclick="manualPicker()">Change area</button>${LOC?'<button class="btn red sm" onclick="clearLoc()">Clear my location</button>':''}</div></div>`}
function setVis(v){if(needLogin()){render();return}me().vis=v;save();toast(v?'You now appear in Nearby Players':'Your location is hidden');render()}
views.nearby=()=>{if(!LOC)return `<div class="pg">${pageHead('📍 Sports Around You','Discover players and grounds near your location.')}<div class="grid">${empty('Location not set','Allow location or pick an area to see distances.',LocationButton('Find Near Me')+' <button class="btn sec" onclick="manualPicker()">Enter location</button>')}</div></div>`;
 return `<div class="pg">${pageHead('📍 Sports Around You','Near '+esc(LOC.label)+' · sorted by distance',`<div class="row wp"><button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button><button class="btn sec sm" onclick="manualPicker()">Change area</button></div>`)}
 ${LOC.far?`<div class="fee">You seem to be outside Jaipur — demo grounds and players are placed around Jaipur. <button class="btn sec sm" onclick="pickArea('Jaipur')">Use Jaipur instead</button></div>`:''}
 <div class="filters">${nbSel('r',[1,3,5,10].map(d=>[d,'Within '+d+' km']),'Distance').replace('<option value="">Distance</option>','')}${nbSel('sport',['Football','Cricket','Badminton','Basketball','Tennis','Volleyball'].map(s=>[s,SP[s]+' '+s]),'All sports')}${nbSel('skill',SKL.map(s=>[s,s]),'Any skill')}${nbSel('av',[['now','Available Now'],['today','Today'],['week','This Week']],'Any availability')}</div>
 <span class="badge g" id="nbR" style="font-size:14px">📍 ${N.r} km radius</span><div id="nbMap" style="margin:10px 0 22px">${nbMap()}</div>
 <h3 style="margin:8px 0 12px;font-size:24px">Grounds Near You</h3><div class="grid" id="nbG">${NearbyGrounds(nbG())}</div>
 <h3 style="margin:26px 0 12px;font-size:24px">Players Near You</h3><div class="grid" id="nbP">${NearbyPlayers(nbP())}</div>${LocationSettings()}</div>`};
function viewProfile(id){const p=PLAYERS.find(x=>x.id===id);openModal(`<div class="row">${avatar(p)}<div><h2 class="brand" style="font-size:24px">${esc(p.name)}</h2><div class="mut">📍 ${LOC?`${km1(p.km)} km away · `:''}Near ${p.loc}</div></div></div>
 <div style="margin:14px 0"><span class="badge g">${SP[p.sport]||''} ${p.sport}</span><span class="badge">${p.skill}</span><span class="badge a">★ ${p.rating} (${p.n})</span><span class="badge">🟢 ${AVL[p.av]}</span></div><p class="mut">Only approximate distance is shown. Exact location is never shared.</p>
 <div class="row" style="margin-top:16px"><button class="btn sec" onclick="closeModal()">Close</button>${S.invites[id]?`<button class="btn full" disabled>Invite ${S.invites[id]}</button>`:`<button class="btn full" onclick="closeModal();invite('${id}')">Invite to Match</button>`}</div>`)}


/* ---- profile settings, home widget, nav button ---- */
const _vpf=views.profile;views.profile=()=>{const h=_vpf();return h?h.replace(/<\/form><\/div>$/,'</form>'+LocationSettings()+'</div>'):h};
const _vh=views.home;views.home=()=>{let w;
 if(!LOC)w=`<div class="card nearw"><div class="row sb wp"><div><h3 style="font-size:22px">📍 Sports Around You</h3><p class="mut">Discover players and grounds near your location.</p></div><button class="btn" onclick="nearMe()">📍 Find Near Me</button></div></div>`;
 else{const g=[...GROUNDS].sort((a,b)=>a.km-b.km).slice(0,3),p=[...PLAYERS].filter(x=>x.km!=null).sort((a,b)=>a.km-b.km).slice(0,3),r=(n,k)=>`<div class="row sb"><span>${esc(n)}</span><span class="badge g dist">📍 ${km1(k)} km away</span></div>`;
  w=`<div class="card nearw"><div class="row sb wp"><div><h3 style="font-size:22px">📍 Sports Around You</h3><p class="mut">Near ${esc(LOC.label)}</p></div><button class="btn sec sm" onclick="go('nearby')">See all & map</button></div><h4>Grounds Near You</h4>${g.map(x=>r(x.name,x.km)).join('')}<h4>Players Near You</h4>${p.map(x=>r(x.name+' · '+x.sport,x.km)).join('')}</div>`}
 return _vh().replace('<div class="three">',w+'<div class="three">')};
const _ch=chrome;chrome=function(){_ch();$('#right').insertAdjacentHTML('afterbegin','<button class="btn sm" onclick="nearMe()" aria-label="Near Me">📍<span class="nmt"> Near Me</span></button>');mountMaps()};
