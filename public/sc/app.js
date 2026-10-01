
/* ===================== DATA & HELPERS ===================== */
const FEE=10; // platform fee per person (₹)
const SP={Football:'⚽',Cricket:'🏏',Badminton:'🏸',Basketball:'🏀',Volleyball:'🏐',Tennis:'🎾',Kabaddi:'🏃','Table Tennis':'🏓',Athletics:'🏃'};
const SPN=Object.keys(SP),LOCS=['Malviya Nagar','Vaishali Nagar','Mansarovar','C-Scheme','Jagatpura','Raja Park','Pratap Nagar','Tonk Road','JLN Marg'],SKL=['Beginner','Intermediate','Advanced'],TIMES=['Morning','Evening','Weekend','Night'];
const $=s=>document.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10)};
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const fmtD=s=>new Date(s+'T00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
const hr=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
const COL=['#10B981','#F59E0B','#3B82F6','#EC4899','#8B5CF6','#14B8A6','#F43F5E','#06B6D4'];
const avatar=(p,i=0)=>p&&p.photo?`<div class="av" style="background-image:url(${p.photo})"></div>`:`<div class="av" style="background:${COL[(i||(p?p.name.length:0))%8]}">${esc((p?p.name:'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div>`;

const PLAYERS=[]; /* real users are loaded from the database */
const GROUNDS=[ /* price, rating and distance are SAMPLE values */
 {id:'g1',name:'Sawai Mansingh Stadium (SMS Stadium)',loc:'C-Scheme',sport:'Cricket',sports:['Cricket','Football','Athletics'],price:2500,rating:4.8,km:3.7,am:['Professional ground','Changing rooms','Parking available']},
 {id:'g2',name:'Rajasthan University Sports Complex',loc:'JLN Marg',sport:'Football',sports:['Football','Cricket','Badminton'],price:900,rating:4.5,km:5.2,am:['Well-maintained turf','Floodlights','Basic facilities']},
 {id:'g3',name:'University Maharaja College Ground',loc:'JLN Marg',sport:'Football',sports:['Football','Cricket','Athletics'],price:700,rating:4.3,km:4.8,am:['Large playing area','Central location','Good accessibility']},
 {id:'g4',name:'Dolphin Sports Academy',loc:'Mansarovar',sport:'Football',sports:['Football','Cricket','Badminton'],price:1000,rating:4.6,km:6.3,am:['Turf & indoor courts','Coaching available','Ample parking']},
 {id:'g5',name:'The Football Park',loc:'Tonk Road',sport:'Football',sports:['Football'],price:1200,rating:4.7,km:1.8,am:['Premium turf','Floodlights','Cafeteria & lounge']},
 {id:'g6',name:'Jaipur Sports Academy',loc:'Jagatpura',sport:'Football',sports:['Football','Cricket','Badminton'],price:900,rating:4.4,km:9.0,am:['Multi-sport facility','Trained coaches','Changing rooms']},
 {id:'g7',name:'Fitso Sports Arena',loc:'Vaishali Nagar',sport:'Badminton',sports:['Badminton','Table Tennis','Football'],price:600,rating:4.6,km:5.1,am:['Indoor courts','Modern infrastructure','Cafe & lounge']},
 {id:'g8',name:'PlayAll Sports Arena',loc:'Mansarovar',sport:'Football',sports:['Football','Cricket','Basketball'],price:1100,rating:4.5,km:6.0,am:['Well-maintained turf','Floodlights','Locker rooms']},
 {id:'g9',name:'Sportify Arena',loc:'Tonk Road',sport:'Football',sports:['Football','Cricket','Volleyball'],price:1300,rating:4.7,km:2.4,am:['Premium turf','Professional setup','Cafe & relaxation area']},
 {id:'g10',name:'Local Box Turfs',loc:'Vaishali Nagar',sport:'Cricket',sports:['Football','Cricket'],price:600,rating:4.2,km:5.4,am:['Affordable rates','Flexible timings','Easy booking']}];
const SEED={users:[],user:null,invites:{},notifs:[{id:1,t:'Welcome to Sports Connect! Find players, book a ground or host a match.',r:0}],
 slots:[],bookings:[],
 waitlists:{},matches:[]};
/* localStorage persistence (single key) */
let S;try{S=JSON.parse(localStorage.getItem('sc_standalone'))||SEED}catch(e){S=SEED}
if(S.ver!==3){S.matches=[];S.slots=[];S.waitlists={};S.users=[];S.user=null;S.invites={};S.ver=3;S.bookings=[]}
const save=()=>{try{localStorage.setItem('sc_standalone',JSON.stringify(S))}catch(e){toast('Storage full – remove a large profile photo',1)}};
const gr=id=>GROUNDS.find(g=>g.id===id)||{name:'Custom ground',loc:'Jaipur',km:0};
var me=()=>window.ME||null;
const myName=()=>{const u=me();return u?u.name:null};

/* ===================== NOTIFICATIONS / TOAST ===================== */
function addNotification(t){S.notifs.unshift({id:Date.now()+Math.random(),t,r:0});save();chrome()}
function toast(m,bad){const e=document.createElement('div');e.id='toast';e.className=bad?'bad':'';e.textContent=m;document.querySelectorAll('#toast').forEach(x=>x.remove());document.body.appendChild(e);setTimeout(()=>e.remove(),2800)}
function toggleNotifs(){const p=$('#np');if(!p.hidden){p.hidden=true;return}
 p.innerHTML=`<div class="row sb pad" style="padding:14px 16px"><b>Notifications</b><a style="color:var(--g);font-size:12px;font-weight:700;cursor:pointer" onclick="readAll()">Mark all read</a></div>`+(S.notifs.length?S.notifs.map(n=>`<button class="n ${n.r?'':'u'}" onclick="readOne(${n.id})">${esc(n.t)}</button>`).join(''):'<p class="mut pad">You are all caught up.</p>');p.hidden=false}
function readOne(id){const n=S.notifs.find(x=>x.id==id);if(n)n.r=1;save();chrome();$('#np').hidden=true;toggleNotifs()}
function readAll(){S.notifs.forEach(n=>n.r=1);save();chrome();$('#np').hidden=true;toggleNotifs()}

/* ===================== AUTH ===================== */
function needLogin(){if(me())return false;toast('Please log in to continue',1);go('auth');return true}
function signup(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const er=[];
 if(f.name.trim().length<2)er.push('Enter your full name');
 if(!/^[6-9]\d{9}$/.test(f.mobile))er.push('Enter a valid 10-digit Indian mobile number');
 if(!/^\S+@\S+\.\S+$/.test(f.email))er.push('Enter a valid email');
 if(f.password.length<6)er.push('Password needs 6+ characters');
 if(S.users.some(u=>u.email===f.email.toLowerCase()||u.mobile===f.mobile))er.push('Email or mobile already registered');
 if(er.length){$('#aerr').innerHTML=er.map(x=>`<div class="err">• ${x}</div>`).join('');return}
 const file=e.target.photo.files[0];
 const finish=photo=>{const u={id:'u'+Date.now(),name:f.name.trim(),mobile:f.mobile,email:f.email.toLowerCase(),password:f.password,loc:f.loc,sport:f.sport,skill:f.skill,photo,rating:0,rn:0};
  S.users.push(u);S.user=u.id;save();toast('Welcome to Sports Connect, '+u.name.split(' ')[0]+'!');go('home')};
 if(file){if(file.size>150000){$('#aerr').innerHTML='<div class="err">• Photo must be under 150 KB</div>';return}const r=new FileReader();r.onload=()=>finish(r.result);r.readAsDataURL(file)}else finish('')}
function login(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const id=f.id.trim().toLowerCase();
 const u=S.users.find(u=>(u.email===id||u.mobile===id)&&u.password===f.password);
 if(!u){$('#lerr').innerHTML='<div class="err">Incorrect email/mobile or password</div>';return}
 S.user=u.id;save();toast('Logged in');go('home')}
function logout(){S.user=null;save();toast('Logged out');go('home')}
function saveProfile(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(f.name.trim().length<2)return toast('Name too short',1);
 Object.assign(me(),{name:f.name.trim(),loc:f.loc,sport:f.sport,skill:f.skill});save();toast('Profile updated');render()}

/* ===================== MATCH LOGIC (join / leave / waitlist) ===================== */
const mById=id=>S.matches.find(m=>m.id===id);
function joinMatch(id,n){const m=mById(id),u=myName();m.cur=Math.min(m.max,m.cur+n);m.joined[u]=n;if(m.host!==u)addNotification(`${u} joined "${m.title}" (host notified)`);else save()}
function freeSpots(id,n,leaver){const m=mById(id),wl=S.waitlists[id]||[],promoted=wl.splice(0,n);S.waitlists[id]=wl;if(leaver)delete m.joined[leaver];
 promoted.forEach(p=>{m.joined[p]=1;S.notifs.unshift({id:Date.now()+Math.random(),t:p===myName()?`🎉 You moved from the waitlist into "${m.title}"!`:`${p} moved from the waitlist into "${m.title}"`,r:0})});
 m.cur=Math.max(0,m.cur-n+promoted.length);save();chrome()}
function leaveMatch(id){const m=mById(id),n=m.joined[myName()]||1;freeSpots(id,n,myName());
 S.bookings.forEach(b=>{if(b.mid===id&&b.status==='Upcoming')b.status='Cancelled'});addNotification(`You left "${m.title}"`);toast('You left the match');render()}
function joinWait(id){if(needLogin())return;const wl=S.waitlists[id]=S.waitlists[id]||[];if(wl.includes(myName()))return;wl.push(myName());
 addNotification(`Waitlist position #${wl.length} for "${mById(id).title}"`);toast('Waitlist position: #'+wl.length);render()}
function leaveWait(id){S.waitlists[id]=(S.waitlists[id]||[]).filter(x=>x!==myName());save();render()}
function simDrop(id){freeSpots(id,1,null);toast('A player dropped out (demo)');render()}
function hostMatch(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),er=[];
 if(f.title.trim().length<3)er.push('Match name needs 3+ characters');
 if(f.date<day(0))er.push('Date cannot be in the past');
 if(+f.end<=+f.start)er.push('End time must be after start time');
 if(+f.max<2||+f.max>30)er.push('Players must be between 2 and 30');
 if(+f.fee<0||f.fee==='')er.push('Enter a match fee (0 or more)');
 if(er.length){$('#herr').innerHTML=er.map(x=>`<div class="err">• ${x}</div>`).join('');return}
 const id='m'+Date.now();S.matches.unshift({id,title:f.title.trim(),sport:f.sport,gid:f.gid,date:f.date,start:+f.start,end:+f.end,max:+f.max,cur:1,fee:+f.fee,skill:f.skill,host:myName(),joined:{[myName()]:1},desc:f.desc.trim()});
 addNotification(`Match "${f.title.trim()}" created. Need ${+f.max-1} more players – invite some!`);toast('Match created!');go('mymatches')}

