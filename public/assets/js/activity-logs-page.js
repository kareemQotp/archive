// activity-logs-page.js - extracted from legacy inline script in activity-logs.html
(function(){
  if(window.__ACTIVITY_LOGS_PAGE__) return; window.__ACTIVITY_LOGS_PAGE__=true;
  const bus = window.__EVENT_BUS__;
  function log(...a){ console.log('[activity-logs-page]', ...a); }
  function safe(fn){ try { return fn(); } catch(e){ console.error('[activity-logs-page] error', e);} }

  // Core Dashboard Class (trimmed from inline version, keeping parity)
  class ActivityLogsDashboard {
    constructor(){
      this.currentPage=1; this.pageSize=50; this.totalPages=1; this.activities=[]; this.filteredActivities=[]; this.realTimeListener=null;
      this.init();
    }
    waitForAuth(){
      return new Promise(res=>{
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds maximum wait
        const ready = ()=> {
          attempts++;
          const firebaseReady = !!(window.db || window.unifiedAuth?.db);
          if ((window.unifiedAuth && window.unifiedAuth.isInitialized) || firebaseReady) {
            log('Auth system ready after', attempts, 'attempts');
            res();
          } else if (attempts >= maxAttempts) {
            log('Auth timeout - proceeding without auth');
            res();
          } else {
            setTimeout(ready, 100);
          }
        };
        ready();
      });
    }
    async init(){
      try {
        await this.waitForAuth();
        
        // Check if user is authenticated (more flexible check)
        const isAuthenticated = !!(window.unifiedAuth?.isAuthenticated || window.unifiedAuth?.currentUser);
        
        if (!isAuthenticated && window.unifiedAuth?.isInitialized) {
          log('User not authenticated, redirecting to login');
          location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname);
          return;
        }
        
        this.setupEventListeners();
        this.setupRealTimeUpdates();
        await this.loadData();
        await this.loadUsers();
        // In case Firebase becomes ready slightly later, refresh once
        window.addEventListener('firebaseReady', () => {
          if (!this.activities.length) {
            this.refreshData();
          }
        }, { once: true });
        log('dashboard initialized with', this.activities.length, 'activities');
      } catch(err){ 
        console.error('Error initializing dashboard', err); 
        this.showError('خطأ في تحميل لوحة التحكم');
        // Show empty state instead of demo data
        this.activities = [];
        this.applyFilters();
      }
    }
    setupEventListeners(){
      window.addEventListener('activityLogged', (e)=> this.handleNewActivity(e.detail));
      const filterIds=['category-filter','priority-filter','user-filter','start-date-filter','end-date-filter','search-filter'];
      filterIds.forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('change', ()=> this.applyFilters()); }});
      const search = document.getElementById('search-filter');
      if(search){ let t; search.addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(()=> this.applyFilters(), 500); }); }
      // Delegated buttons (export / refresh / clear)
      document.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-al-action]');
        if(!btn) return;
        const action = btn.getAttribute('data-al-action');
        switch(action){
          case 'export': this.exportReport(); break;
          case 'refresh': this.refreshData(); break;
          case 'clear-filters': this.clearFilters(); break;
          case 'show-details': {
            const id = btn.getAttribute('data-activity-id');
            if(id) this.showActivityDetails(id); break;
          }
        }
      });
    }
    setupRealTimeUpdates(){
      const db = window.db || window.unifiedAuth?.db;
      if(!db){ console.warn('Firebase not available (real-time disabled)'); return; }
      try {
        this.realTimeListener = db.collection('activity_logs').orderBy('timestamp','desc').limit(100).onSnapshot(snap=>{
          snap.docChanges().forEach(ch=>{ if(ch.type==='added'){ this.handleNewActivity({id:ch.doc.id, ...ch.doc.data()}); }});
        }, err=> console.warn('Real-time updates error', err));
      } catch(err){ console.warn('Could not setup real-time updates', err); }
    }
    handleNewActivity(activity){
      const normalized = this.normalizeActivity(activity);
      this.activities.unshift(normalized);
      this.showRealTimeIndicator();
      this.updateStats();
      if(window.analytics){ window.analytics.addRealTimeActivity?.(activity); }
  try { window.__EVENT_BUS__?.emit && window.__EVENT_BUS__.emit('activities:updated', { count:this.activities.length, latest:activity }); document.dispatchEvent(new CustomEvent('activities:updated', { detail:{ count:this.activities.length, latest:activity } })); } catch(e){}
      this.applyFilters();
    }
    normalizeActivity(a){
      if (!a) return a;
      const ts = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : a.timestamp;
      return { ...a, timestamp: ts };
    }
    showRealTimeIndicator(){
      const ind=document.getElementById('real-time-indicator');
      if(!ind) return; ind.classList.add('active'); setTimeout(()=> ind.classList.remove('active'), 3000);
    }
    async loadData(){
      this.showLoading(true); UX && UX.showLoading && UX.showLoading('تحميل الأنشطة ...');
      try {
        const db = window.db || window.unifiedAuth?.db;
        if (!db) {
          log('Firebase not initialized - showing empty state');
          this.activities = [];
          this.updateStats();
          this.applyFilters();
          return;
        }

        const snapshot = await db.collection('activity_logs').orderBy('timestamp','desc').limit(1000).get();
        log('Loaded', snapshot.docs.length, 'activities from Firebase');
        this.activities = snapshot.docs.map(d=> {
          const data = d.data();
          // Normalize Firestore Timestamp to millis
          const ts = data.timestamp && typeof data.timestamp.toMillis === 'function' ? data.timestamp.toMillis() : (data.timestamp || Date.now());
          return { id: d.id, ...data, timestamp: ts };
        });
        
        this.updateStats();
        this.applyFilters();
        try { window.__EVENT_BUS__?.emit && window.__EVENT_BUS__.emit('activities:updated', { count:this.activities.length }); document.dispatchEvent(new CustomEvent('activities:updated', { detail:{ count:this.activities.length } })); } catch(e){}
      } catch(err){ 
        console.error('Error loading activities', err); 
        this.activities = [];
        this.updateStats();
        this.applyFilters();
      }
      finally { this.showLoading(false); UX && UX.hideLoading && UX.hideLoading(); }
    }
    async loadUsers(){
      const userFilter=document.getElementById('user-filter'); if(!userFilter) return;
      const db = window.db || window.unifiedAuth?.db;
      if(db){ try { const snap= await db.collection('users').get(); snap.docs.forEach(doc=>{ const user=doc.data(); const opt=document.createElement('option'); opt.value=doc.id; opt.textContent=user.displayName || user.email || doc.id; userFilter.appendChild(opt); }); } catch(err){ console.warn('Could not load users', err);} }
    }
    updateStats(){
      const s=this.calculateStats();
      const byId=id=>{ const el=document.getElementById(id); if(el) el.textContent=s[idToStat[id]] || s[id]; };
      const idToStat={ 'total-activities':'total', 'active-users':'activeUsers', 'security-events':'securityEvents', 'critical-events':'criticalEvents'};
      Object.keys(idToStat).forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent = s[idToStat[id]]; });
      if(window.analytics) window.analytics.updateData?.(this.activities);
    }
    calculateStats(){
      const now=Date.now(), dayAgo=now-86400000; const recent=this.activities.filter(a=> a.timestamp>dayAgo); const unique=new Set(recent.map(a=> a.userId)); return { total:this.activities.length, activeUsers:unique.size, securityEvents:this.activities.filter(a=> a.category==='security').length, criticalEvents:this.activities.filter(a=> a.priority==='critical').length };
    }
    getFilterValues(){
      const startVal=document.getElementById('start-date-filter')?.value; const endVal=document.getElementById('end-date-filter')?.value;
      return { category:document.getElementById('category-filter')?.value || '', priority:document.getElementById('priority-filter')?.value || '', userId:document.getElementById('user-filter')?.value || '', startDate:startVal? new Date(startVal).getTime():null, endDate:endVal? new Date(endVal).getTime():null, search: (document.getElementById('search-filter')?.value || '').trim() };
    }
    applyFilters(){
      const f=this.getFilterValues();
      this.filteredActivities = this.activities.filter(a=>{
        if(f.category && a.category!==f.category) return false;
        if(f.priority && a.priority!==f.priority) return false;
        if(f.userId && a.userId!==f.userId) return false;
        if(f.startDate && a.timestamp < f.startDate) return false;
        if(f.endDate && a.timestamp > f.endDate) return false;
        if(f.search){ const txt=JSON.stringify(a).toLowerCase(); if(!txt.includes(f.search.toLowerCase())) return false; }
        return true;
      });
      this.currentPage=1; this.renderTable(); this.renderPagination();
    }
    renderTable(){
      const tbody=document.getElementById('activity-tbody'); if(!tbody) return;
      const start=(this.currentPage-1)*this.pageSize; const end=start+this.pageSize; const pageActs=this.filteredActivities.slice(start,end);
      if(!pageActs.length){
  tbody.innerHTML = `<tr><td colspan="7" class="empty-activities"><i class="fas fa-inbox fa-3x mb-3 empty-activities-icon"></i><h5>لا توجد أنشطة للعرض</h5><p>جرب تغيير الفلاتر أو قم بتحديث البيانات</p><button class="btn btn-primary" data-al-action="refresh"><i class="fas fa-sync-alt"></i> تحديث البيانات</button></td></tr>`;
      } else {
        tbody.innerHTML = pageActs.map(a=> this.renderActivityRow(a)).join('');
      }
      this.totalPages = Math.ceil(this.filteredActivities.length / this.pageSize) || 1;
    }
    renderActivityRow(a){
  const date = window.FormatUtils? FormatUtils.formatArabicDateTime(a.timestamp): new Date(a.timestamp).toLocaleString('ar-SA');
      const categoryClass=`category-${a.category}`; const priorityClass=`priority-${a.priority}`;
      return `<tr><td>${date}</td><td>${this.escape(a.userEmail || a.userDisplayName || 'غير معروف')}</td><td><span class="category-badge ${categoryClass}">${this.getCategoryLabel(a.category)}</span></td><td>${this.getActionLabel(a.action)}</td><td><span class="priority-badge ${priorityClass}">${this.getPriorityLabel(a.priority)}</span></td><td><button class="btn btn-secondary" data-al-action="show-details" data-activity-id="${a.id}"><i class="fas fa-eye"></i> عرض</button></td><td><button class="btn btn-primary" data-al-action="show-details" data-activity-id="${a.id}"><i class="fas fa-info-circle"></i> تفاصيل</button></td></tr>`;
    }
    getCategoryLabel(c){ return ({authentication:'المصادقة',file_management:'إدارة الملفات',user_management:'إدارة المستخدمين',system:'النظام',security:'الأمان',scanner:'الماسح الضوئي',navigation:'التنقل'})[c] || c; }
    getActionLabel(a){ return ({login:'تسجيل دخول',logout:'تسجيل خروج',upload:'رفع ملف',download:'تحميل ملف',delete:'حذف',move:'نقل',view:'عرض',search:'بحث',create_user:'إنشاء مستخدم',delete_user:'حذف مستخدم',role_change:'تغيير دور',page_view:'عرض صفحة',qr_scan:'مسح QR',error:'خطأ'})[a] || a; }
    getPriorityLabel(p){ return ({normal:'عادي',high:'عالي',critical:'حرج'})[p] || p; }
    showActivityDetails(id){
      const act=this.activities.find(a=> a.id===id); if(!act) return;
      const modal=document.createElement('div'); modal.className='modal-overlay';
  const F = window.FormatUtils || {};
  const fmtDT = d => F.formatArabicDateTime? F.formatArabicDateTime(d): new Date(d).toLocaleString('ar-SA');
  const esc = t => F.escapeHtml? F.escapeHtml(t): (t? String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])): '');
  modal.innerHTML = `<div class="modal-content-custom" role="dialog" aria-modal="true" aria-labelledby="activityDetailsTitle"><h3 id="activityDetailsTitle" class="modal-title"><i class="fas fa-info-circle"></i> تفاصيل العملية</h3><div class="activity-details"><div class="details-grid"><div class="detail-item"><span class="detail-label">التاريخ والوقت:</span><span class="detail-value">${fmtDT(act.timestamp)}</span></div><div class="detail-item"><span class="detail-label">المستخدم:</span><span class="detail-value">${esc(act.userEmail || 'غير معروف')}</span></div><div class="detail-item"><span class="detail-label">الفئة:</span><span class="detail-value">${esc(this.getCategoryLabel(act.category))}</span></div><div class="detail-item"><span class="detail-label">العملية:</span><span class="detail-value">${esc(this.getActionLabel(act.action))}</span></div><div class="detail-item"><span class="detail-label">الأولوية:</span><span class="detail-value">${esc(this.getPriorityLabel(act.priority))}</span></div><div class="detail-item"><span class="detail-label">جلسة العمل:</span><span class="detail-value">${esc(act.sessionId)}</span></div><div class="detail-item"><span class="detail-label">عنوان URL:</span><span class="detail-value">${esc(act.details?.url || 'غير محدد')}</span></div></div><h4 class="section-subtitle">التفاصيل الإضافية:</h4><pre class="activity-json">${esc(JSON.stringify(act.details,null,2))}</pre></div><div class="modal-actions"><button class="btn btn-secondary" data-al-action="close-modal" autofocus><i class="fas fa-times"></i> إغلاق</button></div></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); if(e.target.closest('[data-al-action="close-modal"]')) modal.remove(); });
  // Return focus to first focusable element after close (basic)
  const closeBtn = modal.querySelector('[data-al-action="close-modal"]'); if(closeBtn) closeBtn.focus();
    }
    renderPagination(){
      const pag=document.getElementById('pagination'); if(!pag) return; if(this.totalPages<=1){ pag.innerHTML=''; return; }
      let html=''; if(this.currentPage>1) html+=`<button class="page-btn" data-al-action="goto" data-page="${this.currentPage-1}">السابق</button>`;
      const start=Math.max(1,this.currentPage-2), end=Math.min(this.totalPages,this.currentPage+2);
      for(let i=start;i<=end;i++){ const active=i===this.currentPage?'active':''; html+=`<button class="page-btn ${active}" data-al-action="goto" data-page="${i}">${i}</button>`; }
      if(this.currentPage<this.totalPages) html+=`<button class="page-btn" data-al-action="goto" data-page="${this.currentPage+1}">التالي</button>`;
      pag.innerHTML=html;
      pag.querySelectorAll('[data-al-action="goto"]').forEach(btn=> btn.addEventListener('click', ()=>{ this.goToPage(parseInt(btn.getAttribute('data-page'),10)); }));
    }
    goToPage(p){ this.currentPage=p; this.renderTable(); this.renderPagination(); }
    showLoading(show){ const spinner=document.getElementById('loading-spinner'); const table=document.getElementById('activity-table'); if(spinner&&table){ spinner.style.display=show?'block':'none'; table.style.display=show?'none':'table'; } }
  showError(msg){ const div=document.createElement('div'); div.className='error-toast'; div.innerHTML=`<strong>خطأ:</strong> ${msg}<button data-al-action="dismiss-error" class="dismiss-btn" aria-label="إغلاق">&times;</button>`; document.body.appendChild(div); setTimeout(()=> div.remove(),5000); div.addEventListener('click', e=>{ if(e.target.getAttribute('data-al-action')==='dismiss-error') div.remove(); }); }
    clearFilters(){ ['category-filter','priority-filter','user-filter','start-date-filter','end-date-filter','search-filter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); this.applyFilters(); }
    async refreshData(){ await this.loadData(); }
    async exportReport(){
      try {
        const filters=this.getFilterValues();
        const report = await window.activityLogger?.getActivityReport?.({ startDate:filters.startDate, endDate:filters.endDate, category:filters.category, userId:filters.userId });
        const data={ generatedAt:new Date().toISOString(), filters, statistics:report, activities:this.filteredActivities };
        if(window.ExportUtils){
          ExportUtils.toJSON(data,'activity-report');
          const rows = this.filteredActivities.map(a=>({
            timestamp: window.FormatUtils? FormatUtils.formatArabicDateTime(a.timestamp): new Date(a.timestamp).toLocaleString('ar-SA'),
            user: a.userEmail || a.userDisplayName || 'غير معروف',
            category: this.getCategoryLabel(a.category),
            action: this.getActionLabel(a.action),
            priority: this.getPriorityLabel(a.priority)
          }));
          if(rows.length) ExportUtils.toCSV(rows, ['timestamp','user','category','action','priority'], 'activity-report-summary');
        } else {
          this.downloadReportFallback(data);
        }
      } catch(err){ console.error('Error exporting report', err); this.showError('خطأ في تصدير التقرير'); }
    }
    downloadReportFallback(data){ const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`activity-report-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    escape(t){ return window.FormatUtils? FormatUtils.escapeHtml(t): (t? String(t).replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s])): ''); }
    destroy(){ if(this.realTimeListener) this.realTimeListener(); }
  }

  class ActivityAnalytics {
    constructor(){ this.charts={}; this.initCharts(); }
    initCharts(){ this.initCategoryChart(); this.initTimelineChart(); this.initUserActivityChart(); this.initPriorityChart(); }
    initCategoryChart(){
      const ctx=document.getElementById('categoryChart');
      if(!ctx) return;
      this.charts.category = new Chart(ctx, {
        type:'doughnut',
        data:{
          labels:['المصادقة','إدارة الملفات','إدارة المستخدمين','النظام','الأمان'],
          datasets:[{
            data:[0,0,0,0,0],
            backgroundColor:['#3b82f6','#10b981','#f59e0b','#6b7280','#ef4444']
          }]
        },
        options:{
          responsive:true,
            maintainAspectRatio:false,
            plugins:{
              legend:{ position:'bottom' }
            }
        }
      });
    }
    initTimelineChart(){ const ctx=document.getElementById('timelineChart'); if(!ctx) return; this.charts.timeline=new Chart(ctx,{ type:'line', data:{ labels:[], datasets:[{ label:'الأنشطة', data:[], borderColor:'#667eea', backgroundColor:'rgba(102,126,234,0.1)', tension:0.4 }]}, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } } }); }
    initUserActivityChart(){ const ctx=document.getElementById('userActivityChart'); if(!ctx) return; this.charts.userActivity=new Chart(ctx,{ type:'bar', data:{ labels:[], datasets:[{ label:'عدد الأنشطة', data:[], backgroundColor:'#10b981' }]}, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } } }); }
    initPriorityChart(){ const ctx=document.getElementById('priorityChart'); if(!ctx) return; this.charts.priority=new Chart(ctx,{ type:'pie', data:{ labels:['عادي','عالي','حرج'], datasets:[{ data:[0,0,0], backgroundColor:['#10b981','#f59e0b','#ef4444']}]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } } }); }
    updateData(acts){ this.updateCategoryChart(acts); this.updateTimelineChart(acts); this.updateUserActivityChart(acts); this.updatePriorityChart(acts); }
    updateCategoryChart(acts){ if(!this.charts.category) return; const counts={authentication:0,file_management:0,user_management:0,system:0,security:0}; acts.forEach(a=>{ if(counts.hasOwnProperty(a.category)) counts[a.category]++; }); this.charts.category.data.datasets[0].data=Object.values(counts); this.charts.category.update(); }
    updateTimelineChart(acts){ if(!this.charts.timeline) return; const now=new Date(); const hours=[]; const counts=[]; for(let i=23;i>=0;i--){ const hour=new Date(now.getTime()-(i*3600000)); hours.push(hour.getHours()+':00'); const start=hour.getTime(); const end=start+3600000; counts.push(acts.filter(a=> a.timestamp>=start && a.timestamp<end).length); } this.charts.timeline.data.labels=hours; this.charts.timeline.data.datasets[0].data=counts; this.charts.timeline.update(); }
    updateUserActivityChart(acts){ if(!this.charts.userActivity) return; const userCounts={}; acts.forEach(a=>{ const u=a.userEmail || a.userDisplayName || 'غير معروف'; userCounts[u]=(userCounts[u]||0)+1; }); const top=Object.entries(userCounts).sort(([,a],[,b])=> b-a).slice(0,10); this.charts.userActivity.data.labels=top.map(([u])=>u); this.charts.userActivity.data.datasets[0].data=top.map(([,c])=>c); this.charts.userActivity.update(); }
    updatePriorityChart(acts){ if(!this.charts.priority) return; const counts={normal:0,high:0,critical:0}; acts.forEach(a=>{ if(counts.hasOwnProperty(a.priority)) counts[a.priority]++; }); this.charts.priority.data.datasets[0].data=Object.values(counts); this.charts.priority.update(); }
    addRealTimeActivity(a){
      if(this.charts.category){ this.updateCategoryChart([a]); }
      if(this.charts.timeline){
        const now=new Date();
        const hour=now.getHours()+':00';
        const idx=this.charts.timeline.data.labels.indexOf(hour);
        if(idx!==-1){
          this.charts.timeline.data.datasets[0].data[idx]++;
          this.charts.timeline.update();
        }
      }
    }
  }

  function initPage(){
    // Instantiate analytics early so dashboard can call it
    window.analytics = new ActivityAnalytics();
    window.__activityLogsDashboard = new ActivityLogsDashboard();
    
    log('activity logs page initialized');
  }

  // Wait for DOM & page bootstrap event
  document.addEventListener('page:ready', initPage, { once:true });
  if(document.readyState==='complete' || document.readyState==='interactive'){
    // fallback if page:ready already fired (older pages)
    setTimeout(()=>{ if(!window.__activityLogsDashboard) initPage(); }, 500);
  }
})();
