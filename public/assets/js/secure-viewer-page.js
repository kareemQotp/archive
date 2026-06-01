(function(){
  'use strict';

  const state = {
    db: null,
    token: null,
    viewerName: 'External User',
    ipAddress: 'Unknown',
    nowText: ''
  };

  function byId(id){ return document.getElementById(id); }

  function setStatus(message, type){
    const box = byId('viewerStatus');
    if (!box) return;
    const colors = {
      info: '#cbd5e1',
      success: '#86efac',
      error: '#fca5a5'
    };
    box.style.color = colors[type || 'info'] || colors.info;
    box.textContent = message;
  }

  function formatNow(){
    return new Date().toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function sanitize(v){
    return (v || '').toString().replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  function updateMeta(shared){
    state.nowText = formatNow();
    byId('metaBank').textContent = shared.bankName || shared.toDepartment || 'External';
    byId('metaUser').textContent = state.viewerName;
    byId('metaIp').textContent = state.ipAddress;
    byId('metaTime').textContent = state.nowText;
    renderWatermark(shared);
  }

  function renderWatermark(shared){
    const layer = byId('watermarkLayer');
    if (!layer) return;
    const bank = sanitize(shared.bankName || shared.toDepartment || 'External');
    const user = sanitize(state.viewerName);
    const ip = sanitize(state.ipAddress);
    const time = sanitize(state.nowText);
    const text = `${bank} | ${user} | ${ip} | ${time}`;

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='220'>
      <rect width='100%' height='100%' fill='transparent'/>
      <g transform='translate(24,112) rotate(-28)'>
        <text x='0' y='0' font-size='15' fill='rgba(248,250,252,0.65)' font-family='Cairo,Tajawal,sans-serif'>${text}</text>
      </g>
    </svg>`;
    layer.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }

  function blockSensitiveActions(){
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    document.addEventListener('dragstart', function(e){ e.preventDefault(); });
    document.addEventListener('copy', function(e){ e.preventDefault(); });

    document.addEventListener('keydown', function(e){
      const key = (e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if ((ctrl && ['s','p','u'].includes(key)) || key === 'f12' || (ctrl && e.shiftKey && ['i','j','c'].includes(key))) {
        e.preventDefault();
      }
    });

    try {
      window.print = function(){ return false; };
      if (window.top) {
        window.top.print = function(){ return false; };
      }
    } catch (_) {}
  }

  async function fetchIp(){
    try {
      const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.ip) state.ipAddress = d.ip;
    } catch (_) {}
  }

  function showDocument(shared){
    const stage = byId('docStage');
    const frame = byId('docFrame');
    const image = byId('docImage');
    if (!stage || !frame || !image) return;

    const url = shared.downloadURL || '';
    if (!url) {
      setStatus('الرابط لا يحتوي على ملف صالح للعرض.', 'error');
      return;
    }

    const ct = (shared.contentType || '').toLowerCase();
    stage.classList.remove('d-none');
    byId('viewerStatus').classList.add('d-none');

    if (ct.startsWith('image/')) {
      image.classList.remove('d-none');
      frame.classList.add('d-none');
      image.src = url;
      return;
    }

    frame.classList.remove('d-none');
    image.classList.add('d-none');
    const joiner = url.indexOf('#') === -1 ? '#' : '&';
    frame.src = `${url}${joiner}toolbar=0&navpanes=0&scrollbar=0`;
  }

  function isLinkValid(data){
    if (!data || data.active !== true || data.viewOnly !== true) return false;
    const exp = data.expiresAt && typeof data.expiresAt.toDate === 'function' ? data.expiresAt.toDate() : null;
    if (!exp) return false;
    return exp.getTime() > Date.now();
  }

  async function loadSharedLink(){
    const snap = await state.db.collection('shared_links').doc(state.token).get();
    if (!snap.exists) {
      setStatus('الرابط غير موجود أو غير صالح.', 'error');
      return;
    }

    const data = snap.data() || {};
    if (!isLinkValid(data)) {
      setStatus('الرابط منتهي الصلاحية أو غير مفعل.', 'error');
      return;
    }

    updateMeta(data);
    showDocument(data);
    setStatus('تم التحقق من الرابط بنجاح.', 'success');

    setInterval(function(){
      updateMeta(data);
    }, 15000);
  }

  function initFirebase(){
    if (!window.firebase || !window.firebaseConfig) {
      throw new Error('Firebase is not available');
    }
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(window.firebaseConfig || firebaseConfig);
    }
    state.db = firebase.firestore();
  }

  function initParams(){
    const params = new URLSearchParams(window.location.search);
    state.token = params.get('token') || '';
    state.viewerName = params.get('viewer') || params.get('u') || 'External User';
    if (!state.token) {
      setStatus('الرابط غير مكتمل: token مفقود.', 'error');
      return false;
    }
    return true;
  }

  async function bootstrap(){
    blockSensitiveActions();
    if (!initParams()) return;

    try {
      initFirebase();
      await fetchIp();
      await loadSharedLink();
    } catch (e) {
      setStatus('حدث خطأ أثناء تهيئة العرض الآمن.', 'error');
      console.error(e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