/* ===================== INVITES ===================== */
function invite(pid){if(needLogin())return;if(S.invites[pid])return;S.invites[pid]='Pending';save();addNotification(`Invitation sent to ${PLAYERS.find(p=>p.id===pid).name}`);toast('Invitation sent');render();
 /* simulated response after a few seconds (demo only) */
 setTimeout(()=>{const ok=Math.random()<.7,p=PLAYERS.find(x=>x.id===pid);S.invites[pid]=ok?'Accepted':'Declined';save();addNotification(`${p.name} ${ok?'accepted':'declined'} your invitation`);if(location.hash==='#players')render()},3500)}

/* ===================== CHECKOUT (DEMO PAYMENT) ===================== */
let CK=null;
function openModal(h){$('#modal').innerHTML=`<div class="modal" onclick="if(event.target===this)closeModal()"><div>${h}</div></div>`}
function closeModal(){$('#modal').innerHTML='';CK=null}
function bookGround(gid){if(needLogin())return;CK={kind:'ground',gid,date:day(0),start:null,dur:1,players:2,pay:'UPI'};groundModal()}
function joinCheckout(id){if(needLogin())return;const m=mById(id);CK={kind:'match',mid:id,players:1,pay:'UPI',max:m.max-m.cur};matchModal()}
const slotTaken=(gid,d,h)=>S.slots.includes(`${gid}|${d}|${h}`)||(d===day(0)&&h<=new Date().getHours());
function setCK(k,v){CK[k]=k==='players'||k==='dur'||k==='start'?+v:v;if(k==='date'||k==='dur')CK.start=null;CK.kind==='ground'?groundModal():matchModal()}
function feeBox(base,label,pl){const pf=pl*FEE;return `<div class="fee"><div><span>${label}</span><span>₹${base}</span></div><div><span>Platform fee (${pl} × ₹${FEE})</span><span>₹${pf}</span></div><div class="t"><span>Total</span><span>₹${base+pf}</span></div></div>`}
function payBox(){return `<label>Payment method <span class="tag">DEMO PAYMENT – no real money</span></label><div class="row wp">${['UPI','Card','Net Banking'].map(p=>`<button class="btn sm ${CK.pay===p?'':'sec'}" onclick="setCK('pay','${p}')">${p}</button>`).join('')}</div>`}
function groundModal(){const g=gr(CK.gid),{date,start,dur,players}=CK;let sl='';
 for(let h=6;h<22;h++)sl+=`<button class="slot ${start===h?'sel':''}" ${slotTaken(g.id,date,h)?'disabled':''} onclick="setCK('start',${h})">${hr(h)}</button>`;
 let ok=start!==null,msg='';if(ok){for(let i=0;i<dur;i++)if(start+i>21||slotTaken(g.id,date,start+i))ok=false;if(!ok)msg='Selected duration overlaps a booked slot or closing time (10 PM).'}
 openModal(`<img src="${IMG[g.id]}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:16px;margin-bottom:12px"><h2 class="brand">Book ${esc(g.name)}</h2><p class="mut">₹${g.price}/hour · Open 6 AM – 10 PM</p>
 <label>Date</label><input type="date" min="${day(0)}" value="${date}" onchange="setCK('date',this.value)">
 <label>Time slot (greyed = unavailable)</label><div class="slots">${sl}</div>
 <label>Duration</label><select onchange="setCK('dur',this.value)">${[1,2,3].map(d=>`<option value="${d}" ${d===dur?'selected':''}>${d} hour${d>1?'s':''}</option>`).join('')}</select>
 <label>Number of players</label><input type="number" min="1" max="30" value="${players}" onchange="setCK('players',Math.max(1,Math.min(30,this.value||1)))">
 ${msg?`<div class="err">${msg}</div>`:''}${ok?feeBox(g.price*dur,`Ground fee (${dur}h × ₹${g.price})`,players):''}
 ${payBox()}<div class="row" style="margin-top:18px"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn full" ${ok?'':'disabled'} onclick="pay()">Pay (Demo)</button></div>`)}
