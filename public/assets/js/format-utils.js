// format-utils.js: shared formatting + text helpers
(function(){
  if(window.__FORMAT_UTILS__) return; window.__FORMAT_UTILS__=true;
  const Format = {};
  Format.parseTimestamp = function(ts){
    if(!ts) return new Date();
    if(ts instanceof Date) return ts;
    if(ts.toDate) return ts.toDate(); // Firestore Timestamp
    return new Date(ts);
  };
  Format.formatArabicDate = function(date){ date = Format.parseTimestamp(date); return date.toLocaleDateString('ar-SA'); };
  Format.formatArabicTime = function(date){ date = Format.parseTimestamp(date); return date.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}); };
  Format.formatArabicDateTime = function(date){ date = Format.parseTimestamp(date); return Format.formatArabicDate(date)+' '+Format.formatArabicTime(date); };
  Format.escapeHtml = function(txt){ if(txt===undefined||txt===null) return ''; const div=document.createElement('div'); div.textContent=String(txt); return div.innerHTML; };
  Format.truncate = function(str,len){ if(!str) return ''; if(str.length<=len) return str; return str.slice(0,len)+'...'; };
  // Relative time in Arabic (coarse). Output style matches existing UI usage (e.g., "5 دقيقة", "2 ساعة", "اليوم")
  // Rules: <60s => "الآن"; <60m => "<m> دقيقة"; <24h => "<h> ساعة"; <30d => "<d> يوم"; >=30d => full date fallback
  // NOTE: We intentionally keep simplified singular/plural handling to stay consistent with prior UI; can be enhanced later.
  Format.timeAgo = function(date){
    date = Format.parseTimestamp(date);
    const now = new Date();
    const diffSec = Math.floor((now - date)/1000);
    if(isNaN(diffSec)) return '';
    if(diffSec < 60) return 'الآن';
    const diffMin = Math.floor(diffSec/60);
    if(diffMin < 60) return diffMin + ' دقيقة';
    const diffHr = Math.floor(diffMin/60);
    if(diffHr < 24) return diffHr + ' ساعة';
    const diffDay = Math.floor(diffHr/24);
    if(diffDay < 30) return diffDay + ' يوم';
    // Fallback to absolute formatted date for older items
    return Format.formatArabicDate(date);
  };
  // Basic Arabic number formatting (digits). Falls back gracefully if Intl not available.
  Format.formatArabicNumber = function(num){
    if(num===undefined||num===null||num!==num) return '';
    try { return new Intl.NumberFormat('ar-SA').format(num); } catch{ return String(num); }
  };
  window.FormatUtils = Format;
})();