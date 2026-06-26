// ═══════════════════════════════════════════════════════
//  KONFIGURASI — INTEGRASI LANGSUNG URL GAS WEB APP
// ═══════════════════════════════════════════════════════
const LS_API_KEY     = 'gas_api_url_v47';
const LS_SESSION_KEY = 'memberSession_v47';

// MASUKKAN URL DEPLOYMENT GAS ANDA DI SINI
let GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyNd61rOZ1XwcmzsN3f5PoALkFxtuz8jr2ePCstaTeryAlT3PCt8Hogsqkn0hJf7SA4/exec'; 
let currentUser = null;
let flashcardList = [];
let currentCardIndex = 0;
let speechRate = 0.7;
let databaseCache = null;

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
  // Langsung cek session login karena URL API sudah hardcoded dan pasti ada
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
  switchAuth('login'); // Memastikan tab login yang aktif dan terbuka
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

// Ganti fungsi activateApp Anda menjadi seperti ini
async function activateApp() {
  // 1. Sembunyikan panel login, tampilkan container utama
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  
  // 2. WAJIB TUNGGU sampai HTML Dashboard selesai dimuat total ke DOM
  await navigateTo('dashboard');
  
  // 3. BARU JALANKAN fungsi penarik data dari Google Sheets Anda
  // (Ganti 'fetchDataFromSheets' dengan nama fungsi asli penembak API spreadsheet Anda)
  if (typeof fetchDataFromSheets === 'function') {
    fetchDataFromSheets();
  }
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
      const cks = document.querySelectorAll(`.p${p}-chk`);
      const pct = 0;
      const pt = document.getElementById(`phase${p}Progress`), pb = document.getElementById(`phase${p}Bar`);
      if (pt) pt.textContent = pct + '%';
      if (pb) pb.style.width = pct + '%';
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
  const vs = window.speechSynthesis.getVoices();
  const ev = vs.find(v => v.lang.startsWith('en') && v.localService) || vs.find(v => v.lang.startsWith('en'));
  if (ev) u.voice = ev;
  const btn = document.getElementById('btnSpeak'), st = document.getElementById('speechStatus');
  u.onstart = () => { if (btn) btn.classList.add('speaking'); if (st) st.textContent = `🔊 "${word}"`; };
  u.onend   = () => { if (btn) btn.classList.remove('speaking'); if (st) st.textContent = ''; };
  u.onerror = () => { if (btn) btn.classList.remove('speaking'); };
  window.speechSynthesis.speak(u);
}

