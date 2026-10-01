/* ===================== REAL USERS, PRESENCE & CHAT (Lovable Cloud) =====================
   Everything about people comes from the online database. No fake users, no bots. */
const sb = window.sb;
let CUR = null, ONLINE = new Set(), CONVS = [], ACTIVE = null, MSGS = [], UNREAD = 0, PCH = null, MCH = null, HB = null;
window.ME = null;

/* ---------- small helpers ---------- */
const view = () => location.hash.slice(1) || 'home';
const isOn = id => ONLINE.has(id);
function ago(t) {
  if (!t) return 'a while ago';
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
}
const statusTxt = p => isOn(p.id) ? '🟢 Online' : '⚪ Last active ' + ago(p.last_seen);
const fmtKm = k => k < 1 ? Math.max(100, Math.round(k * 10) * 100) + ' m' : km1(k) + ' km';
const distTxt = p => p.hidden ? '📍 Distance hidden' : p.km == null ? '📍 Distance unknown' : '📍 ' + fmtKm(p.km) + ' away';
const tm = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });

function mapP(r) {
  return { id: r.id, name: r.name || 'Player', photo: r.photo || '', loc: r.city || '—', sports: r.sports || [], sport: (r.sports && r.sports[0]) || '—',
    skill: r.skill_level, km: r.distance_km == null ? null : +r.distance_km, hidden: r.distance_hidden, last_seen: r.last_seen };
}

/* ---------- session ---------- */
async function loadMe(user) {
  let { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data) {
    const m = user.user_metadata || {};
    const ins = await sb.from('profiles').insert({ id: user.id, name: m.name || user.email.split('@')[0], city: m.city || null, sports: m.sports || [], skill_level: m.skill_level || 'Intermediate' }).select().single();
    data = ins.data;
  }
  if (!data) return;
  window.ME = { id: data.id, name: data.name, photo: data.photo || '', email: user.email, loc: data.city || '', city: data.city || '', sports: data.sports || [],
    sport: (data.sports || [])[0] || '', skill: data.skill_level, vis: data.location_sharing };
}
function teardown() {
  if (PCH) { sb.removeChannel(PCH); PCH = null; }
  if (MCH) { sb.removeChannel(MCH); MCH = null; }
  if (HB) { clearInterval(HB); HB = null; }
  ONLINE = new Set(); CONVS = []; ACTIVE = null; MSGS = []; UNREAD = 0;
}
async function handleSession(session) {
  const uid = session && session.user ? session.user.id : null;
  if (uid === CUR) return;
  CUR = uid; teardown();
  if (!uid) { window.ME = null; PLAYERS.length = 0; render(); return; }
  await loadMe(session.user);
  const pending = localStorage.getItem('sc_pending_photo');
  if (pending && ME && !ME.photo) { await sb.from('profiles').update({ photo: pending }).eq('id', uid); ME.photo = pending; }
  localStorage.removeItem('sc_pending_photo');
  if (LOC) await saveLoc(LOC.pos);
  startPresence(uid); subscribeMessages(uid);
  await Promise.all([loadPlayers(), loadConvs()]);
  if (view() === 'auth') go('home'); else render();
}
sb.auth.onAuthStateChange((ev, session) => { setTimeout(() => handleSession(session), 0); });
sb.auth.getSession().then(({ data }) => handleSession(data.session));

