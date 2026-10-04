/* ===================== JAIPUR VENUE DIRECTORY (Lovable Cloud) =====================
   Venues come from the `venues` table. Existing g1..g10 keep their photos/prices/slot booking;
   public venues are "Select Ground" (free, no booking), private venues without an in-app price are "Call to Book". */
(function () {
  Object.assign(SP, { Swimming: '🏊', Pickleball: '🏓', 'Box Cricket': '🏏' });
  // Exact category list from the brief. 'Other Sports' catches anything outside the other ten.
  Object.assign(SP, { Athletics: '🏃' });
  const FS = ['Cricket', 'Football', 'Box Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball', 'Volleyball', 'Swimming', 'Table Tennis', 'Athletics', 'Other Sports'];
  const CORE = FS.slice(0, -1);
  let READY = false, FAIL = false;

  async function loadVenues() {
    const { data, error } = await sb.from('venues').select('*').order('kind').order('name');
    if (error) { console.error('[venues]', error); FAIL = true; READY = true; paint(); return; }
    // Only a verified street address (checked by hand) earns a Maps button — never a guessed or area-centre position.
    const list = (data || []).map(v => ({
      id: v.id, name: v.name, loc: v.area, sports: v.sports, sport: v.sports[0] || '', kind: v.kind, access: v.access,
      bookable: v.bookable, phone: v.phone,
      address: v.location_verified && v.address ? v.address : null,
    }));
    G0.splice(0, G0.length, ...list); GROUNDS.splice(0, GROUNDS.length, ...list);
    READY = true; FAIL = false; paint();
  }
  const paint = () => { const v = location.hash.slice(1) || 'home'; if (['grounds', 'host', 'ground', 'nearby'].includes(v)) render(); };
  window.loadVenues = loadVenues;

  /* ---- helpers ---- */
  const isFree = g => g.kind === 'public' && g.access === 'free';
  const typeB = g => g.kind === 'public' ? '<span class="badge g">🟢 Government / Public</span>' : '<span class="badge" style="background:#eff6ff;color:#1d4ed8">🔵 Private</span>';
  const priceB = g => isFree(g) ? '<span class="badge g">FREE</span>' : g.kind === 'public' ? '<span class="badge a">Access to Verify</span>' : '<span class="badge" style="background:#eff6ff;color:#1d4ed8">PAID</span>';
  const bookB = g => `<span class="badge">${g.bookable ? '📅 Bookable' : 'No Booking'}</span>`;
  const sportHas = (g, s) => s === 'Other Sports' ? !g.sports.some(x => CORE.includes(x)) : g.sports.some(x => x === s);
  // WhatsApp deep link with the venue's own number and a pre-filled booking message. No fake numbers, no price.
  const wa = (g, c, label) => g.phone ? `<a class="${c}" target="_blank" rel="noopener" href="https://wa.me/91${g.phone}?text=${encodeURIComponent('Hi, I want to book a sports slot at ' + g.name + '. Please share the available timings.')}" style="text-decoration:none">${label}</a>` : '';
  window.selectGround = id => { if (needLogin()) return; window.PRESEL = id; go('host'); };
  window.venueActions = (g, sm) => {
    const s = sm ? ' sm' : '';
    const dir = GetDirectionsButton(g, 'btn sec' + s);
    if (isFree(g)) return `<span class="row wp">${dir}<button class="btn${s}" onclick="selectGround('${g.id}')">Select</button></span>`;
    return `<span class="row wp">${dir}${wa(g, 'btn sec' + s, '💬 WhatsApp Booking')}<button type="button" class="btn${s}" onclick="openBooking('${g.id}')">📅 Book Ground</button></span>`;
  };

  /* ---- Book Ground: real booking + automatic cost split (price per player is recomputed by the database) ---- */
  const split = (t, n) => { const share = t > 0 && n >= 2 ? Math.ceil(t / n) : 0; return { share, pay: share ? share + FEE : 0 }; };
  window.bkCalc = () => {
    const f = document.getElementById('bkf'); if (!f) return;
    const t = +f.price.value, n = +f.players.value, { share, pay } = split(t, n);
    document.getElementById('bkc').innerHTML = `<div class="fee"><div><span>Ground Cost</span><b>₹${t || 0}</b></div><div><span>Players Required</span><b>${n || 0}</b></div>
      <div><span>Ground Cost Per Player</span><b>₹${share}</b></div><div><span>Sports Connect Fee</span><b>₹${FEE}</b></div>
      <div class="t"><span>Final Amount Per Player</span><span>₹${pay}</span></div></div>`;
  };
  window.openBooking = id => {
    if (needLogin()) return; const g = gr(id); if (!g.sports) return;
    const hs = (n, from, to, sel) => `<select name="${n}" onchange="bkCalc()">${[...Array(to - from + 1)].map((_, i) => `<option value="${i + from}" ${i + from === sel ? 'selected' : ''}>${hr(i + from)}</option>`).join('')}</select>`;
    openModal(`<h2 class="brand">Book ${esc(g.name)}</h2><p class="mut">📍 ${esc(g.address || g.loc + ', Jaipur')}</p>
    <form id="bkf" onsubmit="confirmBooking(event,'${g.id}')"><label>Date</label><input name="date" type="date" min="${day(0)}" value="${day(1)}" required>
    <div class="row"><div style="flex:1"><label>Start time</label>${hs('start', 6, 22, 18)}</div><div style="flex:1"><label>End time</label>${hs('end', 7, 23, 20)}</div></div>
    <div class="row"><div style="flex:1"><label>Total ground price (₹)</label><input name="price" type="number" min="1" max="1000000" placeholder="As quoted by the venue" required oninput="bkCalc()"></div>
    <div style="flex:1"><label>Players required</label><input name="players" type="number" min="2" max="30" value="10" required oninput="bkCalc()"></div></div>
    <div id="bkc" style="margin-top:12px"></div><div id="bkerr"></div>
    <div class="row" style="margin-top:14px"><button type="button" class="btn sec" onclick="closeModal()">Cancel</button><button class="btn full">Confirm Booking</button></div></form>`);
    bkCalc();
  };
  window.confirmBooking = async (e, gid) => {
    e.preventDefault();
    const f = e.target, d = { date: f.date.value, s: +f.start.value, en: +f.end.value, t: +f.price.value, n: +f.players.value }, er = [];
    if (!d.date || d.date < day(0)) er.push('Date cannot be in the past');
    if (d.en <= d.s) er.push('End time must be after start time');
    if (!(d.t >= 1)) er.push('Enter the total ground price');
    if (!(d.n >= 2 && d.n <= 30)) er.push('Players must be between 2 and 30');
    if (er.length) { document.getElementById('bkerr').innerHTML = er.map(x => `<div class="err">• ${x}</div>`).join(''); return; }
    const b = f.querySelector('button.full'); b.disabled = true; b.textContent = 'Booking…';
    const { data, error } = await sb.from('ground_bookings').insert({ ground_id: gid, booking_date: d.date, start_hour: d.s, end_hour: d.en, total_price: d.t, required_players: d.n }).select().single();
    if (error) { b.disabled = false; b.textContent = 'Confirm Booking'; document.getElementById('bkerr').innerHTML = `<div class="err">${esc(error.message)}</div>`; return; }
    const g = gr(gid);
    $('#modal .modal > div').innerHTML = `<div style="text-align:center"><div style="font-size:54px">✅</div><h2 class="brand">✓ Ground Booked Successfully</h2>
      <p class="mut" style="margin:8px 0 16px">${esc(g.name)} · ${fmtD(data.booking_date)} · ${hr(data.start_hour)} – ${hr(data.end_hour)}<br>₹${data.amount_per_player}/player for ${data.required_players} players</p>
      <div class="row"><button class="btn sec full" onclick="closeModal()">Later</button><button class="btn full" onclick="hostFromBooking('${data.id}')">⚽ Host a Match</button></div></div>`;
    addNotification(`Ground booked: ${g.name} on ${fmtD(data.booking_date)}`);
  };
  window.hostFromBooking = async id => {
    const { data, error } = await sb.from('ground_bookings').select('*').eq('id', id).single();
    if (error || !data) return toast('Booking not found', 1);
    window.PREBOOK = data; closeModal(); go('host');
  };
  const card = g => `<div class="card">${IMG[g.id] ? `<img src="${IMG[g.id]}" alt="${esc(g.name)}" loading="lazy" style="width:100%;height:170px;object-fit:cover;display:block">`
    : `<div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:40px;background:${isFree(g) ? '#ecfdf5' : '#eff6ff'}">${g.sports.map(x => SP[x] || '🏟️').slice(0, 3).join(' ')}</div>`}
  <div class="pad"><h3>${esc(g.name)}</h3>
  <div style="margin:8px 0">${g.sports.map(x => `<span class="badge g">${SP[x] || ''} ${esc(x)}</span>`).join('')}${isFree(g) ? '<span class="badge g">FREE</span>' : ''}</div>
  <div class="mut">📍 ${esc(g.address || g.loc + ', Jaipur')}</div>
  ${g.phone ? `<div class="mut" style="margin-top:4px">Contact: ${g.phone}</div>` : ''}
  <div style="margin-top:12px">${venueActions(g)}</div></div></div>`;

  /* ---- grounds page ---- */
  LIST.g = () => {
    if (!READY) return '<p class="mut pad">Loading venues…</p>';
    if (FAIL) return empty("Couldn't load venues", 'Check your connection and try again.', '<button class="btn" onclick="loadVenues()">Try again</button>');
    const f = F.g, q = (f.q || '').toLowerCase(), tab = f.tab || 'paid';
    let r = G0.filter(g => (tab === 'free' ? isFree(g) : !isFree(g)) && (!f.sport || sportHas(g, f.sport)) && (!f.loc || g.loc === f.loc) &&
      (!q || (g.name + ' ' + g.loc + ' ' + g.sports.join(' ')).toLowerCase().includes(q)));
    if (!r.length) return tab === 'free'
      ? empty('No verified free grounds yet', "We only list a government/public ground once we can confirm it's open to everyone without prior permission. Check back soon.")
      : empty('No grounds found', 'Try another sport or area.', clr('g'));
    return r.map(card).join('');
  };
  const opt = (k, pairs, ph) => `<select onchange="setF('g','${k}',this.value)"><option value="">${ph}</option>${pairs.map(([v, t]) => `<option value="${v}" ${F.g[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  window.setGTab = k => { F.g.tab = k; render(); };
  const tabBtn = (k, label) => `<button class="btn${(F.g.tab || 'paid') === k ? '' : ' sec'}" style="flex:1" onclick="setGTab('${k}')">${label}</button>`;
  views.grounds = () => {
    const f = F.g, areas = [...new Set(G0.map(g => g.loc))].sort();
    return `<div class="pg">${pageHead('Grounds', 'Paid turfs you can book directly, and verified free public grounds.')}
    <div class="row" style="gap:10px;margin-bottom:14px">${tabBtn('paid', '💰 Paid & Bookable')}${tabBtn('free', '🆓 Free Public Grounds')}</div>
    <div class="filters"><input placeholder="🔍 Search grounds" value="${esc(f.q || '')}" oninput="setF('g','q',this.value)">
    ${opt('sport', FS.map(s => [s, (SP[s] || '') + ' ' + s]), 'All sports')}${opt('loc', areas.map(a => [a, a]), 'Any area')}${clr('g')}</div>
    ${nmBar('g')}<div class="grid" id="list">${LIST.g()}</div></div>`;
  };

  /* ---- host a match: venue picker with FREE / PAID info ---- */
  window.venueInfo = id => {
    const g = gr(id), el = document.getElementById('vinfo'); if (!el || !g.sports) return;
    el.innerHTML = isFree(g) ? '<p class="mut" style="margin-top:6px">🆓 Free public ground — no booking needed.</p>'
      : g.phone ? `<p class="mut" style="margin-top:6px">${venueActions(g, true)}</p>` : '';
  };
  const _host = views.host;
  views.host = () => {
    const h = _host(); if (!h) return h;
    const pre = window.PRESEL && G0.some(g => g.id === window.PRESEL) ? window.PRESEL : (G0[0] || {}).id; window.PRESEL = null;
    const sel = `<select name="gid" onchange="venueInfo(this.value)">${G0.map(g => `<option value="${g.id}" ${g.id === pre ? 'selected' : ''}>${esc(g.name)} – ${esc(g.loc)}</option>`).join('')}</select><div id="vinfo"></div>`;
    setTimeout(() => pre && venueInfo(pre), 0);
    return h.replace(/<select name="gid">[\s\S]*?<\/select>/, sel);
  };

  loadVenues();
})();
