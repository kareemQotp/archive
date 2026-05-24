// Core Loader: loads scripts based on module-manifest.json sequentially with dependency resolution
(function(){
  if(window.__CORE_LOADER__) return; window.__CORE_LOADER__=true;
  const registry = {}; // name -> {status, started, ended, error?}
  window.__MODULE_REGISTRY__ = registry;
  let manifestCache = null;
  let loaderReady = false;

  function fetchJSON(url){ return fetch(url,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('manifest fetch failed'); return r.json(); }); }
  function loadScript(path){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=path; s.defer=true; s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Failed '+path));
      document.head.appendChild(s);
    });
  }
  function topo(modules){
    const graph = new Map();
    const nameToMod = new Map();
    modules.forEach(m=>{ nameToMod.set(m.name,m); graph.set(m.name,(m.after||[])); });
    const visited=new Set(), temp=new Set(), order=[];
    function visit(n){ if(visited.has(n)) return; if(temp.has(n)) throw new Error('Cycle at '+n); temp.add(n); (graph.get(n)||[]).forEach(visit); temp.delete(n); visited.add(n); order.push(n); }
    modules.forEach(m=>visit(m.name));
    return order.map(n=>nameToMod.get(n));
  }
  async function loadEager(){
    manifestCache = await fetchJSON('assets/js/module-manifest.json');
    window.__MODULE_MANIFEST__ = manifestCache;
    
    // فلترة ملفات الإشعارات في صفحة الفهرس
    const currentPage = window.location.pathname;
    const isIndexPage = currentPage === '/' || currentPage.includes('index.html') || currentPage === '';
    
    let eager = manifestCache.modules.filter(m=>!m.lazy);
    
    if (isIndexPage) {
      // منع تحميل ملفات الإشعارات في صفحة الفهرس
      const notificationModules = ['notifications', 'notification-service', 'notification-badge', 'smart-notifications', 'advanced-alerts', 'notification-integration'];
      // منع تحميل وحدات الصفحات الخاصة التي قد تفترض وجود مصادقة وتعيد التوجيه
      const pageSpecificModules = ['upload-page', 'file-tracking-page', 'activity-logs-page', 'movement-reports-page', 'global-search'];
      const blocked = new Set([...notificationModules, ...pageSpecificModules]);
      eager = eager.filter(m => m && m.name && !blocked.has(m.name));
      console.log('🔇 تم منع تحميل وحدات الإشعارات ووحدات الصفحات الخاصة في صفحة الفهرس');
    }
    
    const ordered = topo(eager.filter(m => m && m.name));
    for(const mod of ordered){
      registry[mod.name] = {status:'loading', path:mod.path, started:performance.now()};
      window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('module:loading', mod.name);
      try { await loadScript(mod.path); registry[mod.name].status='loaded'; }
      catch(e){ registry[mod.name].status='error'; registry[mod.name].error=e.message; console.error('Loader error', mod.name, e); }
      registry[mod.name].ended=performance.now();
      window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('module:loaded', {name:mod.name, record:registry[mod.name]});
    }
    loaderReady = true;
    window.__LOADER_READY__ = true;
    window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('loader:ready', registry);
  }

  async function loadModule(name){
    if(!manifestCache){ console.warn('core-loader: manifest not ready yet'); return; }
    if(registry[name]){ return registry[name].status; }
    const mod = manifestCache.modules.find(m=>m.name===name);
    if(!mod){ console.warn('core-loader: unknown module', name); return; }
    // ensure dependencies loaded first
    if(mod.after){ for(const dep of mod.after){ if(!registry[dep]) await loadModule(dep); } }
    registry[name] = {status:'loading', path:mod.path, started:performance.now()};
    window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('module:loading', name);
    try { await loadScript(mod.path); registry[name].status='loaded'; }
    catch(e){ registry[name].status='error'; registry[name].error=e.message; console.error('Loader error', name, e); }
    registry[name].ended=performance.now();
    window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('module:loaded', {name, record:registry[name]});
    return registry[name].status;
  }

  // Public API
  window.__loadModule = loadModule;
  window.__whenLoaderReady = function(cb){ if(loaderReady) cb(registry); else window.__EVENT_BUS__ && window.__EVENT_BUS__.on('loader:ready', ()=>cb(registry)); };

  loadEager().catch(e=>console.error('core-loader fatal', e));
})();