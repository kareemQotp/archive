// export-utils.js: unified CSV / JSON exporting with BOM + safe filenames
(function(){
  if(window.__EXPORT_UTILS__) return; window.__EXPORT_UTILS__=true;
  const Exporter = {};
  function safeName(base, ext){ const stamp = new Date(); const d = `${stamp.getFullYear()}-${String(stamp.getMonth()+1).padStart(2,'0')}-${String(stamp.getDate()).padStart(2,'0')}_${String(stamp.getHours()).padStart(2,'0')}-${String(stamp.getMinutes()).padStart(2,'0')}`; return `${base}_${d}.${ext}`; }
  Exporter.downloadBlob = function(blob, filename){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
  Exporter.toCSV = function(rows, headers, filenameBase, options={}){
    const BOM='\uFEFF';
    const headerLine = headers.map(h=>`"${String(h).replace(/"/g,'""')}"`).join(',');
    const body = rows.map(r=> headers.map(key=> `"${String(r[key] ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const csv = BOM + headerLine + '\n' + body + '\n';
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    Exporter.downloadBlob(blob, safeName(filenameBase,'csv'));
  };
  Exporter.toJSON = function(obj, filenameBase){ const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'}); Exporter.downloadBlob(blob, safeName(filenameBase,'json')); };
  window.ExportUtils = Exporter;
})();