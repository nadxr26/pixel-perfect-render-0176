/* ===================== JAIPUR VENUE DIRECTORY (Lovable Cloud) =====================
   Venues come from the `venues` table. Existing g1..g10 keep their photos/prices/slot booking;
   public venues are "Select Ground" (free, no booking), private venues without an in-app price are "Call to Book". */
(function () {
  Object.assign(SP, { Swimming: '🏊', Pickleball: '🏓', 'Box Cricket': '🏏' });
  // Exact category list from the brief. 'Other Sports' catches anything outside the other ten.
  const FS = ['Cricket', 'Football', 'Box Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball', 'Volleyball', 'Swimming', 'Table Tennis', 'Other Sports'];
  const CORE = FS.slice(0, -1);
  let READY = false, FAIL = false;
  const AP = a => { const k = Object.keys(AREA).find(x => a.includes(x)); return k ? AREA[k] : AREA.Jaipur; };
  const hsh = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

  async function loadVenues() {
    const { data, error } = await sb.from('venues').select('*').order('kind').order('name');
    if (error) { console.error('[venues]', error); FAIL = true; READY = true; paint(); return; }
    const list = (data || []).map(v => {
      const old = G0.find(g => g.id === v.id) || {};
      const a = AP(v.area), h = hsh(v.id);
      const pos = old.pos || [a[0] + ((h % 60) - 30) / 1e4, a[1] + (((h >> 8) % 60) - 30) / 1e4];
      return Object.assign({}, old, {
        id: v.id, name: v.name, loc: v.area, sports: v.sports, sport: v.sports[0] || '', kind: v.kind, access: v.access,
        bookable: v.bookable, phone: v.phone, price: v.price_per_hour ?? old.price, inApp: v.price_per_hour != null,
        pos, am: old.am || [], k0: old.k0 ?? null, km: LOC ? +km1(distKm(LOC.pos, pos)) : (old.km ?? null),
      });
    });
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
    if (isFree(g)) return `<button class="btn${s}" onclick="selectGround('${g.id}')">Select</button>`;
    return wa(g, 'btn' + s, '💬 WhatsApp Booking');
  };
  const card = g => `<div class="card">${IMG[g.id] ? `<img src="${IMG[g.id]}" alt="${esc(g.name)}" loading="lazy" style="width:100%;height:170px;object-fit:cover;display:block">`
    : `<div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:40px;background:${isFree(g) ? '#ecfdf5' : '#eff6ff'}">${g.sports.map(x => SP[x] || '🏟️').slice(0, 3).join(' ')}</div>`}
  <div class="pad"><h3>${esc(g.name)}</h3>
  <div style="margin:8px 0">${g.sports.map(x => `<span class="badge g">${SP[x] || ''} ${esc(x)}</span>`).join('')}${isFree(g) ? '<span class="badge g">FREE</span>' : ''}</div>
  <div class="mut">📍 ${esc(g.loc)}, Jaipur${LOC && g.km != null ? ` · ${km1(g.km)} km away` : ''}</div>
  ${g.phone ? `<div class="mut" style="margin-top:4px">Contact: ${g.phone}</div>` : ''}
  <div style="margin-top:12px">${venueActions(g)}</div></div></div>`;

  /* ---- grounds page ---- */
  LIST.g = () => {
    if (!READY) return '<p class="mut pad">Loading venues…</p>';
    if (FAIL) return empty("Couldn't load venues", 'Check your connection and try again.', '<button class="btn" onclick="loadVenues()">Try again</button>');
    const f = F.g, q = (f.q || '').toLowerCase(), tab = f.tab || 'paid';
    let r = G0.filter(g => (tab === 'free' ? isFree(g) : !isFree(g)) && (!f.sport || sportHas(g, f.sport)) && (!f.loc || g.loc === f.loc) &&
      (!q || (g.name + ' ' + g.loc + ' ' + g.sports.join(' ')).toLowerCase().includes(q)));
    if (f.sort === 'near' && LOC) r = [...r].sort((a, b) => a.km - b.km);
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
    ${nmBar('g')}<div class="grid" id="list">${LIST.g()}</div>
    <div style="margin-top:26px"><div class="row sb wp" style="margin-bottom:10px"><div><h3 style="font-size:24px">Find Grounds Near You</h3><p class="mut">${LOC ? 'Distances from ' + esc(LOC.label) : 'Allow location to see how far each ground is.'}</p></div>${LOC ? '<button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button>' : LocationButton()}</div>${MapView('gmap_all', { grounds: G0 })}</div></div>`;
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
