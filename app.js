// ── DAFTAR TES ───────────────────────────────────────────
// Tambah tes baru? Daftarkan di sini, lalu buat file JSON-nya di /data/
const TEST_LIST = [
  { id: "deret",      file: "data/deret.json" },
  { id: "matematika", file: "data/matematika.json" },
  { id: "wpt",        file: "data/wpt.json" },
  { id: "logika",     file: "data/logika.json" },
  { id: "cfit",       file: "data/cfit.json" },
];

// ── STATE ────────────────────────────────────────────────
let S = {
  page: "home",
  catalog: [],          // data dari semua JSON
  tid: null,
  qs: [], cur: 0, ans: [],
  sec: 0, interval: null,
  review: false,
};

// ── BOOT ─────────────────────────────────────────────────
async function init() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="loading">Memuat soal...</div>`;

  // load semua JSON secara paralel
  const results = await Promise.all(
    TEST_LIST.map(t =>
      fetch(t.file)
        .then(r => r.json())
        .catch(() => null)
    )
  );

  S.catalog = results.filter(Boolean);
  render();
}

// ── HELPERS ──────────────────────────────────────────────
const mk = (tag, cls = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

const fmt = s => {
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};

// ── RENDER ───────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  if (S.page === "home")   app.appendChild(pgHome());
  if (S.page === "intro")  app.appendChild(pgIntro());
  if (S.page === "test")   app.appendChild(pgTest());
  if (S.page === "result") app.appendChild(pgResult());
}

// ── HOME PAGE ────────────────────────────────────────────
function pgHome() {
  const w = mk("div");

  const nav = mk("div", "navbar");
  nav.innerHTML = `<span class="navbar-title">Psikotes</span>`;
  w.appendChild(nav);

  const pg = mk("div", "page");

  const lbl = mk("div", "section-label");
  lbl.textContent = "Pilih Tes";
  pg.appendChild(lbl);

  const grp = mk("div", "list-group");
  S.catalog.forEach(t => {
    const item = mk("div", "list-item");
    item.innerHTML = `
      <div class="item-icon" style="background:${t.color}22">${t.icon}</div>
      <div class="item-body">
        <div class="item-title">${t.title}</div>
        <div class="item-sub">${t.sub} · ${t.qs.length} soal</div>
      </div>
      <span class="badge">${fmt(t.dur)}</span>
      <span class="chevron">›</span>
    `;
    item.onclick = () => toIntro(t.id);
    grp.appendChild(item);
  });
  pg.appendChild(grp);

  w.appendChild(pg);
  return w;
}

// ── INTRO PAGE ───────────────────────────────────────────
function pgIntro() {
  const t = S.catalog.find(x => x.id === S.tid);
  const w = mk("div");

  const nav = mk("div", "navbar");
  nav.innerHTML = `
    <button class="nav-btn" onclick="toHome()">← Kembali</button>
    <span class="navbar-title">${t.title}</span>
    <span style="min-width:60px"></span>
  `;
  w.appendChild(nav);

  const pg = mk("div", "page");

  const card = mk("div", "intro-card");
  card.innerHTML = `
    <div class="intro-header">
      <div class="intro-icon">${t.icon}</div>
      <div class="intro-title">${t.title}</div>
      <div class="intro-sub">${t.sub}</div>
    </div>
    <div class="info-row"><span class="info-key">Jumlah Soal</span><span class="info-val">${t.qs.length} soal</span></div>
    <div class="info-row"><span class="info-key">Waktu</span><span class="info-val">${fmt(t.dur)}</span></div>
    <div class="info-row"><span class="info-key">Skor</span><span class="info-val">1 poin per benar</span></div>
  `;
  pg.appendChild(card);

  const btn = mk("button", "btn");
  btn.textContent = "Mulai Tes";
  btn.onclick = () => startTest(t.id);
  pg.appendChild(btn);

  w.appendChild(pg);
  return w;
}

// ── TEST PAGE ────────────────────────────────────────────
function pgTest() {
  const t = S.catalog.find(x => x.id === S.tid);
  const q = S.qs[S.cur];
  const total = S.qs.length;
  const answered = S.ans[S.cur] !== undefined;
  const isLast = S.cur === total - 1;
  const pct = ((S.cur + 1) / total * 100);
  const LABELS = ["A", "B", "C", "D", "E"];

  const w = mk("div");

  // navbar
  const nav = mk("div", "navbar");
  const tc = S.sec < 60 ? "danger" : S.sec < 120 ? "warn" : "";
  nav.innerHTML = `
    <button class="nav-btn" onclick="confirmExit()">Keluar</button>
    <span class="navbar-title">${t.title}</span>
    <span class="nav-btn right q-timer ${tc}" id="td">${fmt(S.sec)}</span>
  `;
  w.appendChild(nav);

  const pg = mk("div", "page");

  // progress
  const pb = mk("div");
  pb.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="q-meta">
      <span>Soal ${S.cur + 1} / ${total}</span>
      <span>${cntAns()} terjawab</span>
    </div>
  `;
  pg.appendChild(pb);

  // question card
  const qc = mk("div", "q-card");
  const isCfit   = !!q.q_img;
  const isSeries = S.tid === "deret";

  if (isCfit) {
    qc.innerHTML = `<img src="${q.q_img}" style="width:100%;border-radius:8px;display:block;" alt="Soal ${S.cur + 1}"/>`;
  } else {
    qc.innerHTML = `<div class="q-text ${isSeries ? "series" : ""}">${q.q}</div>`;
  }
  pg.appendChild(qc);

  // options
  const opts = mk("div", "options");

  if (isCfit) {
    // CFIT: tombol label saja, jumlah pilihan dari opt_count (default 6)
    const count = q.opt_count || 6;
    ["A","B","C","D","E","F"].slice(0, count).forEach((lbl, i) => {
      const b = mk("button", "opt-btn");
      if (S.ans[S.cur] === i) b.classList.add("selected");
      b.innerHTML = `<span class="opt-idx">${lbl}</span><span>Pilihan ${lbl}</span>`;
      b.onclick = () => pickAns(i);
      opts.appendChild(b);
    });
  } else {
    q.opts.forEach((o, i) => {
      const b = mk("button", "opt-btn");
      if (S.ans[S.cur] === i) b.classList.add("selected");
      b.innerHTML = `<span class="opt-idx">${LABELS[i]}</span><span>${o}</span>`;
      b.onclick = () => pickAns(i);
      opts.appendChild(b);
    });
  }
  pg.appendChild(opts);

  // navigasi bawah
  const row = mk("div", "btn-row");

  if (S.cur > 0) {
    const prev = mk("button", "btn ghost");
    prev.textContent = "← Sebelumnya";
    prev.style.flex = "1";
    prev.onclick = () => { S.cur--; render(); };
    row.appendChild(prev);
  }

  const next = mk("button", "btn");
  next.style.flex = "2";

  if (isLast) {
    next.textContent = "Submit Tes";
    next.className = answered ? "btn" : "btn red";
    next.onclick = doSubmit;
  } else {
    next.textContent = answered ? "Selanjutnya →" : "Lewati →";
    if (!answered) next.className = "btn skip";
    next.onclick = () => { S.cur++; render(); };
  }

  row.appendChild(next);
  pg.appendChild(row);

  w.appendChild(pg);
  return w;
}

