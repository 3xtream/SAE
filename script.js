// ═══════════════════════════════════════════════════════
//  KONFIGURASI — INTEGRASI LANGSUNG URL GAS WEB APP
// ═══════════════════════════════════════════════════════
const LS_API_KEY     = 'gas_api_url_v47';
const LS_SESSION_KEY = 'memberSession_v47';

let GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyNd61rOZ1XwcmzsN3f5PoALkFxtuz8jr2ePCstaTeryAlT3PCt8Hogsqkn0hJf7SA4/exec'; 
let currentUser = null;
let flashcardList = [];
let currentCardIndex = 0;
let speechRate = 0.7;

// ═══════════════════════════════════════════════════════
//  GLOBAL FRONT-END NAVIGATION ENGINE (Dipindahkan dari HTML)
// ═══════════════════════════════════════════════════════
function pindahTab(sectionId, element) {
  // 1. Atur gaya visual tombol sidebar jika dipicu dari klik manual
  if (element) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'active');
      btn.classList.add('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-800');
    });
    element.classList.remove('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-800');
    element.classList.add('bg-indigo-50', 'text-indigo-700', 'active');
  }

  // 2. Sembunyikan semua section
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.setProperty('display', 'none', 'important');
    sec.classList.remove('active');
  });

  // 3. Tampilkan section aktif
  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.style.setProperty('display', 'block', 'important');
    activeSection.classList.add('active');
  }

  // 4. Inisialisasi modul internal otomatis
  if (sectionId === 'flashcard-tab') {
    initFlashcards();
  } else if (sectionId === 'speaking-lab') {
    loadSpeakingLabIframe();
  } else if (sectionId === 'premium-content-section') {
    loadAndShowPremiumContent();
  }
}

function flipCard() {
  const card = document.getElementById('fCard');
  if (card) card.classList.toggle('flipped');
}

// ═══════════════════════════════════════════════════════
//  API HELPER CONNECTION
// ═══════════════════════════════════════════════════════
async function callAPI(action, params = {}) {
  if (!GAS_API_URL) throw new Error('URL API belum dikonfigurasi.');
  
  const body = JSON.stringify({ action, ...params });
  
  // Kirim data sebagai text/plain, yang secara aturan CORS tidak memerlukan preflight check dari server
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body
  });
  
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

function setSystemLoading(visible, text = 'Memproses...') {
  const ld = document.getElementById('loading');
  const ldt = document.getElementById('loadingText');
  if (ld) ld.style.display = visible ? 'flex' : 'none';
  if (ldt) ldt.textContent = text;
}

// ═══════════════════════════════════════════════════════
//  SESSION & AUTHENTICATION MANAGER
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const savedUrl = localStorage.getItem(LS_API_KEY);
  if (savedUrl) GAS_API_URL = savedUrl;
  
  const sess = localStorage.getItem(LS_SESSION_KEY);
  if (sess) {
    try {
      currentUser = JSON.parse(sess);
      activateApp();
    } catch(e) {
      localStorage.removeItem(LS_SESSION_KEY);
    }
  }
});

async function handleLogin(e) {
  if (e) e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginToken').value.trim(); 

  if (!email || !password) {
    alert('Harap isi email dan token.');
    return;
  }

  // Menggunakan fungsi loading yang benar sesuai bawaan sistem Anda
  setSystemLoading(true, 'Memverifikasi Akses Member...');
  try {
    // Memanggil 'loginUser' sesuai switch-case yang ada di kode.gs lama Anda
    const res = await callAPI('loginUser', { email, password });

    if (res && res.success) {
      currentUser = res.user;
      
      // Menyimpan data sesi menggunakan variabel token hasil enkripsi dari kode.gs
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ email: res.user.email, token: res.token }));
      activateApp(); 
    } else {
      alert('Login gagal: ' + (res ? res.message : 'Respon kosong'));
    }
  } catch (err) {
    alert('Error Hubungan Server: ' + err.message);
  } finally {
    // Mematikan animasi loading dengan fungsi yang benar
    setSystemLoading(false);
  }
}

function handleLogout() {
  if (!confirm('Apakah anda yakin ingin keluar sistem?')) return;
  localStorage.removeItem(LS_SESSION_KEY);
  currentUser = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('authSection').style.display = 'flex';
}

function activateApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('appTitle').innerHTML = `<span class="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span> Sistem Tracker · 🧑‍💻 ${currentUser.fullName}`;
  refreshDataFromDatabase();
  
  // Set default aktif awal ke halaman dashboard utama secara aman
  pindahTab('dashboard', document.getElementById('btn-dashboard'));
}

