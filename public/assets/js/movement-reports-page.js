// movement-reports-page.js
// Modularized logic extracted from legacy inline script in movement-reports.html
(function(){
  const state = { movements: [], filtered: [], loading:false, initialized:false };
  const departmentNames = { archive:'الأرشيف', legal:'الشؤون القانونية', governance:'الحوكمة والامتثال', collection:'إدارة التحصيل', securitization:'إدارة التوريق' };
  const statusNames = { in_archive:'في الأرشيف', transferred:'تم النقل', received:'تم الاستلام', in_transit:'في الطريق', pending:'معلق', completed:'مكتمل' };

  function log(){ console.log('[movement-reports]', ...arguments); }

  async function init(){
    if (state.initialized) return; // prevent double init
    state.initialized = true;
    document.body.classList.add('movement-reports-page');
    await waitForAuth();
    bindDelegatedEvents();
    setDefaultDates();
    await loadStatistics();
  }
  function waitForAuth(){ return new Promise(res=>{ const check=()=>{ if (window.unifiedAuth && window.unifiedAuth.currentUser){ return res(); } setTimeout(check,120); }; check(); }); }

  function qs(id){ return document.getElementById(id); }

  function bindDelegatedEvents(){
    document.addEventListener('click', e=>{
      const target = e.target.closest('[data-mr-action]');
      if(!target) return;
      const action = target.getAttribute('data-mr-action');
      if (action === 'export') return exportReport();
      if (action === 'generate') return generateReport();
    });
  }

  function setDefaultDates(){
    const today = new Date();
    const lastMonth = new Date(Date.now() - 30*24*60*60*1000);
    const toEl = qs('toDate'); const fromEl = qs('fromDate');
    if (toEl) toEl.valueAsDate = today; if (fromEl) fromEl.valueAsDate = lastMonth;
  }

  async function loadStatistics(){
    try {
      setLoading(true); UX && UX.showLoading && UX.showLoading('تحميل البيانات ...');
      if (!window.db){
        // If DB not ready yet, try once after firebaseReady
        state.movements = [];
        renderStats(); renderDepartmentChart(); renderTable();
        const onReady = () => { document.removeEventListener('firebaseReady', onReady); loadStatistics(); };
        document.addEventListener('firebaseReady', onReady, { once: true });
        return;
      }
  const snap = await window.db.collection('file_movements').orderBy('timestamp','desc').limit(200).get();
  state.movements = snap.docs.map(d=> normalizeMovement(d.id, d.data()));
  window.__MOVEMENTS_CACHE__ = state.movements.slice();
  renderStats(); renderDepartmentChart(); renderTable();
  try { window.__EVENT_BUS__?.emit && window.__EVENT_BUS__.emit('movements:updated', { count: state.movements.length }); document.dispatchEvent(new CustomEvent('movements:updated', { detail:{ count: state.movements.length } })); } catch(e){}
  } catch(err){ console.error(err); notify('حدث خطأ في تحميل البيانات','error'); } finally { setLoading(false); UX && UX.hideLoading && UX.hideLoading(); }
  }

  function normalizeMovement(id,data){
    return { id, timestamp: data.timestamp || new Date(), fileNumber: data.fileNumber||'غير محدد', fileName: data.fileName||'غير محدد', fromDepartment:data.fromDepartment||'غير محدد', toDepartment:data.toDepartment||'غير محدد', status:data.status||'pending', userDisplayName:data.userDisplayName||'غير معروف', notes:data.notes||'' };
  }

  function renderStats(){
    const total = state.movements.length;
    const completed = state.movements.filter(m=> m.status==='received' || m.status==='completed').length;
    const pending = state.movements.filter(m=> m.status==='in_transit' || m.status==='pending').length;
    const activeFiles = new Set(state.movements.map(m=> m.fileNumber)).size;
    setNumber('totalMovements', total); setNumber('completedMovements', completed); setNumber('pendingMovements', pending); setNumber('activeFiles', activeFiles);
  }
  function setNumber(id,val){ const el = qs(id); if (el) el.textContent = val; }

  function renderDepartmentChart(){
    const container = qs('departmentChart'); if(!container) return; const stats={}; Object.keys(departmentNames).forEach(k=>stats[k]=0);
    state.movements.forEach(m=>{ if (stats[m.toDepartment]!=null) stats[m.toDepartment]++; });
    const max = Math.max(1,...Object.values(stats));
    container.innerHTML = Object.entries(stats).map(([dept,count])=>{
      const h = (count/max)*200; const pct = Math.round((count/max)*100);
      return `<div class="chart-bar" style="height:${h}px" title="${departmentNames[dept]}: ${count} حركة (${pct}%)">${count}<div class="chart-label">${departmentNames[dept]}</div></div>`;
    }).join('');
  }

  function renderTable(){
    const tbody = qs('movementsTableBody'); if(!tbody) return;
    if(!state.movements.length){
      tbody.innerHTML = `<tr><td colspan="7" class="mr-empty"><i class="fas fa-info-circle me-2"></i>لا توجد حركات للعرض</td></tr>`; return;
    }
    tbody.innerHTML = state.movements.slice(0,50).map(m=> movementRow(m)).join('');
  }
  function movementRow(m){
    const statusClass = getStatusClass(m.status);
    const formattedDate = (window.FormatUtils? FormatUtils.formatArabicDateTime(m.timestamp): new Date(m.timestamp).toLocaleString('ar-SA'));
    return `<tr><td><strong>${safeEscape(m.fileNumber)}</strong></td><td><span title="${safeEscape(m.fileName)}">${safeTruncate(m.fileName,30)}</span></td><td><span class="badge bg-light text-dark">${departmentNames[m.fromDepartment]||m.fromDepartment}</span></td><td><span class="badge bg-primary">${departmentNames[m.toDepartment]||m.toDepartment}</span></td><td><i class="fas fa-user me-1"></i>${safeEscape(m.userDisplayName)}</td><td><i class="fas fa-calendar me-1"></i>${formattedDate}</td><td><span class="badge bg-${statusClass}"><i class="fas ${getStatusIcon(m.status)} me-1"></i>${statusNames[m.status]||m.status}</span></td></tr>`;
  }

  function getStatusClass(s){ return {received:'success', completed:'success', in_transit:'warning', pending:'warning', transferred:'info', in_archive:'secondary'}[s] || 'secondary'; }
  function getStatusIcon(s){ return {received:'fa-check-circle', completed:'fa-check-circle', in_transit:'fa-clock', pending:'fa-hourglass-half', transferred:'fa-exchange-alt', in_archive:'fa-archive'}[s] || 'fa-question-circle'; }

  async function generateReport(){
    const fromDate = qs('fromDate')?.value; const toDate = qs('toDate')?.value; const dept = qs('departmentReport')?.value;
    if(!fromDate || !toDate) return notify('يرجى تحديد تاريخ البداية والنهاية','warning');
    if(new Date(fromDate) > new Date(toDate)) return notify('تاريخ البداية يجب أن يكون قبل تاريخ النهاية','warning');
    try {
      setLoading(true); UX && UX.showLoading && UX.showLoading('إنشاء التقرير ...');
      if(!window.db){
        state.movements=[]; renderStats(); renderDepartmentChart(); renderTable();
        const onReady = () => { document.removeEventListener('firebaseReady', onReady); generateReport(); };
        document.addEventListener('firebaseReady', onReady, { once: true });
        return;
      }
      let query = window.db.collection('file_movements')
        .where('timestamp','>=', new Date(fromDate))
        .where('timestamp','<=', new Date(toDate+'T23:59:59'))
        .orderBy('timestamp','desc');
      if (dept) query = query.where('toDepartment','==',dept);
      const snap = await query.get();
  state.movements = snap.docs.map(d=> normalizeMovement(d.id,d.data()));
  window.__MOVEMENTS_CACHE__ = state.movements.slice();
  renderStats(); renderDepartmentChart(); renderTable();
  try { window.__EVENT_BUS__?.emit && window.__EVENT_BUS__.emit('movements:updated', { count: state.movements.length }); document.dispatchEvent(new CustomEvent('movements:updated', { detail:{ count: state.movements.length } })); } catch(e){}
      notify(`تم إنشاء التقرير. (${state.movements.length} حركة)`, 'success');
  } catch(err){ console.error(err); notify('خطأ في إنشاء التقرير','error'); }
  finally { setLoading(false); UX && UX.hideLoading && UX.hideLoading(); }
  }

  function exportReport(){
    const movements = state.movements;
    if(!movements.length) return notify('لا توجد بيانات للتصدير','warning');
    if(window.ExportUtils){
      const rows = movements.map(m=>{
        const F = window.FormatUtils || {};
        const dt = F.parseTimestamp ? F.parseTimestamp(m.timestamp) : (m.timestamp?.toDate? m.timestamp.toDate(): new Date(m.timestamp));
        return {
          fileNumber: m.fileNumber,
          fileName: m.fileName,
          fromDept: departmentNames[m.fromDepartment]||m.fromDepartment,
          toDept: departmentNames[m.toDepartment]||m.toDepartment,
          user: m.userDisplayName,
          date: F.formatArabicDate ? F.formatArabicDate(dt) : dt.toLocaleDateString('ar-SA'),
          time: F.formatArabicTime ? F.formatArabicTime(dt) : dt.toLocaleTimeString('ar-SA'),
          status: statusNames[m.status]||m.status,
          notes: m.notes||''
        };
      });
      ExportUtils.toCSV(rows, ['fileNumber','fileName','fromDept','toDept','user','date','time','status','notes'], 'تقرير_حركة_الملفات');
      notify('تم تصدير التقرير بنجاح','success');
    } else {
      console.warn('ExportUtils not ready - fallback pending');
    }
  }

  function safeEscape(t){ return window.FormatUtils? FormatUtils.escapeHtml(t): (t? String(t).replace(/[&<>"]/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])): ''); }
  function safeTruncate(t,l){ return window.FormatUtils? FormatUtils.truncate(t,l): (t && t.length>l? t.slice(0,l)+'...': t||''); }

  function setLoading(show){ state.loading=show; const btns = document.querySelectorAll('[data-mr-loading]'); btns.forEach(b=>{ if(show){ if(!b.dataset.originalText) b.dataset.originalText=b.innerHTML; b.disabled=true; b.innerHTML='<i class="fas fa-spinner fa-spin me-2"></i>جاري التحميل...'; } else { b.disabled=false; if(b.dataset.originalText){ b.innerHTML=b.dataset.originalText; delete b.dataset.originalText; } } }); }

  function notify(message,type='info'){
    if(window.UX && window.UX.toast){ try { window.UX.toast(message, type); return; } catch{} }
    if(window.notify && window.notify[type]){ try { window.notify[type](message); return; } catch{} }
    console.log('[notify]', type, message);
  }

  // Initialize when DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Also listen to app-level readiness to ensure init after auth & modules
  document.addEventListener('page:ready', ()=> init(), { once: true });
})();