/* ---------- presence (real online status) ---------- */
const touch = () => CUR && sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', CUR).then(() => {});
function startPresence(uid) {
  PCH = sb.channel('sc-online', { config: { presence: { key: uid } } });
  PCH.on('presence', { event: 'sync' }, () => { ONLINE = new Set(Object.keys(PCH.presenceState())); refreshLive(); })
    .subscribe(async st => { if (st === 'SUBSCRIBED') await PCH.track({ at: Date.now() }); });
  touch(); HB = setInterval(touch, 60000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') touch(); });
window.addEventListener('pagehide', touch);

/* ---------- location (stored privately, only distance is ever shown) ---------- */
async function saveLoc(pos) {
  if (!CUR) return;
  const r = x => Math.round(x * 1000) / 1000; // ~100 m precision
  await sb.from('user_locations').upsert({ user_id: CUR, lat: r(pos[0]), lng: r(pos[1]), updated_at: new Date().toISOString() });
}
window.onLocSet = pos => { if (CUR) saveLoc(pos).then(loadPlayers); };
const _clearLoc = clearLoc;
clearLoc = function () { _clearLoc(); if (CUR) sb.from('user_locations').delete().eq('user_id', CUR).then(loadPlayers); };
function setVis(v) {
  if (needLogin()) { render(); return; }
  ME.vis = v; render();
  sb.from('profiles').update({ location_sharing: v }).eq('id', ME.id).then(({ error }) => {
    if (error) return toast('Could not save setting', 1);
    toast(v ? 'Other players can now see your approximate distance' : 'Your distance is now hidden'); loadPlayers();
  });
}
function LocationSettings() {
  const u = me(); if (!u) return '';
  return `<div class="card pad" style="margin-top:22px"><b>🔒 Location privacy</b><p class="mut" style="margin-top:4px">Your exact location, address or coordinates are never shown to anyone. Other players only see an approximate distance.</p>
  <label class="sw"><input type="checkbox" ${u.vis ? 'checked' : ''} onchange="setVis(this.checked)"><span>Show my approximate distance to other players</span></label>
  <p class="mut">${u.vis ? '🟢 ON — players see roughly how far you are.' : '🔒 OFF — players see "📍 Distance hidden".'}</p>
  <div class="row wp" style="margin-top:10px"><button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button><button class="btn sec sm" onclick="manualPicker()">Change area</button>${LOC ? '<button class="btn red sm" onclick="clearLoc()">Clear my location</button>' : ''}</div></div>`;
}

/* ---------- players ---------- */
async function loadPlayers() {
  if (!CUR) { PLAYERS.length = 0; return; }
  const { data, error } = await sb.rpc('list_players');
  if (error) { console.error(error); return; }
  PLAYERS.splice(0, PLAYERS.length, ...(data || []).map(mapP));
  refreshLive(true);
}
const byNear = (a, b) => (a.km == null ? 1e9 : a.km) - (b.km == null ? 1e9 : b.km);
PlayerCard = p => `<div class="card pad"><div class="row" style="cursor:pointer" onclick="viewProfile('${p.id}')">${avatar(p)}<div><b>${esc(p.name)}</b><div class="mut">${statusTxt(p)}</div><div class="mut">${distTxt(p)}${p.loc !== '—' ? ' · ' + esc(p.loc) : ''}</div></div></div>
 <div style="margin:12px 0">${p.sports.map(s => `<span class="badge g">${SP[s] || ''} ${esc(s)}</span>`).join('')}<span class="badge">${esc(p.skill)}</span></div>
 <div class="row"><button class="btn sec" onclick="viewProfile('${p.id}')">Profile</button><button class="btn full" onclick="openChat('${p.id}')">💬 Chat</button></div></div>`;
NearbyPlayers = a => a.length ? a.map(PlayerCard).join('') : empty(`No players within ${N.r} km yet`, 'Only real players who share their approximate distance appear here.');
nbP = () => PLAYERS.filter(p => p.km != null && p.km <= N.r && (!N.sport || p.sports.includes(N.sport)) && (!N.skill || p.skill === N.skill) && (!N.av || N.av !== 'now' || isOn(p.id))).sort(byNear);
LIST.p = () => {
  if (!me()) return empty('Log in to see players', 'Only real registered players are shown.', `<button class="btn" onclick="go('auth')">Sign up / Log in</button>`);
  const f = F.p, q = (f.q || '').toLowerCase();
  let r = PLAYERS.filter(p => (!f.sport || p.sports.includes(f.sport)) && (!f.loc || p.loc === f.loc) && (!f.skill || p.skill === f.skill) &&
    (!f.on || isOn(p.id)) && (!f.dist || (p.km != null && p.km <= +f.dist)) && (!q || (p.name + p.sports.join(' ') + p.loc).toLowerCase().includes(q)));
  if (f.sort === 'near') r = [...r].sort(byNear);
  if (!PLAYERS.length) return empty('No players nearby yet', 'Share the website with friends — once they sign up they appear here.');
  return r.length ? r.map(PlayerCard).join('') : empty('No players found', 'Try widening your filters.', clr('p'));
};
views.players = () => {
  const f = F.p, cities = [...new Set(PLAYERS.map(p => p.loc).filter(x => x !== '—'))];
  return `<div class="pg">${pageHead('Find Players', 'Real registered players — search by sport, skill, city and distance.')}<div class="filters"><input placeholder="🔍 Search name, sport, city" value="${esc(f.q || '')}" oninput="setF('p','q',this.value)">
 ${sel('p', 'sport', SPN, 'All sports')}${sel('p', 'loc', cities, 'Any city')}${sel('p', 'skill', SKL, 'Any skill')}
 <select onchange="setF('p','dist',this.value)"><option value="">Any distance</option>${[1, 3, 5, 10].map(d => `<option value="${d}" ${f.dist == d ? 'selected' : ''}>≤ ${d} km</option>`).join('')}</select>
 <select onchange="setF('p','on',this.value)"><option value="">Online or offline</option><option value="1" ${f.on ? 'selected' : ''}>🟢 Online now</option></select>${clr('p')}</div>${nmBar('p')}${LIST.p()}</div></div>`;
};
function viewProfile(id) {
  const p = PLAYERS.find(x => x.id === id); if (!p) return;
  openModal(`<div class="row">${avatar(p)}<div><h2 class="brand" style="font-size:24px">${esc(p.name)}</h2><div class="mut">${statusTxt(p)}</div></div></div>
 <div style="margin:14px 0">${p.sports.map(s => `<span class="badge g">${SP[s] || ''} ${esc(s)}</span>`).join('')}<span class="badge">${esc(p.skill)}</span></div>
 <div class="fee"><div><span>Distance</span><b>${distTxt(p).replace('📍 ', '')}</b></div><div><span>City</span><b>${esc(p.loc)}</b></div><div><span>Last active</span><b>${isOn(p.id) ? 'Now' : ago(p.last_seen)}</b></div></div>
 <p class="mut" style="margin-top:10px">Only approximate distance is shown. Exact location is never shared.</p>
 <div class="row" style="margin-top:16px"><button class="btn sec full" onclick="closeModal();invite('${p.id}')">⚽ Invite to Match</button><button class="btn full" onclick="closeModal();openChat('${p.id}')">💬 Chat</button></div>`);
}
async function invite(pid) {
  if (needLogin()) return;
  const p = PLAYERS.find(x => x.id === pid);
  const c = await dm(pid); if (!c) return;
  const { error } = await sb.from('messages').insert({ conversation_id: c, sender_id: CUR, message: '⚽ Hey! Want to play a match together? Let me know a time that works.' });
  if (error) return toast('Could not send invite', 1);
  toast('Invitation sent to ' + (p ? p.name : 'player'));
  ACTIVE = c; go('messages'); loadThread();
}

/* ---------- chat ---------- */
async function dm(other) {
  const { data, error } = await sb.rpc('get_or_create_dm', { _other: other });
  if (error) { toast('Could not open chat', 1); return null; }
  return data;
}
async function openChat(other) { if (needLogin()) return; const c = await dm(other); if (!c) return; ACTIVE = c; MSGS = []; go('messages'); await loadConvs(); loadThread(); }
function openConv(c) { ACTIVE = c; MSGS = []; render(); loadThread(); }
function closeConv() { ACTIVE = null; render(); }
async function loadConvs() {
  if (!CUR) return;
  const { data: mem } = await sb.from('conversation_members').select('conversation_id,user_id');
  const other = {}; (mem || []).forEach(m => { if (m.user_id !== CUR) other[m.conversation_id] = m.user_id; });
  const ids = Object.keys(other);
  if (!ids.length) { CONVS = []; UNREAD = 0; refreshLive(); return; }
  const [{ data: msgs }, { data: profs }] = await Promise.all([
    sb.from('messages').select('id,conversation_id,sender_id,message,created_at,read_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(1000),
    sb.from('profiles').select('id,name,photo,last_seen').in('id', Object.values(other))]);
  const pm = {}; (profs || []).forEach(p => pm[p.id] = p);
  CONVS = ids.map(id => {
    const ms = (msgs || []).filter(m => m.conversation_id === id);
    return { id, other: pm[other[id]] || { id: other[id], name: 'Player' }, last: ms[0] || null, unread: ms.filter(m => m.sender_id !== CUR && !m.read_at).length };
  }).filter(c => c.last || c.id === ACTIVE).sort((a, b) => new Date(b.last ? b.last.created_at : 0) - new Date(a.last ? a.last.created_at : 0));
  UNREAD = CONVS.reduce((s, c) => s + c.unread, 0);
  refreshLive();
}
async function loadThread() {
  if (!ACTIVE) return;
  const c = ACTIVE;
  const { data } = await sb.from('messages').select('id,conversation_id,sender_id,message,created_at,read_at').eq('conversation_id', c).order('created_at', { ascending: true }).limit(500);
  if (c !== ACTIVE) return;
  MSGS = data || []; paintThread();
  if (MSGS.some(m => m.sender_id !== CUR && !m.read_at)) { await sb.rpc('mark_read', { _conv: c }); loadConvs(); }
}
function subscribeMessages(uid) {
  MCH = sb.channel('sc-msgs-' + uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
    const here = m.conversation_id === ACTIVE && view() === 'messages' && document.visibilityState === 'visible';
    if (m.conversation_id === ACTIVE && !MSGS.some(x => x.id === m.id)) { MSGS.push(m); paintThread(); }
    if (m.sender_id !== CUR) {
      if (here) sb.rpc('mark_read', { _conv: m.conversation_id }).then(loadConvs);
      else {
        const c = CONVS.find(x => x.id === m.conversation_id), n = c ? c.other.name : 'a player';
        toast('💬 New message from ' + n); addNotification(`New message from ${n}: "${m.message.slice(0, 60)}"`);
      }
    }
    loadConvs();
  }).subscribe();
}
async function sendMsg(e) {
  e.preventDefault();
  const inp = e.target.msg, t = inp.value.trim(); if (!t || !ACTIVE) return;
  inp.value = '';
  const { data, error } = await sb.from('messages').insert({ conversation_id: ACTIVE, sender_id: CUR, message: t.slice(0, 2000) }).select().single();
  if (error) { inp.value = t; return toast('Message not sent', 1); }
  if (!MSGS.some(x => x.id === data.id)) { MSGS.push(data); paintThread(); }
  loadConvs();
}
const convList = () => CONVS.length ? CONVS.map(c => `<div class="ci ${c.id === ACTIVE ? 'on' : ''}" onclick="openConv('${c.id}')">${avatar(c.other)}<div class="t"><div><b>${isOn(c.other.id) ? '🟢 ' : ''}${esc(c.other.name)}</b></div><div class="mut">${c.last ? (c.last.sender_id === CUR ? 'You: ' : '') + esc(c.last.message) : 'No messages yet'}</div></div><div style="text-align:right"><div class="mut" style="font-size:12px">${c.last ? ago(c.last.created_at) : ''}</div>${c.unread ? `<em class="ub">${c.unread}</em>` : ''}</div></div>`).join('')
  : `<div class="pad mut" style="text-align:center"><b style="display:block;color:var(--ink);margin-bottom:4px">No conversations yet</b>Open a player's profile and tap 💬 Chat.<div style="margin-top:12px"><button class="btn sm" onclick="go('players')">Find Players</button></div></div>`;
function threadHead() {
  const c = CONVS.find(x => x.id === ACTIVE); if (!c) return '';
  return `<button class="btn sec sm cback" onclick="closeConv()">←</button>${avatar(c.other)}<div><b>${esc(c.other.name)}</b><div class="mut" style="font-size:13px">${statusTxt(c.other)}</div></div>`;
}
function paintThread() {
  const box = $('#msgs'); if (!box) return;
  box.innerHTML = MSGS.length ? MSGS.map(m => `<div class="bb ${m.sender_id === CUR ? 'me' : ''}">${esc(m.message)}<small>${tm(m.created_at)}${m.sender_id === CUR && m.read_at ? ' · Seen' : ''}</small></div>`).join('') : '<p class="mut" style="text-align:center;margin:auto">Say hi 👋</p>';
  box.scrollTop = box.scrollHeight;
}
views.messages = () => {
  if (needLogin()) return '';
  return `<div class="pg">${pageHead('Messages', 'Real 1-to-1 conversations with players.')}<div class="chat ${ACTIVE ? 'has' : ''}"><div class="clist" id="clist">${convList()}</div>
  <div class="cthread">${ACTIVE ? `<div class="th" id="thead">${threadHead()}</div><div class="msgs" id="msgs"><p class="mut" style="margin:auto">Loading…</p></div>
  <form class="cin" onsubmit="sendMsg(event)"><input name="msg" placeholder="Type a message..." autocomplete="off" maxlength="2000"><button class="btn">Send</button></form>`
      : '<div style="margin:auto;text-align:center" class="mut pad"><div style="font-size:44px">💬</div>Select a conversation</div>'}</div></div></div>`;
};

/* ---------- live refresh without wiping what the user is typing ---------- */
function refreshLive(full) {
  const v = view();
  if (v === 'players') { const e = $('#list'); if (e) e.innerHTML = LIST.p(); }
  else if (v === 'nearby') { const e = $('#nbP'); if (e) e.innerHTML = NearbyPlayers(nbP()); }
  else if (v === 'messages') { const l = $('#clist'); if (l) l.innerHTML = convList(); const h = $('#thead'); if (h) h.innerHTML = threadHead(); }
  else if (full && v === 'home') render();
  chrome();
}

/* ---------- auth ---------- */
views.auth = () => {
  if (me()) return `<div class="pg">${empty('You are logged in', 'Welcome back, ' + esc(me().name) + '!', `<button class="btn" onclick="go('home')">Go home</button>`)}</div>`;
  const o = (a, v) => a.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  return `<div class="pg"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
 <form class="card pad" onsubmit="signup(event)"><h2 class="brand">Create account</h2><p class="mut">A real account — your friends can find you and chat with you.</p>
 <label>Full name</label><input name="name" required><label>Email</label><input name="email" type="email" required>
 <label>Password</label><input name="password" type="password" minlength="6" required><label>Confirm password</label><input name="password2" type="password" minlength="6" required>
 <label>City</label><input name="city" value="Jaipur" required><label>Sports you play</label><div class="sp-chk">${SPN.map(s => `<label><input type="checkbox" name="sports" value="${s}">${SP[s]} ${s}</label>`).join('')}</div>
 <label>Skill level</label><select name="skill">${o(SKL, 'Intermediate')}</select><label>Profile photo (optional, &lt;150 KB)</label><input name="photo" type="file" accept="image/*">
 <div id="aerr"></div><button class="btn full" style="margin-top:16px">Sign up</button></form>
 <form class="card pad" onsubmit="login(event)" style="align-self:start"><h2 class="brand">Log in</h2><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><div id="lerr"></div><button class="btn full" style="margin-top:16px">Log in</button></form></div></div>`;
};
async function signup(e) {
  e.preventDefault();
  const fm = e.target, fd = new FormData(fm), f = Object.fromEntries(fd), sports = fd.getAll('sports'), er = [];
  if (f.name.trim().length < 2) er.push('Enter your full name');
  if (!/^\S+@\S+\.\S+$/.test(f.email)) er.push('Enter a valid email');
  if (f.password.length < 6) er.push('Password needs 6+ characters');
  if (f.password !== f.password2) er.push('Passwords do not match');
  if (!f.city.trim()) er.push('Enter your city');
  if (!sports.length) er.push('Pick at least one sport');
  const file = fm.photo.files[0];
  if (file && file.size > 150000) er.push('Photo must be under 150 KB');
  if (er.length) { $('#aerr').innerHTML = er.map(x => `<div class="err">• ${x}</div>`).join(''); return; }
  const btn = fm.querySelector('button.btn'); btn.disabled = true; btn.textContent = 'Creating account…';
  if (file) localStorage.setItem('sc_pending_photo', await readFile(file));
  const { data, error } = await sb.auth.signUp({ email: f.email.trim().toLowerCase(), password: f.password,
    options: { emailRedirectTo: location.origin, data: { name: f.name.trim(), city: f.city.trim(), sports, skill_level: f.skill } } });
  btn.disabled = false; btn.textContent = 'Sign up';
  if (error) { $('#aerr').innerHTML = `<div class="err">• ${esc(error.message)}</div>`; return; }
  if (data.user && data.user.identities && !data.user.identities.length) { $('#aerr').innerHTML = '<div class="err">• This email is already registered — please log in.</div>'; return; }
  if (!data.session) openModal(`<div style="text-align:center"><div style="font-size:54px">📧</div><h2 class="brand">Check your email</h2><p class="mut" style="margin:8px 0 16px">We sent a confirmation link to <b>${esc(f.email)}</b>. Click it to activate your account, then log in.</p><button class="btn full" onclick="closeModal()">OK</button></div>`);
  else toast('Welcome to Sports Connect, ' + f.name.trim().split(' ')[0] + '!');
}
async function login(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const { error } = await sb.auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.password });
  if (error) { $('#lerr').innerHTML = `<div class="err">${/confirm/i.test(error.message) ? 'Please confirm your email first (check your inbox).' : 'Incorrect email or password'}</div>`; return; }
  toast('Logged in');
}
async function logout() {
  await touch(); if (PCH) await PCH.untrack();
  await sb.auth.signOut(); toast('Logged out'); go('home');
}