function matchModal(){const m=mById(CK.mid),n=CK.players;
 openModal(`<h2 class="brand">Join ${esc(m.title)}</h2><p class="mut">${fmtD(m.date)} · ${hr(m.start)} – ${hr(m.end)} · ${esc(gr(m.gid).name)}</p>
 <label>Spots to book (${CK.max} left)</label><input type="number" min="1" max="${CK.max}" value="${n}" onchange="setCK('players',Math.max(1,Math.min(${CK.max},this.value||1)))">
 ${feeBox(m.fee*n,`Entry fee (${n} × ₹${m.fee})`,n)}${payBox()}
 <div class="row" style="margin-top:18px"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn full" onclick="pay()">Pay (Demo)</button></div>`)}
function pay(){const c=CK;$('#modal .btn.full').textContent='Processing demo payment…';$('#modal .btn.full').disabled=true;
 setTimeout(()=>{const id='SC-'+Math.floor(10000+Math.random()*89999);let b;
  if(c.kind==='ground'){const g=gr(c.gid);for(let i=0;i<c.dur;i++)S.slots.push(`${c.gid}|${c.date}|${c.start+i}`);
   b={id,kind:'ground',title:g.name,sport:g.sport,date:c.date,time:`${hr(c.start)} – ${hr(c.start+c.dur)}`,base:g.price*c.dur,players:c.players,gid:c.gid,start:c.start,dur:c.dur}}
  else{const m=mById(c.mid);b={id,kind:'match',title:m.title,sport:m.sport,date:m.date,time:`${hr(m.start)} – ${hr(m.end)}`,base:m.fee*c.players,players:c.players,gid:m.gid,mid:m.id};joinMatch(m.id,c.players)}
  b.amount=b.base+b.players*FEE;b.pm=c.pay;b.status='Upcoming';S.bookings.unshift(b);addNotification(`Booking ${id} confirmed (demo payment) – ${b.title}`);
  openModal(`<div style="text-align:center"><div style="font-size:54px">🎉</div><h2 class="brand">Booking confirmed</h2><p class="mut">Demo payment – no real money was charged</p>
  <div class="fee" style="text-align:left"><div><span>Booking ID</span><b>${id}</b></div><div><span>${esc(b.title)}</span><span>${fmtD(b.date)}</span></div><div><span>Time</span><span>${b.time}</span></div><div><span>Players</span><span>${b.players}</span></div><div><span>Base</span><span>₹${b.base}</span></div><div><span>Platform fee</span><span>₹${b.players*FEE}</span></div><div class="t"><span>Total</span><span>₹${b.amount}</span></div></div>
  <div class="row" style="margin-top:16px"><button class="btn sec full" onclick="closeModal();go('bookings')">My Bookings</button><button class="btn full" onclick="closeModal();render()">Done</button></div></div>`);CK=null;render()},1100)}