// ═══════════════════════════════════════════════════════
//  DATABASE SYNC & DATA RENDERING
// ═══════════════════════════════════════════════════════
async function refreshDataFromDatabase() {
  if (!currentUser) return;
  setSystemLoading(true, 'Sinkronisasi Data Excel Spreadsheet...');
  try {
    const data = await callAPI('getData', { email: currentUser.email, token: currentUser.token });
    processDatabaseRender(data);
  } catch(e) {
    console.error(e);
    alert('Gagal memuat database: ' + e.message);
  } finally {
    setSystemLoading(false);
  }
}

function processDatabaseRender(data) {
  document.getElementById('statTotal').textContent    = data.stats.total;
  document.getElementById('statMastered').textContent = data.stats.mastered;
  document.getElementById('statReview').textContent   = data.stats.review;
  document.getElementById('statRatio').textContent    = data.stats.ratio + '%';
  
  const badge = document.getElementById('targetDateBadge');
  if (badge) badge.textContent = data.targetDate || 'No Target';
  
  flashcardList = data.vocabularies.filter(v => !v.isMastered);
  currentCardIndex = 0;
  initFlashcards();
  
  const tbody = document.getElementById('vocabTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  data.vocabularies.forEach((v, index) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition-colors";
    tr.setAttribute('data-word', v.word.toLowerCase());
    tr.setAttribute('data-meaning', v.meaning.toLowerCase());
    tr.setAttribute('data-mastered', v.isMastered ? 'MASTERED' : 'REVIEW');
    
    tr.innerHTML = `
      <td class="p-4 text-center font-mono font-bold text-slate-400">${index + 1}</td>
      <td class="p-4 font-bold text-slate-900 text-sm">
        <div class="flex items-center gap-2">
          <span>${v.word}</span>
          <button onclick="speakRowWord('${v.word.replace(/'/g, "\\'")}')" class="text-indigo-500 hover:text-indigo-700 p-1 cursor-pointer transition-colors"><i class="fa-solid fa-volume-high text-xs"></i></button>
        </div>
      </td>
      <td class="p-4 text-slate-500 text-xs">${v.meaning}</td>
      <td class="p-4 text-center">
        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${v.isMastered ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}">
          ${v.isMastered ? 'Mastered ✓' : 'Review'}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="toggleRowStatus('${v.word.replace(/'/g, "\\'")}', ${v.isMastered})" class="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-all text-slate-600 cursor-pointer shadow-3xs">
          ${v.isMastered ? 'Set Berlatih' : 'Set Kuasai'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ═══════════════════════════════════════════════════════
//  FLASHCARD SYSTEM LOGIC
// ═══════════════════════════════════════════════════════
function initFlashcards() {
  const card = document.getElementById('fCard');
  if (card) card.classList.remove('flipped');
  displayCard();
}

function displayCard() {
  const t = document.getElementById('fcTracker');
  if (!flashcardList || flashcardList.length === 0) {
    document.getElementById('fcFrontWord').textContent = '🎉 Selesai!';
    document.getElementById('fcBackMeaning').textContent = 'Semua kosakata telah dikuasai.';
    if (t) t.textContent = '0/0 Kartu';
    return;
  }
  if (currentCardIndex >= flashcardList.length) currentCardIndex = 0;
  
  const currentItem = flashcardList[currentCardIndex];
  document.getElementById('fcFrontWord').textContent = currentItem.word;
  document.getElementById('fcBackMeaning').textContent = currentItem.meaning;
  if (t) t.textContent = `${currentCardIndex + 1}/${flashcardList.length} Kartu`;
}

function nextCard(e) {
  if(e) e.stopPropagation();
  if (flashcardList.length === 0) return;
  const card = document.getElementById('fCard');
  if (card) card.classList.remove('flipped');
  setTimeout(() => {
    currentCardIndex = (currentCardIndex + 1) % flashcardList.length;
    displayCard();
  }, 150);
}

async function markAsMasteredFromCard(e) {
  if(e) e.stopPropagation();
  if (flashcardList.length === 0) return;
  
  const currentItem = flashcardList[currentCardIndex];
  setSystemLoading(true, 'Menyimpan Status Progres...');
  try {
    const res = await callAPI('updateStatus', {
      email: currentUser.email,
      token: currentUser.token,
      word: currentItem.word,
      isMastered: true
    });
    if (res.success) {
      const card = document.getElementById('fCard');
      if (card) card.classList.remove('flipped');
      setTimeout(() => {
        flashcardList.splice(currentCardIndex, 1);
        displayCard();
        callAPI('getData', { email: currentUser.email, token: currentUser.token }).then(d => {
          document.getElementById('statTotal').textContent    = d.stats.total;
          document.getElementById('statMastered').textContent = d.stats.mastered;
          document.getElementById('statReview').textContent   = d.stats.review;
          document.getElementById('statRatio').textContent    = d.stats.ratio + '%';
        });
      }, 150);
    }
  } catch(err) {
    alert('Gagal update: ' + err.message);
  } finally {
    setSystemLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  TEXT TO SPEECH ENGINE INTERACTION
// ═══════════════════════════════════════════════════════
function setSpeed(val, btn) {
  speechRate = val;
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.remove('bg-indigo-600', 'text-white', 'active');
    b.classList.add('bg-slate-100', 'text-slate-600');
  });
  btn.classList.remove('bg-slate-100', 'text-slate-600');
  btn.classList.add('bg-indigo-600', 'text-white', 'active');
}

function speakCurrentWord(e) {
  if(e) e.stopPropagation();
  if (flashcardList.length === 0) return;
  speakWordEngine(flashcardList[currentCardIndex].word);
}

function speakRowWord(w) { speakWordEngine(w); }

function speakWordEngine(text) {
  if (!('speechSynthesis' in window)) { alert('Browser tidak mendukung audio.'); return; }
  window.speechSynthesis.cancel();
  
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US';
  msg.rate = speechRate;
  
  const status = document.getElementById('speechStatus');
  msg.onstart = () => { if(status) status.textContent = '🔊 Mengucapkan: "' + text + '"'; };
  msg.onend   = () => { if(status) status.textContent = ''; };
  window.speechSynthesis.speak(msg);
}

// ═══════════════════════════════════════════════════════
//  CORE SYSTEM TAB 3: TABLE FILTERS & INTERACTION
// ═══════════════════════════════════════════════════════
function filterVocabList() {
  const query = document.getElementById('vocabSearch').value.toLowerCase();
  const statusFilter = document.getElementById('filterStatus').value;
  const rows = document.querySelectorAll('#vocabTableBody tr');
  
  rows.forEach(row => {
    if (row.cells.length < 2) return;
    const w = row.getAttribute('data-word');
    const m = row.getAttribute('data-meaning');
    const s = row.getAttribute('data-mastered');
    
    const matchesSearch = w.includes(query) || m.includes(query);
    const matchesStatus = (statusFilter === 'ALL') || (s === statusFilter);
    
    row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
  });
}

async function toggleRowStatus(word, currentStatus) {
  setSystemLoading(true, 'Memperbarui Database Sheets...');
  try {
    const res = await callAPI('updateStatus', {
      email: currentUser.email,
      token: currentUser.token,
      word,
      isMastered: !currentStatus
    });
    if (res.success) refreshDataFromDatabase();
  } catch(e) {
    alert('Gagal memproses data: ' + e.message);
    setSystemLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
//  CORE SYSTEM TAB 4: SPEAKING LAB GATEWAY
// ═══════════════════════════════════════════════════════
function loadSpeakingLabIframe() {
  // Sudah dirender langsung via iframe src di index.html
}

// ═══════════════════════════════════════════════════════
//  CORE SYSTEM TAB 6: PREMIUM EXTENDED CONTENT
// ═══════════════════════════════════════════════════════
async function loadAndShowPremiumContent() {
  if (!currentUser) return;
  const pContainer = document.getElementById('premiumContainer');
  if (!pContainer) return;
  pContainer.innerHTML = `
    <div class="col-span-full bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs py-12 flex flex-col items-center justify-center gap-2">
      <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      Memuat modul premium dari repositori khusus...
    </div>
  `;
  try {
    const data = await callAPI('getPremiumContent', { email: currentUser.email, token: currentUser.token });
    pContainer.innerHTML = '';
    if (!data.contents || data.contents.length === 0) {
      pContainer.innerHTML = `<div class="col-span-full bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs py-12">Belum ada materi bimbingan premium khusus untuk akun Anda saat ini.</div>`;
      return;
    }
    data.contents.forEach(item => {
      const card = document.createElement('div');
      card.className = "bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-4";
      card.innerHTML = `
        <div class="space-y-1.5">
          <span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block">${item.category || 'Modul'}</span>
          <h4 class="text-xs font-bold text-slate-800 leading-snug">${item.title}</h4>
          <p class="text-[11px] text-slate-400 font-medium leading-relaxed">${item.description || 'Tidak ada deskripsi tambahan.'}</p>
        </div>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="w-full text-center py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-100 text-slate-700 hover:text-indigo-700 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
          Akses Konten <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
        </a>
      `;
      pContainer.appendChild(card);
    });
  } catch(e) {
    pContainer.innerHTML = `<div class="col-span-full bg-rose-50 border border-rose-100 p-6 rounded-2xl text-center text-rose-600 font-bold text-xs py-12">Gagal mengambil materi premium: ${e.message}</div>`;
  }
}
