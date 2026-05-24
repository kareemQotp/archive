// global-search.js: simple client-side fuzzy filter across cached datasets (activities, movements)
(function(){
  if(window.__GLOBAL_SEARCH__) return; window.__GLOBAL_SEARCH__=true;
  const state = { index: [], map:new Map(), ready:false, panel:null, input:null, resultsEl:null, lastBuild:0 };
  function addActivities(list){
    list.forEach(a=>{
      const key='activity:'+a.id; const text=(a.action+' '+a.category+' '+(a.userEmail||'')+' '+JSON.stringify(a.details||''));
      state.map.set(key,{ type:'activity', id:a.id, text, ref:a });
    });
    rebuildLinear();
  }
  function addMovements(list){
    list.forEach(m=>{
      const key='movement:'+m.id; const text=(m.fileNumber+' '+m.fileName+' '+(m.userDisplayName||'')+' '+m.status);
      state.map.set(key,{ type:'movement', id:m.id, text, ref:m });
    });
    rebuildLinear();
  }
  function rebuildLinear(force){
    if(!force && performance.now()-state.lastBuild < 1500) return; // throttle rebuild
    state.index = Array.from(state.map.values());
    state.lastBuild = performance.now();
  }
  function collect(){
    // Activities
  if(window.__activityLogsDashboard && window.__activityLogsDashboard.activities){ addActivities(window.__activityLogsDashboard.activities); }
    // Movements
  if(window.__MOVEMENTS_CACHE__){ addMovements(window.__MOVEMENTS_CACHE__); }
    state.ready=true;
  }
  function ensurePanel(){
    if(state.panel) return;
    const panel=document.createElement('div'); panel.className='global-search-panel'; panel.innerHTML=`<div class="gsearch-box"><input type="text" placeholder="بحث سريع..." aria-label="بحث" class="gsearch-input"/><div class="gsearch-results" role="listbox"></div></div>`;
    document.body.appendChild(panel); state.panel=panel; state.input=panel.querySelector('.gsearch-input'); state.resultsEl=panel.querySelector('.gsearch-results');
    state.input.addEventListener('input', handleQuery);
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && panel.classList.contains('open')) close(); });
  }
  function handleQuery(){ const q=state.input.value.trim().toLowerCase(); if(!q){ state.resultsEl.innerHTML=''; return; }
    const res = state.index.filter(r=> r.text.toLowerCase().includes(q)).slice(0,25);
    state.resultsEl.innerHTML = res.map(r=> renderItem(r,q)).join('') || '<div class="gsearch-empty">لا نتائج</div>';
  }
  function renderItem(r,q){
    return `<div class="gsearch-item" data-type="${r.type}" tabindex="0" role="option"><span class="gsearch-pill ${r.type}">${r.type==='activity'?'نشاط':'حركة'}</span><span class="gsearch-text">${highlight(r.text,q)}</span></div>`;
  }
  function highlight(text,q){ const idx=text.toLowerCase().indexOf(q); if(idx===-1) return escapeHtml(text); return escapeHtml(text.slice(0,idx))+"<mark>"+escapeHtml(text.slice(idx,idx+q.length))+"</mark>"+escapeHtml(text.slice(idx+q.length)); }
  function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
  function open(){ ensurePanel(); if(!state.ready) collect(); state.panel.classList.add('open'); state.input.focus(); }
  function close(){ state.panel && state.panel.classList.remove('open'); }
  function toggle(){ state.panel && state.panel.classList.contains('open')?close():open(); }
  function shortcut(e){ if((e.ctrlKey||e.metaKey) && e.key==='k'){ e.preventDefault(); open(); } }
  document.addEventListener('keydown', shortcut);
  // Listen for update events to refresh index incrementally
  document.addEventListener('activities:updated', (e)=>{
    const latest = e.detail?.latest; if(latest){ addActivities([latest]); }
  });
  document.addEventListener('movements:updated', (e)=>{
    const latest = e.detail?.latest; if(latest){ addMovements([latest]); }
  });
  window.openGlobalSearch = open;
  window.toggleGlobalSearch = toggle;
})();