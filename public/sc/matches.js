/* ===================== SHARED MATCHES (Lovable Cloud) =====================
   Matches, participants and waitlists live in the online database and update live for everyone. */
(function () {
  let MUID = null, MCH2 = null, NAMES = {}, T = null;
  const err = e => toast((e && e.message || 'Something went wrong').replace(/^.*?: /, ''), 1);

  async function loadMatches() {
    if (!MUID) { S.matches.length = 0; return; }
    const [{ data: ms }, { data: ps }, { data: ws }] = await Promise.all([
      sb.from('matches').select('*').eq('status', 'open').gte('match_date', day(0)).order('match_date').order('start_hour').limit(300),
      sb.from('match_participants').select('match_id,user_id,spots,joined_at').order('joined_at'),
      sb.from('match_waitlist').select('match_id,user_id,created_at').order('created_at')]);
    const ids = new Set();
    (ms || []).forEach(m => ids.add(m.host_id)); (ps || []).forEach(p => ids.add(p.user_id)); (ws || []).forEach(w => ids.add(w.user_id));
    const need = [...ids].filter(i => !NAMES[i]);
    if (need.length) { const { data: pr } = await sb.from('profiles').select('id,name').in('id', need); (pr || []).forEach(p => NAMES[p.id] = p.name || 'Player'); }
    const nm = i => NAMES[i] || 'Player';
    const list = (ms || []).map(m => {
      const part = (ps || []).filter(p => p.match_id === m.id), joined = {};
      part.forEach(p => joined[p.user_id] = p.spots);
      return { id: m.id, title: m.title, sport: m.sport, gid: m.ground_id, date: m.match_date, start: m.start_hour, end: m.end_hour, max: m.max_players,
        fee: m.fee, skill: m.skill, desc: m.description, hostId: m.host_id, host: nm(m.host_id), joined,
        people: part.map(p => nm(p.user_id) + (p.spots > 1 ? ' +' + (p.spots - 1) : '')),
        cur: part.reduce((s, p) => s + p.spots, 0) };
    });
    S.matches.splice(0, S.matches.length, ...list);
    S.waitlists = {}; (ws || []).forEach(w => (S.waitlists[w.match_id] = S.waitlists[w.match_id] || []).push(w.user_id));
    paint();
  }
  function paint() {
    const v = location.hash.slice(1) || 'home';
    if (v === 'matches') { const e = $('#list'); if (e) e.innerHTML = LIST.m(); }
    else if (v === 'mymatches' || v === 'home') render();
  }
  const reload = () => { clearTimeout(T); T = setTimeout(loadMatches, 250); };

  async function onSession(session) {
    const uid = session && session.user ? session.user.id : null;
    if (uid === MUID) return;
    MUID = uid;
    if (MCH2) { sb.removeChannel(MCH2); MCH2 = null; }
    S.matches.length = 0; S.waitlists = {};
    if (!uid) { paint(); return; }
    MCH2 = sb.channel('sc-matches-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, ({ eventType, new: m }) => {
        if (eventType === 'INSERT' && m.host_id !== MUID) toast('⚽ New match posted: ' + m.title);
        reload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_participants' }, ({ eventType, new: p }) => {
        if (eventType === 'INSERT' && p.user_id !== MUID) {
          const m = S.matches.find(x => x.id === p.match_id);
          if (m && m.hostId === MUID) addNotification(`A player joined your match "${m.title}"`);
        }
        reload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_waitlist' }, reload)
      .subscribe();
    await loadMatches();
  }
  sb.auth.onAuthStateChange((ev, s) => setTimeout(() => onSession(s), 0));
  sb.auth.getSession().then(({ data }) => onSession(data.session));

  /* ---------- actions (replace the old device-only versions) ---------- */
  window.hostMatch = async function (e) {
    e.preventDefault(); if (needLogin()) return;
    const f = Object.fromEntries(new FormData(e.target)), er = [];
    if (f.title.trim().length < 3) er.push('Match name needs 3+ characters');
    if (f.date < day(0)) er.push('Date cannot be in the past');
    if (+f.end <= +f.start) er.push('End time must be after start time');
    if (+f.max < 2 || +f.max > 30) er.push('Players must be between 2 and 30');
    if (+f.fee < 0 || f.fee === '') er.push('Enter a match fee (0 or more)');
    if (er.length) { $('#herr').innerHTML = er.map(x => `<div class="err">• ${x}</div>`).join(''); return; }
    const b = e.target.querySelector('button[type=submit],button:not([type])'); if (b) b.disabled = true;
    const { error } = await sb.from('matches').insert({ host_id: MUID, title: f.title.trim(), sport: f.sport, ground_id: f.gid, match_date: f.date,
      start_hour: +f.start, end_hour: +f.end, max_players: +f.max, fee: +f.fee, skill: f.skill, description: (f.desc || '').trim().slice(0, 1000) });
    if (b) b.disabled = false;
    if (error) return err(error);
    addNotification(`Match "${f.title.trim()}" created. Need ${+f.max - 1} more players – invite some!`); toast('Match created!');
    await loadMatches(); go('mymatches');
  };
  window.joinMatch = function (id, n) {
    const m = mById(id);
    sb.rpc('join_match', { _m: id, _spots: n }).then(({ error }) => {
      if (error) return err(error);
      if (m) addNotification(`You joined "${m.title}"`);
      loadMatches();
    });
  };
  window.joinCheckout = function (id) {
    if (needLogin()) return; const m = mById(id); if (!m) return;
    if (m.joined[MUID]) return toast("You're already in this match", 1);
    CK = { kind: 'match', mid: id, players: 1, pay: 'UPI', max: m.max - m.cur }; matchModal();
  };
  window.leaveMatch = async function (id) {
    const m = mById(id); if (!m) return;
    const { error } = await sb.rpc('leave_match', { _m: id }); if (error) return err(error);
    S.bookings.forEach(b => { if (b.mid === id && b.status === 'Upcoming') b.status = 'Cancelled'; });
    addNotification(`You left "${m.title}"`); toast('You left the match'); await loadMatches(); render();
  };
  window.freeSpots = function (id, n, leaver) { if (leaver) sb.rpc('leave_match', { _m: id }).then(loadMatches); };
  window.cancelMatch = async function (id) {
    const m = mById(id); if (!m || !confirm(`Cancel "${m.title}" for everyone?`)) return;
    const { error } = await sb.from('matches').update({ status: 'cancelled' }).eq('id', id).eq('host_id', MUID);
    if (error) return err(error);
    toast('Match cancelled'); await loadMatches(); render();
  };
  window.joinWait = async function (id) {
    if (needLogin()) return;
    const { error } = await sb.rpc('join_waitlist', { _m: id }); if (error) return err(error);
    await loadMatches(); const pos = (S.waitlists[id] || []).indexOf(MUID) + 1;
    addNotification(`Waitlist position #${pos} for "${mById(id).title}"`); toast('Waitlist position: #' + pos);
  };
  window.leaveWait = async function (id) {
    const { error } = await sb.rpc('leave_waitlist', { _m: id }); if (error) return err(error);
    loadMatches();
  };

  /* ---------- views ---------- */
  window.matchCard = function (m) {
    const wl = S.waitlists[m.id] || [], joined = MUID && m.joined[MUID], host = m.hostId === MUID, pos = MUID ? wl.indexOf(MUID) + 1 : 0,
      full = m.cur >= m.max, left = m.max - m.cur, g = gr(m.gid) || { name: 'Ground', loc: '' };
    let act;
    if (host) act = `<div style="text-align:center;font-weight:700;color:var(--g);margin-bottom:8px">⭐ You're hosting</div><button class="btn sec full" onclick="cancelMatch('${m.id}')">Cancel Match</button>`;
    else if (joined) act = `<div style="text-align:center;font-weight:700;color:var(--g);margin-bottom:8px">✅ You're in</div><button class="btn sec full" onclick="leaveMatch('${m.id}')">Leave Match</button>`;
    else if (pos) act = `<div style="text-align:center;font-weight:800;color:#b45309;margin-bottom:8px">Waitlist Position: #${pos}</div><button class="btn sec full" onclick="leaveWait('${m.id}')">Leave Waitlist</button>`;
    else if (full) act = `<div style="text-align:center;font-weight:800;margin-bottom:8px">Match Full</div><button class="btn sec full" onclick="joinWait('${m.id}')">Join Waitlist (${wl.length} waiting)</button>`;
    else act = `${left <= 3 ? `<div style="text-align:center;font-weight:700;color:#b45309;margin-bottom:8px">🔥 Need ${left} more player${left > 1 ? 's' : ''}?</div>` : ''}<button class="btn full" onclick="joinCheckout('${m.id}')">Join Match</button>`;
    return `<div class="card pad"><span class="badge g">${SP[m.sport] || ''} ${esc(m.sport)}</span><span class="badge">${esc(m.skill)}</span><h3 style="font-size:20px;margin:6px 0">${esc(m.title)}</h3>
 <div class="mut">By ${esc(m.host)}<br>📍 ${esc(g.name)}, ${esc(g.loc)}<br>📅 ${fmtD(m.date)} · ⏰ ${hr(m.start)} – ${hr(m.end)}</div>
 <div class="dots">${[...Array(Math.min(m.max, 22))].map((_, i) => `<i class="${i < m.cur ? 'f' : ''}"></i>`).join('')}</div><b>👥 ${m.cur} / ${m.max} players</b>
 <div class="mut" style="margin-top:4px;font-size:13px">Players: ${m.people.map(esc).join(', ')}</div>
 ${feeBox(m.fee, 'Entry fee', 1).replace(/<div class="t">.*$/, `<div class="t"><span>You pay</span><span>₹${m.fee + FEE}</span></div></div>`)}<div style="margin-top:12px">${act}</div></div>`;
  };
  views.mymatches = () => {
    if (needLogin()) return '';
    const mine = S.matches.filter(m => m.hostId === MUID || m.joined[MUID]),
      sec = (t, a) => `<h3 style="margin:22px 0 10px">${t}</h3><div class="grid">${a.length ? a.map(matchCard).join('') : empty('No matches here', 'Create a match and invite players to get started.')}</div>`;
    return `<div class="pg">${pageHead('My Matches', 'Matches you host or have joined.')}${sec('Hosted', mine.filter(m => m.hostId === MUID))}${sec('Joined', mine.filter(m => m.hostId !== MUID))}</div>`;
  };
  const oldM = LIST.m;
  LIST.m = () => MUID ? oldM() : empty('Log in to see matches', 'Matches are shared between real players.', `<button class="btn" onclick="go('auth')">Sign up / Log in</button>`);
  window.loadMatches = loadMatches;
})();
