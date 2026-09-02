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
    transferRequests: [],
    transfers: [],
    initialized: false
  };

  const departmentNames = {
    archive: 'الأرشيف',
    legal: 'الشؤون القانونية',
    governance: 'الحوكمة والامتثال',
    collection: 'إدارة التحصيل',
    securitization: 'إدارة التوريق',
    bank: 'البنك'
  };
  const statusNames = {
    in_archive: 'في الأرشيف',
    transferred: 'تم النقل',
    received: 'تم الاستلام',
    in_transit: 'في الطريق',
    requested: 'مطلوب',
    in_legal: 'قيد المراجعة القانونية',
    in_collection: 'قيد التحصيل',
    digital_shared: 'مشاركة رقمية',
    returned: 'تم الإرجاع',
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    dispatched: 'تم الإرسال',
    completed: 'مكتمل'
  };

  const clientFileTransitions = {
    archived: ['requested', 'digital_shared'],
    requested: ['transferred', 'archived'],
    transferred: ['in_legal', 'in_collection', 'returned'],
    in_legal: ['returned', 'digital_shared'],
    in_collection: ['returned', 'digital_shared'],
    digital_shared: ['archived', 'requested'],
    returned: ['archived']
  };

  function log(){ console.log('[file-tracking]', ...arguments); }

  function escapeHtml(value){
    return (value || '').toString().replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function normalizeRole(role){
    if (window.AuthConstants && typeof window.AuthConstants.normalizeRole === 'function') {
        return window.AuthConstants.normalizeRole(role);
    }
    const r = (role || '').toString().trim().toLowerCase();
    const map = {
      admin: 'admin',
      system_admin: 'super_admin',
      'system-admin': 'super_admin',
      super_admin: 'super_admin',
      'super-admin': 'super_admin',
      archive_officer: 'archive_officer',
      'archive-officer': 'archive_officer',
      department_admin: 'department_admin',
      'department-admin': 'department_admin',
      manager: 'department_admin',
      user: 'viewer'
    };
    return map[r] || r;
  }

  function getCurrentUserRole(){
    return normalizeRole(state.authSystem?.getCurrentUserRole?.() || state.authSystem?.profile?.role || '');
  }

  function getCurrentUserDepartment(){
    return (state.authSystem?.profile?.departmentId || state.authSystem?.profile?.department || 'archive').toString().trim().toLowerCase();
  }

  function canReviewRequests(){
    const role = getCurrentUserRole();
    return ['admin', 'archive_officer', 'department_admin', 'supervisor'].includes(role);
  }

  function safeClone(value){
    try { return JSON.parse(JSON.stringify(value)); } catch { return value || null; }
  }

  function logAudit(action, details = {}, priority = 'normal', options = {}){
    if (!window.activityLogger) return;
    try {
      window.activityLogger.logCustomActivity('audit', action, details, priority, {
        eventType: options.eventType || `file_tracking.${action}`,
        severity: options.severity,
        entityType: options.entityType,
        entityId: options.entityId,
        before: options.before,
        after: options.after,
        outcome: options.outcome || 'success'
      });
    } catch (_) {}
  }

  function generateSecureToken(length = 40){
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(length);
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(v => chars[v % chars.length]).join('');
    }
    let token = '';
    for (let i = 0; i < length; i += 1) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  }

  function getViewerUrl(token){
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}`;
    return `${base}secure-viewer.html?token=${encodeURIComponent(token)}`;
  }

  function canClientFileTransition(fromStatus, toStatus){
    if (!fromStatus || !toStatus) return false;
    if (fromStatus === toStatus) return true;
    return (clientFileTransitions[fromStatus] || []).includes(toStatus);
  }

  function deriveClientLifecycleForMovement(movementStatus, targetDepartment){
    if (movementStatus === 'in_transit') {
      return {
        status: 'transferred',
        currentHolder: targetDepartment,
        locked: targetDepartment !== 'archive',
        requestType: 'physical'
      };
    }

    if (movementStatus === 'received') {
      if (targetDepartment === 'archive') {
        return { status: 'returned', currentHolder: 'archive', locked: false, requestType: 'physical' };
      }
      if (targetDepartment === 'legal') {
        return { status: 'in_legal', currentHolder: 'legal', locked: true, requestType: 'physical' };
      }
      if (targetDepartment === 'collection' || targetDepartment === 'governance' || targetDepartment === 'securitization') {
        return { status: 'in_collection', currentHolder: targetDepartment, locked: true, requestType: 'physical' };
      }
      return { status: 'transferred', currentHolder: targetDepartment, locked: true, requestType: 'physical' };
    }

    return null;
  }

  async function getClientFileDocByFileNumber(fileNumber){
    const q = await window.db.collection('client_files').where('fileNumber', '==', fileNumber).limit(1).get();
    if (q.empty) return null;
    return q.docs[0];
  }

  async function applyClientFileTransitionForMovement(fileNumber, movementStatus, targetDepartment, user){
    const clientFileDoc = await getClientFileDocByFileNumber(fileNumber);
    if (!clientFileDoc) return null;

    const clientData = clientFileDoc.data() || {};
    const desired = deriveClientLifecycleForMovement(movementStatus, targetDepartment);
    if (!desired) {
      throw new Error('تعذر تحديد حالة ملف العميل المناسبة للحركة الحالية');
    }

    const patches = [];
    if (clientData.status === 'archived' && desired.status === 'transferred') {
      patches.push({
        status: 'requested',
        requestType: 'physical',
        currentHolder: clientData.currentHolder || 'archive',
        locked: !!clientData.locked
      });
    }
    patches.push(desired);

    for (const patch of patches) {
      const currentSnap = await clientFileDoc.ref.get();
      const currentData = currentSnap.data() || {};
      if (!canClientFileTransition(currentData.status, patch.status)) {
        throw new Error(`انتقال غير مسموح لملف العميل من ${currentData.status} إلى ${patch.status}`);
      }
      if (patch.status === 'requested' && currentData.currentHolder !== 'archive') {
        throw new Error('لا يمكن طلب أصل جديد والملف خارج الأرشيف');
      }

      await clientFileDoc.ref.update({
        status: patch.status,
        currentHolder: patch.currentHolder,
        locked: patch.locked,
        requestType: patch.requestType,
        lastTransitionBy: user.uid,
        lastTransitionAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    return clientFileDoc.id;
  }

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
    initializeTransferWorkflow();
    // initial load after auth established will be triggered via auth listener
  }

  function initializeTransferWorkflow(){
    const form = document.getElementById('transferRequestForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createTransferRequest();
      });
    }
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
      state.sidebarManager = window.sidebarManager || null;
      if (window.unifiedUI && typeof window.unifiedUI.updateSidebar === 'function') {
        window.unifiedUI.updateSidebar();
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
        if(!u){
          if (window.__ALLOW_GUEST_ACCESS__) {
            log('Smoke mode active - skip auth redirect');
            return;
          }
          window.location.href = 'login.html?message=unauthorized';
        }
      },10000);
      return;
    }
    state.currentUser = user;
    await waitForFirebase();
    await checkPermissions();
    if (window.activityLogger){
      window.activityLogger.logSystemAccess('file-tracking','file_movement_tracking');
    }
    await Promise.all([
      loadClientFileOptionsForRequests(),
      loadTransferRequests(),
      loadTransfers(),
      loadFileMovements()
    ]);
  }

  async function loadClientFileOptionsForRequests(){
    const select = document.getElementById('requestClientFileId');
    if (!select || !window.db) return;
    const snap = await window.db.collection('client_files').orderBy('createdAt', 'desc').limit(300).get();
    const options = ['<option value="">اختر ملف العميل</option>'];
    snap.docs.forEach(doc => {
      const data = doc.data() || {};
      options.push(`<option value="${doc.id}" data-file-number="${escapeHtml(data.fileNumber || '')}" data-holder="${escapeHtml(data.currentHolder || 'archive')}" data-status="${escapeHtml(data.status || 'archived')}">${escapeHtml(data.fileNumber || doc.id)} | ${escapeHtml(data.clientName || 'عميل')} | ${escapeHtml(data.status || 'archived')}</option>`);
    });
    select.innerHTML = options.join('');
  }

  function renderTransferRequests(){
    const table = document.getElementById('transferRequestsTable');
    if (!table) return;
    const body = table.querySelector('tbody');
    if (!body) return;
    const canReview = canReviewRequests();
    body.innerHTML = '';

    state.transferRequests.forEach((req) => {
      const statusText = statusNames[req.status] || req.status;
      const fromName = departmentNames[req.fromDepartment] || req.fromDepartment;
      const toName = departmentNames[req.toDepartment] || req.toDepartment;
      const actions = [];

      if (canReview && req.status === 'pending') {
        actions.push(`<button class="btn btn-sm btn-outline-success" data-ft-action="approve-request" data-request-id="${req.id}">Approve</button>`);
        actions.push(`<button class="btn btn-sm btn-outline-danger" data-ft-action="reject-request" data-request-id="${req.id}">Reject</button>`);
      }
      if (canReview && req.requestType === 'physical' && req.status === 'approved') {
        actions.push(`<button class="btn btn-sm btn-outline-primary" data-ft-action="dispatch-request" data-request-id="${req.id}">Dispatch</button>`);
      }
      if (canReview && req.requestType === 'physical' && req.status === 'dispatched') {
        actions.push(`<button class="btn btn-sm btn-outline-success" data-ft-action="receive-request" data-request-id="${req.id}">Receive</button>`);
      }
      if (canReview && req.requestType === 'physical' && req.status === 'received') {
        actions.push(`<button class="btn btn-sm btn-outline-secondary" data-ft-action="return-request" data-request-id="${req.id}">Return</button>`);
      }
      if (req.requestType === 'digital' && req.shareUrl) {
        actions.push(`<button class="btn btn-sm btn-outline-primary" data-ft-action="open-share-link" data-share-url="${escapeHtml(req.shareUrl)}">Open</button>`);
        actions.push(`<button class="btn btn-sm btn-outline-dark" data-ft-action="copy-share-link" data-share-url="${escapeHtml(req.shareUrl)}">Copy</button>`);
      }

      const row = document.createElement('tr');
      row.innerHTML = `<td>${escapeHtml(req.fileNumber || '-')}</td><td>${escapeHtml(req.requestType || '-')}</td><td>${escapeHtml(fromName || '-')}</td><td>${escapeHtml(toName || '-')}</td><td>${escapeHtml(statusText || '-')}</td><td>${escapeHtml(req.createdByName || req.createdBy || '-')}</td><td><div class="d-flex gap-1 flex-wrap">${actions.join('') || '<span class="text-muted">-</span>'}</div></td>`;
      body.appendChild(row);
    });
  }

  function renderTransfers(){
    const table = document.getElementById('transfersTable');
    if (!table) return;
    const body = table.querySelector('tbody');
    if (!body) return;
    body.innerHTML = '';
    state.transfers.forEach((t) => {
      const ts = t.timestamp ? (t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)) : null;
      const tsText = ts ? ts.toLocaleString('ar-SA') : '-';
      const row = document.createElement('tr');
      row.innerHTML = `<td>${escapeHtml(t.requestId || '-')}</td><td>${escapeHtml(t.fileNumber || '-')}</td><td>${escapeHtml(t.action || '-')}</td><td>${escapeHtml(departmentNames[t.fromDepartment] || t.fromDepartment || '-')}</td><td>${escapeHtml(departmentNames[t.toDepartment] || t.toDepartment || '-')}</td><td>${escapeHtml(statusNames[t.status] || t.status || '-')}</td><td>${escapeHtml(t.actorName || t.actorEmail || t.actorId || '-')}</td><td>${escapeHtml(tsText)}</td>`;
      body.appendChild(row);
    });
  }

  async function loadTransferRequests(){
    if (!window.db) return;
    const snap = await window.db.collection('transfer_requests').orderBy('createdAt', 'desc').limit(200).get();
    state.transferRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTransferRequests();
  }

  async function loadTransfers(){
    if (!window.db) return;
    const snap = await window.db.collection('transfers').orderBy('timestamp', 'desc').limit(300).get();
    state.transfers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTransfers();
  }

  async function createTransferRecord(payload){
    await window.db.collection('transfers').add({
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function createSecureSharedLinkForRequest(requestId, requestData, user){
    const token = generateSecureToken(40);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (48 * 60 * 60 * 1000));

    const docQuery = await window.db.collection('documents')
      .where('clientFileId', '==', requestData.clientFileId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (docQuery.empty) {
      throw new Error('لا يوجد مستند مرتبط بملف العميل للمشاركة الرقمية');
    }

    const documentDoc = docQuery.docs[0];
    const documentData = documentDoc.data() || {};
    if (!documentData.downloadURL) {
      throw new Error('المستند لا يحتوي على رابط عرض صالح');
    }

    const sharedLinkData = {
      requestId,
      requestType: 'digital',
      clientFileId: requestData.clientFileId,
      fileNumber: requestData.fileNumber,
      documentId: documentDoc.id,
      documentTitle: documentData.title || documentData.fileName || requestData.fileNumber || 'Document',
      documentCategory: documentData.category || 'other',
      contentType: documentData.contentType || 'application/pdf',
      filePath: documentData.filePath || '',
      downloadURL: documentData.downloadURL,
      toDepartment: requestData.toDepartment,
      bankName: requestData.toDepartment === 'bank' ? 'Bank' : 'Securitization',
      viewOnly: true,
      allowDownload: false,
      allowPrint: false,
      allowEdit: false,
      watermarkEnabled: true,
      active: true,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      lastAccessAt: null,
      accessCount: 0
    };

    await window.db.collection('shared_links').doc(token).set(sharedLinkData);
    return {
      token,
      shareUrl: getViewerUrl(token),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt)
    };
  }

  async function updateClientFileForRequest(clientFileId, nextStatus, nextHolder, requestType, user){
    const ref = window.db.collection('client_files').doc(clientFileId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('ملف العميل غير موجود');
    const current = snap.data() || {};
    const beforeState = {
      status: current.status || null,
      currentHolder: current.currentHolder || null,
      requestType: current.requestType || null,
      locked: !!current.locked
    };
    if (!canClientFileTransition(current.status, nextStatus)) {
      throw new Error(`انتقال غير مسموح من ${current.status} إلى ${nextStatus}`);
    }

    let locked = false;
    if (requestType === 'digital' && nextStatus === 'digital_shared') {
      locked = false;
    } else if (['transferred', 'in_legal', 'in_collection'].includes(nextStatus) && nextHolder !== 'archive') {
      locked = true;
    }

    const afterState = {
      status: nextStatus,
      currentHolder: nextHolder,
      requestType,
      locked
    };

    await ref.update({
      status: nextStatus,
      currentHolder: nextHolder,
      requestType,
      locked,
      lastTransitionBy: user.uid,
      lastTransitionAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    logAudit('client_file_transition', {
      clientFileId,
      fileNumber: current.fileNumber || '',
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid,
      reason: 'workflow_request_transition'
    }, 'high', {
      eventType: 'client_file.transition',
      severity: 'high',
      entityType: 'client_file',
      entityId: clientFileId,
      before: beforeState,
      after: afterState
    });

    return { ...current, fileNumber: current.fileNumber || '', clientName: current.clientName || '' };
  }

  async function createTransferRequest(){
    const user = await requireAuthOrRedirect();
    const select = document.getElementById('requestClientFileId');
    const requestType = document.getElementById('requestType')?.value;
    const toDepartment = document.getElementById('requestToDepartment')?.value;
    const notes = document.getElementById('requestNotes')?.value?.trim() || '';
    const clientFileId = select?.value || '';
    const selectedOption = select?.options?.[select.selectedIndex];

    if (!clientFileId || !requestType || !toDepartment) {
      notify('يرجى استكمال بيانات الطلب', 'error');
      return;
    }

    const fileNumber = selectedOption?.getAttribute('data-file-number') || '';
    const fromDepartment = selectedOption?.getAttribute('data-holder') || getCurrentUserDepartment() || 'archive';

    if (requestType === 'physical' && toDepartment === 'archive') {
      notify('الطلب الفيزيائي يجب أن يكون لقسم غير الأرشيف', 'error');
      return;
    }

    if (requestType === 'digital' && !['bank', 'securitization'].includes(toDepartment)) {
      notify('المشاركة الرقمية في هذه المرحلة مخصصة للبنك أو التوريق فقط', 'error');
      return;
    }

    await window.db.collection('transfer_requests').add({
      requestType,
      clientFileId,
      fileNumber,
      fromDepartment,
      toDepartment,
      status: 'pending',
      notes,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    logAudit('request_create', {
      requestType,
      clientFileId,
      fileNumber,
      fromDepartment,
      toDepartment,
      createdBy: user.uid
    }, 'normal', {
      eventType: 'transfer_request.create',
      severity: 'medium',
      entityType: 'transfer_request',
      entityId: clientFileId
    });

    document.getElementById('transferRequestForm')?.reset();
    await Promise.all([loadTransferRequests(), loadClientFileOptionsForRequests()]);
    notify('تم إنشاء طلب التحويل', 'success');
  }

  async function reviewTransferRequest(requestId, decision){
    const user = await requireAuthOrRedirect();
    if (!canReviewRequests()) throw new Error('لا تملك صلاحية مراجعة الطلبات');
    const ref = window.db.collection('transfer_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('الطلب غير موجود');
    const data = snap.data();
    const beforeRequest = safeClone(data);
    if (data.status !== 'pending') throw new Error('لا يمكن مراجعة طلب غير معلق');
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';

    await ref.update({
      status: nextStatus,
      reviewedBy: user.uid,
      reviewedByName: user.displayName || user.email || user.uid,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewNotes: decision === 'approve' ? 'Approved' : 'Rejected',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (decision === 'approve' && data.requestType === 'digital') {
      await updateClientFileForRequest(data.clientFileId, 'digital_shared', 'archive', 'digital', user);
      const share = await createSecureSharedLinkForRequest(requestId, data, user);
      await createTransferRecord({
        requestId,
        requestType: 'digital',
        clientFileId: data.clientFileId,
        fileNumber: data.fileNumber,
        action: 'digital_share',
        fromDepartment: 'archive',
        toDepartment: data.toDepartment,
        status: 'completed',
        notes: data.notes || '',
        shareToken: share.token,
        shareUrl: share.shareUrl,
        actorId: user.uid,
        actorName: user.displayName || user.email || user.uid,
        actorEmail: user.email || ''
      });
      await ref.update({
        status: 'completed',
        shareToken: share.token,
        shareUrl: share.shareUrl,
        shareExpiresAt: share.expiresAt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    const afterSnap = await ref.get();
    const afterRequest = safeClone(afterSnap.data() || {});
    logAudit('request_review', {
      requestId,
      decision,
      requestType: data.requestType,
      fileNumber: data.fileNumber,
      reviewerId: user.uid,
      reviewerName: user.displayName || user.email || user.uid
    }, 'high', {
      eventType: 'transfer_request.review',
      severity: 'high',
      entityType: 'transfer_request',
      entityId: requestId,
      before: beforeRequest,
      after: afterRequest
    });

    await Promise.all([loadTransferRequests(), loadTransfers(), loadClientFileOptionsForRequests()]);
    notify(decision === 'approve' ? 'تم اعتماد الطلب' : 'تم رفض الطلب', decision === 'approve' ? 'success' : 'warning');
  }

  async function dispatchTransferRequest(requestId){
    const user = await requireAuthOrRedirect();
    if (!canReviewRequests()) throw new Error('لا تملك صلاحية الإرسال');
    const ref = window.db.collection('transfer_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('الطلب غير موجود');
    const req = snap.data();
    const beforeRequest = safeClone(req);
    if (req.requestType !== 'physical' || req.status !== 'approved') throw new Error('الطلب غير جاهز للإرسال');

    await updateClientFileForRequest(req.clientFileId, 'transferred', req.toDepartment, 'physical', user);
    await createTransferRecord({
      requestId,
      requestType: 'physical',
      clientFileId: req.clientFileId,
      fileNumber: req.fileNumber,
      action: 'dispatch',
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      status: 'in_transit',
      notes: req.notes || '',
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid,
      actorEmail: user.email || ''
    });

    await window.db.collection('file_movements').add({
      fileNumber: req.fileNumber,
      clientFileId: req.clientFileId,
      fileName: req.fileNumber,
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      action: 'transfer',
      status: 'in_transit',
      requestType: 'physical',
      notes: req.notes || '',
      userId: user.uid,
      userEmail: user.email || '',
      userDisplayName: user.displayName || '',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await ref.update({ status: 'dispatched', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    const afterRequest = safeClone((await ref.get()).data() || {});
    logAudit('dispatch', {
      requestId,
      requestType: req.requestType,
      fileNumber: req.fileNumber,
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid
    }, 'high', {
      eventType: 'transfer.dispatch',
      severity: 'high',
      entityType: 'transfer_request',
      entityId: requestId,
      before: beforeRequest,
      after: afterRequest
    });
    await Promise.all([loadTransferRequests(), loadTransfers(), loadFileMovements()]);
    notify('تم إرسال الطلب بنجاح', 'success');
  }

  async function receiveTransferRequest(requestId){
    const user = await requireAuthOrRedirect();
    if (!canReviewRequests()) throw new Error('لا تملك صلاحية الاستلام');
    const ref = window.db.collection('transfer_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('الطلب غير موجود');
    const req = snap.data();
    const beforeRequest = safeClone(req);
    if (req.requestType !== 'physical' || req.status !== 'dispatched') throw new Error('الطلب غير جاهز للاستلام');

    const nextStatus = req.toDepartment === 'legal' ? 'in_legal' : (req.toDepartment === 'collection' || req.toDepartment === 'governance' || req.toDepartment === 'securitization') ? 'in_collection' : 'returned';
    const nextHolder = req.toDepartment || 'archive';
    await updateClientFileForRequest(req.clientFileId, nextStatus, nextHolder, 'physical', user);

    await createTransferRecord({
      requestId,
      requestType: 'physical',
      clientFileId: req.clientFileId,
      fileNumber: req.fileNumber,
      action: 'receive',
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      status: 'received',
      notes: req.notes || '',
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid,
      actorEmail: user.email || ''
    });

    await window.db.collection('file_movements').add({
      fileNumber: req.fileNumber,
      clientFileId: req.clientFileId,
      fileName: req.fileNumber,
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      action: 'receive',
      status: 'received',
      requestType: 'physical',
      notes: req.notes || '',
      userId: user.uid,
      userEmail: user.email || '',
      userDisplayName: user.displayName || '',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await ref.update({ status: 'received', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    const afterRequest = safeClone((await ref.get()).data() || {});
    logAudit('receive', {
      requestId,
      requestType: req.requestType,
      fileNumber: req.fileNumber,
      fromDepartment: req.fromDepartment,
      toDepartment: req.toDepartment,
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid
    }, 'high', {
      eventType: 'transfer.receive',
      severity: 'high',
      entityType: 'transfer_request',
      entityId: requestId,
      before: beforeRequest,
      after: afterRequest
    });
    await Promise.all([loadTransferRequests(), loadTransfers(), loadFileMovements()]);
    notify('تم استلام التحويل', 'success');
  }

  async function returnTransferRequest(requestId){
    const user = await requireAuthOrRedirect();
    if (!canReviewRequests()) throw new Error('لا تملك صلاحية الإرجاع');
    const ref = window.db.collection('transfer_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('الطلب غير موجود');
    const req = snap.data();
    const beforeRequest = safeClone(req);
    if (req.requestType !== 'physical' || req.status !== 'received') throw new Error('الطلب غير جاهز للإرجاع');

    await updateClientFileForRequest(req.clientFileId, 'returned', 'archive', 'physical', user);
    await createTransferRecord({
      requestId,
      requestType: 'physical',
      clientFileId: req.clientFileId,
      fileNumber: req.fileNumber,
      action: 'return',
      fromDepartment: req.toDepartment,
      toDepartment: 'archive',
      status: 'returned',
      notes: req.notes || '',
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid,
      actorEmail: user.email || ''
    });

    await window.db.collection('file_movements').add({
      fileNumber: req.fileNumber,
      clientFileId: req.clientFileId,
      fileName: req.fileNumber,
      fromDepartment: req.toDepartment,
      toDepartment: 'archive',
      action: 'return',
      status: 'received',
      requestType: 'physical',
      notes: req.notes || '',
      userId: user.uid,
      userEmail: user.email || '',
      userDisplayName: user.displayName || '',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await ref.update({ status: 'returned', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    const afterRequest = safeClone((await ref.get()).data() || {});
    logAudit('return', {
      requestId,
      requestType: req.requestType,
      fileNumber: req.fileNumber,
      fromDepartment: req.toDepartment,
      toDepartment: 'archive',
      actorId: user.uid,
      actorName: user.displayName || user.email || user.uid
    }, 'high', {
      eventType: 'transfer.return',
      severity: 'high',
      entityType: 'transfer_request',
      entityId: requestId,
      before: beforeRequest,
      after: afterRequest
    });
    await Promise.all([loadTransferRequests(), loadTransfers(), loadFileMovements()]);
    notify('تم إرجاع الملف إلى الأرشيف', 'success');
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
      if (window.unifiedUI && typeof window.unifiedUI.updateSidebar === 'function') {
        await window.unifiedUI.updateSidebar();
      } else if (state.sidebarManager){
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
        return 0;
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
        return 0;
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
      return docs.length;
    } catch(err){
      console.error('Load error', err);
      container.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>خطأ في تحميل البيانات: ${err.message}</div>`;
      return 0;
    } finally {
      if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-movements-load');
    }
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

  async function searchFileMovements(){
    const fileSearch = document.getElementById('searchFile').value.trim();
    const department = document.getElementById('departmentFilter').value;
    const status = document.getElementById('statusFilter').value;
    const filters = {};
    if (fileSearch) filters.fileNumber = fileSearch;
    if (department) filters.department = department;
    if (status) filters.status = status;
    const resultsCount = await loadFileMovements(filters);
    if (window.activityLogger && (fileSearch || department || status)){
      window.activityLogger.logFileSearch(fileSearch || 'All files', resultsCount, 'file_tracking_filter');
    }
    logAudit('search', {
      query: fileSearch || '',
      department: department || null,
      status: status || null,
      resultsCount
    }, 'normal', {
      eventType: 'file_tracking.search',
      severity: 'low',
      entityType: 'search'
    });
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
      const clientFileId = await updateFileStatus(fileNumber,'in_transit', toDept, user);
      await window.db.collection('file_movements').add({ fileNumber, clientFileId: clientFileId || null, requestType: 'physical', fileName, fromDepartment: fromDept, toDepartment: toDept, action:'transfer', status:'in_transit', notes, userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
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
        const clientFileId = await updateFileStatus(fileNumber,'received', latestMovement.toDepartment, user);
        await window.db.collection('file_movements').add({ fileNumber, clientFileId: clientFileId || latestMovement.clientFileId || null, requestType: 'physical', fileName: latestMovement.fileName, fromDepartment: latestMovement.fromDepartment, toDepartment: latestMovement.toDepartment, action:'receive', status:'received', notes, userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      bootstrap.Modal.getInstance(document.getElementById('receiveFileModal')).hide();
      document.getElementById('receiveFileForm').reset();
      loadFileMovements();
      notify('تم استلام الملف بنجاح','success');
    } catch(err){ console.error('Receive error', err); notify('حدث خطأ في استلام الملف: '+ err.message,'error'); }
    finally { if (window.UX && window.UX.hideLoading) window.UX.hideLoading('file-receive'); submitBtn.disabled = false; submitBtn.innerHTML = original; }
  }

  async function updateFileStatus(fileNumber, status, currentDepartment, user){
    try {
      const clientFileId = await applyClientFileTransitionForMovement(fileNumber, status, currentDepartment, user);
      const docsQuery = await window.db.collection('documents').where('fileNumber','==',fileNumber).limit(1).get();
      if (!docsQuery.empty){ await docsQuery.docs[0].ref.update({ currentStatus: status, currentDepartment, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }); }
      return clientFileId;
    } catch(err){
      console.error('Status update error', err);
      throw err;
    }
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

  async function getFileInfo(fileNumber){
    try {
      if (window.activityLogger){ window.activityLogger.logFileView(fileNumber,'Unknown File'); }
      const clientFileQuery = await window.db.collection('client_files').where('fileNumber','==',fileNumber).limit(1).get();
      if (!clientFileQuery.empty){
        const cf = clientFileQuery.docs[0].data();
        return {
          fileNumber,
          fileName: cf.clientName || 'ملف عميل',
          currentDepartment: cf.currentHolder || 'archive',
          currentStatus: cf.status || 'archived',
          clientFileId: clientFileQuery.docs[0].id
        };
      }

      const docQuery = await window.db.collection('documents').where('fileNumber','==',fileNumber).limit(1).get();
      if (!docQuery.empty){
        const data = docQuery.docs[0].data();
        if (window.activityLogger){ window.activityLogger.logFileView(fileNumber, data.fileName || data.title); }
        return data;
      }

      const moveQuery = await window.db.collection('file_movements').where('fileNumber','==',fileNumber).orderBy('timestamp','desc').limit(1).get();
      if (!moveQuery.empty){
        const mv = moveQuery.docs[0].data();
        return { fileNumber: mv.fileNumber, fileName: mv.fileName, currentDepartment: mv.toDepartment, currentStatus: mv.status, clientFileId: mv.clientFileId || null };
      }

      return { fileNumber, fileName: 'ملف غير معروف', currentDepartment: 'غير محدد', currentStatus: 'غير معروف', clientFileId: null };
    } catch(err){
      console.error('getFileInfo error',err);
      return null;
    }
  }

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
        const clientFileId = await updateFileStatus(scannedFileNumber,'in_transit', toDept, user);
        await window.db.collection('file_movements').add({ fileNumber: scannedFileNumber, clientFileId: clientFileId || null, requestType: 'physical', fileName: info.fileName, fromDepartment: info.currentDepartment, toDepartment: toDept, action:'transfer', status:'in_transit', priority, notes, scanMethod:'qr_scanner', userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
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
        const clientFileId = await updateFileStatus(scannedFileNumber,'received', latest.toDepartment, user);
        await window.db.collection('file_movements').add({ fileNumber: scannedFileNumber, clientFileId: clientFileId || latest.clientFileId || null, requestType: 'physical', fileName: latest.fileName, fromDepartment: latest.fromDepartment, toDepartment: latest.toDepartment, action:'receive', status:'received', condition, notes, scanMethod:'qr_scanner', userId: user.uid, userEmail: user.email || '', userDisplayName: user.displayName || '', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
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
    const requestId = actionBtn.getAttribute('data-request-id');
    const shareUrl = actionBtn.getAttribute('data-share-url');
    switch(action){
      case 'search': return searchFileMovements();
      case 'confirm-transfer': return confirmScannedTransfer();
      case 'confirm-receive': return confirmScannedReceive();
      case 'manual-entry': return processManualEntry();
      case 'create-request': return createTransferRequest();
      case 'refresh-requests': return Promise.all([loadTransferRequests(), loadClientFileOptionsForRequests()]);
      case 'refresh-transfers': return loadTransfers();
      case 'approve-request': return reviewTransferRequest(requestId, 'approve');
      case 'reject-request': return reviewTransferRequest(requestId, 'reject');
      case 'dispatch-request': return dispatchTransferRequest(requestId);
      case 'receive-request': return receiveTransferRequest(requestId);
      case 'return-request': return returnTransferRequest(requestId);
      case 'open-share-link': return window.open(shareUrl, '_blank', 'noopener,noreferrer');
      case 'copy-share-link':
        if (shareUrl && navigator.clipboard) {
          return navigator.clipboard.writeText(shareUrl).then(() => notify('تم نسخ رابط المشاركة', 'success')).catch(() => notify('تعذر نسخ الرابط', 'error'));
        }
        notify('تعذر نسخ الرابط', 'error');
        return;
    }
  });

  // Public API
  const api = {
    searchFileMovements,
    transferFile,
    receiveFile,
    confirmScannedTransfer,
    confirmScannedReceive,
    processManualEntry,
    createTransferRequest,
    loadTransferRequests,
    loadTransfers,
    reviewTransferRequest,
    dispatchTransferRequest,
    receiveTransferRequest,
    returnTransferRequest
  };
  window.fileTrackingPage = api;

  // Listen for common page readiness (page-bootstrap emits page:ready)
  // Robust init: run once on page:ready or DOMContentLoaded (whichever fires first)
  function initOnce(){ if (state.initialized) return; state.initialized = true; init(); }
  document.addEventListener('page:ready', initOnce);
  document.addEventListener('DOMContentLoaded', initOnce);
})();
