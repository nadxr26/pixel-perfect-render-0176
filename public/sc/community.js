/* Community: Teams, Tournaments, Match history & post-match ratings. Real data via Lovable Cloud. */
(function(){
const sb = window.sb;
const C = { tab:'teams', teams:[], tours:[], regs:[], fixtures:{}, history:[], stats:null, open:null };
const SPORTS = ['Football','Cricket','Basketball','Tennis','Badminton','Box Cricket','Volleyball'];
const gName = id => { const g=(window.GROUNDS||[]).find(x=>x.id===id); return g?g.name:'' };
const err = e => toast((e&&e.message)||'Something went wrong',1);
const today = () => new Date().toISOString().slice(0,10);

async function load(){
  if(!window.ME) return;
  const [t,tr,rg,h,st] = await Promise.all([
    sb.rpc('list_teams'), sb.from('tournaments').select('*').order('start_date'),
    sb.from('tournament_teams').select('tournament_id,team_id'), sb.rpc('my_match_history'),
    sb.rpc('get_player_stats',{_u:window.ME.id})]);
  C.teams=t.data||[]; C.tours=tr.data||[]; C.regs=rg.data||[]; C.history=h.data||[]; C.stats=(st.data||[])[0]||null;
  if(location.hash==='#community') render();
}
window.communityReload = load;

const tabBtn=(k,l)=>`<button class="btn ${C.tab===k?'':'sec'} sm" onclick="commTab('${k}')">${l}</button>`;
window.commTab = k => { C.tab=k; C.open=null; render(); };

function teamsView(){
  const mine=C.teams.filter(t=>t.is_member);
  const card=t=>`<div class="card pad"><div class="row sb"><b>${esc(t.name)}</b><span class="badge g">${esc(t.sport)}</span></div>
   <div class="mut" style="margin:6px 0">Captain: ${esc(t.captain_name)} · ${t.member_count} member${t.member_count==1?'':'s'} · ${esc(t.city)}</div>
   <div class="row wp"><button class="btn sec sm" onclick="commRoster('${t.id}')">Roster</button>
   ${t.captain_id===ME.id?`<button class="btn red sm" onclick="commDelTeam('${t.id}')">Delete</button>`:t.is_member?`<button class="btn red sm" onclick="commLeave('${t.id}')">Leave</button>`:`<button class="btn sm" onclick="commJoin('${t.id}')">Join Team</button>`}</div></div>`;
  return `<div class="row sb wp" style="margin:16px 0"><h3>Teams & Clubs</h3><button class="btn sm" onclick="commNewTeam()">+ Create Team</button></div>
   ${mine.length?`<h4 style="margin:8px 0">My Teams</h4><div class="grid">${mine.map(card).join('')}</div>`:''}
   <h4 style="margin:16px 0 8px">All Teams</h4><div class="grid">${C.teams.length?C.teams.map(card).join(''):empty('No teams yet','Create the first team and invite your friends.')}</div>`;
}
window.commNewTeam=()=>openModal(`<h3>Create Team</h3><form onsubmit="commCreateTeam(event)"><label>Team name</label><input name="name" required minlength="2" maxlength="60">
 <label>Sport</label><select name="sport">${SPORTS.map(s=>`<option>${s}</option>`).join('')}</select><label>City</label><input name="city" value="Jaipur">
 <div class="row" style="margin-top:14px"><button class="btn full">Create</button><button type="button" class="btn sec" onclick="closeModal()">Cancel</button></div></form>`);
window.commCreateTeam=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  const {error}=await sb.from('teams').insert({name:f.name.trim(),sport:f.sport,city:f.city.trim()||'Jaipur'});
  if(error) return err(error.code==='23505'?{message:'A team with this name already exists'}:error);
  closeModal();toast('Team created');load();};
window.commJoin=async id=>{const {error}=await sb.rpc('join_team',{_t:id});if(error)return err(error);toast('Joined team');load()};
window.commLeave=async id=>{const {error}=await sb.rpc('leave_team',{_t:id});if(error)return err(error);toast('Left team');load()};
window.commDelTeam=async id=>{if(!confirm('Delete this team?'))return;const {error}=await sb.from('teams').delete().eq('id',id);if(error)return err(error);toast('Team deleted');load()};
window.commRoster=async id=>{const {data,error}=await sb.rpc('team_roster',{_t:id});if(error)return err(error);const t=C.teams.find(x=>x.id===id);
  openModal(`<h3>${esc(t?.name)} roster</h3><div style="display:grid;gap:8px;margin-top:10px">${(data||[]).map(p=>`<div class="row sb"><span>${esc(p.name)}${p.user_id===t?.captain_id?' <span class="badge a">Captain</span>':''}</span><span class="mut">${esc(p.skill_level)}</span></div>`).join('')}</div><button class="btn sec full" style="margin-top:14px" onclick="closeModal()">Close</button>`)};

function standings(t,fx){
  const ids=C.regs.filter(r=>r.tournament_id===t.id).map(r=>r.team_id),row={};
  ids.forEach(i=>row[i]={P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
  fx.filter(f=>f.status==='completed').forEach(f=>{const a=row[f.team_a],b=row[f.team_b];if(!a||!b)return;
    a.P++;b.P++;a.GF+=f.score_a;a.GA+=f.score_b;b.GF+=f.score_b;b.GA+=f.score_a;
    if(f.score_a>f.score_b){a.W++;b.L++;a.Pts+=3}else if(f.score_a<f.score_b){b.W++;a.L++;b.Pts+=3}else{a.D++;b.D++;a.Pts++;b.Pts++}});
  return Object.entries(row).sort((x,y)=>y[1].Pts-x[1].Pts||(y[1].GF-y[1].GA)-(x[1].GF-x[1].GA));
}
const tn=id=>esc((C.teams.find(t=>t.id===id)||{}).name||'Team');
function tourDetail(t){
  const fx=C.fixtures[t.id]||[],org=t.organizer_id===ME.id,regs=C.regs.filter(r=>r.tournament_id===t.id);
  const myCapt=C.teams.filter(x=>x.captain_id===ME.id&&x.sport===t.sport);
  const regIds=regs.map(r=>r.team_id);
  const rounds=[...new Set(fx.map(f=>f.round))];
  return `<div class="card pad" style="margin-top:14px"><div class="row sb wp"><div><h3>${esc(t.title)}</h3><div class="mut">${esc(t.sport)} · ${t.format==='league'?'League (round-robin)':'Knockout'} · ${t.start_date}${t.ground_id?' · '+esc(gName(t.ground_id)):''}</div></div><button class="btn sec sm" onclick="commOpen(null)">Back</button></div>
   <div style="margin:10px 0"><span class="badge g">${t.status}</span><span class="badge">Entry ₹${t.entry_fee}/team</span>${t.prize?`<span class="badge a">Prize: ${esc(t.prize)}</span>`:''}<span class="badge">${regs.length}/${t.max_teams} teams</span></div>
   ${t.description?`<p class="mut">${esc(t.description)}</p>`:''}
   <h4 style="margin:12px 0 6px">Registered teams</h4><div>${regs.length?regs.map(r=>`<span class="badge">${tn(r.team_id)}</span>`).join(''):'<span class="mut">No teams yet</span>'}</div>
   ${t.status==='registration'?`<div class="row wp" style="margin-top:12px">${myCapt.map(x=>regIds.includes(x.id)?`<button class="btn red sm" onclick="commWithdraw('${t.id}','${x.id}')">Withdraw ${esc(x.name)}</button>`:`<button class="btn sm" onclick="commRegister('${t.id}','${x.id}')">Register ${esc(x.name)}</button>`).join('')}
     ${!myCapt.length?`<span class="mut">Create a ${esc(t.sport)} team (as captain) to register.</span>`:''}
     ${org?`<button class="btn sm" onclick="commStart('${t.id}')">Start & generate fixtures</button><button class="btn red sm" onclick="commCancelTour('${t.id}')">Cancel</button>`:''}</div>`:''}
   ${t.format==='league'&&fx.length?`<h4 style="margin:16px 0 6px">Points table</h4><table style="width:100%;font-size:14px"><tr class="mut"><td>Team</td><td>P</td><td>W</td><td>D</td><td>L</td><td>GD</td><td><b>Pts</b></td></tr>${standings(t,fx).map(([id,s])=>`<tr><td>${tn(id)}</td><td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td><td>${s.GF-s.GA}</td><td><b>${s.Pts}</b></td></tr>`).join('')}</table>`:''}
   ${rounds.map(r=>`<h4 style="margin:16px 0 6px">${t.format==='league'?'Fixtures':'Round '+r}</h4>${fx.filter(f=>f.round===r).map(f=>`<div class="row sb wp" style="padding:8px 0;border-top:1px solid var(--line)"><span>${tn(f.team_a)} <b>${f.status==='completed'?f.score_a+' – '+f.score_b:'vs'}</b> ${tn(f.team_b)}</span>
     ${org&&t.status==='ongoing'&&f.status!=='completed'?`<form class="row" onsubmit="commResult(event,'${f.id}','${t.id}')"><input name="a" type="number" min="0" required style="width:60px"><input name="b" type="number" min="0" required style="width:60px"><button class="btn sm">Save</button></form>`:''}</div>`).join('')}`).join('')}
  </div>`;
}
function toursView(){
  if(C.open){const t=C.tours.find(x=>x.id===C.open);if(t)return tourDetail(t)}
  const card=t=>{const n=C.regs.filter(r=>r.tournament_id===t.id).length;return `<div class="card pad"><div class="row sb"><b>${esc(t.title)}</b><span class="badge ${t.status==='registration'?'g':t.status==='cancelled'?'r':'a'}">${t.status}</span></div>
   <div class="mut" style="margin:6px 0">${esc(t.sport)} · ${t.format} · ${t.start_date} · ${n}/${t.max_teams} teams</div><div class="mut">Entry ₹${t.entry_fee}${t.prize?' · Prize '+esc(t.prize):''}</div>
   <button class="btn sm" style="margin-top:10px" onclick="commOpen('${t.id}')">View</button></div>`};
  return `<div class="row sb wp" style="margin:16px 0"><h3>Tournaments & Leagues</h3><button class="btn sm" onclick="commNewTour()">+ Organize Tournament</button></div>
   <div class="grid">${C.tours.length?C.tours.map(card).join(''):empty('No tournaments yet','Organize a weekend cup or league for teams.')}</div>`;
}
window.commOpen=async id=>{C.open=id;if(id){const {data}=await sb.from('tournament_fixtures').select('*').eq('tournament_id',id).order('created_at');C.fixtures[id]=data||[]}render()};
window.commNewTour=()=>openModal(`<h3>Organize Tournament</h3><form onsubmit="commCreateTour(event)"><label>Title</label><input name="title" required minlength="3" maxlength="80">
 <label>Sport</label><select name="sport">${SPORTS.map(s=>`<option>${s}</option>`).join('')}</select>
 <label>Format</label><select name="format"><option value="league">League (round-robin, points table)</option><option value="knockout">Knockout (2/4/8/16 teams)</option></select>
 <label>Ground</label><select name="ground"><option value="">— Select later —</option>${(window.GROUNDS||[]).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select>
 <label>Start date</label><input type="date" name="date" min="${today()}" required><label>Max teams</label><input type="number" name="max" min="2" max="32" value="8">
 <label>Entry fee per team (₹)</label><input type="number" name="fee" min="0" value="0"><label>Prize</label><input name="prize" maxlength="80" placeholder="e.g. ₹5000 + trophy">
 <label>Description</label><textarea name="desc" maxlength="500"></textarea>
 <div class="row" style="margin-top:14px"><button class="btn full">Create</button><button type="button" class="btn sec" onclick="closeModal()">Cancel</button></div></form>`);
window.commCreateTour=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  const {error}=await sb.from('tournaments').insert({title:f.title.trim(),sport:f.sport,format:f.format,ground_id:f.ground||null,start_date:f.date,max_teams:+f.max,entry_fee:+f.fee,prize:f.prize.trim(),description:f.desc.trim()});
  if(error)return err(error);closeModal();toast('Tournament created');load()};
window.commRegister=async(t,team)=>{const {error}=await sb.rpc('register_team',{_t:t,_team:team});if(error)return err(error);toast('Team registered');await load();commOpen(t)};
window.commWithdraw=async(t,team)=>{const {error}=await sb.rpc('withdraw_team',{_t:t,_team:team});if(error)return err(error);toast('Team withdrawn');await load();commOpen(t)};
window.commStart=async t=>{const {error}=await sb.rpc('start_tournament',{_t:t});if(error)return err(error);toast('Fixtures generated');await load();commOpen(t)};
window.commCancelTour=async t=>{if(!confirm('Cancel this tournament?'))return;const {error}=await sb.from('tournaments').update({status:'cancelled'}).eq('id',t);if(error)return err(error);await load();commOpen(null)};
window.commResult=async(e,f,t)=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {error}=await sb.rpc('set_fixture_result',{_f:f,_a:+d.a,_b:+d.b});if(error)return err(error);toast('Result saved');await load();commOpen(t)};

function historyView(){
  const s=C.stats||{};
  return `<h3 style="margin:16px 0 10px">My Stats</h3><div class="grid">
   ${[['Matches played',s.matches_played||0],['Skill rating',s.avg_skill?s.avg_skill+' ★':'—'],['Sportsmanship',s.avg_sportsmanship?s.avg_sportsmanship+' ★':'—'],['Punctuality',s.avg_punctuality?s.avg_punctuality+' ★':'—'],['MVP awards','🏅 '+(s.mvp_count||0)]].map(([l,v])=>`<div class="card pad"><div class="mut">${l}</div><b class="brand" style="font-size:22px">${v}</b></div>`).join('')}</div>
   <h3 style="margin:22px 0 10px">Match History</h3><div style="display:grid;gap:10px">${C.history.length?C.history.map(m=>`<div class="card pad row sb wp"><div><b>${esc(m.title)}</b><div class="mut">${esc(m.sport)} · ${m.match_date} · ${esc(gName(m.ground_id))}${m.is_host?' · Host':''}</div></div>
   ${m.status!=='cancelled'?`<button class="btn sm" onclick="commRate('${m.match_id}')">Rate players / MVP</button>`:'<span class="badge r">Cancelled</span>'}</div>`).join(''):empty('No past matches yet','Play a match to rate teammates and earn MVP badges.')}</div>`;
}
const stars=(n,k,v)=>`<select name="${k}_${n}">${[5,4,3,2,1].map(i=>`<option value="${i}" ${(v||5)==i?'selected':''}>${'★'.repeat(i)}</option>`).join('')}</select>`;
window.commRate=async m=>{const {data,error}=await sb.rpc('rateable_players',{_m:m});if(error)return err(error);
  if(!data||!data.length)return toast('No other players to rate in this match',1);
  openModal(`<h3>Rate players</h3><p class="mut">Pick one MVP. Ratings stay anonymous.</p><form onsubmit="commSaveRate(event,'${m}')">${data.map((p,i)=>`<div class="card pad" style="margin-top:10px"><b>${esc(p.name)}</b><input type="hidden" name="u_${i}" value="${p.user_id}">
   <div class="row wp" style="gap:8px;margin-top:6px"><label>Skill ${stars(i,'s',p.my_skill)}</label><label>Sportsmanship ${stars(i,'g',p.my_sportsmanship)}</label><label>Punctuality ${stars(i,'p',p.my_punctuality)}</label>
   <label><input type="radio" name="mvp" value="${p.user_id}" ${p.my_mvp?'checked':''}> MVP</label></div></div>`).join('')}
   <input type="hidden" name="n" value="${data.length}"><div class="row" style="margin-top:14px"><button class="btn full">Submit ratings</button><button type="button" class="btn sec" onclick="closeModal()">Cancel</button></div></form>`)};
window.commSaveRate=async(e,m)=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  for(let i=0;i<+f.n;i++){const u=f['u_'+i];const {error}=await sb.rpc('rate_player',{_m:m,_u:u,_skill:+f['s_'+i],_sport:+f['g_'+i],_punct:+f['p_'+i],_mvp:f.mvp===u});if(error)return err(error)}
  closeModal();toast('Thanks! Ratings saved');load()};