function speakCurrentWord(e) { if (e) e.stopPropagation(); if (flashcardList.length) speakWord(flashcardList[currentCardIndex].word); }
function setSpeed(r, el) { speechRate = r; document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active')); if (el) el.classList.add('active'); }

function displayCard() {
  const c = document.getElementById('fCard'); if (c) c.classList.remove('flipped');
  const t = document.getElementById('fcTracker');
  if (!flashcardList || flashcardList.length === 0) {
    document.getElementById('fcFrontWord').textContent = '🎉 Selesai!';
    document.getElementById('fcBackMeaning').textContent = 'Semua kosakata telah dikuasai.';
    if (t) t.textContent = '0/0 Kartu'; return;
  }
  if (t) t.textContent = `Kartu ke ${currentCardIndex+1} dari ${flashcardList.length}`;
  const item = flashcardList[currentCardIndex];
  document.getElementById('fcFrontWord').textContent = item.word;
  document.getElementById('fcBackMeaning').textContent = item.meaning;
  const ap = document.getElementById('autoPlayToggle');
  if (ap && ap.checked) setTimeout(() => speakWord(item.word), 300);
}

function nextCard(e) { if (e) e.stopPropagation(); if (!flashcardList.length) return; currentCardIndex = (currentCardIndex+1) % flashcardList.length; displayCard(); }
function prevCard(e) { if (e) e.stopPropagation(); if (!flashcardList.length) return; currentCardIndex = (currentCardIndex-1+flashcardList.length) % flashcardList.length; displayCard(); }

async function markAsMasteredFromCard(e) {
  if (e) e.stopPropagation();
  if (!flashcardList.length) return;
  const item = flashcardList[currentCardIndex];
  await syncVocabPoints({ checked: true }, item.id);
  flashcardList.splice(currentCardIndex, 1);
  if (currentCardIndex >= flashcardList.length && currentCardIndex > 0) currentCardIndex--;
  displayCard();
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION & DYNAMIC CONTENT
// ═══════════════════════════════════════════════════════
// Ganti atau timpa fungsi navigasi/show lama dengan fungsi ini
async function navigateTo(id) {
  const viewport = document.getElementById('content-viewport');
  if (!viewport) return;

  // 1. Set indikator loading di area konten
  viewport.innerHTML = '<div style="text-align:center;padding:3rem;color:#0C447C;font-weight:500;">🔄 Memuat Konten...</div>';

  // 2. Kelola class active di Navbar
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${id}`);
  if (activeBtn) activeBtn.classList.add('active');

  try {
    // 3. Ambil file HTML dari folder components
    const response = await fetch(`components/${id}.html`);
    if (!response.ok) throw new Error(`File components/${id}.html tidak ditemukan.`);
    
    const html = await response.text();
    viewport.innerHTML = html;

    // 4. SINKRONISASI DATA: Jalankan fungsi bawaan script.js Anda setelah HTML siap
    // Skrip lama Anda menggunakan penamaan berbasis ID untuk render
    switch(id) {
      case 'dashboard':
        if (typeof updateDashboardUI === 'function') updateDashboardUI();
        if (typeof renderGraph === 'function' && typeof last7Logs !== 'undefined') renderGraph(last7Logs);
        break;
      case 'vocab-list':
        if (typeof renderVocabDOM === 'function') renderVocabDOM();
        break;
      case 'vocab-milestone':
        if (typeof updateMilestoneUI === 'function') updateMilestoneUI();
        break;
      case 'reading':
        if (typeof runWpmCalc === 'function') runWpmCalc();
        break;
      case 'speaking-lab':
        if (typeof initSpeakingLab === 'function') initSpeakingLab();
        break;
      case 'tracking':
        if (typeof setDefaultDate === 'function') setDefaultDate();
        break;
    }

  } catch (error) {
    viewport.innerHTML = `<div class="card" style="color:#991B1B;background:#FEE2E2;padding:1.5rem;text-align:center;">
                            ⚠️ <b>Gagal memuat menu:</b> ${error.message}
                          </div>`;
  }
}

function initComponentData(id) {
  // Ambil data yang sudah tersimpan di cache/state global JavaScript Anda
  // Sesuaikan pemanggilan fungsi di bawah dengan nama fungsi asli bawaan script.js Anda
  
  switch(id) {
    case 'dashboard':
      // Pastikan elemen grafik ada sebelum digambar
      if (document.getElementById('trackingGraph')) {
        if (typeof renderGraph === 'function' && typeof last7Logs !== 'undefined') {
          renderGraph(last7Logs);
        }
      }
      if (typeof updateDashboardUI === 'function') {
        updateDashboardUI(); 
      }
      break;
      
    case 'tracking':
      if (typeof setDefaultDate === 'function') setDefaultDate();
      break;
      
    case 'flashcard-tab':
      if (typeof updateCardUI === 'function') updateCardUI();
      break;
      
    case 'vocab-milestone':
      if (typeof updateMilestoneUI === 'function') updateMilestoneUI();
      break;
      
    case 'vocab-list':
      if (typeof renderVocabDOM === 'function') renderVocabDOM();
      break;
      
    case 'reading':
      if (typeof runWpmCalc === 'function') runWpmCalc();
      break;
      
    case 'speaking-lab':
      if (typeof initSpeakingLab === 'function') initSpeakingLab();
      break;
  }
}

// Pastikan pada fungsi login sukses (activateApp) atau inisialisasi awal, 
// panggil navigateTo('dashboard') sebagai halaman default utama.

async function activateApp() {
  // 1. Tampilkan kontainer aplikasi utama
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  
  // 2. Tunggu sampai komponen HTML dashboard terpasang sempurna di layar
  await navigateTo('dashboard');
  
  // 3. Jalankan fungsi penarik data Google Sheets asli bawaan script.js Anda
  // (Biasanya bernama fetchData(), loadData(), atau refreshData())
  if (typeof fetchData === 'function') {
    fetchData();
  } else if (typeof loadData === 'function') {
    loadData();
  } else if (typeof refreshData === 'function') {
    refreshData();
  }
}

async function loadAndShowPremiumContent() {
  show('premium-content-section');
  document.getElementById('premium-dynamic-placeholder').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--color-primary);font-weight:bold">🔄 Mengunduh konten...</div>';
  try {
    const r = await callAPI('loadContentPage');
    document.getElementById('premium-dynamic-placeholder').innerHTML = r.html || '<p>Konten kosong.</p>';
  } catch(e) {
    document.getElementById('premium-dynamic-placeholder').innerHTML = '<p style="color:#791F1F;padding:1rem">❌ ' + e.message + '</p>';
  }
}

// ═══════════════════════════════════════════════════════
//  DATA SYNC (LOGS, VOCAB, CHECKLIST)
// ═══════════════════════════════════════════════════════
async function logDailyActivity() {
  if (!currentUser || !currentUser.token) return;
  showLoader(true);
  try {
    const r = await callAPI('saveDailyLog', {
      email:    currentUser.email,
      token:    currentUser.token,
      duration: parseInt(document.getElementById('inputDuration').value) || 0,
      passage:  parseInt(document.getElementById('passagesRead').value) || 0,
      wpm:      parseInt(document.getElementById('currentWpmInput').value) || 0
    });
    if (r.success) { alert('✓ Log disimpan!'); refreshDataFromDatabase(); }
    else alert(r.message);
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
  try {
    await callAPI('updatePhaseChecklist', { email: currentUser.email, phaseNum: p, checklistIndex: idx, isChecked: el.checked });
    const cks = document.querySelectorAll(`.p${p}-chk`);
    let n = 0; cks.forEach(c => { if (c.checked) n++; });
    const pct = Math.round((n / cks.length) * 100);
    const pt = document.getElementById(`phase${p}Progress`), pb = document.getElementById(`phase${p}Bar`);
    if (pt) pt.textContent = pct + '%';
    if (pb) pb.style.width = pct + '%';
    calculateOverallGlobalProgress();
  } catch(e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════
//  WPM CALCULATION & STATUS METRICS
// ═══════════════════════════════════════════════════════
async function handleWpmChange() {
  if (!currentUser || !currentUser.token) return;
  showLoader(true);
  try {
    await callAPI('saveDailyLog', {
      email: currentUser.email, token: currentUser.token,
      duration: 0, passage: 0,
      wpm: parseInt(document.getElementById('currentWpmInput').value) || 0
    });
    updateWPMStatus();
  } catch(e) { alert('Error: ' + e.message); }
  finally { showLoader(false); }
}

function updateWPMStatus() {
  const v = parseInt(document.getElementById('currentWpmInput').value) || 0;
  [{k:'P1',t:100},{k:'P2',t:130},{k:'P3',t:160}].forEach(({k,t}) => {
    const b = document.getElementById(`wpm${k}bar`), s = document.getElementById(`wpm${k}status`);
    if (b) b.style.width = Math.min(100, (v/t)*100) + '%';
    if (s) s.innerHTML = v >= t ? '<span class="badge b-ok">✓ Lulus</span>' : '<span class="badge b-warn">~ Progress</span>';
  });
}

function runWpmCalc() {
  const w = parseInt(document.getElementById('calcWords').value)||0, s = parseInt(document.getElementById('calcSeconds').value)||0;
  const r = document.getElementById('calcResult');
  if (r) r.textContent = (w>0&&s>0) ? Math.round((w/s)*60)+' WPM' : '0 WPM';
}

function applyCalcToInput() {
  const v = parseInt((document.getElementById('calcResult').textContent||'0'))||0;
  document.getElementById('currentWpmInput').value = v;
  handleWpmChange();
}

function updateVocabStatusMilestone(v) {
  [{k:'P1',min:300},{k:'P2',min:800},{k:'P3',min:1200},{k:'P4',min:1800}].forEach(({k,min}) => {
    const e = document.getElementById(`vocab${k}status`);
    if (e) e.innerHTML = v >= min ? '<span class="badge b-ok">✓ Lulus</span>' : '<span class="badge b-no">❌ Belum</span>';
  });
}

function calculateOverallGlobalProgress() {
  const all = document.querySelectorAll('.p1-chk,.p2-chk,.p3-chk,.p4-chk');
  let n = 0; all.forEach(c => { if (c.checked) n++; });
  const g = document.getElementById('totalProgress');
  if (g) g.textContent = (all.length>0 ? Math.round((n/all.length)*100) : 0) + '%';
}

function renderDailyGraph(logs) {
  const gc = document.getElementById('trackingGraph'), lc = document.getElementById('graphLabels');
  if (!gc || !lc) return;
  gc.innerHTML = ''; lc.innerHTML = '';
  let fl = []; for (let i=0;i<7;i++) fl.push(logs&&logs[i]?logs[i]:{date:'-',duration:0});
  fl.forEach((log, i) => {
    const isT = i===6, bh = Math.min(100,(log.duration/60)*100), b = document.createElement('div');
    b.className = 'graph-bar'; b.style.height = `${Math.max(bh,2)}%`;
    const tip = document.createElement('span'); tip.className = 'tooltip';
    let dl = log.date;
    if (dl && dl !== '-') { try { const p = dl.split('-'); if (p.length>=3) dl = p[1]+'/'+p[2]; } catch(e){} }
    tip.textContent = `${dl}: ${log.duration}m`; b.appendChild(tip); gc.appendChild(b);
    const ls = document.createElement('span'); ls.className = 'graph-label'; ls.textContent = isT ? 'Hari Ini' : dl;
    if (isT) ls.style.color = 'var(--color-primary)'; lc.appendChild(ls);
  });
}

// ═══════════════════════════════════════════════════════
//  SPEAKING LAB INTEGRATION
// ═══════════════════════════════════════════════════════
function saveSpLabUrl() {
  const v = document.getElementById('spLabUrl').value.trim();
  if (!v || !v.startsWith('http')) { setSpUrlStatus('warn','<i class="fa-solid fa-triangle-exclamation"></i> Masukkan URL yang valid.'); return; }
  try { localStorage.setItem('splab_github_url', v); } catch(e) {}
  setSpUrlStatus('ok','<i class="fa-solid fa-circle-check"></i> URL tersimpan! Memuat Speaking Lab...');
  document.getElementById('spIframeWrap').style.display = '';
  document.getElementById('spIframeLoader').style.display = 'flex';
  loadSpeakingLabIframe();
}

function setSpUrlStatus(type, html) {
  const el = document.getElementById('spUrlStatus');
  if (el) { el.innerHTML = html; el.style.color = type==='ok'?'#166534':type==='warn'?'#92400E':'#6B7280'; }
}

async function loadSpeakingLabIframe() {
  if (!currentUser || !currentUser.token) { alert('Silakan login terlebih dahulu.'); return; }
  
  const GITHUB_SPEAKING_LAB_URL = 'https://3xtream.github.io/english/speaking-lab.html';

  document.getElementById('spIframeLoader').style.display = 'flex';
  document.getElementById('spIframeErr').style.display    = 'none';
  document.getElementById('spLabIframe').style.display    = 'none';
  document.getElementById('spIframeWrap').style.display   = '';
  
  try {
    const res = await callAPI('getSpeakingLabUrl', { email: currentUser.email, token: currentUser.token });
    if (!res.success) { showIframeError(res.message || 'Gagal mendapatkan URL sesi.'); return; }
    
    const ssoUrl = res.url;
    document.getElementById('spOpenTabBtn').href = ssoUrl;
    
    const iframe = document.getElementById('spLabIframe');
    iframe.onload = function() {
      document.getElementById('spIframeLoader').style.display = 'none';
      iframe.style.display = '';
      setTimeout(function() {
        try {
          iframe.contentWindow.postMessage(
            { 
              type: 'SPEAKING_LAB_SESSION', 
              payload: { token: currentUser.token, email: currentUser.email, fullName: currentUser.fullName } 
            }, 
            new URL(GITHUB_SPEAKING_LAB_URL).origin
          );
        } catch(e) {
          console.error("Gagal postMessage:", e);
        }
      }, 800);
    };
    
    iframe.onerror = function() { showIframeError('Iframe gagal dimuat. Pastikan URL GitHub Pages benar.'); };
    iframe.src = ssoUrl;
  } catch(e) { 
    showIframeError('Gagal koneksi ke server: ' + e.message); 
  }
}

function showIframeError(msg) {
  document.getElementById('spIframeLoader').style.display = 'none';
  document.getElementById('spLabIframe').style.display    = 'none';
  document.getElementById('spIframeErr').style.display    = '';
  document.getElementById('spIframeErrMsg').textContent   = msg;
}
