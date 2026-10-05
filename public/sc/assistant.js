/* Sports Connect AI assistant ("Coach"). Self-contained UI; reads app state only to give real context. */
(function () {
  const KEY = 'sc_assistant_v1';
  let msgs = [];
  try { msgs = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { msgs = []; }
  let busy = false, ctrl = null, rec = null, speakOn = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

  const root = document.createElement('div');
  root.className = 'aiw';
  root.innerHTML = `
  <button class="ai-fab" aria-label="Open Sports Connect assistant"><span class="ai-orb"></span></button>
  <section class="ai-panel" role="dialog" aria-label="Sports Connect assistant" hidden>
    <header class="ai-hd">
      <span class="ai-orb sm"></span>
      <div><b>Coach</b><small>Your Sports Connect assistant</small></div>
      <button class="ai-ic ai-spk" aria-label="Read answers aloud" title="Read answers aloud">🔈</button>
      <button class="ai-ic ai-new" aria-label="New chat" title="New chat">↺</button>
      <button class="ai-ic ai-x" aria-label="Close">✕</button>
    </header>
    <div class="ai-log" aria-live="polite"></div>
    <div class="ai-sug"></div>
    <form class="ai-in">
      <button type="button" class="ai-mic" aria-label="Speak your question">🎙</button>
      <textarea rows="1" placeholder="Ask anything about Sports Connect…" maxlength="1000"></textarea>
      <button class="ai-send" aria-label="Send">↑</button>
    </form>
  </section>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const panel = $('.ai-panel'), log = $('.ai-log'), ta = $('textarea'), sug = $('.ai-sug'), mic = $('.ai-mic'), send = $('.ai-send'), spk = $('.ai-spk');

  const SUGS = ['How do I host a football match?', 'Find players near me', 'How do I book a ground?', 'What does Intermediate mean?'];

  function paint() {
    if (!msgs.length) {
      log.innerHTML = `<div class="ai-hello"><span class="ai-orb lg"></span><h3>Hi${window.CUR && typeof myName === 'function' ? ', ' + esc(myName().split(' ')[0]) : ''}. How can I help?</h3><p>Ask about players, matches, grounds, booking or your account.</p></div>`;
      sug.innerHTML = SUGS.map(s => `<button type="button">${esc(s)}</button>`).join('');
    } else {
      sug.innerHTML = '';
      log.innerHTML = msgs.map((m, i) => `<div class="ai-m ${m.role}">${m.role === 'assistant' ? md(m.content || '') + (m.content ? `<button class="ai-say" data-i="${i}" aria-label="Read aloud">🔈</button>` : '') : esc(m.content)}</div>`).join('');
      if (busy && !msgs[msgs.length - 1].content) log.lastElementChild.innerHTML = '<span class="ai-think"><i></i><i></i><i></i></span>';
    }
    log.scrollTop = log.scrollHeight;
    send.disabled = busy && false;
    send.textContent = busy ? '■' : '↑';
  }

  function context() {
    const out = [];
    try {
      out.push('Current page: ' + (location.hash.slice(1) || 'home'));
      out.push(window.CUR && typeof myName === 'function' ? 'User is logged in as ' + myName() : 'User is NOT logged in.');
      const G = typeof GROUNDS !== 'undefined' ? GROUNDS : [];
      const gname = id => (G.find(g => g.id === id) || {}).name || '';
      const ms = typeof S !== 'undefined' && Array.isArray(S.matches) ? S.matches : [];
      if (ms.length) out.push('Open matches visible to user:\n' + ms.slice(0, 25).map(m => `- "${m.title}" ${m.sport}, ${m.date} ${m.start}:00-${m.end}:00 at ${gname(m.gid)}, ${m.cur ?? '?'}/${m.max} players, skill ${m.skill}, host ${m.host}`).join('\n'));
      else out.push(window.CUR ? 'No open matches right now.' : 'Matches are only visible after login.');
      if (typeof PLAYERS !== 'undefined' && Array.isArray(PLAYERS)) out.push('Registered players visible to user: ' + PLAYERS.length);
    } catch {}
    return out.join('\n');
  }

  function speak(t) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t.replace(/[*#_`]/g, ''));
    u.rate = 1.02; u.lang = /[\u0900-\u097F]/.test(t) ? 'hi-IN' : 'en-IN';
    speechSynthesis.speak(u);
  }

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    msgs.push({ role: 'user', content: text }, { role: 'assistant', content: '' });
    busy = true; root.classList.add('thinking'); paint(); save();
    const a = msgs[msgs.length - 1];
    ctrl = new AbortController();
    try {
      const r = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ messages: msgs.slice(0, -1).filter(m => m.content).slice(-20), context: context() }),
      });
      if (!r.ok || !r.body) { a.content = (await r.text().catch(() => '')) || 'Sorry, I could not answer right now.'; }
      else {
        const rd = r.body.getReader(), dec = new TextDecoder();
        for (;;) { const { done, value } = await rd.read(); if (done) break; a.content += dec.decode(value, { stream: true }); paint(); }
      }
    } catch (e) {
      if (!a.content) a.content = e.name === 'AbortError' ? '(Stopped)' : 'Connection problem. Please try again.';
    }
    busy = false; ctrl = null; root.classList.remove('thinking'); paint(); save();
    if (speakOn && a.content) speak(a.content);
    ta.focus();
  }

  const open = v => { panel.hidden = !v; root.classList.toggle('open', v); if (v) { paint(); setTimeout(() => ta.focus(), 50); } else if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  $('.ai-fab').onclick = () => open(panel.hidden);
  $('.ai-x').onclick = () => open(false);
  $('.ai-new').onclick = () => { if (ctrl) ctrl.abort(); msgs = []; save(); paint(); };
  spk.onclick = () => { speakOn = !speakOn; spk.classList.toggle('on', speakOn); spk.textContent = speakOn ? '🔊' : '🔈'; if (!speakOn && 'speechSynthesis' in window) speechSynthesis.cancel(); };
  sug.onclick = e => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); };
  log.onclick = e => { const b = e.target.closest('.ai-say'); if (b) speak(msgs[+b.dataset.i].content); };
  $('.ai-in').onsubmit = e => { e.preventDefault(); if (busy) { ctrl && ctrl.abort(); return; } const t = ta.value; ta.value = ''; ta.style.height = ''; ask(t); };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('.ai-in').requestSubmit(); } };
  ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) mic.hidden = true;
  mic.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true;
    let final = '';
    rec.onresult = ev => { let t = ''; for (const r of ev.results) t += r[0].transcript; ta.value = t; final = t; };
    rec.onend = () => { rec = null; root.classList.remove('listening'); speakOn = true; spk.classList.add('on'); spk.textContent = '🔊'; if (final.trim()) { ta.value = ''; ask(final); } };
    rec.onerror = ev => { if (ev.error === 'not-allowed' && typeof toast === 'function') toast('Allow microphone access to speak to Coach', 1); };
    root.classList.add('listening'); rec.start();
  };
})();