/* ---------- profile ---------- */
views.profile = () => {
  const u = me(); if (!u) { needLogin(); return ''; }
  const o = (a, v) => a.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  return `<div class="pg" style="max-width:560px;margin:auto"><form class="card pad" onsubmit="saveProfile(event)"><div class="row">${avatar(u)}<div><h2 class="brand" style="font-size:24px">${esc(u.name)}</h2><div class="mut">${esc(u.email)} · 🟢 Online</div></div></div>
 <label>Full name</label><input name="name" value="${esc(u.name)}"><label>City</label><input name="city" value="${esc(u.city)}">
 <label>Sports you play</label><div class="sp-chk">${SPN.map(s => `<label><input type="checkbox" name="sports" value="${s}" ${u.sports.includes(s) ? 'checked' : ''}>${SP[s]} ${s}</label>`).join('')}</div>
 <label>Skill</label><select name="skill">${o(SKL, u.skill)}</select><label>Change profile photo (&lt;150 KB)</label><input name="photo" type="file" accept="image/*">
 <div class="row" style="margin-top:16px"><button class="btn full">Save profile</button><button type="button" class="btn red" onclick="logout()">Log out</button></div></form>${LocationSettings()}</div>`;
};
async function saveProfile(e) {
  e.preventDefault();
  const fm = e.target, fd = new FormData(fm), f = Object.fromEntries(fd), sports = fd.getAll('sports');
  if (f.name.trim().length < 2) return toast('Name too short', 1);
  const upd = { name: f.name.trim(), city: f.city.trim() || null, sports, skill_level: f.skill }, file = fm.photo.files[0];
  if (file) { if (file.size > 150000) return toast('Photo must be under 150 KB', 1); upd.photo = await readFile(file); }
  const { error } = await sb.from('profiles').update(upd).eq('id', CUR);
  if (error) return toast('Could not save profile', 1);
  Object.assign(ME, { name: upd.name, city: upd.city || '', loc: upd.city || '', sports, sport: sports[0] || '', skill: upd.skill_level }, upd.photo ? { photo: upd.photo } : {});
  toast('Profile updated'); render();
}

/* ---------- navigation: Messages with real unread count ---------- */
NAV.splice(5, 0, ['messages', 'Messages', '💬']);
const _chrome2 = chrome;
chrome = function () {
  _chrome2();
  const v = view(), b = UNREAD ? ` <em class="ub">${UNREAD}</em>` : '';
  $('#links').insertAdjacentHTML('beforeend', `<a class="${v === 'messages' ? 'on' : ''}" onclick="go('messages')">Messages${b}</a>`);
  const bm = [...document.querySelectorAll('#bot a')].find(a => a.getAttribute('onclick') === "go('messages')");
  if (bm && UNREAD) bm.insertAdjacentHTML('beforeend', `<em class="ub">${UNREAD}</em>`);
  if (me()) { const bell = $('#right .ib'); if (bell) bell.insertAdjacentHTML('beforebegin', `<button class="ib" onclick="go('messages')" aria-label="Messages">💬${UNREAD ? `<em>${UNREAD}</em>` : ''}</button>`); }
};
const _render2 = render;
render = function () { _render2(); if (view() === 'messages' && ACTIVE) paintThread(); };
window.addEventListener('hashchange', () => { if (view() !== 'messages') ACTIVE = null; });
render();
