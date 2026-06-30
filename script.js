// ═══════════════════════════════════════════════════════════════════════════
//  SISTEM AKUISISI ENGLISH v4.7.3 — script.js (FIXED & CONSOLIDATED)
//
//  Changelog v4.7.3:
//    FIX: selectedAnswer dideklarasikan secara eksplisit (tidak lagi implicit global)
//    FIX: Seluruh alert() pada modul Quiz diganti showBanner() (non-blocking)
//    FIX: Fungsi show() (dead code) dihapus; navigasi terpusat di pindahTab()
//    FIX: loadAndShowPremiumContent() kini menggunakan pindahTab()
//    FIX: SPEAKING_LAB_URL dikonsolidasi menjadi satu konstanta di atas file
//    FIX: setActiveNav() & pindahTab() dipindahkan ke file ini (tidak lagi split)
//    IMPROVEMENT: Navigasi onload dashboard tidak lagi bergantung polling interval
// ═══════════════════════════════════════════════════════════════════════════

// ─── KONSTANTA GLOBAL ────────────────────────────────────────────────────────

const LS_SESSION_KEY   = 'memberSession_v47';
const GAS_API_URL      = 'https://script.google.com/macros/s/AKfycbyNd61rOZ1XwcmzsN3f5PoALkFxtuz8jr2ePCstaTeryAlT3PCt8Hogsqkn0hJf7SA4/exec';
const SPEAKING_LAB_URL = 'https://3xtream.github.io/english/speaking-lab.html';
const WRITING_LAB_URL = 'https://3xtream.github.io/english/writing-lab.html';

// ─── STATE APLIKASI ───────────────────────────────────────────────────────────

let currentUser      = null;
let flashcardList    = [];
let currentCardIndex = 0;
let speechRate       = 0.7;

// State Quiz
let quizQuestions    = [];
let currentQuestion  = 0;
let score            = 0;
let userAnswers      = [];
let selectedAnswer   = null;   // FIX: dideklarasikan eksplisit, tidak lagi implicit global


// ═══════════════════════════════════════════════════════════════════════════
//  NOTIFIKASI BANNER INLINE (menggantikan seluruh alert() di aplikasi)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tampilkan banner notifikasi inline.
 * @param {string} message  - Pesan yang ditampilkan
 * @param {'error'|'success'|'info'} type - Tipe notifikasi
 * @param {number} duration - Durasi tampil dalam ms (0 = manual dismiss)
 */
function showBanner(message, type = 'error', duration = 5000) {
  let banner = document.getElementById('globalBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'globalBanner';
    banner.style.cssText = `
      position:fixed; top:72px; left:50%; transform:translateX(-50%);
      z-index:9999; min-width:320px; max-width:90vw;
      padding:12px 18px; border-radius:12px; font-size:13px; font-weight:600;
      display:flex; align-items:center; gap:10px;
      box-shadow:0 4px 20px rgba(0,0,0,.12); transition:opacity .3s;
    `;
    document.body.appendChild(banner);
  }

  const styles = {
    error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '✕' },
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✓' },
    info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: 'ℹ' },
  };
  const s = styles[type] || styles.info;

  banner.style.background    = s.bg;
  banner.style.border        = `1px solid ${s.border}`;
  banner.style.color         = s.color;
  banner.style.opacity       = '1';
  banner.style.pointerEvents = 'auto';
  banner.innerHTML = `
    <span style="font-size:16px;line-height:1">${s.icon}</span>
    <span style="flex:1">${message}</span>
    <span onclick="hideBanner()" style="cursor:pointer;opacity:.6;font-size:16px;line-height:1;margin-left:4px">✕</span>
  `;

  if (banner._hideTimer) clearTimeout(banner._hideTimer);
  if (duration > 0) {
    banner._hideTimer = setTimeout(hideBanner, duration);
  }
}

function hideBanner() {
  const banner = document.getElementById('globalBanner');
  if (banner) {
    banner.style.opacity       = '0';
    banner.style.pointerEvents = 'none';
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════

function showSkeletons() {
  ['totalProgress', 'totalDays', 'vocabCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<span style="display:inline-block;width:48px;height:20px;
        background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
        background-size:200% 100%;animation:skeletonShimmer 1.2s infinite;
        border-radius:4px"></span>`;
    }
  });
}
// ═══════════════════════════════════════════════════════════════════════════
//                                API KEY
// ═══════════════════════════════════════════════════════════════════════════
function saveApiKey() {
  apiKey = document.getElementById('apiKeyInput').value.trim();
  localStorage.setItem('gemini_api_key', apiKey);
  showToast('API Key tersimpan! ✅');
}


// ═══════════════════════════════════════════════════════════════════════════
//  NAVIGASI TAB  (FIX: dipindahkan ke sini — tidak lagi split antara
//                 script.js dan inline <script> di HTML)
// ═══════════════════════════════════════════════════════════════════════════

function setActiveNav(element) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'active');
    btn.classList.add('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-800');
  });
  element.classList.remove('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-800');
  element.classList.add('bg-indigo-50', 'text-indigo-700', 'active');
}

