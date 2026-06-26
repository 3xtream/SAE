const LS_API_KEY     = 'gas_api_url_v47';
const LS_SESSION_KEY = 'memberSession_v47';

let GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyNd61rOZ1XwcmzsN3f5PoALkFxtuz8jr2ePCstaTeryAlT3PCt8Hogsqkn0hJf7SA4/exec'; 
let currentUser = null;
const GITHUB_SPEAKING_LAB_URL = "https://3xtream.github.io/english/speaking-lab.html";

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  document.getElementById('toastMessage').innerText = message;
  icon.innerText = isError ? 'error_outline' : 'check_circle';
  icon.className = `material-icons-round text-base ${isError ? 'text-rose-400' : 'text-emerald-400'}`;
  toast.classList.remove('opacity-0', 'translate-y-2');
  toast.classList.add('opacity-100', '-translate-y-1');
  setTimeout(() => {
    toast.classList.remove('opacity-100', '-translate-y-1');
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2500);
}

window.alert = function(msg) {
  showToast(msg, msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('salah'));
};

async function callAPI(action, params = {}) {
  if (!GAS_API_URL) throw new Error('URL API belum dikonfigurasi.');
  showLoader(true);
  const body = JSON.stringify({ action, ...params });
  try {
    const res  = await fetch(GAS_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    showLoader(false);
  }
}

function showLoader(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

window.addEventListener('DOMContentLoaded', () => {
  const savedSession = localStorage.getItem(LS_SESSION_KEY);
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      showDashboard();
    } catch(e) {
      localStorage.removeItem(LS_SESSION_KEY);
      showAuth();
    }
  } else {
    showAuth();
  }
});

function showAuth() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('mainDashboard').classList.add('hidden');
  document.getElementById('speakingLabSection').classList.add('hidden');
  document.getElementById('bottomNav').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
}

function switchAuth(mode) {
  const isLogin = mode === 'login';
  document.getElementById('loginBox').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerBox').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tabLogin').className = isLogin ? "flex-1 text-center pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition" : "flex-1 text-center pb-3 text-sm font-medium text-slate-400 transition";
  document.getElementById('tabRegister').className = !isLogin ? "flex-1 text-center pb-3 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600 transition" : "flex-1 text-center pb-3 text-sm font-medium text-slate-400 transition";
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
const password = document.getElementById('loginPassword').value;
  try {
    const res = await callAPI('login', { email, password });
    if (res.success) {
      currentUser = { email: res.email, fullName: res.fullName, token: res.token };
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(currentUser));
      showToast('Login Berhasil!');
      showDashboard();
    } else {
      showToast(res.message || 'Kredensial salah', true);
    }
  } catch(e) {
    showToast('Koneksi Gagal: ' + e.message, true);
  }
}

async function handleRegister() {
  const fullName = document.getElementById('regName').value;
  const email    = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  try {
    const res = await callAPI('register', { fullName, email, password });
    showToast(res.message, !res.success);
    if (res.success) switchAuth('login');
  } catch(e) {
    showToast('Pendaftaran Gagal: ' + e.message, true);
  }
}

function logout() {
  localStorage.removeItem(LS_SESSION_KEY);
  currentUser = null;
  showAuth();
}

async function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainDashboard').classList.remove('hidden');
  document.getElementById('bottomNav').style.display = 'flex';
  document.getElementById('logoutBtn').style.display = 'flex';
  document.getElementById('userWelcome').innerText = currentUser.fullName;
  switchSection('dashboard');
  await refreshDashboardData();
}

function switchSection(target) {
  const isDash = target === 'dashboard';
  document.getElementById('mainDashboard').style.display = isDash ? 'block' : 'none';
  document.getElementById('speakingLabSection').style.display = !isDash ? 'block' : 'none';
  document.getElementById('nav-dashboard').className = isDash ? "flex-col items-center space-y-1 text-blue-600 transition" : "flex-col items-center space-y-1 text-slate-400 transition";
  document.getElementById('nav-speaking-lab').className = !isDash ? "flex-col items-center space-y-1 text-blue-600 transition" : "flex-col items-center space-y-1 text-slate-400 transition";
  if(!isDash) loadSpeakingLab();
}

async function refreshDashboardData() {
  try {
    const res = await callAPI('getDashboardData', { email: currentUser.email });
    if(res.success) {
      document.getElementById('statVocabCount').innerText = res.vocabCount || 0;
      document.getElementById('statAvgWpm').innerText = res.avgWpm || 0;
      renderInputLogCard();
      renderChecklists(res.checklists || {});
    }
  } catch(e) {
    showToast('Gagal memuat data dashboard.', true);
  }
}

function renderInputLogCard() {
  const container = document.getElementById('dashboard-section');
  container.innerHTML = `
    <div class="bg-white rounded-2xl custom-shadow border border-slate-100 p-5 space-y-4">
      <div class="flex items-center space-x-2 pb-1 border-b border-slate-50">
        <span class="material-icons-round text-blue-500 text-lg">edit_note</span>
        <h4 class="font-bold text-sm text-slate-800 tracking-tight">Input Kinerja Harian</h4>
      </div>
      <form onsubmit="event.preventDefault(); submitDailyLog(this);" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-[11px] text-slate-400 font-medium">WPM Speed</label>
            <input type="number" name="wpm" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold focus:outline-none focus:border-blue-500" placeholder="0">
          </div>
          <div class="space-y-1">
            <label class="text-[11px] text-slate-400 font-medium">Durasi (Detik)</label>
            <input type="number" name="duration" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold focus:outline-none focus:border-blue-500" placeholder="Detik">
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-[11px] text-slate-400 font-medium">Judul Passage Bacaan</label>
          <input type="text" name="passage" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:outline-none focus:border-blue-500" placeholder="Materi text...">
        </div>
        <button type="submit" class="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition h-11 shadow-sm">
          Simpan Log Hari Ini
        </button>
      </form>
    </div>
  `;
}

