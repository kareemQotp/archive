// storage-management-page.js
// إدارة التخزين والملفات - إحصائيات وصيانة
(function(){
  'use strict';

  const els = {};
  const state = { user:null, profile:null, loading:false };

  function normalizeRole(role){
    if(!role) return 'viewer';
    const normalized = String(role).trim().toLowerCase().replace(/\s+/g,'_');
    const aliases = {
      admin:'super_admin', system_admin:'super_admin', super_admin:'super_admin',
      manager:'department_admin', 'department-admin':'department_admin', department_admin:'department_admin',
      supervisor:'supervisor', department_head:'supervisor',
      employee:'employee', user:'employee', archive_officer:'employee', 'archive-officer':'employee',
      viewer:'viewer'
    };
    return aliases[normalized] || normalized;
  }

  function normalizeDepartment(department){
    if(!department) return '';
    const normalized = String(department).trim().toLowerCase();
    const aliases = { 'الأرشيف':'archive', 'ارشيف':'archive' };
    return aliases[department] || aliases[normalized] || normalized;
  }
  function status(msg){
    const box = document.getElementById('smStatus');
    if(box){
      const time = new Date().toLocaleTimeString('ar-EG');
      box.textContent = `[${time}] ${msg}`;
    }
    console.debug('[storage-management]', msg);
  }

  function qs(id){ return document.getElementById(id); }

  function initEls(){
    Object.assign(els, {
      sTotalDocs: qs('sTotalDocs'),
      sStorageFiles: qs('sStorageFiles'),
      sEstimatedSize: qs('sEstimatedSize'),
      sDistinctClassifications: qs('sDistinctClassifications'),
      recentStorageFilesBody: qs('recentStorageFilesBody'),
      btnRefresh: qs('btnRefresh'),
      btnExportStorage: qs('btnExportStorage'),
      btnCleanupThumbnails: qs('btnCleanupThumbnails'),
      cleanupResult: qs('cleanupResult'),
      departmentDistribution: qs('departmentDistribution'),
      topClassifications: qs('topClassifications'),
      btnIntegrityCheck: qs('btnIntegrityCheck'),
      integrityResult: qs('integrityResult')
    });
  }

  function show(msg, el){ if(el) el.textContent = msg; }

  function ensureAuthReady(){
    return new Promise((resolve,reject)=>{
      if(window.auth && window.auth.currentUser){ return resolve(window.auth.currentUser); }
      const t = setTimeout(()=>reject(new Error('timeout waiting auth')), 11000);
      document.addEventListener('firebaseAuthReady', ()=>{ clearTimeout(t); resolve(window.auth.currentUser); }, { once:true });
    });
  }

  function formatSize(bytes){
    if(!bytes || isNaN(bytes)) return '-';
    const units=['B','KB','MB','GB'];
    let i=0; let val=bytes;
    while(val>1024 && i<units.length-1){ val/=1024; i++; }
    return val.toFixed(1)+' '+units[i];
  }

  async function loadStats(){
    const db = firebase.firestore();
    // fetch limited documents for distribution (approximation)
    status('جلب الإحصاءات (documents)...');
    const snap = await db.collection('documents').limit(1500).get();
    const docs=[]; snap.forEach(d=>{ const data=d.data(); data.__id=d.id; docs.push(data); });
    const totalDocs = snap.size;
    // classification distinct
    const classSet = new Set();
    const deptCounts = {};
    docs.forEach(doc=>{
      const c = doc.classificationName || doc.classification; if(c) classSet.add(c);
      const dep = doc.department || doc.currentDepartment || 'other';
      deptCounts[dep] = (deptCounts[dep]||0)+1;
    });
  els.sTotalDocs.textContent = totalDocs;
  if(totalDocs === 0) status('لا توجد وثائق (قد تكون المجموعة فارغة أو ينقصك الصلاحية)');
    els.sDistinctClassifications.textContent = classSet.size;

    // Build distribution listing
    const depHtml = Object.entries(deptCounts)
      .sort((a,b)=>b[1]-a[1])
      .map(([k,v])=>`<div class="d-flex justify-content-between"><span>${k}</span><span class="fw-semibold">${v}</span></div>`)
      .join('');
    els.departmentDistribution.innerHTML = depHtml || '--- لا توجد بيانات ---';

    // Top classifications
    const classCounts = {};
    docs.forEach(doc=>{
      const c = doc.classificationName || doc.classification || 'غير مصنف';
      classCounts[c] = (classCounts[c]||0)+1;
    });
    const top = Object.entries(classCounts).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([k,v])=>`<div class="d-flex justify-content-between"><span>${k}</span><span class="fw-semibold">${v}</span></div>`).join('');
    els.topClassifications.innerHTML = top || '--- لا توجد بيانات ---';

    // recent docs
    els.recentStorageFilesBody.innerHTML='';
    docs.slice(-30).reverse().forEach(doc=>{
      let ts = doc.uploadedAt || doc.uploadDate || doc.createdAt || doc.timestamp;
      if(ts && ts.toDate) ts = ts.toDate();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${doc.__id}</td><td>${doc.name || doc.fileName || 'بدون'}</td><td>${doc.department || doc.currentDepartment || '-'}</td><td>${doc.classificationName || doc.classification || '-'}</td><td>${ts instanceof Date ? ts.toLocaleDateString('ar-EG') : '-'}</td>`;
      els.recentStorageFilesBody.appendChild(tr);
    });

    // rough estimated size (if documents store size field)
    const totalBytes = docs.reduce((sum,d)=> sum + (d.size||d.fileSize||0), 0);
    els.sEstimatedSize.textContent = formatSize(totalBytes);
    if(totalBytes === 0) status('لم يتم العثور على حقول حجم (size/fileSize) في الوثائق الحالية');
  }

  async function loadStorageFilesCount(){
    try {
      if(!window.cloudServices || !window.cloudServices.getStorageFilesCount){
        console.warn('cloudServices.getStorageFilesCount not available');
        status('خدمة عدّ الملفات غير متوفرة (cloud-services.js مفقود أو لم يتم تحميله)');
        return;
      }
      const res = await window.cloudServices.getStorageFilesCount();
      els.sStorageFiles.textContent = res.total || res.count || '-';
      status('تم تحديث عدد ملفات التخزين');
    } catch(err){
      console.error('storage files count error', err);
      els.sStorageFiles.textContent = 'خطأ';
      status('خطأ أثناء جلب عدد ملفات التخزين');
    }
  }

  async function cleanupThumbnails(){
    if(!window.cloudServices || !window.cloudServices.cleanupThumbnails){
      showCleanup('الخدمة غير متوفرة'); return; }
    showCleanup('... جاري التنفيذ');
    try {
      const res = await window.cloudServices.cleanupThumbnails();
      showCleanup(`تم الحذف: ${res.deleted||0} - فشل: ${res.failures||0}`);
    } catch(err){
      showCleanup('فشل التنفيذ');
    }
  }

  function showCleanup(msg){ if(els.cleanupResult){ els.cleanupResult.textContent = msg; } }

  async function integrityCheck(){
    showIntegrity('... جاري الفحص');
    try {
      const db = firebase.firestore();
      const snap = await db.collection('documents').limit(800).get();
      let missingDepartment = 0, missingClassification = 0;
      snap.forEach(d=>{
        const data = d.data();
        if(!data.department && !data.currentDepartment) missingDepartment++;
        if(!data.classification && !data.classificationName) missingClassification++;
      });
      showIntegrity(`نواقص القسم: ${missingDepartment} | نواقص التصنيف: ${missingClassification}`);
    } catch(err){
      console.error('integrity check error', err);
      showIntegrity('فشل الفحص');
    }
  }

  function showIntegrity(msg){ if(els.integrityResult) els.integrityResult.textContent = msg; }

  function enforceRole(){
    if(!state.profile) return;
    const role = normalizeRole(state.profile.role);
    const department = normalizeDepartment(state.profile.department);
    if(!(role === 'super_admin' || department === 'archive')){
      // disable admin tools
      els.btnCleanupThumbnails.disabled = true;
      els.btnIntegrityCheck.disabled = true;
    }
  }

  function setupEvents(){
    els.btnRefresh.addEventListener('click', refreshAll);
    els.btnCleanupThumbnails.addEventListener('click', cleanupThumbnails);
    els.btnIntegrityCheck.addEventListener('click', integrityCheck);
    els.btnExportStorage.addEventListener('click', exportRecentAsCSV);
  }

  function exportRecentAsCSV(){
    const rows = [['ID','Name','Department','Classification','Date']];
    const trs = els.recentStorageFilesBody.querySelectorAll('tr');
    trs.forEach(tr=>{
      const cols = Array.from(tr.children).map(td=>`"${(td.textContent||'').replace(/"/g,'""')}"`);
      rows.push(cols);
    });
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'storage-management-recent.csv';
    a.click();
  }

  async function refreshAll(){
    status('بدء التحديث العام...');
    await Promise.all([loadStats(), loadStorageFilesCount()]);
    status('اكتمل التحديث');
    // If everything is zero and we were possibly offline, schedule a retry
    try {
      const allZero = (els.sTotalDocs.textContent === '0') && (els.sStorageFiles.textContent === '-' || els.sStorageFiles.textContent === '0');
      if(allZero) {
        status('نتائج صفرية - إعادة المحاولة بعد 4 ثوانٍ للتأكد من الاتصال');
        setTimeout(()=> { refreshAll().catch(()=>status('فشل إعادة المحاولة')); }, 4000);
      }
    } catch(_) {}
  }

  async function bootstrap(){
    try {
      await ensureAuthReady();
      state.user = window.auth.currentUser;
      if(window.unifiedAuth && window.unifiedAuth.currentUserProfile){
        state.profile = window.unifiedAuth.currentUserProfile;
      }
      initEls();
      setupEvents();
      enforceRole();
      status('تهيئة الصفحة...');
      await refreshAll();
      // Listen for coming online to refetch
      window.addEventListener('online', ()=>{
        status('تم استعادة الاتصال - إعادة تحميل الإحصاءات');
        refreshAll();
      });
      window.addEventListener('offline', ()=> status('⚠️ المتصفح في وضع غير متصل - سيتم استخدام البيانات المخزنة مؤقتاً إن وجدت'));
    } catch(err){
      console.error('[storage-management] bootstrap failed', err);
      status('فشل التهيئة - تحقق من وحدة التحكم');
    }
  }

  document.addEventListener('firebaseReady', bootstrap, { once:true });
})();