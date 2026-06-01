(function(){
  'use strict';

  const state = {
    user: null,
    clients: [],
    clientFiles: [],
    filteredClientFiles: [],
    scanner: null,
    scannerRunning: false,
    scannerCameras: [],
    scannerCameraIndex: 0
  };
  const els = {};
  const STATUSES = ['archived', 'requested', 'transferred', 'in_legal', 'in_collection', 'digital_shared', 'returned'];
  const HOLDERS = ['archive', 'legal', 'collection', 'governance', 'securitization', 'bank'];
  const TRANSITIONS = {
    archived: ['requested', 'digital_shared'],
    requested: ['transferred', 'archived'],
    transferred: ['in_legal', 'in_collection', 'returned'],
    in_legal: ['returned', 'digital_shared'],
    in_collection: ['returned', 'digital_shared'],
    digital_shared: ['archived', 'requested'],
    returned: ['archived']
  };

  function $(id){ return document.getElementById(id); }
  function status(msg, type='info'){
    if(!els.statusBox) return;
    els.statusBox.className = `alert alert-${type}`;
    els.statusBox.textContent = msg;
  }
  function escapeHtml(v){
    return (v || '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function normalizeText(v){ return (v || '').toString().trim(); }

  function setSearchSummary(text){
    if (els.searchSummary) els.searchSummary.textContent = text;
  }

  function logSearchActivity(field, query, resultsCount, source = 'manual_search'){
    if (!window.activityLogger) return;
    try {
      window.activityLogger.logFileSearch(query || 'empty', resultsCount, `client_files_${field}_${source}`);
    } catch (_) {}
  }

  function logOpenActivity(file){
    if (!window.activityLogger || !file) return;
    try {
      window.activityLogger.logFileOpen(file.id || file.fileNumber || file.barcode, file.clientName || file.fileNumber || 'client_file', 'client-files-page');
    } catch (_) {}
  }

  function generateBarcode(clientId, contractNumber, caseNumber){
    const seed = `${clientId}-${contractNumber}-${caseNumber}`.replace(/\s+/g, '').toUpperCase();
    const t = Date.now().toString().slice(-6);
    return `CF-${seed}-${t}`;
  }

  async function ensureAuth(){
    return new Promise((resolve, reject) => {
      if(window.auth && window.auth.currentUser){
        resolve(window.auth.currentUser);
        return;
      }
      const timeout = setTimeout(() => reject(new Error('auth-timeout')), 12000);
      window.addEventListener('firebaseAuthReady', () => {
        clearTimeout(timeout);
        resolve(window.auth?.currentUser || null);
      }, { once: true });
    });
  }

  async function loadClients(){
    const snap = await window.db.collection('clients').orderBy('createdAt', 'desc').limit(300).get();
    state.clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderClients();
    renderClientOptions();
  }

  async function loadClientFiles(){
    const snap = await window.db.collection('client_files').orderBy('createdAt', 'desc').limit(500).get();
    state.clientFiles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.filteredClientFiles = [...state.clientFiles];
    renderClientFiles(state.filteredClientFiles);
  }

  function canTransition(fromStatus, toStatus){
    if(!fromStatus || !toStatus) return false;
    if(fromStatus === toStatus) return true;
    return (TRANSITIONS[fromStatus] || []).includes(toStatus);
  }

  function deriveLock(statusValue, holder, requestType){
    if(requestType === 'digital' && statusValue === 'digital_shared') return false;
    if(holder !== 'archive') return true;
    if(statusValue === 'transferred' || statusValue === 'in_legal' || statusValue === 'in_collection') return true;
    return false;
  }

  function validateTransition(file, nextStatus, nextHolder, requestType){
    if(!STATUSES.includes(nextStatus)) return 'حالة الملف غير صالحة';
    if(!HOLDERS.includes(nextHolder)) return 'القسم الحالي غير صالح';
    if(requestType !== 'physical' && requestType !== 'digital') return 'نوع الطلب غير صالح';
    if(!canTransition(file.status, nextStatus)) return `انتقال غير مسموح من ${file.status} إلى ${nextStatus}`;
    if(nextStatus === 'requested' && file.currentHolder !== 'archive') return 'لا يمكن طلب أصل جديد والملف خارج الأرشيف';
    if(nextStatus === 'requested' && nextHolder !== 'archive') return 'طلب الأصل يجب أن يبقى في الأرشيف حتى التسليم';
    if(requestType === 'digital' && nextStatus !== 'digital_shared' && nextStatus !== file.status) {
      return 'الطلب الرقمي يسمح فقط بالانتقال إلى digital_shared';
    }
    if(requestType === 'digital' && nextStatus === 'digital_shared' && nextHolder !== 'archive') {
      return 'الطلب الرقمي لا يخرج الأصل من الأرشيف';
    }
    return null;
  }

  function renderClients(){
    const body = els.clientsTable.querySelector('tbody');
    body.innerHTML = '';
    state.clients.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${c.name || '-'}</td><td>${c.clientId || '-'}</td><td>${c.nationalId || '-'}</td><td><button class="btn btn-sm btn-outline-danger" data-del-client="${c.id}">حذف</button></td>`;
      body.appendChild(tr);
    });
  }

  function renderClientFiles(list = state.filteredClientFiles){
    const body = els.clientFilesTable.querySelector('tbody');
    body.innerHTML = '';
    list.forEach((f) => {
      const nextStatusOptions = [f.status, ...(TRANSITIONS[f.status] || [])]
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join('');
      const holderOptions = HOLDERS
        .map((value) => `<option value="${escapeHtml(value)}" ${value === f.currentHolder ? 'selected' : ''}>${escapeHtml(value)}</option>`)
        .join('');
      const tr = document.createElement('tr');
      tr.id = `client-file-row-${f.id}`;
      tr.innerHTML = `<td>${escapeHtml(f.barcode || '-')}</td><td>${escapeHtml(f.fileNumber || '-')}</td><td>${escapeHtml(f.clientName || '-')}</td><td>${escapeHtml(f.clientId || '-')}</td><td>${escapeHtml(f.contractNumber || '-')}</td><td>${escapeHtml(f.caseNumber || '-')}</td><td>${escapeHtml(f.status || '-')}</td><td>${escapeHtml(f.currentHolder || '-')}</td><td><span class="badge ${f.locked ? 'bg-danger' : 'bg-success'}">${f.locked ? 'true' : 'false'}</span></td><td><div class="d-flex gap-1"><select class="form-select form-select-sm" data-next-status="${f.id}">${nextStatusOptions}</select><select class="form-select form-select-sm" data-next-holder="${f.id}">${holderOptions}</select><select class="form-select form-select-sm" data-request-type="${f.id}"><option value="physical">physical</option><option value="digital">digital</option></select><button class="btn btn-sm btn-outline-primary" data-apply-transition="${f.id}">تطبيق</button></div></td><td><div class="d-flex gap-1"><button class="btn btn-sm btn-outline-success" data-open-client-file="${f.id}">فتح</button><button class="btn btn-sm btn-outline-danger" data-del-client-file="${f.id}">حذف</button></div></td>`;
      body.appendChild(tr);
    });
  }

  async function queryClientFilesByField(field, value){
    const trimmed = normalizeText(value);
    if (!trimmed) return [...state.clientFiles];

    let query;
    if (field === 'clientName') {
      query = window.db.collection('client_files')
        .where('clientName', '>=', trimmed)
        .where('clientName', '<=', `${trimmed}\uf8ff`)
        .limit(200);
    } else {
      query = window.db.collection('client_files')
        .where(field, '==', trimmed)
        .limit(200);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  function getSearchCriteria(){
    return {
      field: normalizeText(els.searchField?.value) || 'barcode',
      value: normalizeText(els.searchValue?.value)
    };
  }

  function focusClientFileRow(clientFileId){
    const row = document.getElementById(`client-file-row-${clientFileId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('client-file-row-focus');
    row.classList.add('table-warning');
    setTimeout(() => {
      row.classList.remove('client-file-row-focus');
      row.classList.remove('table-warning');
    }, 2600);
  }

  function openClientFile(file, source = 'search'){
    if (!file) {
      status('لم يتم العثور على ملف لفتحه', 'warning');
      return;
    }
    focusClientFileRow(file.id);
    logOpenActivity(file);
    status(`تم فتح ملف العميل: ${file.clientName || '-'} | ${file.fileNumber || file.barcode || '-'}`, 'success');
    setSearchSummary(`المصدر: ${source} | الملف: ${file.fileNumber || file.barcode || '-'} | العميل: ${file.clientName || '-'}`);
  }

  async function searchClientFiles(e){
    if (e && e.preventDefault) e.preventDefault();
    const { field, value } = getSearchCriteria();
    try {
      if (!value) {
        state.filteredClientFiles = [...state.clientFiles];
        renderClientFiles(state.filteredClientFiles);
        setSearchSummary(`تم عرض جميع الملفات (${state.filteredClientFiles.length}).`);
        logSearchActivity(field, 'all', state.filteredClientFiles.length);
        return;
      }

      const results = await queryClientFilesByField(field, value);
      state.filteredClientFiles = results;
      renderClientFiles(state.filteredClientFiles);
      setSearchSummary(`نتائج البحث (${field}): ${results.length}`);
      logSearchActivity(field, value, results.length);

      if (!results.length) {
        status('لا توجد نتائج مطابقة.', 'warning');
      } else {
        status(`تم العثور على ${results.length} نتيجة.`, 'success');
      }
    } catch (error) {
      console.error('searchClientFiles error:', error);
      status(`تعذر تنفيذ البحث: ${error.message}`, 'danger');
    }
  }

  async function clearSearch(){
    if (els.searchValue) els.searchValue.value = '';
    if (els.searchField) els.searchField.value = 'barcode';
    state.filteredClientFiles = [...state.clientFiles];
    renderClientFiles(state.filteredClientFiles);
    setSearchSummary(`تمت إعادة تعيين البحث. عدد الملفات: ${state.filteredClientFiles.length}`);
  }

  function openFirstSearchResult(){
    const first = state.filteredClientFiles[0] || null;
    if (!first) {
      status('لا توجد نتائج لفتحها.', 'warning');
      return;
    }
    openClientFile(first, 'first_result');
  }

  function parseScannedCode(raw){
    const input = normalizeText(raw);
    if (!input) return '';
    try {
      const parsed = JSON.parse(input);
      return normalizeText(parsed.barcode || parsed.fileNumber || parsed.code || input);
    } catch (_) {
      return input;
    }
  }

  async function findClientFileByCode(code){
    const normalizedCode = parseScannedCode(code);
    if (!normalizedCode) return null;

    const localHit = state.clientFiles.find((f) =>
      normalizeText(f.barcode) === normalizedCode || normalizeText(f.fileNumber) === normalizedCode
    );
    if (localHit) return localHit;

    let snap = await window.db.collection('client_files').where('barcode', '==', normalizedCode).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

    snap = await window.db.collection('client_files').where('fileNumber', '==', normalizedCode).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

    return null;
  }

  function setScanStatus(text, type = 'info'){
    if (!els.scanStatusBox) return;
    els.scanStatusBox.className = `alert alert-${type}`;
    els.scanStatusBox.textContent = text;
  }

  async function startBarcodeScanner(){
    if (!window.Html5Qrcode) {
      setScanStatus('مكتبة المسح غير متاحة.', 'danger');
      return;
    }
    if (state.scannerRunning) return;

    try {
      if (!state.scannerCameras.length) {
        state.scannerCameras = await Html5Qrcode.getCameras();
      }
      const cam = state.scannerCameras[state.scannerCameraIndex] || null;
      if (!cam) {
        setScanStatus('لا توجد كاميرا متاحة.', 'danger');
        return;
      }

      if (!state.scanner) state.scanner = new Html5Qrcode('clientFileScanVideo');
      await state.scanner.start(
        cam.id,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await handleScannedBarcode(decodedText);
        }
      );

      state.scannerRunning = true;
      if (els.startBarcodeScanBtn) els.startBarcodeScanBtn.disabled = true;
      if (els.stopBarcodeScanBtn) els.stopBarcodeScanBtn.disabled = false;
      setScanStatus('جاري المسح...', 'info');
    } catch (error) {
      console.error('startBarcodeScanner error:', error);
      setScanStatus('تعذر تشغيل الكاميرا. تحقق من الأذونات.', 'danger');
    }
  }

  async function stopBarcodeScanner(){
    try {
      if (state.scanner && state.scannerRunning) {
        await state.scanner.stop();
        await state.scanner.clear();
      }
    } catch (_) {}

    state.scanner = null;
    state.scannerRunning = false;
    if (els.startBarcodeScanBtn) els.startBarcodeScanBtn.disabled = false;
    if (els.stopBarcodeScanBtn) els.stopBarcodeScanBtn.disabled = true;
    setScanStatus('تم إيقاف المسح.', 'secondary');
  }

  async function switchBarcodeCamera(){
    if (!state.scannerCameras.length || state.scannerCameras.length === 1) return;
    state.scannerCameraIndex = (state.scannerCameraIndex + 1) % state.scannerCameras.length;
    if (state.scannerRunning) {
      await stopBarcodeScanner();
      await startBarcodeScanner();
    }
  }

  async function handleScannedBarcode(decodedText){
    const code = parseScannedCode(decodedText);
    if (els.lastScannedCode) els.lastScannedCode.textContent = code || '-';
    if (els.searchField) els.searchField.value = 'barcode';
    if (els.searchValue) els.searchValue.value = code;

    logSearchActivity('barcode', code, 0, 'scan');

    const found = await findClientFileByCode(code);
    if (!found) {
      setScanStatus('لم يتم العثور على ملف بهذا الباركود.', 'warning');
      status('لم يتم العثور على ملف مطابق للباركود.', 'warning');
      return;
    }

    state.filteredClientFiles = [found];
    renderClientFiles(state.filteredClientFiles);
    openClientFile(found, 'barcode_scan');
    setScanStatus('تم العثور على الملف وفتحه.', 'success');

    try {
      if (window.activityLogger) {
        window.activityLogger.logQRScan(code, true, 'client_file_open');
      }
    } catch (_) {}

    await stopBarcodeScanner();
    if (window.bootstrap && els.scanBarcodeModal) {
      const modalInstance = bootstrap.Modal.getOrCreateInstance(els.scanBarcodeModal);
      modalInstance.hide();
    }
  }

  function renderClientOptions(){
    els.clientRef.innerHTML = '<option value="">اختر العميل</option>';
    state.clients.forEach((c) => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = `${c.name} - ${c.clientId}`;
      option.dataset.clientId = c.clientId || '';
      option.dataset.clientName = c.name || '';
      option.dataset.nationalId = c.nationalId || '';
      els.clientRef.appendChild(option);
    });
  }

  async function createClient(e){
    e.preventDefault();
    const name = normalizeText(els.clientName.value);
    const clientId = normalizeText(els.clientId.value);
    const nationalId = normalizeText(els.clientNationalId.value);
    const notes = normalizeText(els.clientNotes.value);
    if(!name || !clientId){ status('بيانات العميل ناقصة', 'danger'); return; }

    await window.db.collection('clients').add({
      name,
      nameNormalized: name.toLowerCase(),
      clientId,
      nationalId,
      notes,
      status: 'active',
      isActive: true,
      createdBy: state.user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    els.clientForm.reset();
    await loadClients();
    status('تم إنشاء العميل بنجاح', 'success');
  }

  async function createClientFile(e){
    e.preventDefault();
    const clientRef = els.clientRef.value;
    const selected = els.clientRef.options[els.clientRef.selectedIndex];
    const contractNumber = normalizeText(els.contractNumber.value);
    const caseNumber = normalizeText(els.caseNumber.value);
    const nationalId = normalizeText(els.clientFileNationalId.value) || selected?.dataset.nationalId || '';
    const currentHolder = 'archive';
    const statusValue = 'archived';

    if(!clientRef || !contractNumber || !caseNumber){ status('بيانات ملف العميل ناقصة', 'danger'); return; }

    const clientId = selected?.dataset.clientId || '';
    const clientName = selected?.dataset.clientName || '';
    const fileNumber = `${clientId || 'CLIENT'}-${Date.now()}`;
    const barcode = generateBarcode(clientId, contractNumber, caseNumber);

    await window.db.collection('client_files').add({
      clientRef,
      clientId,
      clientName,
      fileNumber,
      barcode,
      nationalId,
      contractNumber,
      caseNumber,
      status: statusValue,
      currentHolder,
      locked: false,
      requestType: 'physical',
      lastTransitionBy: state.user.uid,
      lastTransitionAt: firebase.firestore.FieldValue.serverTimestamp(),
      notes: '',
      createdBy: state.user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    els.clientFileForm.reset();
    await loadClientFiles();
    status('تم إنشاء ملف العميل بنجاح', 'success');
  }

  async function deleteClient(id){
    await window.db.collection('clients').doc(id).delete();
    await loadClients();
    status('تم حذف العميل', 'warning');
  }

  async function deleteClientFile(id){
    await window.db.collection('client_files').doc(id).delete();
    await loadClientFiles();
    status('تم حذف ملف العميل', 'warning');
  }

  async function applyTransition(clientFileId){
    const file = state.clientFiles.find((item) => item.id === clientFileId);
    if(!file){ status('لم يتم العثور على ملف العميل', 'danger'); return; }

    const nextStatus = normalizeText(document.querySelector(`[data-next-status="${clientFileId}"]`)?.value);
    const nextHolder = normalizeText(document.querySelector(`[data-next-holder="${clientFileId}"]`)?.value);
    const requestType = normalizeText(document.querySelector(`[data-request-type="${clientFileId}"]`)?.value);

    const error = validateTransition(file, nextStatus, nextHolder, requestType);
    if(error){ status(error, 'danger'); return; }

    const nextLocked = deriveLock(nextStatus, nextHolder, requestType);
    await window.db.collection('client_files').doc(clientFileId).update({
      status: nextStatus,
      currentHolder: nextHolder,
      requestType,
      locked: nextLocked,
      lastTransitionBy: state.user.uid,
      lastTransitionAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadClientFiles();
    status('تم تطبيق انتقال الحالة بنجاح', 'success');
  }

  function bindEvents(){
    els.clientForm.addEventListener('submit', createClient);
    els.clientFileForm.addEventListener('submit', createClientFile);
    if (els.clientFileSearchForm) {
      els.clientFileSearchForm.addEventListener('submit', searchClientFiles);
    }
    if (els.clearSearchBtn) {
      els.clearSearchBtn.addEventListener('click', clearSearch);
    }
    if (els.openFirstResultBtn) {
      els.openFirstResultBtn.addEventListener('click', openFirstSearchResult);
    }
    if (els.startBarcodeScanBtn) {
      els.startBarcodeScanBtn.addEventListener('click', startBarcodeScanner);
    }
    if (els.stopBarcodeScanBtn) {
      els.stopBarcodeScanBtn.addEventListener('click', stopBarcodeScanner);
    }
    if (els.switchBarcodeCameraBtn) {
      els.switchBarcodeCameraBtn.addEventListener('click', switchBarcodeCamera);
    }
    els.refreshBtn.addEventListener('click', async () => {
      await Promise.all([loadClients(), loadClientFiles()]);
      setSearchSummary(`تم تحديث البيانات. عدد الملفات: ${state.filteredClientFiles.length}`);
      status('تم التحديث', 'success');
    });

    document.addEventListener('shown.bs.modal', (e) => {
      if (e.target.id === 'scanBarcodeModal') {
        setScanStatus('اضغط بدء المسح لقراءة الباركود.', 'info');
      }
    });

    document.addEventListener('hide.bs.modal', async (e) => {
      if (e.target.id === 'scanBarcodeModal') {
        await stopBarcodeScanner();
      }
    });

    document.addEventListener('click', async (e) => {
      const delClient = e.target.closest('[data-del-client]');
      if(delClient){ await deleteClient(delClient.getAttribute('data-del-client')); }
      const delClientFile = e.target.closest('[data-del-client-file]');
      if(delClientFile){ await deleteClientFile(delClientFile.getAttribute('data-del-client-file')); }
      const transitionBtn = e.target.closest('[data-apply-transition]');
      if(transitionBtn){ await applyTransition(transitionBtn.getAttribute('data-apply-transition')); }
      const openBtn = e.target.closest('[data-open-client-file]');
      if(openBtn){
        const id = openBtn.getAttribute('data-open-client-file');
        const file = state.clientFiles.find((item) => item.id === id);
        openClientFile(file, 'table_action');
      }
    });
  }

  async function bootstrap(){
    els.statusBox = $('statusBox');
    els.clientForm = $('clientForm');
    els.clientFileForm = $('clientFileForm');
    els.clientName = $('clientName');
    els.clientId = $('clientId');
    els.clientNationalId = $('clientNationalId');
    els.clientNotes = $('clientNotes');
    els.clientRef = $('clientRef');
    els.contractNumber = $('contractNumber');
    els.caseNumber = $('caseNumber');
    els.clientFileNationalId = $('clientFileNationalId');
    els.currentHolder = $('currentHolder');
    els.fileStatus = $('fileStatus');
    els.clientsTable = $('clientsTable');
    els.clientFilesTable = $('clientFilesTable');
    els.refreshBtn = $('refreshBtn');
    els.clientFileSearchForm = $('clientFileSearchForm');
    els.searchField = $('searchField');
    els.searchValue = $('searchValue');
    els.searchSummary = $('searchSummary');
    els.clearSearchBtn = $('clearSearchBtn');
    els.openFirstResultBtn = $('openFirstResultBtn');
    els.scanBarcodeModal = $('scanBarcodeModal');
    els.scanStatusBox = $('scanStatusBox');
    els.startBarcodeScanBtn = $('startBarcodeScanBtn');
    els.stopBarcodeScanBtn = $('stopBarcodeScanBtn');
    els.switchBarcodeCameraBtn = $('switchBarcodeCameraBtn');
    els.lastScannedCode = $('lastScannedCode');

    state.user = await ensureAuth();
    if(!state.user){ status('يرجى تسجيل الدخول أولاً', 'danger'); return; }

    bindEvents();
    await Promise.all([loadClients(), loadClientFiles()]);
    setSearchSummary(`تم تحميل ${state.filteredClientFiles.length} ملف عميل.`);
    status('تم تحميل بيانات العملاء وملفاتهم', 'success');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
