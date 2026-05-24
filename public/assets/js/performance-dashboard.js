// performance-dashboard.js: visualizes perfMetrics history & module load timings
(function(){
  if(window.__PERF_DASH__) return; window.__PERF_DASH__=true;
  function createPanel(){
    if(document.getElementById('perf-dashboard-panel')) return;
    const panel=document.createElement('div');
    panel.id='perf-dashboard-panel';
    panel.className='perf-dashboard collapsed';
    panel.innerHTML=`<button class="perf-toggle" aria-expanded="false">⚡ الأداء</button>
      <div class="perf-body"><h5>الأداء (آخر تشغيل)</h5><div class="perf-steps"></div><h6 class="mt-3">الوحدات</h6><div class="perf-modules"></div>
      <button class="btn btn-sm btn-outline-secondary mt-2" data-perf-action="refresh">تحديث</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.perf-toggle').addEventListener('click',()=>{
      panel.classList.toggle('collapsed');
      const exp = !panel.classList.contains('collapsed');
      panel.querySelector('.perf-toggle').setAttribute('aria-expanded', exp);
      if(exp) render();
    });
    panel.addEventListener('click', e=>{
      if(e.target.getAttribute('data-perf-action')==='refresh'){ render(true); }
    });
  }
  function fmt(ms){ return ms==null?'-': ms.toFixed(1)+'ms'; }
  function render(force=false){
    if(!window.perfMetrics) return;
    const stepsEl=document.querySelector('#perf-dashboard-panel .perf-steps');
    const modsEl=document.querySelector('#perf-dashboard-panel .perf-modules');
    if(!stepsEl||!modsEl) return;
    const hist = perfMetrics.history();
    const latest = hist[hist.length-1];
    if(!latest) { stepsEl.innerHTML='<em>لا بيانات</em>'; modsEl.innerHTML=''; return; }
    stepsEl.innerHTML = `<table class="table table-sm table-striped mb-1"><thead><tr><th>الخطوة</th><th>الزمن</th></tr></thead><tbody>`+
      latest.entries.map(e=> `<tr><td>${e.step}</td><td>${fmt(e.ms)}</td></tr>`).join('')+`</tbody></table>`;
    const mods = latest.modules.slice().sort((a,b)=> (a.ms||0)-(b.ms||0));
    modsEl.innerHTML = `<table class="table table-sm table-bordered mb-0"><thead><tr><th>الوحدة</th><th>الحالة</th><th>الزمن</th></tr></thead><tbody>`+
      mods.map(m=> `<tr><td>${m.name}</td><td>${m.status}</td><td>${fmt(m.ms||0)}</td></tr>`).join('')+`</tbody></table>`;
  }
  function init(){ createPanel(); }
  document.addEventListener('DOMContentLoaded', init);
  window.__EVENT_BUS__ && window.__EVENT_BUS__.on && window.__EVENT_BUS__.on('perf:report', ()=> render());
})();