function cancelBooking(id){const b=S.bookings.find(x=>x.id===id);if(!confirm('Cancel booking '+id+'? (Demo refund)'))return;b.status='Cancelled';
 if(b.kind==='ground')for(let i=0;i<b.dur;i++)S.slots=S.slots.filter(s=>s!==`${b.gid}|${b.date}|${b.start+i}`);
 else freeSpots(b.mid,b.players,myName());addNotification(`Booking ${id} cancelled (demo refund)`);toast('Booking cancelled');render()}

/* ===================== VIEWS ===================== */
const F={p:{},m:{},g:{}};
function setF(k,f,v){F[k][f]=v;const e=$('#list');if(e)e.innerHTML=LIST[k]()}
const sel=(k,f,opts,ph)=>`<select onchange="setF('${k}','${f}',this.value)"><option value="">${ph}</option>${opts.map(o=>`<option ${F[k][f]===o?'selected':''}>${o}</option>`).join('')}</select>`;
const clr=k=>`<button class="btn sec sm" onclick="F['${k}']={};render()">Clear filters</button>`;
const empty=(t,s,b='')=>`<div class="empty"><b>${t}</b>${s}<div style="margin-top:12px">${b}</div></div>`;
const LIST={
 p(){const f=F.p,q=(f.q||'').toLowerCase();const r=PLAYERS.filter(p=>(!f.sport||p.sport===f.sport)&&(!f.loc||p.loc===f.loc)&&(!f.skill||p.skill===f.skill)&&(!f.time||p.time===f.time)&&(!f.dist||p.km<=+f.dist)&&(!f.rate||p.rating>=+f.rate)&&(!q||(p.name+p.sport+p.loc).toLowerCase().includes(q)));
  return r.length?r.map((p,i)=>`<div class="card pad"><div class="row">${avatar(p,i)}<div><b>${p.name}</b><div class="mut">📍 ${p.loc} · ${p.km} km away</div></div></div>
  <div style="margin:12px 0"><span class="badge g">${SP[p.sport]} ${p.sport}</span><span class="badge">${p.skill}</span><span class="badge a">★ ${p.rating}</span><span class="badge">🕒 ${p.time}</span></div>
  ${S.invites[p.id]?`<button class="btn sec full" disabled>Invite ${S.invites[p.id]}</button>`:`<button class="btn full" onclick="invite('${p.id}')">Invite to Match</button>`}</div>`).join(''):empty('No players found nearby','Try widening your filters.',clr('p'))},
 m(){const f=F.m,r=S.matches.filter(m=>(!f.sport||m.sport===f.sport)&&(!f.skill||m.skill===f.skill)&&(!f.q||(m.title+m.host).toLowerCase().includes(f.q.toLowerCase())));
  return r.length?r.map(matchCard).join(''):empty('No matches found','Create a match and invite players to get started.',`<button class="btn" onclick="go('host')">Host a Match</button>`)},
 g(){const f=F.g,r=GROUNDS.filter(g=>(!f.sport||g.sports.includes(f.sport))&&(!f.loc||g.loc===f.loc)&&(!f.q||g.name.toLowerCase().includes(f.q.toLowerCase())));
  return r.length?r.map(g=>`<div class="card"><img src="${IMG[g.id]}" alt="${esc(g.name)}" loading="lazy" style="width:100%;height:170px;object-fit:cover;display:block"><div class="pad"><div class="row sb"><h3>${g.name}</h3><span class="badge a">★ ${g.rating}</span></div>
  <div class="mut">📍 ${g.loc}, Jaipur · ${g.km} km away <span class="tag">sample</span></div><div style="margin:10px 0">${g.sports.map(x=>`<span class="badge g">${SP[x]||""} ${x}</span>`).join("")}${g.am.map(a=>`<span class="badge">${a}</span>`).join('')}</div>
  <div class="mut">🕒 6 AM – 10 PM · ${[...Array(16)].filter((_,i)=>!slotTaken(g.id,day(0),i+6)).length} slots free today</div>
  <div class="row sb" style="margin-top:12px"><b class="brand" style="font-size:22px">₹${g.price}<small class="mut">/hr</small></b><button class="btn" onclick="bookGround('${g.id}')">Book Ground</button></div></div></div>`).join(''):empty('No grounds found','Try another sport or area.',clr('g'))}};
