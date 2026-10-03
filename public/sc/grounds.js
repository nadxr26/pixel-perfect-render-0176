/* ===================== JAIPUR VENUE DIRECTORY (Lovable Cloud) =====================
   Venues come from the `venues` table. Existing g1..g10 keep their photos/prices/slot booking;
   public venues are "Select Ground" (free, no booking), private venues without an in-app price are "Call to Book". */
(function () {
  Object.assign(SP, { Swimming: '🏊', Pickleball: '🏓', 'Multi-sport': '🏅', 'Turf Sports': '🥅', 'Box Cricket': '🏏' });
  const FS = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Swimming', 'Pickleball', 'Multi-sport', 'Turf Sports'];
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
  const sportHas = (g, s) => g.sports.some(x => x === s || (s === 'Cricket' && x === 'Box Cricket'));
  const tel = (g, c = 'btn sec') => g.phone ? `<a class="${c}" href="tel:+91${g.phone}" style="text-decoration:none">📞 Call to Book</a>` : '';
  window.selectGround = id => { if (needLogin()) return; window.PRESEL = id; go('host'); };
  window.venueActions = (g, sm) => {
    const s = sm ? ' sm' : '';
    if (g.kind === 'public') return `<button class="btn${s}" onclick="selectGround('${g.id}')">Select Ground</button>`;
    if (g.inApp) return `<span class="row wp">${IMG[g.id] ? `<button class="btn sec${s}" onclick="openGround('${g.id}')">Details</button>` : ''}<button class="btn${s}" onclick="bookGround('${g.id}')">Book Ground</button></span>`;
    return `<span class="row wp">${tel(g, 'btn sec' + s)}<button class="btn${s}" onclick="selectGround('${g.id}')">Select Ground</button></span>`;
  };
  const card = g => `<div class="card">${IMG[g.id] ? `<img src="${IMG[g.id]}" alt="${esc(g.name)}" loading="lazy" style="width:100%;height:170px;object-fit:cover;display:block">`
    : `<div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:40px;background:${g.kind === 'public' ? '#ecfdf5' : '#eff6ff'}">${g.sports.map(x => SP[x] || '🏟️').slice(0, 3).join(' ')}</div>`}
  <div class="pad"><div class="row sb" style="align-items:flex-start"><h3>${esc(g.name)}</h3>${g.rating ? `<span class="badge a">★ ${g.rating}</span>` : ''}</div>
  <div class="mut">📍 ${esc(g.loc)}, Jaipur${LOC && g.km != null ? ` · ${km1(g.km)} km away` : ''}</div>
  <div style="margin:10px 0">${typeB(g)}${priceB(g)}${bookB(g)}</div>
  <div style="margin-bottom:10px">${g.sports.map(x => `<span class="badge g">${SP[x] || ''} ${esc(x)}</span>`).join('')}</div>
  ${g.phone ? `<div class="mut">📞 <a href="tel:+91${g.phone}">${g.phone}</a></div>` : ''}
  <div class="row sb wp" style="margin-top:12px"><b class="brand" style="font-size:20px">${isFree(g) ? 'FREE' : g.inApp ? `₹${g.price}<small class="mut">/hr</small>` : g.kind === 'public' ? '' : 'Paid'}</b>${venueActions(g)}</div></div></div>`;

  /* ---- grounds page ---- */
  LIST.g = () => {
    if (!READY) return '<p class="mut pad">Loading venues…</p>';
    if (FAIL) return empty("Couldn't load venues", 'Check your connection and try again.', '<button class="btn" onclick="loadVenues()">Try again</button>');
    const f = F.g, q = (f.q || '').toLowerCase();
    let r = G0.filter(g => (!f.sport || sportHas(g, f.sport)) && (!f.loc || g.loc === f.loc) && (!f.kind || g.kind === f.kind) &&
      (!f.price || (f.price === 'free' ? isFree(g) : !isFree(g))) && (!f.book || (f.book === 'yes' ? g.bookable : !g.bookable)) &&
      (!q || (g.name + ' ' + g.loc + ' ' + g.sports.join(' ')).toLowerCase().includes(q)));
    if (f.sort === 'near' && LOC) r = [...r].sort((a, b) => a.km - b.km);
    return r.length ? r.map(card).join('') : empty('No grounds found', 'Try another sport, area or filter.', clr('g'));
  };
  const opt = (k, pairs, ph) => `<select onchange="setF('g','${k}',this.value)"><option value="">${ph}</option>${pairs.map(([v, t]) => `<option value="${v}" ${F.g[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  views.grounds = () => {
    const f = F.g, areas = [...new Set(G0.map(g => g.loc))].sort();
    return `<div class="pg">${pageHead('Grounds', 'Jaipur grounds & turfs — free public grounds and bookable private venues.')}
    <div class="filters"><input placeholder="🔍 Search grounds" value="${esc(f.q || '')}" oninput="setF('g','q',this.value)">
    ${opt('sport', FS.map(s => [s, SP[s] + ' ' + s]), 'All sports')}${opt('loc', areas.map(a => [a, a]), 'Any area')}
    ${opt('kind', [['public', 'Government / Public'], ['private', 'Private']], 'Any type')}${opt('price', [['free', 'Free'], ['paid', 'Paid']], 'Free or paid')}
    ${opt('book', [['no', 'No Booking'], ['yes', 'Bookable']], 'Any booking')}${clr('g')}</div>${nmBar('g')}${LIST.g()}</div>
    <div style="margin-top:26px"><div class="row sb wp" style="margin-bottom:10px"><div><h3 style="font-size:24px">Find Grounds Near You</h3><p class="mut">${LOC ? 'Distances from ' + esc(LOC.label) : 'Allow location to see how far each ground is.'}</p></div>${LOC ? '<button class="btn sec sm" onclick="updateLoc()">🔄 Update Location</button>' : LocationButton()}</div>${MapView('gmap_all', { grounds: G0 })}</div></div>`;
  };

  /* ---- host a match: venue picker with FREE / PAID info ---- */
  window.venueInfo = id => {
    const g = gr(id), el = document.getElementById('vinfo'); if (!el || !g.kind) return;
    el.innerHTML = `<div class="fee" style="margin-top:8px"><div>${typeB(g)}${priceB(g)}</div>${isFree(g) ? '<div class="mut">Free public ground — no booking or payment needed. Just invite your team.</div>'
      : g.kind === 'public' ? '<div class="mut">Access needs to be verified with the venue before playing.</div>'
      : `<div class="row wp" style="margin-top:6px">${g.inApp ? `<button type="button" class="btn sm" onclick="bookGround('${g.id}')">Book Ground</button>` : ''}${tel(g, 'btn sec sm')}</div>`}</div>`;
  };
  const _host = views.host;
  views.host = () => {
    const h = _host(); if (!h) return h;
    const pre = window.PRESEL && gr(window.PRESEL).kind ? window.PRESEL : (G0[0] || {}).id; window.PRESEL = null;
    const grp = (t, a) => a.length ? `<optgroup label="${t}">${a.map(g => `<option value="${g.id}" ${g.id === pre ? 'selected' : ''}>${esc(g.name)} – ${esc(g.loc)} (${isFree(g) ? 'FREE' : 'PAID'})</option>`).join('')}</optgroup>` : '';
    const sel = `<select name="gid" onchange="venueInfo(this.value)">${grp('🟢 Government / Public', G0.filter(g => g.kind === 'public'))}${grp('🔵 Private', G0.filter(g => g.kind !== 'public'))}</select><div id="vinfo"></div>`;
    setTimeout(() => pre && venueInfo(pre), 0);
    return h.replace(/<select name="gid">[\s\S]*?<\/select>/, sel);
  };

  loadVenues();
})();
