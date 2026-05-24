// classification-page.js
// وحدة إدارة التصنيفات - إنشاء / تعديل / حذف وربط الوثائق
// تعتمد على: unified-auth.js, firebase-init.js, activity-logger.js
(function(){
  'use strict';

  const state = {
    categories: new Map(), // id -> data
    treeBuilt: false,
    user: null,
    department: null,
    unsubscribe: null,
    selectedCategoryId: null,
    loading: false
  };

  const els = {};

  function qs(id){ return document.getElementById(id); }

  function initElements(){
    Object.assign(els, {
      form: qs('categoryForm'),
      catId: qs('catId'),
      catName: qs('catName'),
      catSlug: qs('catSlug'),
      catLevel: qs('catLevel'),
      catPriority: qs('catPriority'),
      catParent: qs('catParent'),
      btnSave: qs('btnSaveCategory'),
      btnNew: qs('btnNewCategory'),
      tree: qs('categoryTree'),
      assignForm: qs('assignForm'),
      assignDocId: qs('assignDocId'),
      assignCategory: qs('assignCategory'),
      btnAssign: qs('btnAssignCategory'),
      searchInput: qs('categorySearch'),
      statsBox: qs('categoryStats'),
      alertBox: qs('categoryAlerts')
    });
  }

  function logActivity(action, details){
    if(window.activityLogger){
      window.activityLogger.log(action, details || {});
    } else {
      console.debug('[classification] activity:', action, details);
    }
  }

  function showAlert(type, msg){
    if(!els.alertBox) return;
    const id = 'al_'+Date.now();
    const div = document.createElement('div');
    div.className = `alert alert-${type} py-2 px-3 small`;
    div.role = 'alert';
    div.id = id;
    div.textContent = msg;
    els.alertBox.prepend(div);
    setTimeout(()=>div.remove(), 6000);
  }

  function slugify(txt){
    return (txt||'').trim()
      .toLowerCase()
      .replace(/\s+/g,'-')
      .replace(/[^\w\-أ-ي]+/g,'')
      .replace(/--+/g,'-');
  }

  function ensureAuthReady(){
    return new Promise((resolve,reject)=>{
      if(window.auth && window.auth.currentUser){
        return resolve(window.auth.currentUser);
      }
      const timeout = setTimeout(()=>reject(new Error('timeout waiting auth')), 12000);
      document.addEventListener('firebaseAuthReady', ()=>{
        clearTimeout(timeout);
        resolve(window.auth.currentUser);
      }, { once:true });
    });
  }

  async function loadCategoriesRealtime(){
    const db = firebase.firestore();
    // collection: categories (department scoped field department)
    const ref = db.collection('categories').where('active','==', true).orderBy('priority','asc');
    state.unsubscribe = ref.onSnapshot(snap=>{
      state.categories.clear();
      snap.forEach(doc=>{
        const data = doc.data();
        state.categories.set(doc.id, { id:doc.id, ...data });
      });
      buildTree();
      populateParentSelect();
      populateAssignSelect();
      updateStats();
    }, err=>{
      console.error('[classification] snapshot error', err);
      showAlert('danger', 'خطأ في جلب التصنيفات');
    });
  }

  function buildTree(){
    if(!els.tree) return;
    els.tree.innerHTML = '';
    const root = document.createElement('ul');
    root.className = 'list-unstyled mb-0';
    const cats = Array.from(state.categories.values());

    const byParent = new Map();
    cats.forEach(c=>{
      const p = c.parentId || '__root__';
      if(!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(c);
    });

    function render(parentId, container, level){
      const list = byParent.get(parentId);
      if(!list) return;
      list.sort((a,b)=> (a.priority||0) - (b.priority||0) || a.name.localeCompare(b.name, 'ar'));
      list.forEach(cat=>{
        const li = document.createElement('li');
        li.className = 'mb-1';
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='btn btn-sm btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center';
        btn.innerHTML = `<span>${'— '.repeat(level)}${cat.name} <small class="text-muted">(${cat.slug||''})</small></span><span class="badge bg-primary-subtle text-primary ms-2">${cat.priority||0}</span>`;
        btn.addEventListener('click', ()=> selectCategory(cat.id));
        li.appendChild(btn);
        container.appendChild(li);
        // children
        render(cat.id, container, level+1);
      });
    }

    render('__root__', root, 0);
    els.tree.appendChild(root);
  }

  function populateParentSelect(){
    if(!els.catParent) return;
    const current = els.catParent.value;
    els.catParent.innerHTML = '<option value="">(بدون)</option>';
    Array.from(state.categories.values())
      .filter(c=> !state.selectedCategoryId || c.id !== state.selectedCategoryId)
      .forEach(c=>{
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        els.catParent.appendChild(opt);
      });
    if(current && els.catParent.querySelector(`option[value="${current}"]`)){
      els.catParent.value = current;
    }
  }

  function populateAssignSelect(){
    if(!els.assignCategory) return;
    const sel = els.assignCategory;
    const current = sel.value;
    sel.innerHTML = '<option value="">اختر تصنيفاً</option>';
    Array.from(state.categories.values()).forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    if(current && sel.querySelector(`option[value="${current}"]`)) sel.value = current;
  }

  function updateStats(){
    if(!els.statsBox) return;
    const total = state.categories.size;
    const topLevel = Array.from(state.categories.values()).filter(c=> !c.parentId).length;
    els.statsBox.textContent = `الإجمالي: ${total} | الجذر: ${topLevel}`;
  }

  function selectCategory(id){
    const cat = state.categories.get(id);
    if(!cat) return;
    state.selectedCategoryId = id;
    els.catId.value = cat.id;
    els.catName.value = cat.name || '';
    els.catSlug.value = cat.slug || '';
    els.catLevel.value = cat.level || '';
    els.catPriority.value = cat.priority || 0;
    els.catParent.value = cat.parentId || '';
    els.btnSave.textContent = 'تحديث التصنيف';
    logActivity('category_select', { id });
    populateParentSelect();
  }

  function resetForm(){
    state.selectedCategoryId = null;
    els.form.reset();
    els.catId.value='';
    els.btnSave.textContent = 'حفظ التصنيف';
    populateParentSelect();
  }

  async function saveCategory(evt){
    evt.preventDefault();
    if(state.loading) return;
    const name = els.catName.value.trim();
    if(!name){
      showAlert('warning','يرجى إدخال اسم التصنيف');
      return;
    }
    const slug = els.catSlug.value.trim() || slugify(name);
    const data = {
      name,
      slug,
      level: Number(els.catLevel.value)||0,
      priority: Number(els.catPriority.value)||0,
      parentId: els.catParent.value || null,
      active: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      department: state.department || null,
      updatedBy: state.user ? state.user.uid : null
    };
    const db = firebase.firestore();
    try {
      state.loading = true;
      els.btnSave.disabled = true;
      if(state.selectedCategoryId){
        await db.collection('categories').doc(state.selectedCategoryId).set(data, { merge:true });
        showAlert('success','تم تحديث التصنيف');
        logActivity('category_update', { id: state.selectedCategoryId });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.createdBy = state.user ? state.user.uid : null;
        const ref = await db.collection('categories').add(data);
        showAlert('success','تم إنشاء التصنيف');
        logActivity('category_create', { id: ref.id });
      }
      resetForm();
    } catch(err){
      console.error(err);
      showAlert('danger','خطأ أثناء الحفظ');
    } finally {
      state.loading = false;
      els.btnSave.disabled = false;
    }
  }

  async function assignCategory(evt){
    evt.preventDefault();
    const docId = els.assignDocId.value.trim();
    const catId = els.assignCategory.value;
    if(!docId){ showAlert('warning','أدخل معرف الوثيقة'); return; }
    if(!catId){ showAlert('warning','اختر تصنيفاً'); return; }
    const cat = state.categories.get(catId);
    if(!cat){ showAlert('danger','تصنيف غير موجود'); return; }
    try {
      const db = firebase.firestore();
      await db.collection('documents').doc(docId).set({
        classificationId: cat.id,
        classificationName: cat.name,
        classificationSlug: cat.slug,
        classificationUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
      showAlert('success','تم ربط التصنيف بالوثيقة');
      logActivity('document_classification_assign', { docId, catId });
      els.assignForm.reset();
    } catch(err){
      console.error(err);
      showAlert('danger','تعذر ربط التصنيف');
    }
  }

  function setupEvents(){
    els.form.addEventListener('submit', saveCategory);
    els.btnNew.addEventListener('click', resetForm);
    els.assignForm.addEventListener('submit', assignCategory);
    els.searchInput.addEventListener('input', handleSearch);
  }

  function handleSearch(){
    const q = els.searchInput.value.trim().toLowerCase();
    const buttons = els.tree.querySelectorAll('button');
    buttons.forEach(btn=>{
      const text = btn.textContent.toLowerCase();
      btn.style.display = text.includes(q) ? '' : 'none';
    });
  }

  function enforceRole(){
    // Only admin or archive department can access fully
    if(!window.unifiedAuth || !window.unifiedAuth.currentUserProfile) return;
    const profile = window.unifiedAuth.currentUserProfile;
    if(!(profile.role === 'admin' || profile.department === 'archive')){
      showAlert('danger','ليست لديك صلاحية كاملة لإدارة التصنيفات (عرض فقط)');
      els.form.querySelectorAll('input,select,button').forEach(el=>{
        if(el.id !== 'categorySearch') el.disabled = true;
      });
      els.btnAssign.disabled = true;
    }
  }

  async function bootstrap(){
    try {
      await ensureAuthReady();
      state.user = window.auth.currentUser;
      if(window.unifiedAuth && window.unifiedAuth.currentUserProfile){
        state.department = window.unifiedAuth.currentUserProfile.department || null;
      }
      initElements();
      setupEvents();
      enforceRole();
      await loadCategoriesRealtime();
      showAlert('info','تم تحميل التصنيفات');
    } catch(err){
      console.error('[classification] bootstrap failed', err);
      showAlert('danger','فشل تهيئة صفحة التصنيفات');
    }
  }

  document.addEventListener('firebaseReady', bootstrap, { once:true });
})();