function matchCard(m){const u=myName(),wl=S.waitlists[m.id]||[],joined=u&&m.joined[u],pos=u?wl.indexOf(u)+1:0,full=m.cur>=m.max,left=m.max-m.cur,g=gr(m.gid);
 let act;if(joined)act=`<div style="text-align:center;font-weight:700;color:var(--g);margin-bottom:8px">✅ You're in</div><button class="btn sec full" onclick="leaveMatch('${m.id}')">Leave Match</button>`;
 else if(pos)act=`<div style="text-align:center;font-weight:800;color:#b45309;margin-bottom:8px">Waitlist Position: #${pos}</div><button class="btn sec full" onclick="leaveWait('${m.id}')">Leave Waitlist</button>`;
 else if(full)act=`<div style="text-align:center;font-weight:800;margin-bottom:8px">Match Full</div><button class="btn sec full" onclick="joinWait('${m.id}')">Join Waitlist (${wl.length} waiting)</button>`;
 else act=`${left<=3?`<div style="text-align:center;font-weight:700;color:#b45309;margin-bottom:8px">🔥 Need ${left} more player${left>1?'s':''}?</div>`:''}<button class="btn full" onclick="joinCheckout('${m.id}')">Join Match</button>`;
 return `<div class="card pad"><span class="badge g">${SP[m.sport]} ${m.sport}</span><span class="badge">${m.skill}</span><h3 style="font-size:20px;margin:6px 0">${esc(m.title)}</h3>
 <div class="mut">By ${esc(m.host)}<br>📍 ${esc(g.name)}, ${esc(g.loc)}<br>📅 ${fmtD(m.date)} · ⏰ ${hr(m.start)} – ${hr(m.end)}</div>
 <div class="dots">${[...Array(Math.min(m.max,22))].map((_,i)=>`<i class="${i<m.cur?'f':''}"></i>`).join('')}</div><b>👥 ${m.cur} / ${m.max} players</b>
 ${feeBox(m.fee,'Entry fee',1).replace(/<div class="t">.*$/,`<div class="t"><span>You pay</span><span>₹${m.fee+FEE}</span></div></div>`)}<div style="margin-top:12px">${act}</div></div>`}
