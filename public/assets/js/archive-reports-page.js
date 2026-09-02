// archive-reports-page.js
// واجهة تقارير الأرشيف: إحصائيات وتحليلات حول الوثائق
(function(){
  'use strict';

  const els = {};
  const state = { user:null, profile:null, loading:false };

  function normalizeRole(role){
    if (window.AuthConstants && typeof window.AuthConstants.normalizeRole === 'function') {
        return window.AuthConstants.normalizeRole(role);
    }
    if(!role) return 'viewer';
    const normalized = String(role).trim().toLowerCase().replace(/\s+/g,'_');
    const aliases = {
      admin:'admin', system_admin:'super_admin', super_admin:'super_admin',
      manager:'department_admin', 'department-admin':'department_admin', department_admin:'department_admin',
      supervisor:'supervisor', department_head:'supervisor',
      employee:'employee', user:'viewer', archive_officer:'archive_officer', 'archive-officer':'archive_officer',
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

  function qs(id){ return document.getElementById(id); }

  function initEls(){
    Object.assign(els, {
      fromDate: qs('fromDate'),
      toDate: qs('toDate'),
      departmentFilter: qs('departmentFilter'),
      btnRun: qs('btnRun'),
      btnGenerate: qs('btnGenerate'),
      btnExport: qs('btnExport'),
      mTotalDocs: qs('mTotalDocs'),
      mAddedDocs: qs('mAddedDocs'),
      mDailyAvg: qs('mDailyAvg'),
      mSearchOps: qs('mSearchOps'),
      trendChart: qs('trendChart'),
      classificationChart: qs('classificationChart'),
      recentDocsBody: qs('recentDocsBody')
    });
  }

  function showToast(msg, type='info'){
    console.log('[reports]', type, msg);
  }

  function ensureAuthReady(){
    return new Promise((resolve,reject)=>{
      if(window.auth && window.auth.currentUser){ return resolve(window.auth.currentUser); }
      const t = setTimeout(()=>reject(new Error('timeout waiting auth')), 10000);
      document.addEventListener('firebaseAuthReady', ()=>{ clearTimeout(t); resolve(window.auth.currentUser); }, { once:true });
    });
  }

  function setMetrics(obj){
    els.mTotalDocs.textContent = obj.totalDocs ?? '-';
    els.mAddedDocs.textContent = obj.addedDocs ?? '-';
    els.mDailyAvg.textContent = obj.dailyAvg ?? '-';
    els.mSearchOps.textContent = obj.searchOps ?? '-';
  }

  function dateFloor(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }

  async function runReport(){
    if(state.loading) return; state.loading = true;
    const db = firebase.firestore();
    const from = els.fromDate.value ? new Date(els.fromDate.value) : null;
    const to = els.toDate.value ? new Date(els.toDate.value) : null;
    if(to) to.setHours(23,59,59,999);
    const dept = els.departmentFilter.value;

    showToast('تشغيل التقرير ...');

    try {
      let ref = db.collection('documents');
      // department field variants
      if(dept){
        ref = ref.where('department','==', dept);
      }
      // simple date filter (using uploadedAt or uploadDate fallback)
      // we fetch all then filter client side due to heterogeneity
      const snap = await ref.limit(1200).get();
      const docs = [];
      snap.forEach(d=>{
        const data = d.data();
        data.__id = d.id;
        docs.push(data);
      });
      const filtered = docs.filter(doc=>{
        let ts = doc.uploadedAt || doc.uploadDate || doc.createdAt || doc.timestamp;
        if(ts && ts.toDate) ts = ts.toDate();
        if(!(ts instanceof Date)) return true; // keep if unknown
        if(from && ts < from) return false;
        if(to && ts > to) return false;
        return true;
      });

      // metrics
      const totalDocs = filtered.length;
      let addedDocs = 0;
      if(from || to){ addedDocs = filtered.length; } // simplified definition

      // daily average
      let dailyAvg = '-';
      if(from && to){
        const days = Math.max(1, Math.round((dateFloor(to)-dateFloor(from))/(1000*60*60*24))+1);
        dailyAvg = (filtered.length / days).toFixed(1);
      }

      // classification distribution
      const classCounts = {};
      filtered.forEach(doc=>{
        const c = doc.classificationName || doc.classification || 'غير مصنف';
        classCounts[c] = (classCounts[c]||0)+1;
      });

      // mock search ops (needs activity logs query)
      // we try limited fetch for activity logs containing 'search'
      let searchOps = '-';
      try {
        const actSnap = await db.collection('activity_logs')
          .where('action','==','search')
          .orderBy('timestamp','desc')
          .limit(200)
          .get();
        searchOps = actSnap.size;
      } catch(e) {
        console.warn('search ops query fallback', e.code);
      }

      // build charts placeholders
      els.trendChart.textContent = 'سيتم تحسين الرسم (الاتجاه الزمني) لاحقاً';
      const topClasses = Object.entries(classCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
      if(topClasses.length){
        els.classificationChart.innerHTML = topClasses.map(([k,v])=>`<div class="d-flex justify-content-between"><span>${k}</span><span class="fw-semibold">${v}</span></div>`).join('');
      } else {
        els.classificationChart.textContent = '--- لا توجد بيانات ---';
      }

      // recent docs table
      els.recentDocsBody.innerHTML = '';
      filtered.slice(-25).reverse().forEach(doc=>{
        let ts = doc.uploadedAt || doc.uploadDate || doc.createdAt || doc.timestamp;
        if(ts && ts.toDate) ts = ts.toDate();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${doc.__id}</td><td>${doc.name || doc.fileName || 'بدون'}</td><td>${doc.department || doc.currentDepartment || '-'}</td><td>${doc.classificationName || doc.classification || '-'}</td><td>${ts instanceof Date ? ts.toLocaleDateString('ar-EG') : '-'}</td>`;
        els.recentDocsBody.appendChild(tr);
      });

      setMetrics({ totalDocs, addedDocs, dailyAvg, searchOps });
      showToast('اكتمل التقرير','success');
    } catch(err){
      console.error('[archive-reports] runReport error', err);
      showToast('فشل تشغيل التقرير','danger');
    } finally {
      state.loading = false;
    }
  }

  function setupEvents(){
    els.btnRun.addEventListener('click', runReport);
    els.btnGenerate.addEventListener('click', runReport);
    els.btnExport.addEventListener('click', exportReport);
  }

  function exportReport(){
    // Simple CSV export of recent docs
    const rows = [['ID','Name','Department','Classification','Date']];
    const trs = els.recentDocsBody.querySelectorAll('tr');
    trs.forEach(tr=>{
      const cols = Array.from(tr.children).map(td=>`"${(td.textContent||'').replace(/"/g,'""')}"`);
      rows.push(cols);
    });
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'archive-report.csv';
    a.click();
  }

  function enforceRole(){
    if(!state.profile) return;
    const role = normalizeRole(state.profile.role);
    const department = normalizeDepartment(state.profile.department);
    if(!(role === 'super_admin' || department === 'archive')){
      showToast('قراءة فقط - صلاحيات محدودة');
      // allow viewing but maybe restrict export
      els.btnExport.disabled = true;
    }
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
      runReport();
    } catch(err){
      console.error('[archive-reports] bootstrap failed', err);
    }
  }

  document.addEventListener('firebaseReady', bootstrap, { once:true });
})();