async function submitDailyLog(form) {
  const wpm = form.wpm.value;
  const duration = form.duration.value;
  const passage = form.passage.value;
  try {
    const res = await callAPI('saveDailyLog', { email: currentUser.email, wpm, duration, passage });
    showToast(res.message, !res.success);
    if(res.success) refreshDashboardData();
  } catch(e) {
    showToast('Gagal menyimpan log: ' + e.message, true);
  }
}

const PHASE_LABELS = {
  1: { title: "Phase 1: Pronunciation Checklist", class: "text-blue-600 bg-blue-50", items: ["Skor akurasi konsisten di atas 80% pada tes fundamental.", "Lancar melafalkan seluruh 44 simbol fonetik IPA.", "Menyelesaikan rekaman minimal 10 klip audio mandiri.", "Mampu membedakan minimal 20 pasangan kata minimal pair."] },
  2: { title: "Phase 2: Fluency Checklist", class: "text-emerald-600 bg-emerald-50", items: ["Mencapai target membaca konsisten di atas 110 WPM.", "Menyelesaikan seluruh target tantangan shadowing teks cerita.", "Mampu berbicara tanpa jeda tidak wajar selama 1 menit penuh.", "Skor kelancaran konsisten stabil di atas 85%."] },
  3: { title: "Phase 3: Expansion Checklist", class: "text-amber-600 bg-amber-50", items: ["Menguasai akumulasi target kosakata hingga 1200 kata aktif.", "Berhasil menyusun ringkasan lisan secara langsung tanpa teks.", "Menyelesaikan seluruh target latihan membaca pemahaman kritis.", "Mampu menangkap makna satu paragraf penuh tanpa translasi mental."] },
  4: { title: "Phase 4: Mastery Checklist", class: "text-rose-600 bg-rose-50", items: ["Akumulasi kosakata tingkat mahir tercapai (1800 - 2000 Kata).", "Sesi praktek konversasional aktif berjalan lancar.", "Mampu memproduksi tulisan jurnal esai opini pendek secara natural.", "Kelulusan total dari seluruh rangkaian kurikulum akselerasi 1 tahun."] }
};

function renderChecklists(savedStates) {
  for (let phaseNum = 1; phaseNum <= 4; phaseNum++) {
    const pMeta = PHASE_LABELS[phaseNum];
    const el = document.getElementById('phase' + phaseNum);
    if(!el) continue;
    
    let html = `
      <div class="flex items-center space-x-2 pb-1 border-b border-slate-50">
        <div class="w-7 h-7 rounded-lg ${pMeta.class} flex items-center justify-center font-bold text-xs">${phaseNum}</div>
        <h4 class="font-bold text-sm text-slate-800 tracking-tight">${pMeta.title}</h4>
      </div>
      <div class="space-y-2.5 pt-1">
    `;
    
    pMeta.items.forEach((itemText, idx) => {
      const isChecked = savedStates[`PHASE-${phaseNum}_${idx}`] === "TRUE";
      html += `
        <label class="flex items-start space-x-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100 active:bg-slate-100 transition cursor-pointer select-none">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="syncPhaseChecklist(${phaseNum}, ${idx}, this)" class="w-5 h-5 rounded-lg text-blue-600 border-slate-300 bg-white mt-0.5 transition">
          <span class="text-xs font-semibold text-slate-600 leading-normal">${itemText}</span>
        </label>
      `;
    });
    
    html += `</div>`;
    el.innerHTML = html;
  }
}

async function syncPhaseChecklist(phaseNum, checklistIndex, checkbox) {
  const isChecked = checkbox.checked;
  showToast('Memperbarui status cloud...');
  try {
    const res = await callAPI('updatePhaseChecklistInSheet', {
      email: currentUser.email,
      phaseNum,
      checklistIndex,
      isChecked
    });
    if(res.success) showToast('Status database berhasil di-update!');
  } catch(e) {
    checkbox.checked = !isChecked;
    showToast('Gagal update data cloud: ' + e.message, true);
  }
}

async function loadSpeakingLab() {
  document.getElementById('spIframeLoader').style.display = 'flex';
  document.getElementById('spLabIframe').style.display = 'none';
  try {
    const res = await callAPI('getSpeakingLabUrl', { email: currentUser.email, token: currentUser.token });
    if (!res.success) { showToast(res.message || 'Gagal mendapatkan URL sesi.', true); return; }
    
    document.getElementById('spOpenTabBtn').href = res.url;
    const iframe = document.getElementById('spLabIframe');
    
    iframe.onload = function() {
      document.getElementById('spIframeLoader').style.display = 'none';
      iframe.style.display = 'block';
      setTimeout(() => {
        try {
          iframe.contentWindow.postMessage(
            { type: 'SPEAKING_LAB_SESSION', payload: { token: currentUser.token, email: currentUser.email, fullName: currentUser.fullName } }, 
            new URL(GITHUB_SPEAKING_LAB_URL).origin
          );
        } catch(e) { console.error("Gagal postMessage:", e); }
      }, 800);
    };
    iframe.src = res.url;
  } catch(e) { 
    showToast('Koneksi Lab Gagal: ' + e.message, true); 
  }
}
