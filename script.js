// ═══════════════════════════════════════════════════════
//  KONFIGURASI — INTEGRASI LANGSUNG URL GAS WEB APP
// ═══════════════════════════════════════════════════════
const LS_API_KEY     = 'gas_api_url_v47';
const LS_SESSION_KEY = 'memberSession_v47';

// MASUKKAN URL DEPLOYMENT GAS ANDA DI SINI
let GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyNd61rOZ1XwcmzsN3f5PoALkFxtuz8jr2ePCstaTeryAlT3PCt8Hogsqkn0hJf7SA4/exec'; 
// URL UNTUK SPEAKING LAB
const GITHUB_SPEAKING_LAB_URL = 'https://3xtream.github.io/english/speaking-lab.html';

let currentUser = null;
let flashcardList = [];
let currentCardIndex = 0;
let speechRate = 0.7;

// ═══════════════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════════════
async function callAPI(action, params = {}) {
  if (!GAS_API_URL) throw new Error('URL API belum dikonfigurasi.');
  const body = JSON.stringify({ action, ...params });
  const res  = await fetch(GAS_API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

// ═══════════════════════════════════════════════════════
//  SETUP API URL
// ═══════════════════════════════════════════════════════
function saveApiUrl() {
  const v = document.getElementById('apiUrlInput').value.trim();
  if (!v || !v.startsWith('https://script.google.com')) {
    document.getElementById('apiUrlStatus').textContent = '⚠️ Masukkan URL GAS yang valid (dimulai https://script.google.com).';
    return;
  }
  GAS_API_URL = v;
  try { localStorage.setItem(LS_API_KEY, v); } catch(e) {}
  document.getElementById('apiUrlStatus').textContent = '✓ URL tersimpan!';
  document.getElementById('apiSetup').style.display = 'none';
  startApp();
}

function showApiSetup() {
  document.getElementById('apiSetup').style.display = 'block';
  document.getElementById('apiUrlInput').value = GAS_API_URL;
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();

  // Bersihkan sisa elemen yang tidak dipakai
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display     = 'none';

  startApp();
});

function startApp() {
  let raw = null;
  try { raw = localStorage.getItem(LS_SESSION_KEY); } catch(e) {}
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && s.email && s.token && s.fullName && (!s.expiresAt || Date.now() < s.expiresAt)) {
        currentUser = { email: s.email, fullName: s.fullName, token: s.token };
        activateApp();
        return;
      }
      try { localStorage.removeItem(LS_SESSION_KEY); } catch(e) {}
    } catch(e) { try { localStorage.removeItem(LS_SESSION_KEY); } catch(e2) {} }
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

function switchAuth(t) {
  ['Login','Register'].forEach(x => {
    const isLogin = x === 'Login';
    document.getElementById('tab' + x).classList.toggle('active', t === (isLogin ? 'login' : 'register'));
    document.getElementById((isLogin ? 'login' : 'register') + 'Box').classList.toggle('active', t === (isLogin ? 'login' : 'register'));
  });
}

function showAuthPage() {
  document.getElementById('authSection').style.display = 'block'; 
  document.getElementById('mainApp').style.display = 'none';
  switchAuth('login');
}

// ═══════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════
async function handleRegister() {
  const name  = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass  = document.getElementById('regPassword').value;
  if (!name || !email || !pass) { alert('Lengkapi semua field.'); return; }
  showLoader(true);
  try {
    const r = await callAPI('registerUser', { email, password: pass, fullName: name });
    alert(r.message);
    if (r.success) {
      document.getElementById('regName').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regPassword').value = '';
      switchAuth('login');
      document.getElementById('loginEmail').value = email;
    }
  } catch(e) { alert('Error: ' + e.message); }
  finally { showLoader(false); }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) { alert('Masukkan email dan password.'); return; }
  showLoader(true);
  try {
    const r = await callAPI('loginUser', { email, password: pass });
    if (r.success) {
      currentUser = { email: r.user.email, fullName: r.user.fullName, token: r.token };
      try { localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ ...currentUser, expiresAt: Date.now() + 7*24*60*60*1000 })); } catch(e) {}
      activateApp();
    } else {
      alert(r.message);
    }
  } catch(e) { alert('Error koneksi: ' + e.message); }
  finally { showLoader(false); }
}

function activateApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('appTitle').innerHTML = `<span class="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span> Sistem Tracker · 🧑‍💻 ${currentUser.fullName}`;
  refreshDataFromDatabase();
  
  const setupCard = document.getElementById('spSetupCard');
  const iframeWrap = document.getElementById('spIframeWrap');
  if (setupCard) setupCard.style.setProperty('display', 'none', 'important');
  if (iframeWrap) iframeWrap.style.setProperty('display', 'flex', 'important');
}

function handleLogout() {
  try { localStorage.removeItem(LS_SESSION_KEY); } catch(e) {}
  currentUser = null;
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  switchAuth('login');
  showAuthPage();
}