views.community=function(){if(needLogin())return '';
  const body=C.tab==='teams'?teamsView():C.tab==='tours'?toursView():historyView();
  return `<div class="pg">${pageHead('Community','Teams, tournaments, ratings and your match history.')}<div class="row wp" style="gap:8px;margin-top:10px">${tabBtn('teams','🛡️ Teams')}${tabBtn('tours','🏆 Tournaments')}${tabBtn('history','⭐ History & Ratings')}</div>${body}</div>`};

const _chrome=window.chrome_orig||chrome;
window.chrome=chrome=function(){_chrome();const v=location.hash.slice(1),l=$('#links');if(l&&!l.querySelector('[data-comm]'))l.insertAdjacentHTML('beforeend',`<a data-comm class="${v==='community'?'on':''}" onclick="go('community')">Community</a>`)};

window.addEventListener('hashchange',()=>{if(location.hash==='#community')load()});
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN'||ev==='INITIAL_SESSION')setTimeout(load,600)});
sb.channel('comm-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'tournament_fixtures'},()=>{if(location.hash==='#community'){load();if(C.open)commOpen(C.open)}})
  .on('postgres_changes',{event:'*',schema:'public',table:'tournament_teams'},()=>{if(location.hash==='#community')load()}).subscribe();
if(location.hash==='#community')setTimeout(load,800);
chrome();
})();
