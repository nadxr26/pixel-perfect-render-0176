/* ===================== SHARED MATCHES (Lovable Cloud) =====================
   Matches, participants and waitlists live in the online database and update live for everyone. */
(function () {
  let MUID = null, MCH2 = null, NAMES = {}, T = null;
  const err = e => toast((e && e.message || 'Something went wrong').replace(/^.*?: /, ''), 1);

  let SEQ = 0;
  async function loadMatches() {
    if (!MUID) { S.matches.length = 0; return; }
    const seq = ++SEQ;
    const { data: rows, error } = await sb.from('matches')
      .select('*, match_participants(user_id,spots,joined_at,payment_status,amount,paid_at), match_waitlist(user_id,created_at)')
      .in('status', ['open', 'cancelled']).gte('match_date', day(0)).order('match_date').order('start_hour').limit(300)
      .order('joined_at', { referencedTable: 'match_participants' }).order('created_at', { referencedTable: 'match_waitlist' });
    if (seq !== SEQ) return; // a newer load already started; ignore this stale response
    if (error) { console.error('[matches] load failed', error); return; }
    const ms = (rows || []).filter(m => m.status === 'open' || m.host_id === MUID || (m.match_participants || []).some(p => p.user_id === MUID)), ps = [], ws = [];
    ms.forEach(m => { (m.match_participants || []).forEach(p => ps.push({ ...p, match_id: m.id })); (m.match_waitlist || []).forEach(w => ws.push({ ...w, match_id: m.id })); });
    const ids = new Set();
    (ms || []).forEach(m => ids.add(m.host_id)); (ps || []).forEach(p => ids.add(p.user_id)); (ws || []).forEach(w => ids.add(w.user_id));
    const need = [...ids].filter(i => !NAMES[i]);
    if (need.length) { const { data: pr } = await sb.from('profiles').select('id,name').in('id', need); (pr || []).forEach(p => NAMES[p.id] = p.name || 'Player'); }
    if (seq !== SEQ) return;
    const nm = i => NAMES[i] || 'Player';
    const list = (ms || []).map(m => {
      const part = (ps || []).filter(p => p.match_id === m.id), joined = {};
      part.forEach(p => joined[p.user_id] = p.spots);
      return { id: m.id, title: m.title, sport: m.sport, gid: m.ground_id, date: m.match_date, start: m.start_hour, end: m.end_hour, max: m.max_players,
        fee: m.fee, skill: m.skill, desc: m.description, hostId: m.host_id, host: nm(m.host_id), joined,
        people: part.map(p => nm(p.user_id) + (p.spots > 1 ? ' +' + (p.spots - 1) : '')),
        cur: part.reduce((s, p) => s + p.spots, 0), status: m.status, bookingId: m.booking_id, groundPrice: m.ground_price, app: m.amount_per_player,
        players: part.map(p => ({ id: p.user_id, name: nm(p.user_id), pay: p.payment_status, amount: p.amount ?? m.amount_per_player })) };
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
      .subscribe(st => { if (st === 'SUBSCRIBED') loadMatches(); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') console.warn('[matches] realtime', st); });
    await loadMatches();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && MUID) reload(); });
  sb.auth.onAuthStateChange((ev, s) => setTimeout(() => onSession(s), 0));
  sb.auth.getSession().then(({ data }) => onSession(data.session));

  /* ---------- actions (replace the old device-only versions) ---------- */
  let HOSTING = false;
  window.hostMatch = async function (e) {
    e.preventDefault(); if (needLogin() || HOSTING) return;
    const f = Object.fromEntries(new FormData(e.target)), er = [];
    if (f.title.trim().length < 3) er.push('Match name needs 3+ characters');
    if (f.date < day(0)) er.push('Date cannot be in the past');
    if (+f.end <= +f.start) er.push('End time must be after start time');
    if (+f.max < 2 || +f.max > 30) er.push('Players must be between 2 and 30');
    if (+f.fee < 0 || f.fee === '') er.push('Enter a match fee (0 or more)');
    if (er.length) { $('#herr').innerHTML = er.map(x => `<div class="err">• ${x}</div>`).join(''); return; }
    const b = e.target.querySelector('button[type=submit],button:not([type])'); if (b) b.disabled = true;
    HOSTING = true;
    const { error } = await sb.from('matches').insert({ host_id: MUID, title: f.title.trim(), sport: f.sport, ground_id: f.gid, match_date: f.date,
      start_hour: +f.start, end_hour: +f.end, max_players: +f.max, fee: +f.fee, booking_id: f.booking_id || null, skill: f.skill, description: (f.desc || '').trim().slice(0, 1000) });
    HOSTING = false; if (b) b.disabled = false;
    if (error) return err(error);
    window.PREBOOK = null;
    addNotification(`Match "${f.title.trim()}" created. Need ${+f.max - 1} more players – invite some!`); toast('Match created!');
    await loadMatches(); go('mymatches');
  };
  window.joinMatch = async function (id, n) {
    const m = mById(id);
    const { error } = await sb.rpc('join_match', { _m: id, _spots: n });
    if (error) { err(error); await loadMatches(); return false; }
    if (m) addNotification(`You joined "${m.title}"`);
    await loadMatches();
    return true;
  };
  window.joinCheckout = function (id) {
    if (needLogin()) return; const m = mById(id); if (!m) return;
    if (m.joined[MUID]) return toast("You're already in this match", 1);
    if (m.bookingId) { if (m.hostId === MUID) return toast("You're the host of this match", 1); return joinBooked(id); }
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
  /* ---------- booked matches: cost split, demo payment, host management ---------- */
  async function joinBooked(id) {
    const m = mById(id); if (!m || !confirm(`Join "${m.title}"? Your share will be ₹${m.app}. You pay only once all ${m.max} players have joined.`)) return;
    if (await joinMatch(id, 1)) toast('You joined the match!');
  }
  window.payDemo = async function (id) {
    const { error } = await sb.rpc('pay_demo', { _m: id }); if (error) return err(error);
    toast('Demo payment successful! No real money charged.'); addNotification('Demo payment successful — no real money charged.'); await loadMatches(); render();
  };
  window.removePlayer = async function (id, uid) {
    if (!confirm('Remove this player from the match?')) return;
    const { error } = await sb.rpc('remove_player', { _m: id, _u: uid }); if (error) return err(error);
    toast('Player removed'); await loadMatches(); if (document.getElementById('mgr')) manageMatch(id);
  };
  const PB = { paid: '<span class="badge g">✓ Paid</span>', payment_required: '<span class="badge a">⏳ Payment Required</span>', pending: '<span class="badge">Waiting for players</span>' };
  const demoNote = '<div class="fee" style="margin-top:8px"><b>Demo Payment</b><div class="mut">No real money will be charged. This is only for testing Sports Connect.</div></div>';
  window.manageMatch = function (id) {
    const m = mById(id); if (!m) return;
    const paid = m.players.filter(p => p.pay === 'paid').length, exp = m.max * m.app, got = paid * m.app;
    openModal(`<div id="mgr"><h2 class="brand">Manage Match</h2><p class="mut">${esc(m.title)}</p>
    <div class="fee"><div><span>Players</span><b>${m.cur} / ${m.max}</b></div><div><span>Total Expected</span><b>₹${exp}</b></div><div><span>Total Paid</span><b>₹${got}</b></div><div class="t"><span>Total Pending</span><span>₹${exp - got}</span></div></div>
    <h3 style="margin:16px 0 8px">Players</h3>${m.players.length ? m.players.map(p => `<div class="row sb" style="padding:8px 0;border-bottom:1px solid #f3f4f6"><b>${esc(p.name)}</b><span class="row">${PB[p.pay] || ''}<button class="btn red sm" onclick="removePlayer('${m.id}','${p.id}')">Remove</button></span></div>`).join('') : '<p class="mut">No players yet.</p>'}
    <p class="mut" style="margin-top:10px;font-size:13px">DEMO PAYMENT — NO REAL MONEY CHARGED</p><button class="btn sec full" style="margin-top:12px" onclick="closeModal()">Close</button></div>`);
  };
  function bookedCard(m) {
    const g = gr(m.gid) || { name: 'Ground', loc: '' }, host = m.hostId === MUID, me = m.players.find(p => p.id === MUID), full = m.cur >= m.max, left = m.max - m.cur, cx = m.status === 'cancelled';
    const st = cx ? '<span class="badge r">❌ Cancelled</span>' : full ? '<span class="badge" style="background:#eff6ff;color:#1d4ed8">🔵 Match Full</span>' : left <= Math.max(2, Math.ceil(m.max * .2)) ? '<span class="badge a">🟡 Almost Full</span>' : '<span class="badge g">🟢 Filling Players</span>';
    let act;
    if (cx) act = '<div style="text-align:center;font-weight:800;color:#dc2626">MATCH CANCELLED</div>';
    else if (host) act = `<div style="text-align:center;font-weight:700;color:var(--g);margin-bottom:8px">⭐ You're hosting</div><div class="row"><button class="btn full" onclick="manageMatch('${m.id}')">Manage Match</button><button class="btn sec" onclick="cancelMatch('${m.id}')">Cancel Match</button></div>`;
    else if (me) act = me.pay === 'paid' ? `<div style="text-align:center;font-weight:800;color:var(--g)">✓ Paid</div><p class="mut" style="text-align:center;font-size:13px">DEMO PAYMENT — NO REAL MONEY CHARGED</p>`
      : full ? `<div style="text-align:center;font-weight:800">MATCH FULL 🎉</div><div style="text-align:center">Your Amount: <b>₹${me.amount}</b> · ⏳ Payment Required</div>${demoNote}<button class="btn full" style="margin-top:8px" onclick="payDemo('${m.id}')">Pay ₹${me.amount} (Demo)</button>`
      : `<div style="text-align:center;font-weight:700;color:var(--g);margin-bottom:6px">✅ You're in</div><p class="mut" style="text-align:center;font-size:13px">Payment will be available when all ${m.max} players join.</p><button class="btn sec full" onclick="leaveMatch('${m.id}')">Leave Match</button>`;
    else if (full) act = '<div style="text-align:center;font-weight:800">MATCH FULL 🎉</div>';
    else act = `<button class="btn full" onclick="joinCheckout('${m.id}')">Join Match</button>`;
    return `<div class="card pad"><span class="badge g">${SP[m.sport] || ''} ${esc(m.sport)}</span>${st}<h3 style="font-size:20px;margin:6px 0">${esc(m.title)}</h3>
 <div class="mut">Hosted by ${esc(m.host)}<br>📍 ${esc(g.name)}${g.loc ? ', ' + esc(g.loc) : ''}<br>📅 ${fmtD(m.date)} · ⏰ ${hr(m.start)} – ${hr(m.end)}</div>
 <div class="dots">${[...Array(Math.min(m.max, 30))].map((_, i) => `<i class="${i < m.cur ? 'f' : ''}"></i>`).join('')}</div><b>👥 ${m.cur} / ${m.max} Players Joined</b>
 ${m.players.length ? `<div class="mut" style="margin-top:4px;font-size:13px">Players: ${m.players.map(p => esc(p.name)).join(', ')}</div>` : ''}
 <div class="fee" style="margin-top:10px"><div><span>Ground Booking</span><b>₹${m.groundPrice}</b></div><div><span>Players</span><b>${m.max}</b></div><div><span>Ground Share</span><b>₹${m.app - FEE}/player</b></div><div><span>Sports Connect Fee</span><b>₹${FEE}/player</b></div><div class="t"><span>You Pay</span><span>₹${m.app}</span></div></div>
 <div style="margin-top:12px">${act}</div></div>`;
  }
  window.matchCard = function (m) {
    if (m.bookingId) return bookedCard(m);
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
