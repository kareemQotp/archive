// Performance Metrics Collector
(function(){
  if(window.__PERF_METRICS_LOADED__) return; window.__PERF_METRICS_LOADED__=true;
  const marks = {};
  const runId = Date.now();
  function mark(name){ marks[name] = performance.now(); }
  function persist(entries){
    try {
      const key = 'perf:history';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ t: new Date().toISOString(), runId, entries, modules: snapshotModules() });
      while(existing.length>20) existing.shift(); // keep last 20
      localStorage.setItem(key, JSON.stringify(existing));
    } catch(e){ /* ignore */ }
  }
  function snapshotModules(){
    try {
      const reg = window.__MODULE_REGISTRY__ || {}; 
      return Object.entries(reg).map(([name,rec])=>({name, status:rec.status, ms: rec.ended && rec.started ? +(rec.ended-rec.started).toFixed(2): null}));
    } catch(e){ return []; }
  }
  function report(){
    const base = marks['start'] || 0;
    const entries = Object.entries(marks).filter(([k])=>k!=='start').map(([k,v])=>({step:k, ms: +(v-base).toFixed(2)}));
    console.table(entries);
    persist(entries);
    window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('perf:report', entries);
  }
  mark('start');
  window.addEventListener('DOMContentLoaded', ()=>mark('domContentLoaded'));
  window.addEventListener('load', ()=>{ mark('windowLoad'); setTimeout(report, 0); });
  window.perfMetrics = { mark, report, marks, history(){ try { return JSON.parse(localStorage.getItem('perf:history')||'[]'); } catch(e){ return []; } }, snapshotModules };
})();