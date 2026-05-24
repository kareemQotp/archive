// upload-page.js - extracted logic from upload.html inline script (phase 1)
(function(){
  if(window.__UPLOAD_PAGE__) return; window.__UPLOAD_PAGE__=true;
  const bus = window.__EVENT_BUS__;
  let permissionController; let selectedFiles=[]; let bulkFiles=[]; let uploadInProgress=false;
  // Unified notify helper
  function notify(msg,type='info'){
    if(window.UX && window.UX.toast){ try { window.UX.toast(msg,type); return; } catch(e){} }
    if(window.notify){ try { window.notify(msg,type); return; } catch(e){} }
    try { alert(msg); } catch(e){}
  }
  function onAuth(user){
    if(!user){
      // Respect page-level overrides and demo mode to avoid unwanted redirects
      const redirectDisabled = !!(window.__UPLOAD_PAGE_REDIRECT_DISABLED__);
      const allowDemo = !!(window.__ALLOW_DEMO_MODE__);
      const demoEnabled = localStorage.getItem('demo_mode') === 'true';
      if (redirectDisabled || allowDemo || demoEnabled) {
        // Do not redirect; page will handle demo/guest state
        return;
      }
      location.href='login.html?message=session-expired';
      return;
    }
    const displayName = user.displayName || (user.email? user.email.split('@')[0] : 'مستخدم');
    const userInfoEl = document.getElementById('userInfo'); if(userInfoEl){ userInfoEl.innerHTML = '<i class="fas fa-user me-1"></i>'+displayName; }
    if(permissionController) permissionController.updateUI();
    if(window.sidebarManager){ const role = window.unifiedAuth.getCurrentUserRole(); window.sidebarManager.updateSidebarNav(true, role); }
  }
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function waitFor(pred){ for(let i=0;i<80;i++){ if(pred()) return true; await wait(100);} return false; }
  function qs(id){ return document.getElementById(id); }
  // Legacy inline UI replaced by unified UX layer; retain container fallback
  function showAlert(message,type){
    // Keep container message for inline context (accessible region) while also toast
    const c=qs('alertContainer');
    if(c){ c.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert"><i class="fas fa-${type==='success'?'check-circle':(type==='warning'?'exclamation-triangle':'exclamation-circle')} me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`; }
    notify(message, type==='danger'?'error':(type==='warning'?'warning':type));
  }
  function showLoading(show, key='upload-page-op'){
    if(window.UX && window.UX.showLoading){ if(show) window.UX.showLoading(key); else window.UX.hideLoading(key); return; }
    const o=qs('loadingOverlay'); if(!o) return; o.classList[show?'remove':'add']('d-none');
  }
  function formatFileSize(bytes){ if(bytes===0) return '0 Bytes'; const k=1024; const sizes=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2))+' '+sizes[i]; }
  function getFileIcon(ext){ switch(ext){ case 'pdf':return '-pdf'; case 'doc': case 'docx': return '-word'; case 'xls': case 'xlsx': return '-excel'; case 'png': case 'jpg': case 'jpeg': return '-image'; default: return ''; } }
  function displayFiles(){ const list=qs('fileList'); if(!list) return; list.innerHTML=''; selectedFiles.forEach((file,i)=>{ const ext=file.name.split('.').pop().toLowerCase(); const size=formatFileSize(file.size); const item=document.createElement('div'); item.className='file-item'; item.innerHTML=`<div class="d-flex align-items-center"><div class="file-icon ${ext}"><i class="fas fa-file${getFileIcon(ext)}"></i></div><div class="flex-grow-1 ms-3"><h6 class="mb-1">${file.name}</h6><small class="text-muted">${size}</small><div class="progress mt-2" style="height:6px;"><div class="progress-bar" id="progress-${i}" style="width:0%"></div></div></div><button class="btn btn-outline-danger btn-sm" data-remove-index="${i}"><i class="fas fa-times"></i></button></div>`; list.appendChild(item); }); const btn=qs('uploadBtn'); if(btn) btn.disabled=selectedFiles.length===0; }
  function updateFileProgress(i,progress,err){ const bar=qs(`progress-${i}`); if(!bar) return; bar.style.width=`${progress}%`; if(err){ bar.classList.add('bg-danger'); } else if(progress===100){ bar.classList.add('bg-success'); } }
  function simulateSingleUpload(i){
    return new Promise(resolve=>{
      let p=0; const iv=setInterval(()=>{ p+=Math.random()*20; if(p>=100){ p=100; clearInterval(iv); updateFileProgress(i,100); resolve(); } else { updateFileProgress(i,p); } }, 180);
    });
  }
  async function uploadFiles(){
    if(uploadInProgress) return;
    if(selectedFiles.length===0){ showAlert('يرجى اختيار ملفات للرفع','danger'); return; }
    const title=qs('documentTitle').value.trim();
    const description=qs('documentDescription').value.trim();
    const category=qs('documentCategory').value;
    const tags=qs('documentTags').value.split(',').map(t=>t.trim()).filter(Boolean);
    if(!title){ showAlert('يرجى إدخال عنوان الوثيقة','danger'); return; }
    if(!category){ showAlert('يرجى اختيار فئة الوثيقة','danger'); return; }
    showLoading(true,'upload-batch'); uploadInProgress=true;
    try {
      const user=window.unifiedAuth && window.unifiedAuth.currentUser;
      const demoMode = localStorage.getItem('demo_mode')==='true';
      // If unauthenticated or demo mode, simulate upload locally and skip cloud calls
      if(!user){
        for(let i=0;i<selectedFiles.length;i++){
          await simulateSingleUpload(i);
        }
        showAlert('تم رفع الملف بنجاح (وضع تجريبي)!','success');
        selectedFiles=[]; displayFiles();
        qs('documentTitle').value=''; qs('documentDescription').value=''; qs('documentCategory').value=''; qs('documentTags').value='';
        return;
      }
      let allSuccess=true;
      const uploadService = new window.DocumentUploadService();
      uploadService.onProgress((p)=>{/* global progress (ignored) */});
      for(let i=0;i<selectedFiles.length;i++){
        const file=selectedFiles[i];
        try {
          uploadService.onProgress((p)=>updateFileProgress(i,p));
          const res= await uploadService.uploadFile(file,{ category, department: qs('department')?.value || 'general' });

          // Get download URL for the uploaded file
          const downloadURL = await firebase.storage().ref(res.filePath).getDownloadURL();

          // Resolve user department and normalize
          const profile = await (window.unifiedAuth?.getCurrentUserData ? window.unifiedAuth.getCurrentUserData() : null);
          const userDeptRaw = profile?.departmentId || profile?.department || qs('department')?.value || 'general';
          const normalizeDepartmentName = (dept)=>{
            const d=(dept||'').toString().trim().toLowerCase();
            const map={ 'legal':'legal','الشؤون القانونية':'legal','القانونية':'legal','قانونية':'legal','ادارة الشؤون القانونية':'legal','إدارة الشؤون القانونية':'legal','archive':'archive','الارشيف':'archive','الأرشيف':'archive','ارشيف':'archive','governance':'governance','حوكمة':'governance','الحوكمة':'governance','collection':'collection','تحصيل':'collection','التحصيل':'collection','securitization':'securitization','توريق':'securitization','التوريق':'securitization','admin':'admin','system_admin':'admin','system-admin':'admin','مدير':'admin','مدير النظام':'admin' };
            return map[d]||d||'general';
          };
          const userDept = normalizeDepartmentName(userDeptRaw);

          // Create Firestore document directly (cloud function stubs may not exist)
          const docData={
            title: title || file.name,
            description,
            category,
            tags,
            status: 'active',
            isActive: true,
            // Department fields
            department: userDept,
            departmentId: userDept,
            currentDepartment: userDept,
            // File fields
            fileName: file.name,
            filePath: res.filePath,
            downloadURL,
            fileSize: file.size,
            contentType: file.type,
            // Audit fields
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          await window.db.collection('documents').add(docData);
          updateFileProgress(i,100);
          if(window.activityLogger){ window.activityLogger.logFileUpload(file.name, file.size, file.type, true, null); }
        } catch(e){
          allSuccess=false; updateFileProgress(i,0,true);
          if(window.activityLogger){ window.activityLogger.logFileUpload(file.name, file.size, file.type, false, e); }
        }
      }
      if(allSuccess){ showAlert('تم رفع جميع الملفات بنجاح!','success'); selectedFiles=[]; displayFiles(); qs('documentTitle').value=''; qs('documentDescription').value=''; qs('documentCategory').value=''; qs('documentTags').value=''; }
      else { showAlert('انتهى الرفع مع بعض الإخفاقات. راجع السجلات.','warning'); }
      // Emit activities update for global search indexing if needed
      try { document.dispatchEvent(new CustomEvent('documents:uploaded',{ detail: { count: selectedFiles.length, title } })); } catch{}
  } catch(err){ showAlert('حدث خطأ أثناء رفع الملفات: '+err.message,'danger'); if(window.activityLogger) window.activityLogger.logSystemError(err, { source: 'upload_page' }); }
    finally { showLoading(false,'upload-batch'); uploadInProgress=false; }
  }
  function removeFile(i){ selectedFiles.splice(i,1); displayFiles(); }
  function handleFiles(files){
    const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/jpg'];
    const valid=files.filter(f=>{
      if(!allowed.includes(f.type)){ showAlert('نوع الملف غير مدعوم: '+f.name,'danger'); return false; }
      if(f.size>10*1024*1024){ showAlert('الملف كبير جداً (حد أقصى 10MB): '+f.name,'danger'); return false; }
      return true;
    });
    selectedFiles=[...selectedFiles,...valid];
    if(valid.length){ notify(`${valid.length} ملف(ات) جاهزة للرفع`,'info'); }
    displayFiles();
  }
  function initDropZones(){
    const dz=qs('dropZone');
    const input=qs('fileInput');
    if(dz&&input){
      dz.addEventListener('click',()=>input.click());
      dz.addEventListener('dragover',e=>{e.preventDefault(); dz.classList.add('dragover');});
      dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
      dz.addEventListener('drop',e=>{ e.preventDefault(); dz.classList.remove('dragover'); const files = Array.from(e.dataTransfer.files); handleFiles(files); try{ input.value=''; }catch{} });
      input.addEventListener('change',e=>{ const files = Array.from(e.target.files); handleFiles(files); try{ e.target.value=''; }catch{} });
    }
  }
  function bindGlobal(){ document.addEventListener('click',e=>{ const rm=e.target.closest('[data-remove-index]'); if(rm){ removeFile(parseInt(rm.getAttribute('data-remove-index'))); } }); const uploadBtn=qs('uploadBtn'); if(uploadBtn) uploadBtn.addEventListener('click',e=>{ e.preventDefault(); uploadFiles(); }); }
  async function bootstrap(){ await waitFor(()=>window.unifiedAuth && window.unifiedAuth.isInitialized); if(window.UIPermissionController) permissionController = new UIPermissionController(window.unifiedAuth); window.unifiedAuth.onAuthStateChanged(onAuth); initDropZones(); bindGlobal(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootstrap); else bootstrap();
})();