// ── RESULT PAGE ──────────────────────────────────────────
function pgResult() {
  const t = S.catalog.find(x => x.id === S.tid);
  const total = S.qs.length;
  let correct = 0;
  S.qs.forEach((q, i) => { if (S.ans[i] === q.ans) correct++; });
  const wrong   = S.ans.filter(a => a !== undefined).length - correct;
  const skipped = S.ans.filter(a => a === undefined).length;
  const pct     = Math.round(correct / total * 100);
  const col     = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--accent)" : "var(--danger)";

  const w = mk("div");

  const nav = mk("div", "navbar");
  nav.innerHTML = `
    <button class="nav-btn" onclick="toHome()">Selesai</button>
    <span class="navbar-title">Hasil Tes</span>
    <button class="nav-btn right" onclick="toggleReview()">${S.review ? "Tutup" : "Review"}</button>
  `;
  w.appendChild(nav);

  const pg = mk("div", "page");

  // score
  const sc = mk("div", "score-card");
  sc.innerHTML = `
    <div class="score-num" style="color:${col}">${pct}%</div>
    <div class="score-label">${t.title}</div>
    <div class="score-sub">Benar <strong>${correct}</strong> dari <strong>${total}</strong> soal</div>
  `;
  pg.appendChild(sc);

  // stat
  const sr = mk("div", "stat-row");
  sr.innerHTML = `
    <div class="stat-box"><div class="stat-val g">${correct}</div><div class="stat-key">Benar</div></div>
    <div class="stat-box"><div class="stat-val r">${wrong}</div><div class="stat-key">Salah</div></div>
    <div class="stat-box"><div class="stat-val" style="color:var(--label2)">${skipped}</div><div class="stat-key">Lewati</div></div>
  `;
  pg.appendChild(sr);

  // review
  if (S.review) {
    const lbl = mk("div", "section-label");
    lbl.textContent = "Review Jawaban";
    pg.appendChild(lbl);

    S.qs.forEach((q, i) => {
      const ok   = S.ans[i] === q.ans;
      const skip = S.ans[i] === undefined;
      const item = mk("div", "review-item");

      const num = mk("div", "r-num " + (ok ? "ok" : "bad"));
      num.textContent = i + 1;

      const body = mk("div", "r-body");
      const isCfitQ = !!q.q_img;
      const ABCDEF  = ["A","B","C","D","E","F"];
      const uAnsLbl = skip ? "(dilewati)" : isCfitQ ? "Pilihan " + ABCDEF[S.ans[i]] : q.opts[S.ans[i]];
      const cAnsLbl = isCfitQ ? "Pilihan " + ABCDEF[q.ans] : q.opts[q.ans];
      const qLabel  = isCfitQ ? `Soal CFIT #${i + 1}` : q.q;
      body.innerHTML = `
        <div class="rq">${qLabel}</div>
        <div class="ra">
          Kamu: <span class="${ok ? "ok" : "bad"}">${uAnsLbl}</span>
          ${!ok ? ` · Benar: <span class="ok">${cAnsLbl}</span>` : ""}
        </div>
      `;

      item.appendChild(num);
      item.appendChild(body);
      pg.appendChild(item);
    });
  }

  const b1 = mk("button", "btn");
  b1.textContent = "Coba Lagi";
  b1.onclick = () => toIntro(t.id);
  pg.appendChild(b1);

  const b2 = mk("button", "btn ghost");
  b2.textContent = "Pilih Tes Lain";
  b2.onclick = toHome;
  pg.appendChild(b2);

  w.appendChild(pg);
  return w;
}

