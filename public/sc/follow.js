/* ===================== FOLLOW SYSTEM (Lovable Cloud) =====================
   Relationships live in the `follows` table (RLS: you can only follow/unfollow as yourself).
   Buttons are rendered by followBtn(); real.js calls it on player cards and the profile modal. */
(function () {
  let FUID = null, FCH = null, FT = null, SEQ = 0, LOADED = false, LOADERR = null, TAB = 'followers';
  let FOLLOWING = new Map(), FOLLOWERS = new Map();      // other user's id -> created_at
  const BUSY = new Set(), EXTRA = {};                     // EXTRA: profiles not present in PLAYERS
  const prof = id => PLAYERS.find(p => p.id === id) || EXTRA[id] || { id, name: 'Player', photo: '', sports: [] };
  const msg = e => ((e && e.message) || 'Something went wrong').replace(/^.*?: /, '');

  /* ---------- data ---------- */
  async function loadFollows() {
    if (!FUID) { FOLLOWING = new Map(); FOLLOWERS = new Map(); LOADED = false; paint(); return; }
    const seq = ++SEQ;
    const { data, error } = await sb.from('follows').select('follower_id,following_id,created_at')
      .or(`follower_id.eq.${FUID},following_id.eq.${FUID}`).order('created_at', { ascending: false }).limit(5000);
    if (seq !== SEQ) return;                              // stale response
    if (error) { console.error('[follow] load failed', error); LOADERR = msg(error); LOADED = true; paint(); return; }
    LOADERR = null; FOLLOWING = new Map(); FOLLOWERS = new Map();
    (data || []).forEach(r => { if (r.follower_id === FUID) FOLLOWING.set(r.following_id, r.created_at); else FOLLOWERS.set(r.follower_id, r.created_at); });
    LOADED = true;
    const missing = [...FOLLOWING.keys(), ...FOLLOWERS.keys()].filter(id => !PLAYERS.some(p => p.id === id) && !EXTRA[id]);
    if (missing.length) {
      const { data: pr } = await sb.from('profiles').select('id,name,photo').in('id', missing);
      (pr || []).forEach(p => EXTRA[p.id] = { id: p.id, name: p.name || 'Player', photo: p.photo || '', sports: [] });
      if (seq !== SEQ) return;
    }
    paint(); screens();
  }
  const screens = () => {                                  // lists/cards drawn before the data arrived need a refresh
    if (typeof refreshLive === 'function') refreshLive();
    if (location.hash.slice(1) === 'profile' && FUID && !document.querySelector('.fc-ers')) render();
  };
  const reload = () => { clearTimeout(FT); FT = setTimeout(loadFollows, 250); };

  async function onSession(session) {
    const uid = session && session.user ? session.user.id : null;
    if (uid === FUID) return;
    FUID = uid;
    if (FCH) { sb.removeChannel(FCH); FCH = null; }
    FOLLOWING = new Map(); FOLLOWERS = new Map(); LOADED = false; LOADERR = null;
    if (!uid) { paint(); screens(); return; }
    FCH = sb.channel('sc-follows-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, ({ eventType, new: n, old: o }) => {
        const r = eventType === 'DELETE' ? o : n;
        if (!r || (r.follower_id !== FUID && r.following_id !== FUID)) return;   // not about me
        if (eventType === 'INSERT' && r.following_id === FUID && !FOLLOWERS.has(r.follower_id)) addNotification(`${prof(r.follower_id).name} started following you`);
        reload();
      })
      .subscribe(st => { if (st === 'SUBSCRIBED') loadFollows(); });
    await loadFollows();
  }
  sb.auth.onAuthStateChange((ev, s) => setTimeout(() => onSession(s), 0));
  sb.auth.getSession().then(({ data }) => onSession(data.session));

  window.loadFollows = loadFollows;

  /* ---------- follow / unfollow ---------- */
  window.toggleFollow = async function (id) {
    if (needLogin()) return;
    if (!FUID || id === FUID || BUSY.has(id)) return;     // can't follow yourself, ignore double clicks
    const was = FOLLOWING.has(id);
    BUSY.add(id); paint();
    const { error } = was
      ? await sb.from('follows').delete().eq('follower_id', FUID).eq('following_id', id)
      : await sb.from('follows').insert({ follower_id: FUID, following_id: id });
    BUSY.delete(id);
    if (error && !(error.code === '23505' && !was)) { paint(); return toast(msg(error), 1); }  // 23505 = already following: treat as success
    if (was) { FOLLOWING.delete(id); toast('Unfollowed ' + prof(id).name); }
    else { FOLLOWING.set(id, new Date().toISOString()); toast('You are now following ' + prof(id).name); }
    paint(); followCounts(id);
  };

  /* ---------- UI pieces ---------- */
  window.followBtn = function (id, sm) {
    if (!FUID || id === FUID) return '';                  // logged out, or it's me
    const on = FOLLOWING.has(id), busy = BUSY.has(id) || !LOADED;   // disabled until we know who I already follow
    return `<button class="btn sec${sm ? ' sm' : ''}" data-follow="${id}" ${busy ? 'disabled' : ''} ${on ? 'style="background:#ecfdf5"' : ''} onclick="toggleFollow('${id}')">${BUSY.has(id) || !LOADED ? '…' : on ? '✓ Following' : '＋ Follow'}</button>`;
  };
  const cnt = m => LOADED && !LOADERR ? m.size : '–';
  window.FollowStats = function () {
    if (!FUID) return '';
    return `<div class="card pad" style="margin-top:22px"><b>👥 Your network</b><p class="mut" style="margin-top:4px">People who follow you and people you follow.</p>
    <div class="row" style="margin-top:12px"><button class="btn sec full" onclick="showFollows('followers')"><b class="fc-ers">${cnt(FOLLOWERS)}</b> Followers</button><button class="btn sec full" onclick="showFollows('following')"><b class="fc-ing">${cnt(FOLLOWING)}</b> Following</button></div></div>`;
  };
  window.followCounts = async function (id) {              // counts for another player's profile modal
    const el = document.getElementById('pf-counts'); if (!el || el.dataset.pid !== id) return;
    const q = c => sb.from('follows').select('*', { count: 'exact', head: true }).eq(c, id);
    const [a, b] = await Promise.all([q('following_id'), q('follower_id')]);
    const e2 = document.getElementById('pf-counts'); if (!e2 || e2.dataset.pid !== id) return;
    e2.innerHTML = a.error || b.error ? '👥 –' : `👥 <b>${a.count}</b> followers · <b>${b.count}</b> following`;
  };
  const row = id => {
    const p = prof(id);
    return `<div class="row" style="padding:10px 0;border-bottom:1px solid #f3f4f6"><div class="row" style="flex:1;min-width:0;cursor:pointer" onclick="closeModal();viewProfile('${id}')">${avatar(p)}<div style="min-width:0"><b>${esc(p.name)}</b><div class="mut" style="font-size:13px">${isOn(id) ? '🟢 Online' : '⚪ Offline'}${FOLLOWING.has(id) && FOLLOWERS.has(id) ? ' · follows each other' : ''}</div></div></div>${followBtn(id, true)}</div>`;
  };
  function listBody() {
    if (!LOADED) return '<p class="mut" style="text-align:center;padding:24px 0">Loading…</p>';
    if (LOADERR) return `<div class="empty"><b>Couldn't load</b>${esc(LOADERR)}<div style="margin-top:12px"><button class="btn sm" onclick="LOADED_RETRY()">Try again</button></div></div>`;
    const ids = [...(TAB === 'followers' ? FOLLOWERS : FOLLOWING).keys()];
    if (!ids.length) return TAB === 'followers'
      ? '<div class="empty"><b>No followers yet</b>Players who follow you will appear here.</div>'
      : `<div class="empty"><b>Not following anyone yet</b>Find players you like and tap Follow.<div style="margin-top:12px"><button class="btn sm" onclick="closeModal();go('players')">Find Players</button></div></div>`;
    return ids.map(row).join('');
  }
  window.LOADED_RETRY = () => { LOADERR = null; LOADED = false; paint(); loadFollows(); };
  window.showFollows = function (tab) {
    if (needLogin()) return;
    TAB = tab || TAB;
    openModal(`<h2 class="brand" style="margin-bottom:12px">Your network</h2><div class="row" id="fl-tabs"></div><div id="fl-body" style="margin-top:8px"></div><button class="btn sec full" style="margin-top:14px" onclick="closeModal()">Close</button>`);
    paintList();
  };
  window.setFollowTab = t => { TAB = t; paintList(); };
  function paintList() {
    const b = document.getElementById('fl-body'); if (!b) return;
    document.getElementById('fl-tabs').innerHTML =
      `<button class="btn ${TAB === 'followers' ? '' : 'sec'} full" onclick="setFollowTab('followers')">Followers ${cnt(FOLLOWERS)}</button><button class="btn ${TAB === 'following' ? '' : 'sec'} full" onclick="setFollowTab('following')">Following ${cnt(FOLLOWING)}</button>`;
    b.innerHTML = listBody();
  }
  function paint() {                                       // refresh every follow-related thing currently on screen
    document.querySelectorAll('[data-follow]').forEach(b => { b.outerHTML = followBtn(b.dataset.follow, b.classList.contains('sm')); });
    const a = document.querySelector('.fc-ers'), g = document.querySelector('.fc-ing');
    if (a) a.textContent = cnt(FOLLOWERS); if (g) g.textContent = cnt(FOLLOWING);
    paintList();
  }
})();
