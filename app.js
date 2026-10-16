(function () {
  var SEC = [[0, 60], [60, 300]];
  var TOTAL = 300;
  var NAMES = ['5-second test', 'Task walkthrough'];

  var state = 'idle';
  var acc = 0;
  var t0 = 0;
  var timer = null;
  var lastIdx = -2;
  var wake = null;

  function $(id) { return document.getElementById(id); }
  var elapsedEl = $('elapsed');
  var statusEl = $('status');
  var cueEls = Array.prototype.slice.call(document.querySelectorAll('.step .cue'));
  var cueDone = $('cue-done');
  var readyEl = $('ready');
  var nextBtn = $('next');
  var next2 = $('next2');
  var controlsEl = document.querySelector('.controls');
  var countEl = $('count');
  var itemEls = Array.prototype.slice.call(document.querySelectorAll('.items li'));
  var itemIdx = 0;
  var primary = $('primary');
  var cancelBtn = $('cancel');
  var live = $('live');
  var head = $('head');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var segs = Array.prototype.slice.call(document.querySelectorAll('.seg'));
  var fills = Array.prototype.slice.call(document.querySelectorAll('.fill'));
  var barEl = document.querySelector('.bar');
  var recapEl = $('recap');
  var recapBtn = $('recap-open');
  var top3El = $('top3');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var autoEl = $('auto');
  var autoScroll = true;
  try { if (localStorage.getItem('hottake-autoscroll') === 'off') autoScroll = false; } catch (err) {}
  autoEl.checked = autoScroll;

  function scrollToStep(i) { scrollToEl(steps[i]); }

  function scrollToEl(el) {
    var stick = parseFloat(getComputedStyle(head).top) || 0;
    var top = el.getBoundingClientRect().top + window.pageYOffset - stick - head.offsetHeight - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }

  autoEl.addEventListener('change', function () {
    autoScroll = autoEl.checked;
    try { localStorage.setItem('hottake-autoscroll', autoScroll ? 'on' : 'off'); } catch (err) {}
    if (autoScroll && (state === 'running' || state === 'paused') && lastIdx >= 0 && lastIdx < SEC.length) scrollToStep(lastIdx);
  });

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function elapsedSec() {
    var ms = acc + (state === 'running' ? performance.now() - t0 : 0);
    return Math.min(ms / 1000, TOTAL);
  }

  function setHead() {
    document.documentElement.style.setProperty('--head-h', head.offsetHeight + 'px');
  }

  async function lock() {
    try {
      if ('wakeLock' in navigator && !wake) {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', function () { wake = null; });
      }
    } catch (err) { wake = null; }
  }
  function unlock() {
    try { if (wake) wake.release(); } catch (err) {}
    wake = null;
  }

  function render() {
    var e = elapsedSec();
    var idx;
    if (state === 'idle') idx = -1;
    else if (state === 'done' || e >= TOTAL) idx = SEC.length;
    else idx = SEC.findIndex(function (s) { return e < s[1]; });

    elapsedEl.textContent = fmt(Math.ceil(TOTAL - e));
    recapEl.hidden = state !== 'done';
    readyEl.hidden = state !== 'idle';
    itemEls.forEach(function (li, i) { li.hidden = i !== itemIdx; });
    countEl.textContent = (itemIdx + 1) + ' of ' + itemEls.length;
    next2.textContent = itemIdx === itemEls.length - 1 ? 'Finish review' : 'Next';
    next2.hidden = !((state === 'running' || state === 'paused') && idx === 1);
    nextBtn.hidden = !((state === 'running' || state === 'paused') && idx === 0 && e >= 5);
    steps[0].dataset.phase = idx === -1 ? 'idle' : ((idx === 0 && e < 5) ? 'look' : 'say');

    steps.forEach(function (el, i) {
      var st;
      if (idx === -1) st = i === 0 ? 'next' : 'upcoming';
      else if (i < idx) st = 'done';
      else if (i === idx) st = 'active';
      else st = i === idx + 1 ? 'next' : 'upcoming';
      el.dataset.state = st;
      el.classList.toggle('open', st === 'active');
    });

    segs.forEach(function (seg, i) {
      var pct = Math.min(Math.max((e - SEC[i][0]) / (SEC[i][1] - SEC[i][0]), 0), 1) * 100;
      fills[i].style.width = pct + '%';
      seg.dataset.active = String(i === idx);
    });
    barEl.dataset.final = String(e >= TOTAL - 60);

    var cue = '';
    var warn = false;
    var target = -1;
    if (state === 'idle') {
      cue = ''; target = -1;
    } else if (state === 'paused') {
      cue = 'Paused'; target = idx;
    } else if (state === 'done') {
      cue = e >= TOTAL ? 'Time' : 'Done'; target = 'done';
    } else {
      target = idx;
      var left = Math.ceil(SEC[idx][1] - e);
      if (idx === 0 && e < 5) { cue = 'Looking · ' + Math.ceil(5 - e) + 's'; warn = true; }
      else if (left <= 10 && idx < SEC.length - 1) { cue = 'Next in ' + fmt(left) + ': ' + NAMES[idx + 1]; warn = true; }
      else if (left <= 10) { cue = 'Wrap up in ' + fmt(left); warn = true; }
    }
    cueEls.concat([cueDone]).forEach(function (el, i) {
      var mine = (i === cueEls.length) ? target === 'done' : target === i;
      el.textContent = mine ? cue : '';
      el.classList.toggle('warn', mine && warn);
    });

    var labels = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Complete' };
    statusEl.textContent = labels[state];
    statusEl.dataset.s = state;

    primary.textContent = { idle: 'Start', running: 'Pause', paused: 'Resume', done: 'Restart' }[state];
    cancelBtn.hidden = state === 'idle';
    cancelBtn.disabled = state === 'idle';
    var host = state === 'idle' ? readyEl : (state === 'done' ? null : steps[idx]);
    if (state === 'done') {
      if (controlsEl.parentNode !== recapEl || controlsEl.nextSibling !== top3El) recapEl.insertBefore(controlsEl, top3El);
    } else if (host && controlsEl.parentNode !== host) {
      host.appendChild(controlsEl);
    }

    if (idx !== lastIdx) {
      if (state === 'running' && idx >= 0 && idx < SEC.length) {
        live.textContent = 'Now: ' + NAMES[idx];
        if (autoScroll) scrollToStep(idx);
      }
      if (state === 'done' && autoScroll) scrollToEl(recapEl);
      lastIdx = idx;
    }
  }

  function tick() {
    if (elapsedSec() >= TOTAL) {
      clearInterval(timer);
      timer = null;
      state = 'done';
      acc = TOTAL * 1000;
      unlock();
      live.textContent = 'Time. The Top-3 Summary is ready.';
    }
    render();
  }

  function begin() {
    state = 'running';
    t0 = performance.now();
    clearInterval(timer);
    timer = setInterval(tick, 100);
    lock();
    render();
  }

  function pause() {
    acc += performance.now() - t0;
    state = 'paused';
    clearInterval(timer);
    timer = null;
    unlock();
    render();
  }

  function reset() {
    clearInterval(timer);
    timer = null;
    state = 'idle';
    acc = 0;
    lastIdx = -2;
    itemIdx = 0;
    unlock();
    top3El.hidden = true;
    recapBtn.hidden = false;
    render();
  }

  primary.addEventListener('click', function () {
    if (state === 'idle') { acc = 0; begin(); }
    else if (state === 'running') pause();
    else if (state === 'paused') begin();
    else { reset(); begin(); }
  });

  cancelBtn.addEventListener('click', function () {
    reset();
    live.textContent = 'Timer cancelled';
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  nextBtn.addEventListener('click', function () {
    if ((state !== 'running' && state !== 'paused') || elapsedSec() >= SEC[0][1]) return;
    acc = SEC[0][1] * 1000;
    t0 = performance.now();
    itemIdx = 0;
    render();
  });

  next2.addEventListener('click', function () {
    if (state !== 'running' && state !== 'paused') return;
    next2.blur();
    if (itemIdx < itemEls.length - 1) {
      itemIdx += 1;
      live.textContent = 'Now: ' + itemEls[itemIdx].textContent;
      render();
      return;
    }
    if (state === 'running') acc += performance.now() - t0;
    clearInterval(timer);
    timer = null;
    state = 'done';
    unlock();
    live.textContent = 'Review finished. The Top-3 Summary is ready.';
    render();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space' && !(ev.target.closest && ev.target.closest('button, input, a, textarea, select'))) {
      ev.preventDefault();
      primary.click();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state === 'running') lock();
  });

  window.addEventListener('resize', setHead);
  if (window.ResizeObserver) new ResizeObserver(setHead).observe(head);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHead);

  var urlEl = $('url');
  var openEl = $('open');
  var noteEl = $('sitenote');
  var nameEl = $('sitename');
  var NOTE = 'Click to open in a new tab, or right-click and choose \u201cOpen link in split view\u201d.';

  function parseSite(v) {
    v = v.trim();
    if (!v) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.hostname.indexOf('.') < 1) return null;
      return u;
    } catch (err) { return null; }
  }

  function updateSite(force) {
    var raw = urlEl.value.trim();
    var u = parseSite(raw);
    if (u) {
      openEl.href = u.href;
      openEl.setAttribute('aria-disabled', 'false');
      openEl.removeAttribute('tabindex');
      nameEl.textContent = u.hostname.replace(/^www\./, '');
      noteEl.textContent = NOTE;
      noteEl.dataset.bad = 'false';
    } else {
      openEl.removeAttribute('href');
      openEl.setAttribute('aria-disabled', 'true');
      openEl.setAttribute('tabindex', '-1');
      nameEl.textContent = 'this site';
      var showErr = raw && (force === true || document.activeElement !== urlEl);
      noteEl.textContent = showErr ? 'Enter a full web address, like example.com.' : NOTE;
      noteEl.dataset.bad = showErr ? 'true' : 'false';
    }
  }
  urlEl.addEventListener('input', function () { updateSite(false); });
  urlEl.addEventListener('blur', function () { updateSite(false); });
  $('siteform').addEventListener('submit', function (ev) {
    ev.preventDefault();
    updateSite(true);
    if (openEl.getAttribute('aria-disabled') === 'false') openEl.click();
  });

  recapBtn.addEventListener('click', function () {
    top3El.hidden = false;
    recapBtn.hidden = true;
    scrollToEl(top3El);
    var first = $('f1-issue');
    if (first) first.focus({ preventScroll: true });
  });

  /* ---------- Top-3: severity, quotes, export ---------- */
  var SEV = { 5: 'Critical', 4: 'High Friction', 3: 'Deficit', 2: 'Minor', 1: 'Other' };
  var FIELDS = ['site-name', 'q-transcript'];
  [1, 2, 3].forEach(function (n) { FIELDS.push('f' + n + '-issue', 'f' + n + '-impact', 'f' + n + '-rec'); });
  var qInclude = $('q-include');
  var qBody = $('q-body');
  var qTranscript = $('q-transcript');
  var qFind = $('q-find');
  var qStatus = $('q-status');
  var qList = $('q-list');
  var exportBtn = $('export');
  var exportNote = $('export-note');
  var exportFallback = $('export-fallback');
  var clearBtn = $('clear');
  var DRAFT_KEY = 'hottake-draft';
  var quotes = [];
  var saveTimer = null;
  var clearArmed = false;
  var findCtl = null;

  function getSev(n) {
    var r = document.querySelector('input[name="f' + n + '-sev"]:checked');
    return r ? Number(r.value) : 0;
  }
  function getFinding(n) {
    return { n: n, sev: getSev(n), issue: $('f' + n + '-issue').value.trim(), impact: $('f' + n + '-impact').value.trim(), rec: $('f' + n + '-rec').value.trim() };
  }
  function hasContent(f) { return !!(f.sev || f.issue || f.impact || f.rec); }

  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var d = { f: {}, sev: {}, include: qInclude.checked, quotes: quotes };
      FIELDS.forEach(function (id) { d.f[id] = $(id).value; });
      [1, 2, 3].forEach(function (n) { d.sev[n] = getSev(n); });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
    }, 300);
  }
  function loadDraft() {
    var raw = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) {}
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      FIELDS.forEach(function (id) { if (d.f && typeof d.f[id] === 'string') $(id).value = d.f[id]; });
      [1, 2, 3].forEach(function (n) {
        var v = d.sev && d.sev[n];
        var r = v && document.querySelector('input[name="f' + n + '-sev"][value="' + v + '"]');
        if (r) r.checked = true;
      });
      qInclude.checked = !!d.include;
      if (Array.isArray(d.quotes)) quotes = d.quotes.filter(function (q) { return q && typeof q.text === 'string'; });
    } catch (e) {}
    qBody.hidden = !qInclude.checked;
    renderQuotes();
  }

  function renderQuotes() {
    qList.textContent = '';
    [1, 2, 3].forEach(function (n) {
      var items = quotes.filter(function (q) { return q.finding === n; });
      if (!items.length) return;
      var g = document.createElement('div');
      g.className = 'q-group';
      var h = document.createElement('h4');
      var sv = getSev(n);
      h.textContent = 'Finding ' + n + (sv ? ' · ' + sv + ' ' + SEV[sv] : '');
      g.appendChild(h);
      items.forEach(function (q) {
        var row = document.createElement('div');
        row.className = 'q-item';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!q.picked;
        cb.setAttribute('aria-label', 'Include this quote');
        cb.addEventListener('change', function () { q.picked = cb.checked; saveDraft(); });
        var body = document.createElement('div');
        var bq = document.createElement('blockquote');
        bq.textContent = '“' + q.text + '”';
        var meta = document.createElement('p');
        meta.className = 'q-meta';
        meta.textContent = 'Match ' + q.score + '/5' + (q.why ? ' · ' + q.why : '');
        body.appendChild(bq);
        body.appendChild(meta);
        row.appendChild(cb);
        row.appendChild(body);
        g.appendChild(row);
      });
      qList.appendChild(g);
    });
  }

  function squash(t) {
    return String(t).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  var STOP = {};
  ('a an the and or but if so then than that this these those it its it\'s i i\'m i\'d i\'ve i\'ll you your we our they them he she of to in on at by for with from as is are was were be been being am do does did done have has had having can could would should will just really very also not no yes there here what when where which who whom how why about into over out up down off too more most some any all each every my me mine like kind sort bit lot get got going gonna okay ok well yeah um uh hmm').split(' ').forEach(function (w) { STOP[w] = 1; });
  var HEDGE = /\b(not sure|can'?t tell|cannot tell|confus\w*|unclear|don'?t (?:know|understand|see|get)|no idea|where is|where do|why is|why do|hmm+|wait|what does|what is|what are|how does|how do|i'd expect|i would expect|expected|frustrat\w*|overwhelm\w*|too much|lost|surpris\w*|struggl\w*|hard to|difficult|nice|love|clear\w*|obvious\w*|easy|easier|great|helpful)\b/i;

  var STEMWORD = {};
  function stem(w) {
    if (w.length > 5) w = w.replace(/(ing|edly|ed|ly|ies|es)$/, '');
    else if (w.length > 3) w = w.replace(/s$/, '');
    return w.length > 4 ? w.replace(/e$/, '') : w;
  }
  function tokens(text) {
    var raw = String(text).toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z0-9']+/g) || [];
    var out = [];
    raw.forEach(function (w) { if (w.length > 2 && !STOP[w]) { var st = stem(w); if (!STEMWORD[st]) STEMWORD[st] = w; out.push(st); } });
    var all = out.slice();
    for (var i = 0; i < out.length - 1; i++) all.push(out[i] + '_' + out[i + 1]);
    return all;
  }

  function splitUnits(text) {
    var t = text.replace(/\s+/g, ' ').trim();
    var parts = t.split(/(?<=[.!?])\s+/);
    var units = [];
    parts.forEach(function (sent) {
      var words = sent.split(' ');
      if (words.length <= 40) { units.push(sent); return; }
      for (var i = 0; i < words.length; i += 25) units.push(words.slice(i, i + 25).join(' '));
    });
    var merged = [];
    units.forEach(function (u) {
      if (merged.length && merged[merged.length - 1].split(' ').length < 5) merged[merged.length - 1] += ' ' + u;
      else merged.push(u);
    });
    return merged.filter(function (u) { return u.split(' ').length >= 4; });
  }

  function vec(toks, idf, weight) {
    var v = {};
    toks.forEach(function (t) { v[t] = (v[t] || 0) + (idf[t] || 1) * (weight || 1); });
    return v;
  }
  function norm(v) { var s = 0; for (var k in v) s += v[k] * v[k]; return Math.sqrt(s) || 1; }

  function findQuotes() {
    var transcript = qTranscript.value.trim();
    var findings = [1, 2, 3].map(getFinding).filter(hasContent);
    if (!transcript) { qStatus.textContent = 'Add the transcript first.'; return; }
    if (!findings.length) { qStatus.textContent = 'Fill in at least one finding first.'; return; }
    var units = splitUnits(transcript);
    if (!units.length) { qStatus.textContent = 'The transcript is too short to search.'; return; }
    var utoks = units.map(tokens);
    var df = {};
    utoks.forEach(function (tk) { var seen = {}; tk.forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    var idf = {};
    Object.keys(df).forEach(function (t) { idf[t] = Math.log(1 + units.length / df[t]); });
    var uvec = utoks.map(function (tk) { return vec(tk, idf, 1); });
    var unorm = uvec.map(norm);
    var KEEP = { 5: 3, 4: 3, 3: 2, 2: 1, 1: 1, 0: 2 };
    var out = [];
    findings.forEach(function (f) {
      var q = {};
      [[f.issue, 1], [f.impact, 0.7], [f.rec, 0.5]].forEach(function (pair) {
        var tk = tokens(pair[0]);
        tk.forEach(function (t) { q[t] = (q[t] || 0) + (idf[t] || Math.log(1 + units.length)) * pair[1]; });
      });
      var qn = norm(q);
      if (!Object.keys(q).length) return;
      var scored = [];
      units.forEach(function (u, i) {
        var dot = 0, hits = [];
        for (var t in q) { if (uvec[i][t]) { dot += q[t] * uvec[i][t]; if (t.indexOf('_') === -1) hits.push(t); } }
        if (!dot) return;
        var cos = dot / (qn * unorm[i]);
        var hedge = HEDGE.exec(u);
        var score = cos + (hedge ? 0.08 : 0) + (u.indexOf('?') !== -1 ? 0.03 : 0);
        scored.push({ i: i, score: score, hits: hits, hedge: hedge ? hedge[0].toLowerCase() : '' });
      });
      scored.sort(function (x, y) { return y.score - x.score; });
      var n = 0;
      scored.forEach(function (c) {
        if (n >= KEEP[f.sev || 0]) return;
        var sc = c.score >= 0.3 ? 5 : c.score >= 0.22 ? 4 : c.score >= 0.14 ? 3 : 0;
        if (!sc || (c.hits.length < 2 && c.score < 0.22)) return;
        var why = 'Shares: ' + c.hits.slice(0, 4).map(function (h) { return STEMWORD[h] || h; }).join(', ') + (c.hedge ? '. Reaction wording: "' + c.hedge + '"' : '');
        out.push({ finding: f.n, text: units[c.i].slice(0, 400), score: sc, why: why, picked: sc >= 4 });
        n += 1;
      });
    });
    quotes = out;
    renderQuotes();
    saveDraft();
    qStatus.textContent = out.length
      ? out.length + ' passage' + (out.length === 1 ? '' : 's') + ' found. Ticked ones scored 4 or 5. Matching is by shared wording, so read each one and untick what does not fit.'
      : 'No passages matched your findings. Try wording the findings closer to how you speak, or add the key terms you said aloud.';
  }

  function localDate() {
    var d = new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }

  function buildMarkdown() {
    var site = $('site-name').value.trim();
    var L = [];
    L.push('# ' + (site ? site + ': ' : '') + 'Expert review');
    L.push('');
    L.push('Date: ' + localDate());
    L.push('');
    L.push('> Expert review, not user data. Findings are hypotheses to validate.');
    L.push('');
    var fs = [1, 2, 3].map(getFinding).filter(hasContent);
    fs.sort(function (a, b) { return (b.sev || 0) - (a.sev || 0) || a.n - b.n; });
    if (fs.length) {
      L.push('## Findings, most severe first');
      L.push('');
    }
    fs.forEach(function (f, i) {
      L.push('### ' + (i + 1) + '. ' + (f.sev ? SEV[f.sev] + ' (severity ' + f.sev + ' of 5)' : 'Not rated'));
      L.push('');
      if (f.issue) L.push('**Issue:** ' + f.issue + '\n');
      if (f.impact) L.push('**Impact:** ' + f.impact + '\n');
      if (f.rec) L.push('**Recommendation:** ' + f.rec + '\n');
      if (qInclude.checked) {
        var picked = quotes.filter(function (q) { return q.finding === f.n && q.picked; });
        if (picked.length) {
          L.push('**In my words:**');
          L.push('');
          picked.forEach(function (q) {
            L.push(q.text.split(/\r?\n/).map(function (ln) { return '> ' + ln; }).join('\n'));
            L.push('');
          });
        }
      }
    });
    L.push('## Next step');
    L.push('');
    L.push('This is an early impression. On its own it carries little weight. Have 7 other people review the site and look for patterns across reviewers.');
    L.push('');
    return L.join('\n');
  }

  function blobDownload(name, text) {
    try {
      var b = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      var u = URL.createObjectURL(b);
      var a = document.createElement('a');
      a.href = u;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      return true;
    } catch (err) { return false; }
  }

  function exportReport() {
    var md = buildMarkdown();
    var name = 'hot-take-review-' + localDate() + '.md';
    exportFallback.hidden = true;
    exportNote.textContent = '';
    var cl = window.claude;
    var p = cl && cl.use ? cl.use('downloads') : Promise.resolve(null);
    p.then(function (dl) {
      if (!dl) throw { code: 'unavailable' };
      return dl.save({ filename: name, data: md });
    }).then(function () {
      exportNote.textContent = 'Saved ' + name + '.';
    }).catch(function (e) {
      if (e && e.code === 'declined') { exportNote.textContent = 'Download cancelled.'; return; }
      if (blobDownload(name, md)) { exportNote.textContent = 'Saved ' + name + '.'; return; }
      exportFallback.value = md;
      exportFallback.hidden = false;
      exportNote.textContent = 'Download is not available here. Select the text below and copy it into a .md file.';
    });
  }

  function parseCaptions(raw) {
    var t = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (!/^WEBVTT/.test(t.trim()) && t.indexOf('-->') === -1) return t.trim();
    var out = [];
    var skipBlock = false;
    t.split('\n').forEach(function (line, i) {
      var l = line.trim();
      if (!l) { skipBlock = false; return; }
      if (skipBlock) return;
      if (i === 0 && /^WEBVTT/.test(l)) { skipBlock = true; return; }
      if (/^(NOTE|STYLE|REGION)\b/.test(l)) { skipBlock = true; return; }
      if (l.indexOf('-->') !== -1) return;
      if (/^\d+$/.test(l)) return;
      l = l.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
      if (!l) return;
      if (out.length && out[out.length - 1] === l) return;
      out.push(l);
    });
    return out.join(' ');
  }

  function loadTranscriptFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { qStatus.textContent = 'That file is over 5 MB. Use a smaller transcript.'; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var text = parseCaptions(rd.result);
      if (!text) { qStatus.textContent = 'No text found in ' + file.name + '.'; return; }
      qTranscript.value = text;
      qStatus.textContent = 'Loaded ' + file.name + ' (' + text.length.toLocaleString() + ' characters). Timestamps removed.';
      saveDraft();
    };
    rd.onerror = function () { qStatus.textContent = 'Could not read that file.'; };
    rd.readAsText(file);
  }

  $('q-file').addEventListener('change', function (ev) {
    loadTranscriptFile(ev.target.files && ev.target.files[0]);
    ev.target.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (n) {
    qTranscript.addEventListener(n, function (ev) { ev.preventDefault(); qTranscript.dataset.drag = 'true'; });
  });
  ['dragleave', 'dragend'].forEach(function (n) {
    qTranscript.addEventListener(n, function () { qTranscript.dataset.drag = 'false'; });
  });
  qTranscript.addEventListener('drop', function (ev) {
    ev.preventDefault();
    qTranscript.dataset.drag = 'false';
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) loadTranscriptFile(f);
  });
  // A file dropped outside the box must not navigate the tab away.
  window.addEventListener('dragover', function (ev) { ev.preventDefault(); });
  window.addEventListener('drop', function (ev) { ev.preventDefault(); });

  qInclude.addEventListener('change', function () { qBody.hidden = !qInclude.checked; saveDraft(); });
  qFind.addEventListener('click', findQuotes);
  exportBtn.addEventListener('click', exportReport);
  clearBtn.addEventListener('click', function () {
    if (!clearArmed) {
      clearArmed = true;
      clearBtn.textContent = 'Click again to clear everything';
      setTimeout(function () { clearArmed = false; clearBtn.textContent = 'Clear form'; }, 4000);
      return;
    }
    clearArmed = false;
    clearBtn.textContent = 'Clear form';
    FIELDS.forEach(function (id) { $(id).value = ''; });
    Array.prototype.forEach.call(document.querySelectorAll('.sev input'), function (r) { r.checked = false; });
    qInclude.checked = false;
    qBody.hidden = true;
    quotes = [];
    renderQuotes();
    qStatus.textContent = '';
    exportNote.textContent = '';
    exportFallback.hidden = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  });
  top3El.addEventListener('input', saveDraft);
  top3El.addEventListener('change', function (ev) {
    if (ev.target && ev.target.name && /-sev$/.test(ev.target.name)) { renderQuotes(); saveDraft(); }
  });
  loadDraft();

  setHead();
  render();
})();
