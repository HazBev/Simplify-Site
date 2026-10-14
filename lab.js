// Readability Lab: a live, in-browser demo of the scoring described on the methodology page.
// Everything runs locally; no text leaves the browser.
(() => {
  const root = document.getElementById('readabilityLab');
  if (!root) return;

  const input = document.getElementById('labInput');
  const preview = document.getElementById('labPreview');
  const flags = document.getElementById('labFlags');
  const sampleBtn = document.getElementById('labSample');
  const plainBtn = document.getElementById('labPlain');
  const clearBtn = document.getElementById('labClear');
  const delta = document.getElementById('labDelta');
  const out = {
    fre: document.getElementById('labFre'),
    band: document.getElementById('labBand'),
    meter: document.getElementById('labMeter'),
    fog: document.getElementById('labFog'),
    fk: document.getElementById('labFk'),
    wps: document.getElementById('labWps'),
    words: document.getElementById('labWords'),
  };

  const samples = [
    'Notwithstanding anything to the contrary herein, the Supplier shall, in the event that the Services are not performed in accordance with the Specification, re-perform the same forthwith at its own cost, and the Customer shall be entitled to withhold payment pursuant to clause 7 until such time as the deficiency has been remedied to the reasonable satisfaction of the Customer.',
    'This Agreement may be terminated by either party upon the giving of not less than thirty (30) days\' prior written notice. All sums which are due and owing hereunder shall be paid by the Customer prior to the effective date of termination.',
    'Each party shall keep the other party\'s Confidential Information secret. It may share that information only with its employees who need to know it to perform this Agreement.',
  ];
  let sampleIndex = 0;

  // Legalese and the plain alternative Simplify would suggest. Longest phrases first so they win.
  const legalese = [
    ['notwithstanding anything to the contrary', 'despite anything else'],
    ['shall be entitled to', 'may'],
    ['in the event that', 'if'],
    ['until such time as', 'until'],
    ['with respect to', 'about'],
    ['in accordance with', 'under'],
    ['for the avoidance of doubt', 'to be clear'],
    ['prior to', 'before'],
    ['subsequent to', 'after'],
    ['pursuant to', 'under'],
    ['by virtue of', 'because of'],
    ['the giving of', 'giving'],
    ['due and owing', 'due'],
    ['null and void', 'void'],
    ['notwithstanding', 'despite'],
    ['forthwith', 'immediately'],
    ['hereinafter', 'from now on'],
    ['hereunder', 'under this agreement'],
    ['herein', 'in this agreement'],
    ['hereto', 'to this agreement'],
    ['thereof', 'of it'],
    ['therein', 'in it'],
    ['whereas', 'because'],
    ['said', 'the'],
    ['the same', 'it'],
    ['is obliged to', 'must'],
    ['shall', 'must'],
    ['commence', 'start'],
    ['terminate', 'end'],
    ['utilise', 'use'],
    ['utilize', 'use'],
    ['deem', 'treat as'],
    ['endeavour', 'try'],
  ];
  const legaleseRe = new RegExp(
    `\\b(${legalese.map(([term]) => term.replace(/[-]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );
  const plainFor = (term) => legalese.find(([t]) => t === term.toLowerCase())?.[1] ?? term;

  const strings = {
    en: {
      bands: ['Very difficult', 'Difficult', 'Fairly difficult', 'Standard', 'Fairly easy', 'Easy', 'Very easy'],
      long: (n) => `Long sentence (${n} words)`,
      passive: 'Possible passive voice',
      legal: (term, plain) => `Legalese: “${term}” → try “${plain}”`,
      none: 'No flags. Nicely done.',
      flagCount: (l, p, g) => `${l} long sentence${l === 1 ? '' : 's'} · ${p} passive construction${p === 1 ? '' : 's'} · ${g} legalese term${g === 1 ? '' : 's'}`,
      delta: (d) => `Plain-English swaps moved Flesch Reading Ease by ${d > 0 ? '+' : ''}${d.toFixed(1)} points.`,
      empty: 'Paste a clause above to see it annotated.',
    },
    fr: {
      bands: ['Très difficile', 'Difficile', 'Assez difficile', 'Standard', 'Assez facile', 'Facile', 'Très facile'],
      long: (n) => `Phrase longue (${n} mots)`,
      passive: 'Voix passive possible',
      legal: (term, plain) => `Jargon : « ${term} » → essayez « ${plain} »`,
      none: 'Aucun signalement. Bravo.',
      flagCount: (l, p, g) => `${l} phrase(s) longue(s) · ${p} tournure(s) passive(s) · ${g} terme(s) de jargon`,
      delta: (d) => `Les reformulations ont modifié le score Flesch de ${d > 0 ? '+' : ''}${d.toFixed(1)} points.`,
      empty: 'Collez une clause ci-dessus pour la voir annotée.',
    },
  };
  const t = () => strings[document.documentElement.lang === 'fr' ? 'fr' : 'en'];

  // Same syllable logic described on the page: vowel groups, drop silent e, minimum one.
  const syllables = (word) => {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const groups = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  };

  const splitSentences = (text) =>
    (text.match(/[^.!?;]+[.!?;]*/g) || []).map((s) => s.trim()).filter((s) => /[a-z]/i.test(s));
  const wordsOf = (text) => text.match(/[A-Za-z][A-Za-z'’-]*/g) || [];

  const analyse = (text) => {
    const sentences = splitSentences(text);
    const words = wordsOf(text);
    const nS = Math.max(1, sentences.length);
    const nW = words.length;
    if (!nW) return null;
    const syl = words.reduce((sum, w) => sum + syllables(w), 0);
    const complex = words.filter((w) => syllables(w) >= 3 && !/^[A-Z]/.test(w)).length;
    const wps = nW / nS;
    const spw = syl / nW;
    return {
      sentences,
      words: nW,
      wps,
      fre: 206.835 - 1.015 * wps - 84.6 * spw,
      fk: 0.39 * wps + 11.8 * spw - 15.59,
      fog: 0.4 * (wps + 100 * (complex / nW)),
    };
  };

  const bandIndex = (fre) => {
    if (fre >= 90) return 6;
    if (fre >= 80) return 5;
    if (fre >= 70) return 4;
    if (fre >= 60) return 3;
    if (fre >= 50) return 2;
    if (fre >= 30) return 1;
    return 0;
  };

  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // be-verb followed (optionally via an adverb) by a past participle.
  const passiveRe = /\b(am|is|are|was|were|be|been|being)\s+(?:not\s+)?(?:\w+ly\s+)?(\w+(?:ed|en)|paid|made|given|held|kept|sent|done|set|put)\b/gi;

  const annotateSentence = (sentence, counts) => {
    const marks = [];
    sentence.replace(legaleseRe, (m, _g, offset) => {
      marks.push({ start: offset, end: offset + m.length, kind: 'legal', title: t().legal(m, plainFor(m)) });
      counts.legal += 1;
      return m;
    });
    sentence.replace(passiveRe, (m, _a, _b, offset) => {
      const overlaps = marks.some((k) => offset < k.end && offset + m.length > k.start);
      if (!overlaps) {
        marks.push({ start: offset, end: offset + m.length, kind: 'passive', title: t().passive });
        counts.passive += 1;
      }
      return m;
    });
    marks.sort((a, b) => a.start - b.start);
    let html = '';
    let cursor = 0;
    marks.forEach((k) => {
      html += escapeHtml(sentence.slice(cursor, k.start));
      html += `<mark class="lab-${k.kind}" title="${escapeHtml(k.title)}">${escapeHtml(sentence.slice(k.start, k.end))}</mark>`;
      cursor = k.end;
    });
    html += escapeHtml(sentence.slice(cursor));
    const n = wordsOf(sentence).length;
    if (n > 20) {
      counts.long += 1;
      return `<span class="lab-long" title="${escapeHtml(t().long(n))}">${html}</span>`;
    }
    return html;
  };

  const render = () => {
    const result = analyse(input.value);
    if (!result) {
      ['fre', 'fog', 'fk', 'wps', 'words'].forEach((k) => { out[k].textContent = '–'; });
      out.band.textContent = '';
      out.meter.style.setProperty('--score', 0);
      preview.innerHTML = `<span class="mono">${escapeHtml(t().empty)}</span>`;
      flags.textContent = '';
      return;
    }
    const fre = Math.max(0, Math.min(100, result.fre));
    out.fre.textContent = fre.toFixed(1);
    out.band.textContent = t().bands[bandIndex(fre)];
    out.meter.style.setProperty('--score', fre);
    out.fog.textContent = result.fog.toFixed(1);
    out.fk.textContent = Math.max(0, result.fk).toFixed(1);
    out.wps.textContent = result.wps.toFixed(1);
    out.words.textContent = String(result.words);

    const counts = { long: 0, passive: 0, legal: 0 };
    preview.innerHTML = result.sentences.map((s) => annotateSentence(s, counts)).join(' ');
    flags.textContent = counts.long + counts.passive + counts.legal
      ? t().flagCount(counts.long, counts.passive, counts.legal)
      : t().none;
  };

  const matchCase = (original, replacement) =>
    /^[A-Z]/.test(original) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;

  const plainify = () => {
    const before = analyse(input.value);
    if (!before) return;
    input.value = input.value
      .replace(legaleseRe, (m) => matchCase(m, plainFor(m)))
      .replace(/\b(\w+) \((\d+)\)/g, '$2'); // "thirty (30)" → "30"
    const after = analyse(input.value);
    render();
    const d = Math.max(0, Math.min(100, after.fre)) - Math.max(0, Math.min(100, before.fre));
    delta.textContent = t().delta(d);
  };

  const loadSample = () => {
    input.value = samples[sampleIndex];
    sampleIndex = (sampleIndex + 1) % samples.length;
    delta.textContent = '';
    render();
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    delta.textContent = '';
    timer = setTimeout(render, 120);
  });
  sampleBtn.addEventListener('click', loadSample);
  plainBtn.addEventListener('click', plainify);
  clearBtn.addEventListener('click', () => {
    input.value = '';
    delta.textContent = '';
    render();
    input.focus();
  });

  // Re-render dynamic labels when the site language toggle changes <html lang>.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  loadSample();
})();