// ═══════════════════════════════════════════════════════
//  DATA REFRESH & RENDER
// ═══════════════════════════════════════════════════════
async function refreshDataFromDatabase() {
  if (!currentUser || !currentUser.token) { handleLogout(); return; }
  showLoader(true);
  try {
    const [vb, dd] = await Promise.all([
      callAPI('getVocabBank', { email: currentUser.email, token: currentUser.token }),
      callAPI('getDashboardData', { email: currentUser.email, token: currentUser.token })
    ]);

    if (vb && vb.success === false) throw new Error(vb.message);
    if (dd && dd.success === false) throw new Error(dd.message);

    const masteredList = (Array.isArray(vb) ? vb : []).filter(v => v.mastered).map(v => v.id);

    processDatabaseRender({
      vocabBank:     Array.isArray(vb) ? vb : [],
      last7Logs:     dd.logs || [],
      streakDays:    dd.logs ? dd.logs.length : 0,
      latestWpm:     (dd.logs && dd.logs.length > 0) ? dd.logs[dd.logs.length - 1].wpm : 0,
      masteredVocabs: masteredList,
      checkedPhases: { 1:[], 2:[], 3:[], 4:[] }
    });
  } catch(e) {
    alert('Gagal memuat data: ' + e.message);
  } finally {
    showLoader(false);
  }
}

function renderVocabHTML(vb) {
  if (!vb) return;
  for (let i = 1; i <= 7; i++) { const e = document.getElementById(`cat${i}`); if (e) e.innerHTML = ''; }
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
    if (data.vocabBank) renderVocabHTML(data.vocabBank);
    if (data.last7Logs) renderDailyGraph(data.last7Logs);
    const tde = document.getElementById('totalDays');
    const wpe = document.getElementById('currentWpmInput');
    if (tde) tde.textContent = data.streakDays || 0;
    if (wpe) wpe.value = data.latestWpm || 0;
    updateWPMStatus();
    const ms = new Set(data.masteredVocabs || []);
    let cc = 0;
    document.querySelectorAll('.vocab-chk').forEach(c => {
      const id = c.getAttribute('data-id');
      c.checked = ms.has(id);
      if (ms.has(id)) cc++;
    });
    ['floatingCounter','currentVocabInput','vocabCount'].forEach(id => {
      const e = document.getElementById(id);
      if (e) {
        if (id === 'floatingCounter') e.textContent = `${cc} Kata Terkuasai`;
        else if (id === 'vocabCount') e.textContent = cc;
        else e.value = cc;
      }
    });
    updateVocabStatusMilestone(cc);
    [1,2,3,4].forEach(p => {
      const pct = 0;
      const pt = document.getElementById(`phase${p}Progress`), pb = document.getElementById(`phase${p}Bar`);
      if (pt) pt.textContent = pct + '%';
      if (pb) pb.style.width = pct + '%';
      const ptTh = document.getElementById(`phase${p}Progress-th`), pbTh = document.getElementById(`phase${p}Bar-th`);
      if (ptTh) ptTh.textContent = pct + '%';
      if (pbTh) pbTh.style.width = pct + '%';
    });
    calculateOverallGlobalProgress();
    initFlashcards();
  } catch(err) { console.error(err); }
}

// ═══════════════════════════════════════════════════════
//  FLASHCARD SYSTEM
// ═══════════════════════════════════════════════════════
async function initFlashcards() {
  try {
    const d = await callAPI('getFlashcards', { email: currentUser.email });
    flashcardList = Array.isArray(d) ? d : [];
    currentCardIndex = 0;
    displayCard();
  } catch(e) { console.error('Flashcard error:', e); }
}

function speakWord(word) {
  if (!word || word === '-' || word === '🎉 Selesai!') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US'; u.rate = speechRate; u.pitch = 1; u.volume = 1;
  window.speechSynthesis.speak(u);
}

function speakCurrentWord(e) {
  if (e) e.stopPropagation();
  if (flashcardList.length) speakWord(flashcardList[currentCardIndex].word);
}

function setSpeed(r, el) {
  speechRate = r;
  document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function displayCard() {
  const c = document.getElementById('fCard');
  if (c) c.classList.remove('flipped');
  const t = document.getElementById('fcTracker');
  if (!flashcardList || flashcardList.length === 0) {
    document.getElementById('fcFrontWord').textContent = '🎉 Selesai!';
    document.getElementById('fcBackMeaning').textContent = 'Semua kosakata telah dikuasai.';
    if (t) t.textContent = '0/0 Kartu';
    return;
  }
  if (t) t.textContent = `Kartu ke ${currentCardIndex+1} dari ${flashcardList.length}`;
  const item = flashcardList[currentCardIndex];
  document.getElementById('fcFrontWord').textContent = item.word;
  document.getElementById('fcBackMeaning').textContent = item.meaning;
}

function nextCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  currentCardIndex = (currentCardIndex+1) % flashcardList.length;
  displayCard();
}

function prevCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  currentCardIndex = (currentCardIndex-1+flashcardList.length) % flashcardList.length;
  displayCard();
}

