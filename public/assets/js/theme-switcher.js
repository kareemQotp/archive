// theme-switcher.js: toggle light/dark, persist in localStorage
(function(){
  if(window.__THEME_SWITCHER__) return; window.__THEME_SWITCHER__=true;
  const KEY='archive-theme';
  function apply(theme){
    document.body.classList.toggle('theme-dark', theme==='dark');
    localStorage.setItem(KEY, theme);
    window.UX && UX.announce(theme==='dark'?'تم تفعيل الوضع الداكن':'تم تفعيل الوضع الفاتح');
  }
  function init(){
    const stored = localStorage.getItem(KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    apply(stored);
    injectButton();
  }
  function injectButton(){
    if(document.querySelector('[data-theme-toggle]')) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='theme-toggle-btn';
    btn.setAttribute('data-theme-toggle','');
    btn.setAttribute('aria-label','تغيير وضع الألوان');
    updateBtnIcon(btn);
    btn.addEventListener('click',()=>{
      const now = document.body.classList.contains('theme-dark')?'light':'dark';
      apply(now); updateBtnIcon(btn);
    });
    // Prefer placing inside a header container if exists
    const header = document.querySelector('.activity-header, .mr-page-header, header, .page-header');
    if(header){
      const wrap = header.querySelector('.header-actions') || header;
      wrap.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
  }
  function updateBtnIcon(btn){
    const dark = document.body.classList.contains('theme-dark');
    btn.innerHTML = dark?'<i class="fas fa-sun"></i><span>وضع فاتح</span>':'<i class="fas fa-moon"></i><span>وضع داكن</span>';
  }
  document.addEventListener('DOMContentLoaded', init);
})();