// ── ACTIONS ──────────────────────────────────────────────
function toHome() {
  stopTimer();
  S = {
    ...S,
    page: "home", tid: null,
    qs: [], cur: 0, ans: [],
    sec: 0, interval: null, review: false,
  };
  render();
}

function toIntro(id) {
  stopTimer();
  S.page = "intro";
  S.tid  = id;
  render();
}

function startTest(id) {
  const t  = S.catalog.find(x => x.id === id);
  const qs = [...t.qs].sort(() => Math.random() - 0.5);
  stopTimer();
  S = {
    ...S,
    page: "test", tid: id,
    qs, cur: 0,
    ans: new Array(qs.length).fill(undefined),
    sec: t.dur, interval: null, review: false,
  };
  startTimer();
  render();
}

function pickAns(i) {
  S.ans[S.cur] = i;
  render();
}

function cntAns() {
  return S.ans.filter(a => a !== undefined).length;
}

function doSubmit() {
  stopTimer();
  S.page   = "result";
  S.review = false;
  render();
}

function toggleReview() {
  S.review = !S.review;
  render();
}

function confirmExit() {
  if (confirm("Keluar dari tes? Progress akan hilang.")) toHome();
}

// ── TIMER ────────────────────────────────────────────────
function startTimer() {
  S.interval = setInterval(() => {
    S.sec--;
    if (S.sec <= 0) { stopTimer(); doSubmit(); return; }

    // update timer di navbar tanpa re-render penuh
    const el = document.getElementById("td");
    if (el) {
      el.textContent = fmt(S.sec);
      el.className   = "nav-btn right q-timer" +
        (S.sec < 60 ? " danger" : S.sec < 120 ? " warn" : "");
    }
  }, 1000);
}

function stopTimer() {
  if (S.interval) { clearInterval(S.interval); S.interval = null; }
}

// ── START ────────────────────────────────────────────────
init();
