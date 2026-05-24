// file-tracking-page.js
// Encapsulated logic from former inline <script> in file-tracking.html
// Registers as window.fileTrackingPage and listens for page readiness

(function(){
  const state = {
    authSystem: null,
    permissionController: null,
    currentUser: null,
    sidebarManager: null,
    transferScanner: null,
    receiveScanner: null,
    currentScanData: null,
    transferCameraIndex: 0,
    receiveCameraIndex: 0,
    availableCameras: [],
    initialized: false
  };

  const departmentNames = {
    archive: 'الأرشيف',
    legal: 'الشؤون القانونية',
    governance: 'الحوكمة والامتثال',
    collection: 'إدارة التحصيل',
    securitization: 'إدارة التوريق'
  };
  const statusNames = {
    in_archive: 'في الأرشيف',
    transferred: 'تم النقل',
    received: 'تم الاستلام',
    in_transit: 'في الطريق'
  };

  function log(){ console.log('[file-tracking]', ...arguments); }

  // Unified notify/toast helper (success|error|info)
  function notify(message, type='info'){
    if (window.UX && window.UX.toast){
      try { window.UX.toast(message, type); return; } catch{}
    }
    if (window.notify){ try { window.notify(message, type); return; } catch{}
    }
    // Fallback
    try { alert(message); } catch{}
  }

  async function init(){
    document.body.classList.add('file-tracking-page');
    log('Initializing file tracking page');
    await waitForAuth();
    await waitForFirebase();
    setupAuth();
    initializeScannerControls();
    // initial load after auth established will be triggered via auth listener
  }

  function waitForAuth(){
    return new Promise(res=>{
      let attempts = 0; const max = 50;
      (function check(){
        attempts++;
        if (window.unifiedAuth && window.auth) return res();
        if (attempts >= max) return res();
        setTimeout(check,200);
      })();
    });
  }

  function setupAuth(){
    if (window.unifiedAuth){
      state.authSystem = window.unifiedAuth;
      if (window.UIPermissionController){
        state.permissionController = new UIPermissionController(window.unifiedAuth);
      }
      if (window.SidebarManager){
        state.sidebarManager = new SidebarManager();
      }
      state.authSystem.onAuthStateChanged(handleAuthStateChange);
    } else if (window.firebase && firebase.auth){
      firebase.auth().onAuthStateChanged(handleAuthStateChange);
    }
  }

  async function handleAuthStateChange(user){
    log('Auth state changed', user && user.email);
    if (!user){
      setTimeout(()=>{
        const u = state.authSystem ? state.authSystem.getCurrentUser() : (window.firebase && firebase.auth ? firebase.auth().currentUser : null);
        if(!u){ window.location.href = 'login.html?message=session-expired'; }
      },10000);
      return;
    }
    state.currentUser = user;
    await waitForFirebase();
    await checkPermissions();
    if (window.activityLogger){
      window.activityLogger.logSystemAccess('file-tracking','file_movement_tracking');
    }
    loadFileMovements();
  }

  // Wait until Firebase Firestore is ready (window.db) or a ready event fires
  function waitForFirebase(){
    return new Promise(resolve=>{
      if (window.db) return resolve();
      let settled = false;
      const done = ()=>{ if (!settled){ settled = true; resolve(); } };
      const onReady = ()=>{ document.removeEventListener('firebaseReady', onReady); done(); };
      document.addEventListener('firebaseReady', onReady);
      // Poll as a fallback in case the event already fired
      let tries = 0; const iv = setInterval(()=>{
        tries++;
        if (window.db){ clearInterval(iv); document.removeEventListener('firebaseReady', onReady); done(); }
        else if (tries > 50){ clearInterval(iv); document.removeEventListener('firebaseReady', onReady); done(); }
      }, 100);
    });
  }

  // Safely get current user or redirect
  async function requireAuthOrRedirect(){
    const user = state.currentUser || (window.auth && window.auth.currentUser) || (window.unifiedAuth && window.unifiedAuth.currentUser) || null;
    if (user && user.uid) return user;
    notify('يرجى تسجيل الدخول لإتمام العملية','error');
    // soft redirect after a small delay
    setTimeout(()=>{
      try { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname); } catch(_) {}
    }, 800);
    throw new Error('no-auth');
  }

  async function checkPermissions(){
    try {
      if (!state.authSystem || !state.authSystem.getCurrentUser()) return;
      const profile = state.authSystem.profile;
      if (profile && profile.role){
        // allowed roles currently all
      }
      if (state.sidebarManager){
        const role = state.authSystem.getCurrentUserRole() || 'viewer';
        state.sidebarManager.updateSidebarNav(true, role);
      }
      if (state.permissionController){ state.permissionController.updateUI(); }
    } catch(err){ console.error('Permissions error', err); }
  }

  async function loadFileMovements(filters = {}){
    const container = document.getElementById('movementsContainer');
    if (!container) return;
    try {
      if (window.UX && window.UX.showLoading) window.UX.showLoading('file-movements-load');
      container.innerHTML = '<div class="d-flex justify-content-center align-items-center loading-height"><div class="spinner-border text-primary"></div></div>';
      if (!window.db){
        await waitForFirebase();
      }
      if (!window.db){
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-database"></i></div><h5>لم يتم تهيئة الاتصال بعد</h5><p>يرجى تحديث الصفحة أو المحاولة لاحقًا</p></div>';
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-movements-load');
        return;
      }
      let query = window.db.collection('file_movements').orderBy('timestamp','desc');
      if (filters.fileNumber){
        query = window.db.collection('file_movements').where('fileNumber','==',filters.fileNumber).orderBy('timestamp','desc');
      }
      const snapshot = await query.limit(50).get();
      let docs = snapshot.docs;
      if (filters.department){
        docs = docs.filter(d=>{ const data = d.data(); return data.toDepartment === filters.department || data.fromDepartment === filters.department; });
      }
      if (filters.status){
        docs = docs.filter(d=> d.data().status === filters.status);
      }
      if (!docs.length){
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-exchange-alt"></i></div><h5>لا توجد حركات ملفات</h5><p>لم يتم العثور على أي حركات للملفات</p></div>';
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-movements-load');
        return;
      }
      const grouped = {};
      docs.forEach(doc=>{ const m = { id: doc.id, ...doc.data() }; const key = m.fileNumber; grouped[key] = grouped[key] || { fileNumber: m.fileNumber, fileName: m.fileName, movements: []}; grouped[key].movements.push(m); });
      Object.values(grouped).forEach(f=> f.movements.sort((a,b)=>{ const ta = a.timestamp ? a.timestamp.toDate() : new Date(0); const tb = b.timestamp ? b.timestamp.toDate() : new Date(0); return tb - ta; }));
      renderFileMovements(grouped);
      // Emit movements:updated for global search / analytics
      try {
        const movementObjects = docs.map(d=>{ const data = d.data(); return { id: d.id, fileNumber: data.fileNumber, fileName: data.fileName, action: data.action, status: data.status, timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : null }; });
        document.dispatchEvent(new CustomEvent('movements:updated',{ detail: { movements: movementObjects, source: 'file-tracking' }}));
      } catch(e){ /* silent */ }
    } catch(err){ console.error('Load error', err); container.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>خطأ في تحميل البيانات: ${err.message}</div>`; }
    finally { if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-movements-load'); }
  }

  function renderFileMovements(grouped){
    const container = document.getElementById('movementsContainer');
    const F = window.FormatUtils || {};
    const esc = s => {
      if (s === undefined || s === null) return '';
      if (F.escapeHtml) return F.escapeHtml(String(s));
      return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
    };
    container.innerHTML = Object.values(grouped).map(file=>{
      const latest = file.movements[0];
      const currentStatus = latest ? latest.status : 'unknown';
      const currentLocation = latest ? (latest.toDepartment || latest.fromDepartment) : 'unknown';
      const currentLocationSafe = (currentLocation||'').replace(/[^a-zA-Z0-9_-]/g,'');
      const statusSafe = (currentStatus||'').replace(/[^a-zA-Z0-9_-]/g,'');
      return `<div class="tracking-card"><div class="d-flex justify-content-between align-items-start mb-3"><div><h5 class="mb-1"><i class="fas fa-file-alt me-2"></i>${esc(file.fileName) || 'ملف غير محدد'}</h5><p class="text-muted mb-2">رقم الملف: ${esc(file.fileNumber)}</p><div class="d-flex gap-2"><span class="department-badge dept-${currentLocationSafe}">${esc(departmentNames[currentLocation] || currentLocation)}</span><span class="status-badge status-${statusSafe.replace('_','-')}">${esc(statusNames[currentStatus] || currentStatus)}</span></div></div><button class="btn btn-outline-primary btn-sm" data-ft-action="toggle-history" data-file="${esc(file.fileNumber)}"><i class="fas fa-history me-1"></i>التاريخ</button></div><div class="movement-timeline d-none" id="timeline-${esc(file.fileNumber)}">${file.movements.map(m=>{ const ts = m.timestamp ? (m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp)) : new Date(); const tsFmt = F.formatArabicDateTime ? F.formatArabicDateTime(ts) : ts.toLocaleString('ar-SA'); return `<div class="timeline-item"><div class="timeline-marker ${esc(m.action || 'transfer')}"></div><div class="d-flex justify-content-between align-items-start"><div><h6 class="mb-1">${m.action === 'transfer' ? 'نقل الملف' : 'استلام الملف'} ${m.fromDepartment ? `من ${esc(departmentNames[m.fromDepartment] || m.fromDepartment)}` : ''} ${m.toDepartment ? `إلى ${esc(departmentNames[m.toDepartment] || m.toDepartment)}` : ''}</h6><p class="text-muted mb-1">${esc(m.notes || 'لا توجد ملاحظات')}</p><small class="text-muted"><i class="fas fa-clock me-1"></i>${tsFmt}</small></div><div class="d-flex align-items-center"><div class="user-avatar">${esc(m.userDisplayName ? m.userDisplayName.charAt(0) : 'ع')}</div><div class="me-2"><div class="fw-bold small">${esc(m.userDisplayName || 'مستخدم غير معروف')}</div><div class="text-muted" style="font-size:0.75rem">${esc(m.userEmail || '')}</div></div></div></div></div>`; }).join('')}</div>`;
    }).join('');
  }

  function toggleMovementHistory(fileNumber, button){
    // Find timeline within the same card to avoid ID fragility on special file numbers
    const card = button.closest('.tracking-card');
    const timeline = card ? card.querySelector('.movement-timeline') : null;
    if (!timeline) return;
    if (timeline.classList.contains('d-none')){
      timeline.classList.remove('d-none');
      button.innerHTML = '<i class="fas fa-eye-slash me-1"></i>إخفاء';
    } else {
      timeline.classList.add('d-none');
      button.innerHTML = '<i class="fas fa-history me-1"></i>التاريخ';
    }
  }

  function searchFileMovements(){
    const fileSearch = document.getElementById('searchFile').value.trim();
    const department = document.getElementById('departmentFilter').value;
    const status = document.getElementById('statusFilter').value;
    const filters = {};
    if (fileSearch) filters.fileNumber = fileSearch;
    if (department) filters.department = department;
    if (status) filters.status = status;
    if (window.activityLogger && (fileSearch || department || status)){
      window.activityLogger.logFileSearch(fileSearch || 'All files',0,'file_tracking_filter');
    }
    loadFileMovements(filters);
  }

  async function transferFile(){
    const user = await requireAuthOrRedirect();
    const fileNumber = document.getElementById('transferFileNumber').value.trim();
    const fileName = document.getElementById('transferFileName').value.trim();
    const fromDept = document.getElementById('transferFromDept').value;
    const toDept = document.getElementById('transferToDept').value;
    const notes = document.getElementById('transferNotes').value.trim();
    if (!fileNumber || !fileName || !fromDept || !toDept){ return notify('يرجى ملء جميع الحقول المطلوبة','error'); }
    if (fromDept === toDept){ return notify('لا يمكن نقل الملف لنفس القسم','error'); }
    const submitBtn = document.querySelector('#transferFileModal .btn-primary');
    const original = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري النقل...';
    try {
      if (window.UX && window.UX.showLoading) window.UX.showLoading('file-transfer');
  await window.db.collection('file_movements').add({ fileNumber, fileName, fromDepartment: fromDept, toDepartment: toDept, action:'transfer', status:'in_transit', notes, userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      await updateFileStatus(fileNumber,'in_transit', toDept);
      bootstrap.Modal.getInstance(document.getElementById('transferFileModal')).hide();
      document.getElementById('transferFileForm').reset();
      loadFileMovements();
      notify('تم نقل الملف بنجاح','success');
    } catch(err){ console.error('Transfer error', err); notify('حدث خطأ في نقل الملف: '+ err.message,'error'); }
    finally { if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-transfer'); submitBtn.disabled = false; submitBtn.innerHTML = original; }
  }

  async function receiveFile(){
    const user = await requireAuthOrRedirect();
    const fileNumber = document.getElementById('receiveFileNumber').value.trim();
    const notes = document.getElementById('receiveNotes').value.trim();
    if (!fileNumber) return notify('يرجى إدخال رقم الملف','error');
    const submitBtn = document.querySelector('#receiveFileModal .btn-success');
    const original = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري الاستلام...';
    try {
      if (window.UX && window.UX.showLoading) window.UX.showLoading('file-receive');
      const movementsQuery = await window.db.collection('file_movements').where('fileNumber','==',fileNumber).orderBy('timestamp','desc').limit(10).get();
      if (movementsQuery.empty) return notify('لا يوجد ملف بهذا الرقم','error');
      let latestMovement = null; for (const doc of movementsQuery.docs){ const m = doc.data(); if (m.status === 'in_transit'){ latestMovement = m; break; } }
      if (!latestMovement) return notify('لا يوجد ملف في حالة انتقال بهذا الرقم','error');
  await window.db.collection('file_movements').add({ fileNumber, fileName: latestMovement.fileName, fromDepartment: latestMovement.fromDepartment, toDepartment: latestMovement.toDepartment, action:'receive', status:'received', notes, userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      await updateFileStatus(fileNumber,'received', latestMovement.toDepartment);
      bootstrap.Modal.getInstance(document.getElementById('receiveFileModal')).hide();
      document.getElementById('receiveFileForm').reset();
      loadFileMovements();
      notify('تم استلام الملف بنجاح','success');
    } catch(err){ console.error('Receive error', err); notify('حدث خطأ في استلام الملف: '+ err.message,'error'); }
    finally { if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-receive'); submitBtn.disabled = false; submitBtn.innerHTML = original; }
  }

  async function updateFileStatus(fileNumber, status, currentDepartment){
    try {
      const docsQuery = await window.db.collection('documents').where('fileNumber','==',fileNumber).limit(1).get();
      if (!docsQuery.empty){ await docsQuery.docs[0].ref.update({ currentStatus: status, currentDepartment, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); }
    } catch(err){ console.error('Status update error', err); }
  }

  // Scanner logic (trimmed / simplified where possible)
  function initializeScannerControls(){
    const bind = (id, handler)=>{ const el = document.getElementById(id); if (el) el.addEventListener('click', handler); };
    bind('startTransferScan', startTransferScanner); bind('stopTransferScan', stopTransferScanner); bind('switchTransferCamera', switchTransferCamera);
    bind('startReceiveScan', startReceiveScanner); bind('stopReceiveScan', stopReceiveScanner); bind('switchReceiveCamera', switchReceiveCamera);
    if (window.Html5Qrcode){ Html5Qrcode.getCameras().then(dev=>{ state.availableCameras = dev; }).catch(()=>{}); }
    // Enable controls when modals are shown and clean up on hide
    document.addEventListener('shown.bs.modal', e=>{
      if (e.target.id === 'scanTransferModal'){ toggleScanButtons('transfer', false); }
      if (e.target.id === 'scanReceiveModal'){ toggleScanButtons('receive', false); }
    });
    document.addEventListener('hide.bs.modal', e=>{
      if (e.target.id === 'scanTransferModal') stopTransferScanner();
      if (e.target.id === 'scanReceiveModal') stopReceiveScanner();
    });
  }
  async function startTransferScanner(){ await startScanner('transfer'); }
  async function startReceiveScanner(){ await startScanner('receive'); }
  async function startScanner(type){
    try {
      const camIndex = type === 'transfer' ? state.transferCameraIndex : state.receiveCameraIndex;
      const camId = state.availableCameras.length > camIndex ? state.availableCameras[camIndex].id : { facingMode: 'environment' };
      const targetId = type === 'transfer' ? 'transferScannerVideo' : 'receiveScannerVideo';
      // Ensure target region exists and is empty
      const region = document.getElementById(targetId);
      if (!region) throw new Error('scanner region not found');
      region.innerHTML = '';
      const scanner = new Html5Qrcode(targetId);
      await scanner.start(camId,{ fps:10, qrbox:{ width:200, height:200 } }, decoded => { type === 'transfer' ? onTransferScanSuccess(decoded) : onReceiveScanSuccess(decoded); });
      if (type === 'transfer'){ state.transferScanner = scanner; toggleScanButtons('transfer', true); } else { state.receiveScanner = scanner; toggleScanButtons('receive', true); }
    } catch(err){ notify('خطأ في تشغيل الكاميرا. تأكد من السماح للموقع بالوصول للكاميرا.','error'); }
  }
  async function stopTransferScanner(){ await stopScanner('transfer'); }
  async function stopReceiveScanner(){ await stopScanner('receive'); }
  async function stopScanner(type){ const s = type==='transfer'? state.transferScanner : state.receiveScanner; if (s){ try { await s.stop(); await s.clear(); } catch{} } if (type==='transfer'){ state.transferScanner=null; toggleScanButtons('transfer', false);} else { state.receiveScanner=null; toggleScanButtons('receive', false);} }
  function switchTransferCamera(){ switchCamera('transfer'); }
  function switchReceiveCamera(){ switchCamera('receive'); }
  async function switchCamera(type){ if ((type==='transfer'? state.availableCameras.length <=1 : state.availableCameras.length <=1)) return; await stopScanner(type); if (type==='transfer'){ state.transferCameraIndex = (state.transferCameraIndex +1) % state.availableCameras.length; startTransferScanner(); } else { state.receiveCameraIndex = (state.receiveCameraIndex +1) % state.availableCameras.length; startReceiveScanner(); } }
  function toggleScanButtons(type, running){ if (type==='transfer'){ setDisabled('startTransferScan', running); setDisabled('stopTransferScan', !running); } else { setDisabled('startReceiveScan', running); setDisabled('stopReceiveScan', !running); } }
  function setDisabled(id, disabled){ const el = document.getElementById(id); if (el) el.disabled = disabled; }

  async function onTransferScanSuccess(text){ await stopTransferScanner(); state.currentScanData = parseQRCode(text); if (window.activityLogger){ window.activityLogger.logQRScan(text, !!state.currentScanData,'transfer'); } if(!state.currentScanData) return notify('رمز QR غير صالح.','error'); document.getElementById('transferScannedResult')?.classList.remove('d-none'); document.getElementById('transferFormSection')?.classList.remove('d-none'); document.getElementById('confirmTransferBtn')?.classList.remove('d-none'); const info = await getFileInfo(state.currentScanData.fileNumber); displayTransferFileInfo(info); }
  async function onReceiveScanSuccess(text){ await stopReceiveScanner(); state.currentScanData = parseQRCode(text); if (window.activityLogger){ window.activityLogger.logQRScan(text, !!state.currentScanData,'receive'); } if(!state.currentScanData) return notify('رمز QR غير صالح.','error'); const inTransit = await checkFileInTransit(state.currentScanData.fileNumber); if(!inTransit) return notify('هذا الملف ليس في حالة انتقال.','error'); document.getElementById('receiveScannedResult')?.classList.remove('d-none'); document.getElementById('receiveFormSection')?.classList.remove('d-none'); document.getElementById('confirmReceiveBtn')?.classList.remove('d-none'); const info = await getFileInfo(state.currentScanData.fileNumber); displayReceiveFileInfo(info); }

  function parseQRCode(qrText){ try { const data = JSON.parse(qrText); if (data.fileNumber && data.type === 'archive_file') return data; } catch{} if (qrText.trim()) return { fileNumber: qrText.trim(), type:'archive_file'}; return null; }

  async function getFileInfo(fileNumber){ try { if (window.activityLogger){ window.activityLogger.logFileView(fileNumber,'Unknown File'); } const docQuery = await window.db.collection('documents').where('fileNumber','==',fileNumber).limit(1).get(); if (!docQuery.empty){ const data = docQuery.docs[0].data(); if (window.activityLogger){ window.activityLogger.logFileView(fileNumber, data.fileName || data.title); } return data; } const moveQuery = await window.db.collection('file_movements').where('fileNumber','==',fileNumber).orderBy('timestamp','desc').limit(1).get(); if (!moveQuery.empty){ const mv = moveQuery.docs[0].data(); return { fileNumber: mv.fileNumber, fileName: mv.fileName, currentDepartment: mv.toDepartment, currentStatus: mv.status }; } return { fileNumber, fileName: 'ملف غير معروف', currentDepartment: 'غير محدد', currentStatus: 'غير معروف' }; } catch(err){ console.error('getFileInfo error',err); return null; } }

  async function checkFileInTransit(fileNumber){ try { const q = await window.db.collection('file_movements').where('fileNumber','==',fileNumber).orderBy('timestamp','desc').limit(5).get(); for (const doc of q.docs){ const m = doc.data(); if (m.status === 'in_transit') return true; } return false; } catch(err){ return false; } }

  function displayTransferFileInfo(fileInfo){ if(!fileInfo) return; const c = document.getElementById('transferFileInfo'); if(!c) return; c.innerHTML = `<div class="row"><div class="col-md-6"><strong>رقم الملف:</strong> ${fileInfo.fileNumber}</div><div class="col-md-6"><strong>اسم الملف:</strong> ${fileInfo.fileName || 'غير محدد'}</div></div><div class="row mt-2"><div class="col-md-6"><strong>القسم الحالي:</strong> ${departmentNames[fileInfo.currentDepartment] || fileInfo.currentDepartment}</div><div class="col-md-6"><strong>الحالة:</strong> <span class="badge bg-info">${statusNames[fileInfo.currentStatus] || fileInfo.currentStatus}</span></div></div>`; }
  function displayReceiveFileInfo(fileInfo){ if(!fileInfo) return; const c = document.getElementById('receiveFileInfo'); if(!c) return; c.innerHTML = `<div class="row"><div class="col-md-6"><strong>رقم الملف:</strong> ${fileInfo.fileNumber}</div><div class="col-md-6"><strong>اسم الملف:</strong> ${fileInfo.fileName || 'غير محدد'}</div></div><div class="row mt-2"><div class="col-md-6"><strong>في الطريق من:</strong> ${departmentNames[fileInfo.fromDepartment] || fileInfo.fromDepartment || ''}</div><div class="col-md-6"><strong>الحالة:</strong> <span class="badge bg-warning">في الطريق</span></div></div>`; }

  async function confirmScannedTransfer(){
    try {
      const user = await requireAuthOrRedirect();
      const scannedFileNumber = state.currentScanData && state.currentScanData.fileNumber;
      if(!scannedFileNumber) return notify('لم يتم مسح أي ملف','error');
      const toDept = document.getElementById('scanTransferToDept').value;
      const priority = document.getElementById('transferPriority').value;
      const notes = document.getElementById('scanTransferNotes').value;
      if(!toDept) return notify('يرجى اختيار القسم المستقبل','error');
      const btn = document.getElementById('confirmTransferBtn');
      const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري النقل...';
      try {
        if (window.UX && window.UX.showLoading) window.UX.showLoading('scanner-transfer');
        const info = await getFileInfo(scannedFileNumber);
        await window.db.collection('file_movements').add({ fileNumber: scannedFileNumber, fileName: info.fileName, fromDepartment: info.currentDepartment, toDepartment: toDept, action:'transfer', status:'in_transit', priority, notes, scanMethod:'qr_scanner', userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        await updateFileStatus(scannedFileNumber,'in_transit', toDept);
        if (window.activityLogger){ window.activityLogger.logFileMove(scannedFileNumber, info.currentDepartment, toDept, priority); }
        bootstrap.Modal.getInstance(document.getElementById('scanTransferModal')).hide();
        resetTransferModal();
        loadFileMovements();
        notify('تم نقل الملف بنجاح عبر الماسح الضوئي!','success');
      } finally {
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('scanner-transfer');
        btn.disabled = false; btn.innerHTML = original;
      }
    } catch(err){
      if (err && err.message !== 'no-auth') notify('حدث خطأ في نقل الملف: '+ err.message,'error');
    }
  }
  async function confirmScannedReceive(){
    try {
      const user = await requireAuthOrRedirect();
      const scannedFileNumber = state.currentScanData && state.currentScanData.fileNumber;
      if(!scannedFileNumber) return notify('لم يتم مسح أي ملف','error');
      const condition = document.getElementById('receiveCondition').value;
      const notes = document.getElementById('scanReceiveNotes').value;
      const btn = document.getElementById('confirmReceiveBtn');
      const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جاري الاستلام...';
      try {
        if (window.UX && window.UX.showLoading) window.UX.showLoading('scanner-receive');
        const movementsQuery = await window.db.collection('file_movements').where('fileNumber','==',scannedFileNumber).orderBy('timestamp','desc').limit(10).get();
        let latest = null; for (const doc of movementsQuery.docs){ const m = doc.data(); if (m.status === 'in_transit'){ latest = m; break; } }
        if(!latest) { notify('لا يوجد ملف في حالة انتقال بهذا الرقم','error'); return; }
        await window.db.collection('file_movements').add({ fileNumber: scannedFileNumber, fileName: latest.fileName, fromDepartment: latest.fromDepartment, toDepartment: latest.toDepartment, action:'receive', status:'received', condition, notes, scanMethod:'qr_scanner', userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        await updateFileStatus(scannedFileNumber,'received', latest.toDepartment);
        if (window.activityLogger){ window.activityLogger.logFileMove(scannedFileNumber, latest.fromDepartment, latest.toDepartment, 'received'); }
        bootstrap.Modal.getInstance(document.getElementById('scanReceiveModal')).hide();
        resetReceiveModal();
        loadFileMovements();
        notify('تم استلام الملف بنجاح عبر الماسح الضوئي!','success');
      } finally {
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('scanner-receive');
        btn.disabled = false; btn.innerHTML = original;
      }
    } catch(err){
      if (err && err.message !== 'no-auth') notify('حدث خطأ في استلام الملف: '+ err.message,'error');
    }
  }

  function resetTransferModal(){ stopTransferScanner(); hideSections(['transferScannedResult','transferFormSection','confirmTransferBtn']); document.getElementById('transferScanForm')?.reset(); state.currentScanData = null; }
  function resetReceiveModal(){ stopReceiveScanner(); hideSections(['receiveScannedResult','receiveFormSection','confirmReceiveBtn']); document.getElementById('receiveScanForm')?.reset(); state.currentScanData = null; }
  function hideSections(ids){ ids.forEach(id=>{ const el = document.getElementById(id); if (el) el.classList.add('d-none'); }); }

  function processManualEntry(){ const fileCode = document.getElementById('manualFileCode').value.trim(); const operation = document.getElementById('manualOperation').value; if(!fileCode) return notify('يرجى إدخال رقم الملف','error'); bootstrap.Modal.getInstance(document.getElementById('manualEntryModal')).hide(); state.currentScanData = { fileNumber: fileCode, type:'archive_file' }; if (operation==='transfer'){ bootstrap.Modal.getInstance(document.getElementById('scanTransferModal')).show(); onTransferScanSuccess(fileCode); } else { bootstrap.Modal.getInstance(document.getElementById('scanReceiveModal')).show(); onReceiveScanSuccess(fileCode); } }

  document.addEventListener('hidden.bs.modal', e=>{ if (e.target.id==='scanTransferModal') resetTransferModal(); else if (e.target.id==='scanReceiveModal') resetReceiveModal(); });

  // Event delegation for dynamic buttons
  document.addEventListener('click', e=>{ 
    const base = e.target && e.target.closest ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
    const historyBtn = base && base.closest ? base.closest('[data-ft-action="toggle-history"]') : null;
    if (historyBtn){ toggleMovementHistory(historyBtn.getAttribute('data-file'), historyBtn); return; }
    const actionBtn = base && base.closest ? base.closest('[data-ft-action]') : null;
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-ft-action');
    switch(action){
      case 'search': return searchFileMovements();
      case 'confirm-transfer': return confirmScannedTransfer();
      case 'confirm-receive': return confirmScannedReceive();
      case 'manual-entry': return processManualEntry();
    }
  });

  // Public API
  const api = { searchFileMovements, transferFile, receiveFile, confirmScannedTransfer, confirmScannedReceive, processManualEntry };
  window.fileTrackingPage = api;

  // Listen for common page readiness (page-bootstrap emits page:ready)
  // Robust init: run once on page:ready or DOMContentLoaded (whichever fires first)
  function initOnce(){ if (state.initialized) return; state.initialized = true; init(); }
  document.addEventListener('page:ready', initOnce);
  document.addEventListener('DOMContentLoaded', initOnce);
})();