async function markAsMasteredFromCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  const item = flashcardList[currentCardIndex];
  await syncVocabPoints({ checked: true }, item.id);
}

// ═══════════════════════════════════════════════════════
//  DATA SYNC (LOGS, VOCAB, CHECKLIST)
// ═══════════════════════════════════════════════════════
async function logDailyActivity() {
  if (!currentUser || !currentUser.token) return;
  showLoader(true);
  try {
    const r = await callAPI('saveDailyLog', { 
      email: currentUser.email, 
      token: currentUser.token, 
      duration: parseInt(document.getElementById('inputDuration').value) || 0, 
      passage: parseInt(document.getElementById('passagesRead').value) || 0, 
      wpm: parseInt(document.getElementById('currentWpmInput').value) || 0 
    });
    if (r.success) {
      alert('✓ Log disimpan!');
      refreshDataFromDatabase();
    } else alert(r.message);
  } catch(e) { alert('Error: ' + e.message); }
  finally { showLoader(false); }
}

async function syncVocabPoints(el, wordId) {
  if (!currentUser || !currentUser.token) return;
  const chk = document.getElementById(`chk-${wordId}`);
  const checked = el.checked;
  if (chk) chk.checked = checked;
  try {
    await callAPI('updateVocabProgress', { email: currentUser.email, token: currentUser.token, wordId, isMastered: checked });
    const n = document.querySelectorAll('.vocab-chk:checked').length;
    ['currentVocabInput','vocabCount','floatingCounter'].forEach(id => {
      const e = document.getElementById(id);
      if (e) {
        if (id === 'floatingCounter') e.textContent = `${n} Kata Terkuasai`;
        else if (id === 'vocabCount') e.textContent = n;
        else e.value = n;
      }
    });
    updateVocabStatusMilestone(n);
  } catch(e) {
    if (chk) chk.checked = !checked;
    alert('Gagal sinkronisasi: ' + e.message);
  }
}

async function syncPhaseChecklist(p, idx, el) {
  // Ditangani secara lokal atau disesuaikan dengan kebutuhan Anda
}

function runWpmCalc() {
  const w = parseInt(document.getElementById('calcWords').value)||0, s = parseInt(document.getElementById('calcSeconds').value)||0;
  const r = document.getElementById('calcResult');
  if (r) r.textContent = (w>0&&s>0) ? Math.round((w/s)*60)+' WPM' : '0 WPM';
}

function applyCalcToInput() {
  const v = parseInt((document.getElementById('calcResult').textContent||'0'))||0;
  document.getElementById('currentWpmInput').value = v;
}

// ═══════════════════════════════════════════════════════
//  FUNCTIONS FOR SPEAKING LAB RENDERING
// ═══════════════════════════════════════════════════════
function loadSpeakingLabIframe() {
  const launchBtn = document.getElementById('spLaunchBtn');
  if (launchBtn) {
    launchBtn.href = GITHUB_SPEAKING_LAB_URL;
  }
  
  const iframe = document.getElementById('spLabIframe');
  if (iframe) {
    iframe.src = GITHUB_SPEAKING_LAB_URL;
  }
}

function showIframeError(msg) {
  const loader = document.getElementById('spIframeLoader');
  const iframe = document.getElementById('spLabIframe');
  const errBox = document.getElementById('spIframeErr');
  const errMsg = document.getElementById('spIframeErrMsg');
  
  if (loader) loader.style.setProperty('display', 'none', 'important');
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (errBox) {
    errBox.className = "absolute inset-0 bg-indigo-50/50 flex flex-col items-center justify-center p-8 text-center z-10";
    const userName = (typeof currentUser !== 'undefined' && currentUser && currentUser.fullName) ? currentUser.fullName : 'Member Terautentikasi';
    if (errMsg) {
      errMsg.className = "text-xs text-slate-600 max-w-sm mt-2 p-4 bg-white rounded-xl border border-slate-200 text-left leading-relaxed";
      errMsg.innerHTML = `
        <p class="font-bold text-rose-600 mb-1">⚠️ Terjadi Kendala Pembuatan Sesi</p>
        <p class="text-[11px] text-slate-500">${msg}</p>
        <div class="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-400 font-mono">
          <span>User: ${userName}</span>
          <span>Status: Sesi Terautentikasi ✓</span>
        </div>
      `;
    }

    let launchBtn = document.getElementById('spLaunchBtn');
    if (!launchBtn) {
      launchBtn = document.createElement('a');
      launchBtn.id = 'spLaunchBtn';
      launchBtn.target = '_blank';
      launchBtn.rel = 'noopener noreferrer';
      launchBtn.className = "mt-5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer";
      launchBtn.innerHTML = `<i class=\"fa-solid fa-rocket text-sm\"></i> Mulai Speaking Lab Sekarang`;
      errBox.appendChild(launchBtn);
    }
    launchBtn.href = GITHUB_SPEAKING_LAB_URL;
  }
}