function pindahTab(sectionId) {
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.setProperty('display', 'none', 'important');
    sec.classList.remove('active');
  });
  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.style.setProperty('display', 'block', 'important');
    activeSection.classList.add('active');
  }
  // Trigger fungsi spesifik saat tab tertentu dibuka
  if (sectionId === 'flashcard-tab' && typeof initFlashcards === 'function') initFlashcards();
  if (sectionId === 'speaking-lab'  && typeof loadSpeakingLabIframe === 'function') loadSpeakingLabIframe();
  if (sectionId === 'writing-lab'  && typeof loadWritingLabIframe === 'function') loadWritingLabIframe();
}


// ═══════════════════════════════════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function callAPI(action, params = {}) {
  if (!GAS_API_URL) throw new Error('URL API belum dikonfigurasi.');
  const body = JSON.stringify({ action, ...params });
  const res  = await fetch(GAS_API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}


// ═══════════════════════════════════════════════════════════════════════════
//  INISIALISASI & GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display     = 'none';
  _injectGlobalStyles();
  startApp();
});

function _injectGlobalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes skeletonShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .graph-bar-wrap {
      display:flex; flex-direction:column; align-items:center;
      flex:1; gap:4px; min-width:0;
    }
    .graph-bar-inner {
      width:100%; border-radius:6px 6px 0 0;
      background:linear-gradient(to top,#6366f1,#818cf8);
      position:relative; cursor:default; transition:opacity .2s;
      min-height:4px;
    }
    .graph-bar-inner:hover { opacity:.8; }
    .graph-bar-inner .g-tooltip {
      display:none; position:absolute; bottom:calc(100% + 6px); left:50%;
      transform:translateX(-50%);
      background:#1e293b; color:#fff; font-size:11px; font-weight:600;
      padding:4px 8px; border-radius:6px; white-space:nowrap;
      z-index:10; pointer-events:none;
    }
    .graph-bar-inner:hover .g-tooltip { display:block; }
    .graph-bar-inner .g-tooltip::after {
      content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%);
      border:5px solid transparent; border-top-color:#1e293b;
    }
    .graph-val-label  { font-size:10px; font-weight:700; color:#6366f1; }
    .graph-date-label { font-size:9px; color:#94a3b8; font-family:monospace; text-align:center; }
    .graph-bar-inner.today-bar { background:linear-gradient(to top,#4f46e5,#6366f1); }
    .speaking { animation:pulse 1s infinite; }
    .writing { animation:pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
    .vocab-item {
      display:flex; align-items:center; background:#f9f9f9;
      padding:6px 10px; border:1px solid #eee; border-radius:4px;
      font-size:13px; user-select:none; cursor:pointer;
    }
    .vocab-item input { margin-right:8px; cursor:pointer; }
    .vocab-item span  { color:#666; font-size:11px; margin-left:4px; }
    .section         { display:none; }
    .section.active  { display:block; animation:fadeIn .25s ease-in-out; }
    .perspective        { perspective:1000px; }
    .transform-style-3d { transform-style:preserve-3d; }
    .backface-hidden    { backface-visibility:hidden; }
    .rotate-y-180       { transform:rotateY(180deg); }
    #fCard.flipped      { transform:rotateY(180deg); }
    @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    .badge.b-ok   { background:#dcfce7; color:#166534; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:700; }
    .badge.b-warn { background:#fef9c3; color:#854d0e; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:700; }
    .badge.b-no   { background:#fee2e2; color:#991b1b; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:700; }
  `;
  document.head.appendChild(style);
}

function startApp() {
  let raw = null;
  try { raw = localStorage.getItem(LS_SESSION_KEY); } catch (e) {}
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && s.email && s.token && s.fullName && (!s.expiresAt || Date.now() < s.expiresAt)) {
        currentUser = { email: s.email, fullName: s.fullName, token: s.token };
        activateApp();
        return;
      }
      try { localStorage.removeItem(LS_SESSION_KEY); } catch (e) {}
    } catch (e) {
      try { localStorage.removeItem(LS_SESSION_KEY); } catch (e2) {}
    }
  }
  showAuthPage();
}

function showLoader(v) {
  const l = document.getElementById('loading');
  if (l) l.style.display = v ? 'flex' : 'none';
}

function setDefaultDate() {
  const d = document.getElementById('logDate');
  if (d) d.value = new Date().toISOString().substring(0, 10);
}


// ═══════════════════════════════════════════════════════════════════════════
//  AUTH — HALAMAN & FORM
// ═══════════════════════════════════════════════════════════════════════════

function switchAuth(t) {
  const isLogin = t === 'login';

  const tabLogin    = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginBox    = document.getElementById('loginBox');
  const registerBox = document.getElementById('registerBox');

  if (tabLogin)    tabLogin.className    = isLogin
    ? 'flex-1 py-2.5 text-center rounded-lg cursor-pointer transition-all bg-white text-slate-900 shadow-2xs'
    : 'flex-1 py-2.5 text-center rounded-lg cursor-pointer transition-all hover:text-slate-900 text-slate-500';
  if (tabRegister) tabRegister.className = !isLogin
    ? 'flex-1 py-2.5 text-center rounded-lg cursor-pointer transition-all bg-white text-slate-900 shadow-2xs'
    : 'flex-1 py-2.5 text-center rounded-lg cursor-pointer transition-all hover:text-slate-900 text-slate-500';
  if (loginBox)    loginBox.style.display    = isLogin ? 'block' : 'none';
  if (registerBox) registerBox.style.display = !isLogin ? 'block' : 'none';
}

function showAuthPage() {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('mainApp').style.display     = 'none';
  switchAuth('login');
}

async function handleRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  if (!name || !email || !pass) { showBanner('Lengkapi semua field terlebih dahulu.', 'error'); return; }
  if (pass.length < 6)          { showBanner('Password minimal 6 karakter.', 'error'); return; }
  showLoader(true);
  try {
    const r = await callAPI('registerUser', { email, password: pass, fullName: name });
    showBanner(r.message, r.success ? 'success' : 'error');
    if (r.success) {
      document.getElementById('regName').value     = '';
      document.getElementById('regEmail').value    = '';
      document.getElementById('regPassword').value = '';
      switchAuth('login');
      document.getElementById('loginEmail').value  = email;
    }
  } catch (e) {
    showBanner('Error koneksi: ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) { showBanner('Masukkan email dan password.', 'error'); return; }
  showLoader(true);
  try {
    const r = await callAPI('loginUser', { email, password: pass });
    if (r.success) {
      currentUser = { email: r.user.email, fullName: r.user.fullName, token: r.token };
      try {
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify({
          ...currentUser,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }));
      } catch (e) {}
      activateApp();
    } else {
      showBanner(r.message, 'error');
    }
  } catch (e) {
    showBanner('Error koneksi: ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

function activateApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display     = 'block';
  document.getElementById('appTitle').innerHTML = `
    <span class="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span>
    Sistem Tracker · 🧑‍💻 ${currentUser.fullName}
  `;

  const setupCard  = document.getElementById('spSetupCard');
  const iframeWrap = document.getElementById('spIframeWrap');
  if (setupCard)  setupCard.style.setProperty('display', 'none', 'important');
  if (iframeWrap) iframeWrap.style.setProperty('display', 'flex', 'important');

  // FIX: Langsung buka dashboard tanpa polling interval
  pindahTab('dashboard');
  const btnDashboard = document.getElementById('btn-dashboard');
  if (btnDashboard) setActiveNav(btnDashboard);

  showSkeletons();
  refreshDataFromDatabase();
}

function handleLogout() {
  try { localStorage.removeItem(LS_SESSION_KEY); } catch (e) {}
  currentUser      = null;
  flashcardList    = [];
  currentCardIndex = 0;
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  switchAuth('login');
  showAuthPage();
}


// ═══════════════════════════════════════════════════════════════════════════
//  DATA REFRESH & RENDER
// ═══════════════════════════════════════════════════════════════════════════

async function refreshDataFromDatabase() {
  if (!currentUser || !currentUser.token) { handleLogout(); return; }
  showLoader(true);
  try {
    const [vb, dd] = await Promise.all([
      callAPI('getVocabBank',     { email: currentUser.email, token: currentUser.token }),
      callAPI('getDashboardData', { email: currentUser.email, token: currentUser.token }),
    ]);

    if (vb && vb.success === false) throw new Error(vb.message);
    if (dd && dd.success === false) throw new Error(dd.message);

    const masteredList = (Array.isArray(vb) ? vb : []).filter(v => v.mastered).map(v => v.id);

    processDatabaseRender({
      vocabBank:      Array.isArray(vb) ? vb : [],
      last7Logs:      dd.logs          || [],
      totalMinutes:   dd.totalMinutes  || 0,
      latestWpm:      dd.latestWpm     || 0,
      masteredVocabs: masteredList,
      checkedPhases:  dd.checkedPhases || { 1: [], 2: [], 3: [], 4: [] },
    });
  } catch (e) {
    showBanner('Gagal memuat data: ' + e.message, 'error', 0);
  } finally {
    showLoader(false);
  }
}

function renderVocabHTML(vb) {
  if (!vb) return;
  for (let i = 1; i <= 7; i++) {
    const e = document.getElementById(`cat${i}`);
    if (e) e.innerHTML = '';
  }
  vb.forEach(item => {
    if (!item.id) return;
    const catId = item.id.split('-')[0].toLowerCase();
    const c = document.getElementById(catId);
    if (c) {
      const l = document.createElement('label');
      l.className = 'vocab-item';
      l.innerHTML = `<input type="checkbox" class="vocab-chk" data-id="${item.id}" id="chk-${item.id}" onchange="syncVocabPoints(this,'${item.id}')"><strong>${item.word}</strong><span>(${item.meaning})</span>`;
      c.appendChild(l);
    }
  });
}

function processDatabaseRender(data) {
  try {
    if (data.vocabBank)  renderVocabHTML(data.vocabBank);
    if (data.last7Logs)  renderDailyGraph(data.last7Logs);

    // Streak days
    const streakDays = data.last7Logs ? data.last7Logs.filter(l => l.duration > 0).length : 0;
    const tde = document.getElementById('totalDays');
    if (tde) tde.textContent = streakDays;

    // WPM terbaru
    const wpe = document.getElementById('currentWpmInput');
    if (wpe) wpe.value = data.latestWpm || 0;
    updateWPMStatus();
    runWpmCalc();

    // Vocab mastered checkboxes
    const ms = new Set(data.masteredVocabs || []);
    let cc = 0;
    document.querySelectorAll('.vocab-chk').forEach(c => {
      const id = c.getAttribute('data-id');
      c.checked = ms.has(id);
      if (ms.has(id)) cc++;
    });
    ['floatingCounter', 'currentVocabInput', 'vocabCount'].forEach(id => {
      const e = document.getElementById(id);
      if (e) {
        if (id === 'floatingCounter') e.textContent = `${cc} Kata Terkuasai`;
        else if (id === 'vocabCount') e.textContent = cc;
        else e.value = cc;
      }
    });
    updateVocabStatusMilestone(cc);

    // Restore Phase Checklist dari data server
    const cp = data.checkedPhases || { 1: [], 2: [], 3: [], 4: [] };
    [1, 2, 3, 4].forEach(p => {
      const checkedIndices = cp[p] || [];
      const cks = document.querySelectorAll(`.p${p}-chk`);
      cks.forEach(chk => {
        const idx = parseInt(chk.getAttribute('data-idx'));
        chk.checked = checkedIndices.includes(idx);
      });
      const n   = cks.length ? Array.from(cks).filter(c => c.checked).length : 0;
      const pct = cks.length ? Math.round((n / cks.length) * 100) : 0;
      // Update progress bar di Dashboard
      const pt = document.getElementById(`phase${p}Progress`);
      const pb = document.getElementById(`phase${p}Bar`);
      if (pt) pt.textContent = pct + '%';
      if (pb) pb.style.width = pct + '%';
      // Update progress bar di tab Teori & Fase
      const ptTh = document.getElementById(`phase${p}Progress-th`);
      const pbTh = document.getElementById(`phase${p}Bar-th`);
      if (ptTh) ptTh.textContent = pct + '%';
      if (pbTh) pbTh.style.width = pct + '%';
    });

    calculateOverallGlobalProgress();
    initFlashcards();
  } catch (err) {
    console.error('processDatabaseRender error:', err);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  FLASHCARD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

async function initFlashcards() {
  if (!currentUser || !currentUser.token) return;
  try {
    const d = await callAPI('getFlashcards', { email: currentUser.email, token: currentUser.token });
    flashcardList    = Array.isArray(d) ? d : [];
    currentCardIndex = 0;
    displayCard();
  } catch (e) {
    console.error('Flashcard init error:', e);
  }
}

function displayCard() {
  const fCard = document.getElementById('fCard');
  if (fCard) fCard.classList.remove('flipped');

  const tracker      = document.getElementById('fcTracker');
  const frontWord    = document.getElementById('fcFrontWord');
  const backMeaning  = document.getElementById('fcBackMeaning');

  if (!flashcardList || flashcardList.length === 0) {
    if (frontWord)   frontWord.textContent  = '🎉 Selesai!';
    if (backMeaning) backMeaning.textContent = 'Semua kosakata telah dikuasai.';
    if (tracker)     tracker.textContent    = '0 / 0 Kartu';
    updateFlashcardProgress(0, 0);
    return;
  }

  if (currentCardIndex >= flashcardList.length) currentCardIndex = 0;
  if (currentCardIndex < 0) currentCardIndex = flashcardList.length - 1;

  if (tracker) tracker.textContent = `Kartu ke ${document.getElementById('vocabCount').textContent} Sisa ${flashcardList.length}`;

  const item = flashcardList[currentCardIndex];
  if (frontWord)   frontWord.textContent  = item.word;
  if (backMeaning) backMeaning.textContent = item.meaning;

  updateFlashcardProgress(currentCardIndex + 1, flashcardList.length);

  const ap = document.getElementById('autoPlayToggle');
  if (ap && ap.checked) setTimeout(() => speakWord(item.word), 300);
}
function updateFlashcardProgress(current, total) {
  const progressBar = document.getElementById('flashcardProgress');
  if (!progressBar) return;
  progressBar.style.width = total > 0 ? ((current / total) * 100) + '%' : '0%';
}

function flipCard() {
  const c = document.getElementById('fCard');
  if (c) c.classList.toggle('flipped');
}

function nextCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  currentCardIndex = (currentCardIndex + 1) % flashcardList.length;
  displayCard();
}

function prevCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  currentCardIndex = (currentCardIndex - 1 + flashcardList.length) % flashcardList.length;
  displayCard();
}

async function markAsMasteredFromCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  const item = flashcardList[currentCardIndex];
  await syncVocabPoints({ checked: true }, item.id);
  flashcardList.splice(currentCardIndex, 1);
  if (currentCardIndex >= flashcardList.length && currentCardIndex > 0) currentCardIndex--;
  displayCard();
}


// ═══════════════════════════════════════════════════════════════════════════
//  AUDIO — SPEECH SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════

function speakWord(word) {
  if (!word || word === '-' || word === '🎉 Selesai!') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u   = new SpeechSynthesisUtterance(word);
  u.lang    = 'en-US'; u.rate = speechRate; u.pitch = 1; u.volume = 1;
  const vs  = window.speechSynthesis.getVoices();
  const ev  = vs.find(v => v.lang.startsWith('en') && v.localService) || vs.find(v => v.lang.startsWith('en'));
  if (ev) u.voice = ev;
  const btn = document.getElementById('btnSpeak');
  const st  = document.getElementById('speechStatus');
  u.onstart = () => { if (btn) btn.classList.add('speaking');    if (st) st.textContent = `🔊 "${word}"`; };
  u.onend   = () => { if (btn) btn.classList.remove('speaking'); if (st) st.textContent = ''; };
  u.onerror = () => { if (btn) btn.classList.remove('speaking'); };
  window.speechSynthesis.speak(u);
}

function speakCurrentWord(e) {
  if (e) e.stopPropagation();
  if (flashcardList.length) speakWord(flashcardList[currentCardIndex].word);
}

function setSpeed(r, el) {
  speechRate = r;
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.className = 'speed-btn px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200';
  });
  if (el) el.className = 'speed-btn active px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg';
}


// ═══════════════════════════════════════════════════════════════════════════
//  KONTEN PREMIUM  (FIX: gunakan pindahTab() bukan show() yang sudah dihapus)
// ═══════════════════════════════════════════════════════════════════════════

async function loadAndShowPremiumContent() {
  pindahTab('premium-content-section');   // FIX: was show() — dead code
  document.getElementById('premium-dynamic-placeholder').innerHTML =
    '<div style="text-align:center;padding:2rem;color:#4f46e5;font-weight:bold">🔄 Mengunduh konten premium...</div>';
  try {
    const r = await callAPI('loadContentPage');
    document.getElementById('premium-dynamic-placeholder').innerHTML = r.html || '<p>Konten kosong.</p>';
  } catch (e) {
    document.getElementById('premium-dynamic-placeholder').innerHTML =
      `<div style="padding:1rem;color:#991b1b;background:#fef2f2;border-radius:8px">❌ ${e.message}</div>`;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  DATA SYNC — LOGS, VOCAB, CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

async function logDailyActivity() {
  if (!currentUser || !currentUser.token) return;
  const duration = parseInt(document.getElementById('inputDuration').value) || 0;
  const passage  = parseInt(document.getElementById('passagesRead').value)  || 0;
  const wpm      = parseInt(document.getElementById('currentWpmInput').value) || 0;
  if (duration === 0 && wpm === 0) {
    showBanner('Isi minimal Durasi atau WPM sebelum menyimpan log.', 'error');
    return;
  }
  showLoader(true);
  try {
    const r = await callAPI('saveDailyLog', {
      email: currentUser.email,
      token: currentUser.token,
      duration, passage, wpm,
    });
    if (r.success) {
      showBanner('Log harian berhasil disimpan!', 'success');
      refreshDataFromDatabase();
    } else {
      showBanner(r.message, 'error');
    }
  } catch (e) {
    showBanner('Error: ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

async function syncVocabPoints(el, wordId) {
  if (!currentUser || !currentUser.token) return;
  const checked = el.checked !== undefined ? el.checked : !!el.checked;
  const chk = document.getElementById(`chk-${wordId}`);
  if (chk) chk.checked = checked;
  try {
    await callAPI('updateVocabProgress', {
      email: currentUser.email, token: currentUser.token,
      wordId, isMastered: checked,
    });
    const n = document.querySelectorAll('.vocab-chk:checked').length;
    ['currentVocabInput', 'vocabCount', 'floatingCounter'].forEach(id => {
      const e = document.getElementById(id);
      if (e) {
        if (id === 'floatingCounter') e.textContent = `${n} Kata Terkuasai`;
        else if (id === 'vocabCount') e.textContent = n;
        else e.value = n;
      }
    });
    updateVocabStatusMilestone(n);
  } catch (e) {
    if (chk) chk.checked = !checked;
    showBanner('Gagal sinkronisasi vocab: ' + e.message, 'error');
  }
}

async function syncPhaseChecklist(p, idx, el) {
  try {
    await callAPI('updatePhaseChecklist', {
      email: currentUser.email, token: currentUser.token,
      phaseNum: p, checklistIndex: idx, isChecked: el.checked,
    });
    const cks = document.querySelectorAll(`.p${p}-chk`);
    let n = 0;
    cks.forEach(c => { if (c.checked) n++; });
    const pct = cks.length ? Math.round((n / cks.length) * 100) : 0;
    // Update dashboard
    const pt = document.getElementById(`phase${p}Progress`);
    const pb = document.getElementById(`phase${p}Bar`);
    if (pt) pt.textContent = pct + '%';
    if (pb) pb.style.width  = pct + '%';
    // Update Teori & Fase tab
    const ptTh = document.getElementById(`phase${p}Progress-th`);
    const pbTh = document.getElementById(`phase${p}Bar-th`);
    if (ptTh) ptTh.textContent = pct + '%';
    if (pbTh) pbTh.style.width  = pct + '%';
    calculateOverallGlobalProgress();
  } catch (e) {
    el.checked = !el.checked;   // rollback
    showBanner('Gagal simpan checklist: ' + e.message, 'error');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  WPM — KALKULASI & STATUS
// ═══════════════════════════════════════════════════════════════════════════

async function handleWpmChange() {
  if (!currentUser || !currentUser.token) return;
  const wpm = parseInt(document.getElementById('currentWpmInput').value) || 0;
  if (wpm > 600) { showBanner('WPM melebihi batas normal (max 600).', 'error'); return; }
  showLoader(true);
  try {
    await callAPI('updateWpmOnly', { email: currentUser.email, token: currentUser.token, wpm });
    updateWPMStatus();
  } catch (e) {
    showBanner('Gagal simpan WPM: ' + e.message, 'error');
  } finally {
    showLoader(false);
  }
}

function updateWPMStatus() {
  const v = parseInt(document.getElementById('currentWpmInput').value) || 0;
  [{ k: 'P1', t: 100 }, { k: 'P2', t: 130 }, { k: 'P3', t: 160 }].forEach(({ k, t }) => {
    const b = document.getElementById(`wpm${k}bar`);
    const s = document.getElementById(`wpm${k}status`);
    if (b) b.style.width = Math.min(100, (v / t) * 100) + '%';
    if (s) s.innerHTML   = v >= t
      ? '<span class="badge b-ok">✓ Lulus</span>'
      : '<span class="badge b-warn">~ Progress</span>';
  });
}

function runWpmCalc() {
  const w = parseInt(document.getElementById('calcWords').value)   || 0;
  const s = parseInt(document.getElementById('calcSeconds').value) || 0;
  const r = document.getElementById('calcResult');
  if (r) r.textContent = (w > 0 && s > 0) ? Math.round((w / s) * 60) + ' WPM' : '0 WPM';
}

function applyCalcToInput() {
  const v = parseInt((document.getElementById('calcResult').textContent || '0')) || 0;
  document.getElementById('currentWpmInput').value = v;
  handleWpmChange();
}

function updateVocabStatusMilestone(v) {
  [{ k: 'P1', min: 300 }, { k: 'P2', min: 800 }, { k: 'P3', min: 1200 }, { k: 'P4', min: 1800 }].forEach(({ k, min }) => {
    const e = document.getElementById(`vocab${k}status`);
    if (e) e.innerHTML = v >= min
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">✓ Lulus</span>'
      : '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-100">❌ Belum</span>';
  });
}

function calculateOverallGlobalProgress() {
  const all = document.querySelectorAll('.p1-chk,.p2-chk,.p3-chk,.p4-chk');
  let n = 0;
  all.forEach(c => { if (c.checked) n++; });
  const g = document.getElementById('totalProgress');
  if (g) g.textContent = (all.length > 0 ? Math.round((n / all.length) * 100) : 0) + '%';
}


// ═══════════════════════════════════════════════════════════════════════════
//  GRAFIK AKTIVITAS HARIAN
// ═══════════════════════════════════════════════════════════════════════════

function renderDailyGraph(logs) {
  const gc = document.getElementById('trackingGraph');
  if (!gc) return;
  gc.innerHTML = '';

  // Pastikan selalu 7 slot
  const slots = [];
  for (let i = 0; i < 7; i++) {
    slots.push(logs && logs[i] ? logs[i] : { date: '-', duration: 0, wpm: 0, passage: 0 });
  }

  const maxDur = Math.max(...slots.map(s => s.duration), 1);

  slots.forEach((log, i) => {
    const isToday   = i === 6;
    const heightPct = Math.max((log.duration / maxDur) * 100, log.duration > 0 ? 6 : 2);

    let dateLabel = log.date;
    if (dateLabel && dateLabel !== '-') {
      try {
        const p = dateLabel.split('-');
        if (p.length >= 3) dateLabel = p[1] + '/' + p[2];
      } catch (e) {}
    }

    const tooltipLines = log.duration > 0
      ? `${dateLabel} · ${log.duration} menit${log.wpm > 0 ? ' · ' + log.wpm + ' WPM' : ''}${log.passage > 0 ? ' · ' + log.passage + ' passage' : ''}`
      : `${dateLabel} · Tidak ada log`;

    const wrap     = document.createElement('div');
    wrap.className = 'graph-bar-wrap';

    const valLabel       = document.createElement('div');
    valLabel.className   = 'graph-val-label';
    valLabel.textContent = log.duration > 0 ? log.duration + 'm' : '';

    const bar      = document.createElement('div');
    bar.className  = 'graph-bar-inner' + (isToday ? ' today-bar' : '');
    bar.style.height = heightPct + '%';

    const tooltip       = document.createElement('div');
    tooltip.className   = 'g-tooltip';
    tooltip.textContent = tooltipLines;
    bar.appendChild(tooltip);

    const dateEl       = document.createElement('div');
    dateEl.className   = 'graph-date-label';
    dateEl.textContent = isToday ? 'Hari ini' : dateLabel;
    if (isToday) dateEl.style.color = '#6366f1';

    wrap.appendChild(valLabel);
    wrap.appendChild(bar);
    wrap.appendChild(dateEl);
    gc.appendChild(wrap);
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  SPEAKING LAB INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function loadSpeakingLabIframe() {
  const loader = document.getElementById('spIframeLoader');
  const errBox = document.getElementById('spIframeErr');
  const errMsg = document.getElementById('spIframeErrMsg');
  const iframe = document.getElementById('spLabIframe');
  const wrap   = document.getElementById('spIframeWrap');

  if (loader) loader.style.setProperty('display', 'flex',  'important');
  if (errBox) errBox.style.setProperty('display', 'none',  'important');
  if (iframe) iframe.style.setProperty('display', 'none',  'important');
  if (wrap)   wrap.style.setProperty('display',   'block', 'important');

  // Jika sudah pernah dimuat, tampilkan langsung tanpa fetch ulang
  if (iframe && iframe.dataset.loaded === '1') {
    if (loader) loader.style.setProperty('display', 'none',  'important');
    if (iframe) iframe.style.setProperty('display', 'block', 'important');
    return;
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(SPEAKING_LAB_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!iframe) throw new Error('Element #spLabIframe tidak ditemukan.');
    iframe.srcdoc         = html;
    iframe.dataset.loaded = '1';
    iframe.onload = () => {
      if (loader) loader.style.setProperty('display', 'none',  'important');
      if (iframe) iframe.style.setProperty('display', 'block', 'important');
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Speaking Lab fetch error:', err);
    const isTimeout = err.name === 'AbortError';
    if (loader) loader.style.setProperty('display', 'none', 'important');
    if (errBox) errBox.style.setProperty('display', 'flex', 'important');
    if (errMsg) errMsg.textContent = isTimeout
      ? 'Koneksi timeout (>12 detik). Gunakan tombol Tab Baru.'
      : `Gagal memuat konten: ${err.message}. Gunakan tombol Tab Baru.`;
  }
}

function showIframeError(msg) {
  const loader = document.getElementById('spIframeLoader');
  const iframe = document.getElementById('spLabIframe');
  const errBox = document.getElementById('spIframeErr');
  const errMsg = document.getElementById('spIframeErrMsg');
  if (loader) loader.style.setProperty('display', 'none', 'important');
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (errBox) errBox.style.setProperty('display', 'flex', 'important');
  if (errMsg) errMsg.textContent = msg;
}

// ═══════════════════════════════════════════════════════════════════════════
//  WRITING LAB INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function loadWritingLabIframe() {
  const loader = document.getElementById('wrIframeLoader');
  const errBox = document.getElementById('wrIframeErr');
  const errMsg = document.getElementById('wrIframeErrMsg');
  const iframe = document.getElementById('wrLabIframe');
  const wrap   = document.getElementById('wrIframeWrap');

  if (loader) loader.style.setProperty('display', 'flex',  'important');
  if (errBox) errBox.style.setProperty('display', 'none',  'important');
  if (iframe) iframe.style.setProperty('display', 'none',  'important');
  if (wrap)   wrap.style.setProperty('display',   'block', 'important');

  // Jika sudah pernah dimuat, tampilkan langsung tanpa fetch ulang
  if (iframe && iframe.dataset.loaded === '1') {
    if (loader) loader.style.setProperty('display', 'none',  'important');
    if (iframe) iframe.style.setProperty('display', 'block', 'important');
    return;
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(WRITING_LAB_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!iframe) throw new Error('Element #spLabIframe tidak ditemukan.');
    iframe.srcdoc         = html;
    iframe.dataset.loaded = '1';
    iframe.onload = () => {
      if (loader) loader.style.setProperty('display', 'none',  'important');
      if (iframe) iframe.style.setProperty('display', 'block', 'important');
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Writing Lab fetch error:', err);
    const isTimeout = err.name === 'AbortError';
    if (loader) loader.style.setProperty('display', 'none', 'important');
    if (errBox) errBox.style.setProperty('display', 'flex', 'important');
    if (errMsg) errMsg.textContent = isTimeout
      ? 'Koneksi timeout (>12 detik). Gunakan tombol Tab Baru.'
      : `Gagal memuat konten: ${err.message}. Gunakan tombol Tab Baru.`;
  }
}

function showIframeError(msg) {
  const loader = document.getElementById('wrIframeLoader');
  const iframe = document.getElementById('wrLabIframe');
  const errBox = document.getElementById('wrIframeErr');
  const errMsg = document.getElementById('wrIframeErrMsg');
  if (loader) loader.style.setProperty('display', 'none', 'important');
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (errBox) errBox.style.setProperty('display', 'flex', 'important');
  if (errMsg) errMsg.textContent = msg;
}



// ═══════════════════════════════════════════════════════════════════════════
//  LATIHAN SOAL (QUIZ)
//  FIX: Seluruh alert() diganti showBanner(); selectedAnswer dideklarasikan
//       di atas file sehingga tidak lagi implicit global.
// ═══════════════════════════════════════════════════════════════════════════

async function startQuiz() {
  if (!currentUser || !currentUser.token) return;
  const level   = document.getElementById('quiz-level').value;
  const limit   = Number(document.getElementById('quiz-limit').value);
  const shuffle = document.getElementById('quiz-shuffle').checked;

  showLoader(true);
  try {
    const result = await callAPI('getQuestions', {
      email: currentUser.email,
      token: currentUser.token,
      level, limit, shuffle,
    });

    if (!result.success) {
      showBanner(result.message || 'Gagal memuat soal.', 'error');   // FIX: was alert()
      return;
    }
    if (!result.questions || result.questions.length === 0) {
      showBanner('Tidak ada soal tersedia untuk level yang dipilih.', 'info');
      return;
    }

    quizQuestions   = result.questions;
    currentQuestion = 0;
    score           = 0;
    userAnswers     = [];
    selectedAnswer  = null;

    document.getElementById('quiz-result').style.display    = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    renderQuestion();
  } catch (err) {
    showBanner('Error koneksi: ' + err.message, 'error');   // FIX: was alert()
  } finally {
    showLoader(false);
  }
}

function renderQuestion() {
  selectedAnswer = null;

  const q = quizQuestions[currentQuestion];

  document.getElementById('quiz-number').textContent =
    `Soal ${currentQuestion + 1} / ${quizQuestions.length}`;

  // Update skor realtime
  const scoreEl = document.getElementById('quiz-score');
  if (scoreEl) scoreEl.textContent = `Skor : ${score}`;

  document.getElementById('quiz-progress').style.width =
    ((currentQuestion + 1) / quizQuestions.length * 100) + '%';

  document.getElementById('quiz-question').textContent = q.pertanyaan;

  const options = [q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d, q.opsi_e];
  let html = '';
  options.forEach((option, index) => {
    if (!option) return;
    const letter = String.fromCharCode(65 + index);
    html += `
      <label class="block border rounded-xl p-3 cursor-pointer hover:bg-indigo-50 mb-2">
        <input type="radio" name="quizOption" value="${letter}"
               onchange="selectedAnswer='${letter}'">
        <strong>${letter}.</strong> ${option}
      </label>`;
  });
  document.getElementById('quiz-options').innerHTML = html;

  // Sembunyikan feedback dari soal sebelumnya
  const fb = document.getElementById('quiz-feedback');
  if (fb) fb.style.display = 'none';
}

function checkAnswer() {
  if (selectedAnswer === null) {
    showBanner('Pilih jawaban terlebih dahulu.', 'info');   // FIX: was alert()
    return;
  }

  const q     = quizQuestions[currentQuestion];
  const benar = String(q.jawaban_benar).trim().toUpperCase();

  userAnswers.push({ question: q, selected: selectedAnswer, correct: benar });
  if (selectedAnswer === benar) score++;

  showAnswerResult(selectedAnswer === benar, benar, q.penjelasan);
}

function showAnswerResult(isCorrect, correctAnswer, explanation) {
  const div = document.getElementById('quiz-feedback');
  div.style.display = 'block';
  div.innerHTML = `
    <div class="rounded-xl p-5 border ${isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}">
      <h3 class="font-bold text-xl mb-3">${isCorrect ? '✅ Jawaban Benar' : '❌ Jawaban Salah'}</h3>
      <p class="mb-3">Jawaban benar: <strong>${correctAnswer}</strong></p>
      <p>${explanation || ''}</p>
      <button class="mt-5 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700"
              onclick="nextQuestion()">
        ${currentQuestion + 1 < quizQuestions.length ? 'Soal Berikutnya' : 'Lihat Hasil'}
      </button>
    </div>`;
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion >= quizQuestions.length) {
    finishQuiz();
    return;
  }
  renderQuestion();
}

function finishQuiz() {
  const nilai = Math.round(score / quizQuestions.length * 100);

  document.getElementById('quiz-container').style.display = 'none';
  document.getElementById('quiz-feedback').style.display  = 'none';

  const result = document.getElementById('quiz-result');
  result.style.display = 'block';
  result.innerHTML = `
    <div class="bg-white rounded-xl shadow p-6 text-center">
      <h2 class="text-3xl font-bold text-indigo-600">🎉 Latihan Selesai</h2>
      <p class="mt-4 text-xl">Nilai : <strong>${nilai}</strong></p>
      <p>Benar : ${score} &nbsp;|&nbsp; Salah : ${quizQuestions.length - score}</p>
      <button onclick="restartQuiz()"
              class="mt-5 bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-700">
        🔄 Ulangi Latihan
      </button>
    </div>`;
}

function restartQuiz() {
  document.getElementById('quiz-result').style.display = 'none';
  startQuiz();
}