const pageHead=(t,s,b='')=>`<div class="row sb wp"><div><h2>${t}</h2><p class="mut">${s}</p></div>${b}</div>`;
const views={
 home(){const u=me(),up=S.bookings.find(b=>b.status==='Upcoming');return `<section class="hero"><span class="badge g">🏏 Jaipur · Live community</span><h1>Find Players.<br><span>Book Grounds.</span><br>Play Together.</h1>
 <p class="mut" style="max-width:520px;margin:14px auto 0">India's sports community: find people nearby, book real grounds and run the whole match in one place.</p></section>
 <div class="three"><div class="card act" onclick="go('players')"><div class="e">🏃</div><h3>Find Players</h3><p class="mut">Find people nearby who want to play.</p></div>
 <div class="card act" onclick="go('grounds')"><div class="e">🏟</div><h3>Book Grounds</h3><p class="mut">Pick a date, slot and duration. Platform fee ₹10/person.</p></div>
 <div class="card act" onclick="go('matches')"><div class="e">⚽</div><h3>Play Together</h3><p class="mut">Create or join matches, use waitlists.</p></div></div>
 ${u?`<h2>Welcome, ${esc(u.name.split(' ')[0])}</h2><div class="grid" style="margin:14px 0 30px"><div class="card pad"><b>Upcoming booking</b><p class="mut" style="margin:6px 0">${up?`${esc(up.title)} · ${fmtD(up.date)} · ${up.time}`:'No upcoming bookings'}</p><button class="btn sec sm" onclick="go('bookings')">My Bookings</button></div>
 <div class="card pad"><b>Notifications</b><p class="mut" style="margin:6px 0">${S.notifs.filter(n=>!n.r).length} unread</p><button class="btn sec sm" onclick="toggleNotifs()">Open</button></div>
 <div class="card pad"><b>Host a match</b><p class="mut" style="margin:6px 0">Need players? Create a game and invite.</p><button class="btn sm" onclick="go('host')">Host Match</button></div></div>`:`<div class="card pad" style="text-align:center;margin-bottom:30px"><b>Join Sports Connect</b><p class="mut" style="margin:6px 0 12px">Create a free account to invite players, join matches and book grounds.</p><button class="btn" onclick="go('auth')">Sign up / Log in</button></div>`}`},
 auth(){const o=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');return `<div class="pg"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
 <form class="card pad" onsubmit="signup(event)"><h2 class="brand">Create account</h2><p class="mut">Demo account saved only in this browser (localStorage). No OTP is sent.</p>
 <label>Full name</label><input name="name" required><label>Mobile number</label><input name="mobile" inputmode="numeric" maxlength="10" required><label>Email</label><input name="email" type="email" required>
 <label>Password</label><input name="password" type="password" required><label>Location</label><select name="loc">${o(LOCS)}</select><label>Favourite sport</label><select name="sport">${o(SPN)}</select>
 <label>Skill level</label><select name="skill">${o(SKL,'Intermediate')}</select><label>Profile photo (optional, &lt;150 KB)</label><input name="photo" type="file" accept="image/*">
 <div id="aerr"></div><button class="btn full" style="margin-top:16px">Sign up</button></form>
 <form class="card pad" onsubmit="login(event)" style="align-self:start"><h2 class="brand">Log in</h2><label>Email or mobile</label><input name="id" required><label>Password</label><input name="password" type="password" required><div id="lerr"></div><button class="btn full" style="margin-top:16px">Log in</button></form></div></div>`},
 players(){const f=F.p;return `<div class="pg">${pageHead('Find Players','Search nearby players by sport, skill, time and rating.')}<div class="filters"><input placeholder="🔍 Search name, sport, area" value="${esc(f.q||'')}" oninput="setF('p','q',this.value)">
 ${sel('p','sport',SPN,'All sports')}${sel('p','loc',LOCS,'Any location')}${sel('p','skill',SKL,'Any skill')}${sel('p','time',TIMES,'Any time')}
 <select onchange="setF('p','dist',this.value)"><option value="">Any distance</option>${[3,5,10].map(d=>`<option value="${d}" ${f.dist==d?'selected':''}>≤ ${d} km</option>`).join('')}</select>
 <select onchange="setF('p','rate',this.value)"><option value="">Any rating</option>${[4,4.5].map(d=>`<option value="${d}" ${f.rate==d?'selected':''}>${d}★ +</option>`).join('')}</select>${clr('p')}</div><div class="grid" id="list">${LIST.p()}</div></div>`},
 matches(){const f=F.m;return `<div class="pg">${pageHead('Matches','Join a game. You pay entry + ₹10 platform fee.',`<button class="btn" onclick="go('host')">+ Host a Match</button>`)}<div class="filters"><input placeholder="🔍 Search matches" value="${esc(f.q||'')}" oninput="setF('m','q',this.value)">${sel('m','sport',SPN,'All sports')}${sel('m','skill',SKL,'Any skill')}${clr('m')}</div><div class="grid" id="list">${LIST.m()}</div></div>`},
 grounds(){const f=F.g;return `<div class="pg">${pageHead('Grounds','Book real slots. Booked slots turn grey instantly.')}<div class="filters"><input placeholder="🔍 Search grounds" value="${esc(f.q||'')}" oninput="setF('g','q',this.value)">${sel('g','sport',SPN,'All sports')}${sel('g','loc',LOCS,'Any location')}${clr('g')}</div><div class="grid" id="list">${LIST.g()}</div>
 <div class="card pad" style="margin-top:18px"><b>📍 Map</b><div class="map">Map placeholder – plug Google Maps / Mapbox here (distances shown are sample data)</div></div></div>`},
 host(){if(needLogin())return '';return `<div class="pg" style="max-width:640px;margin:auto"><form class="card pad" onsubmit="hostMatch(event)"><h2 class="brand">Host a Match</h2>
 <label>Sport</label><select name="sport">${SPN.map(s=>`<option>${s}</option>`).join('')}</select><label>Match name</label><input name="title" required>
 <label>Date</label><input name="date" type="date" min="${day(0)}" value="${day(1)}" required><div class="row"><div style="flex:1"><label>Start</label><select name="start">${[...Array(16)].map((_,i)=>`<option value="${i+6}" ${i+6===18?'selected':''}>${hr(i+6)}</option>`).join('')}</select></div><div style="flex:1"><label>End</label><select name="end">${[...Array(16)].map((_,i)=>`<option value="${i+7}" ${i+7===20?'selected':''}>${hr(i+7)}</option>`).join('')}</select></div></div>
 <label>Ground</label><select name="gid">${GROUNDS.map(g=>`<option value="${g.id}">${g.name} – ${g.loc} (${g.sports.join('/')})</option>`).join('')}</select>
 <div class="row"><div style="flex:1"><label>Max players</label><input name="max" type="number" value="10" required></div><div style="flex:1"><label>Match fee (₹)</label><input name="fee" type="number" value="100" required></div></div>
 <label>Skill level</label><select name="skill">${SKL.map(s=>`<option>${s}</option>`).join('')}</select><label>Description</label><textarea name="desc" rows="3"></textarea><div id="herr"></div><button class="btn full" style="margin-top:16px">Create Match</button></form></div>`},
 mymatches(){if(needLogin())return '';const u=myName(),mine=S.matches.filter(m=>m.host===u||m.joined[u]),sec=(t,a)=>`<h3 style="margin:22px 0 10px">${t}</h3><div class="grid">${a.length?a.map(matchCard).join(''):empty('No matches here','Create a match and invite players to get started.')}</div>`;
 return `<div class="pg">${pageHead('My Matches','Matches you host or have joined.')}${sec('Hosted',mine.filter(m=>m.host===u))}${sec('Joined',mine.filter(m=>m.host!==u))}</div>`},
 bookings(){if(needLogin())return '';const t=(s)=>S.bookings.filter(b=>s==='Cancelled'?b.status==='Cancelled':b.status==='Upcoming'&&(s==='Past'?b.date<day(0):b.date>=day(0)));
 const sec=(n,a)=>`<h3 style="margin:22px 0 10px">${n} (${a.length})</h3><div style="display:grid;gap:12px">${a.length?a.map(b=>`<div class="card pad row sb wp"><div><span class="badge ${b.status==='Cancelled'?'r':'g'}">${b.status}</span><span class="mut">ID ${b.id}</span><h3 style="font-size:19px">${esc(b.title)}</h3><div class="mut">${SP[b.sport]} ${b.sport} · 📅 ${fmtD(b.date)} · ⏰ ${b.time} · 👥 ${b.players} players</div></div>
 <div style="text-align:right"><b class="brand" style="font-size:22px">₹${b.amount}</b><div class="mut">₹${b.base} + ₹${b.players*FEE} fee · ${b.status==='Cancelled'?'Demo refund':'Paid (Demo) via '+b.pm}</div>
 <div class="row wp" style="justify-content:flex-end;margin-top:8px"><button class="btn sec sm" onclick="go('grounds')">View Ground</button>${b.status==='Upcoming'?`<button class="btn red sm" onclick="cancelBooking('${b.id}')">Cancel</button>`:''}</div></div></div>`).join(''):empty(n==='Upcoming'?'No upcoming bookings':'Nothing here','Book a ground to get started.',n==='Upcoming'?`<button class="btn" onclick="go('grounds')">Book Ground</button>`:'')}</div>`;
 return `<div class="pg">${pageHead('My Bookings','Track your grounds and matches.')}${sec('Upcoming',t('Upcoming'))}${sec('Past',t('Past'))}${sec('Cancelled',t('Cancelled'))}</div>`},
 profile(){const u=me();if(!u){needLogin();return ''}const o=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
 return `<div class="pg" style="max-width:560px;margin:auto"><form class="card pad" onsubmit="saveProfile(event)"><div class="row">${avatar(u)}<div><h2 class="brand" style="font-size:24px">${esc(u.name)}</h2><div class="mut">${esc(u.email)} · ${esc(u.mobile)}</div></div></div>
 <label>Full name</label><input name="name" value="${esc(u.name)}"><label>Location</label><select name="loc">${o(LOCS,u.loc)}</select><label>Favourite sport</label><select name="sport">${o(SPN,u.sport)}</select><label>Skill</label><select name="skill">${o(SKL,u.skill)}</select>
 <div class="row" style="margin-top:16px"><button class="btn full">Save profile</button><button type="button" class="btn red" onclick="logout()">Log out</button></div></form></div>`}};

/* ===================== ROUTER & CHROME ===================== */
var NAV=[['home','Home','🏠'],['players','Players','🏃'],['matches','Matches','⚽'],['grounds','Grounds','🏟'],['bookings','Bookings','🎟'],['profile','Profile','👤']];
function go(v){if(location.hash==='#'+v)render();else location.hash=v;window.scrollTo(0,0)}
function chrome(){const v=location.hash.slice(1)||'home',u=me(),un=S.notifs.filter(n=>!n.r).length;
 $('#links').innerHTML=NAV.slice(0,5).map(n=>`<a class="${v===n[0]?'on':''}" onclick="go('${n[0]}')">${n[1]}</a>`).join('')+`<a class="${v==='mymatches'?'on':''}" onclick="go('mymatches')">My Matches</a>`;
 $('#bot').innerHTML=NAV.map(n=>`<a class="${v===n[0]?'on':''}" onclick="go('${n[0]}')"><span>${n[2]}</span>${n[1]}</a>`).join('');
 $('#right').innerHTML=u?`<button class="btn sec sm" onclick="go('host')">Host</button><button class="ib" onclick="toggleNotifs()" aria-label="Notifications">🔔${un?`<em>${un}</em>`:''}</button><div onclick="go('profile')" style="cursor:pointer">${avatar(u)}</div>`:`<button class="btn sm" onclick="go('auth')">Login / Sign up</button>`}
function render(){const v=location.hash.slice(1)||'home';$('#np').hidden=true;$('#app').innerHTML=(views[v]||views.home)();chrome()}
window.addEventListener('hashchange',render);
