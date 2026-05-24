/**
 * update-html-pages.js
 * توحيد رؤوس (head) صفحات HTML بإضافة السكربتات المشتركة (format-utils, ux-core)
 * وتحسين إمكانية الوصول (رابط تخطي للمحتوى) بدون تعديل منطق الصفحات.
 * آمن للتشغيل المتكرر (Idempotent).
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function listHtmlFiles(dir){
  const entries = fs.readdirSync(dir, { withFileTypes:true });
  let files = [];
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) files = files.concat(listHtmlFiles(full));
    else if(e.isFile() && e.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function ensureSharedScripts(html){
  const hasFormat = /format-utils\.js/.test(html);
  const hasUX = /ux-core\.js/.test(html);
  if(hasFormat && hasUX) return html; // Already present

  // Insert before </head>
  const injectLines = [];
  if(!hasFormat) injectLines.push('    <script defer src="assets/js/format-utils.js"></script>');
  if(!hasUX) injectLines.push('    <script defer src="assets/js/ux-core.js"></script>');
  const injectBlock = injectLines.join('\n');
  return html.replace(/<\/head>/i, m=> injectBlock + '\n' + m);
}

function ensureSkipLink(html){
  let updated = html;
  // Ensure an element with id="mainContent" exists (attach to first container-like div if missing)
  if(!/id=("|')mainContent\1/.test(updated)){
    updated = updated.replace(/<div([^>]*class=("|')[^"']*(container|main-container|auth-container)[^"']*("')[^>]*)>/i, (full)=>{
      if(/id=/.test(full)) return full; // keep existing id
      return full.replace(/>$/, ' id="mainContent">');
    });
  }
  // Inject skip link if missing
  if(!/class=("|')skip-link/.test(updated)){
    updated = updated.replace(/<body[^>]*>/i, (m)=> m + '\n    <a href="#mainContent" class="skip-link visually-hidden-focusable">تخطي إلى المحتوى الرئيسي</a>');
  }
  // Enforce accessibility attributes (role="main" + tabindex) on #mainContent element
  updated = updated.replace(/<(div|main)([^>]*\bid=("|')mainContent\3[^>]*)>/i, (match, tag, rest)=>{
    let newRest = rest;
    if(!/role=/.test(newRest)) newRest += ' role="main"';
    if(!/tabindex=/.test(newRest)) newRest += ' tabindex="-1"';
    return `<${tag}${newRest}>`;
  });
  return updated;
}

function processFile(file){
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;
  html = ensureSharedScripts(html);
  html = ensureSkipLink(html);
  if(html !== orig){
    fs.writeFileSync(file, html, 'utf8');
    return true;
  }
  return false;
}

function run(){
  const files = listHtmlFiles(PUBLIC_DIR);
  let changed = 0;
  files.forEach(f=>{ try { if(processFile(f)) changed++; } catch(err){ console.error('Failed updating', f, err.message); } });
  console.log(`✅ تحديث الصفحات اكتمل. تم تعديل ${changed} من ${files.length} صفحة.`);
}

if(require.main === module){
  run();
}

module.exports = { run };
