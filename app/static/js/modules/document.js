import { eventBus, EVENTS } from './events.js';
import { api } from './api.js';
import { utils } from './config.js';

// Document Manager Module
export class DocumentManager {
    constructor() {
        this.toolbar = document.getElementById('selectionToolbarContainer');
        this.selectedCount = document.getElementById('selectedCount');
        this.selectedIds = document.getElementById('selectedIds');
        this.clearBtn = document.getElementById('clearSelection');
        this.userList = document.getElementById('userList');
        this.selectedDocuments = new Set();
        this.checkboxes = document.querySelectorAll('.document-checkbox');
        
        if (this.toolbar) {
            this.initializeEventListeners();
        }
    }
    
    initializeEventListeners() {
        this.checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handleCheckboxChange(checkbox));
        });
        
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearSelection();
            });
        }

        // Handle document updates from other parts of the app
        eventBus.subscribe(EVENTS.DOCUMENT_UPDATED, (docId) => {
            this.refreshDocument(docId);
        });
    }
    
    handleCheckboxChange(checkbox) {
        const documentId = checkbox.value;
        if (checkbox.checked) {
            this.selectedDocuments.add(documentId);
            eventBus.publish(EVENTS.DOCUMENT_SELECTED, documentId);
        } else {
            this.selectedDocuments.delete(documentId);
            eventBus.publish(EVENTS.DOCUMENT_DESELECTED, documentId);
        }
        this.updateUI();
    }
    
    clearSelection() {
        this.selectedDocuments.clear();
        this.checkboxes.forEach(checkbox => checkbox.checked = false);
        this.updateUI();
    }
    
    updateUI() {
        const hasSelection = this.selectedDocuments.size > 0;
        this.toolbar.classList.toggle('d-none', !hasSelection);
        
        if (hasSelection) {
            this.selectedCount.textContent = this.selectedDocuments.size;
            this.selectedIds.value = Array.from(this.selectedDocuments).join(',');
            document.body.style.paddingTop = this.toolbar.offsetHeight + 'px';
        } else {
            document.body.style.paddingTop = '0';
        }
    }

    async refreshDocument(docId) {
        try {
            const response = await api.get(`/api/documents/${docId}`);
            if (response.ok) {
                // Update document card in the UI
                const card = document.querySelector(`[data-document-id="${docId}"]`);
                if (card) {
                    card.outerHTML = this.createDocumentCard(response.data);
                }
            }
        } catch (error) {
            console.error('Failed to refresh document:', error);
        }
    }

    createDocumentCard(doc) {
        return `
            <div class="document-card card h-100" data-document-id="${doc.id}">
                <div class="form-check position-absolute m-2">
                    <input class="form-check-input document-checkbox" type="checkbox" 
                           value="${doc.id}" id="doc${doc.id}"
                           ${this.selectedDocuments.has(doc.id) ? 'checked' : ''}>
                </div>
                
                <div class="card-img-top d-flex align-items-center justify-content-center">
                    ${doc.thumbnail_path ? 
                        `<img src="${doc.thumbnail_path}" alt="${doc.title}" class="img-fluid">` :
                        `<i class="fas ${utils.getFileIcon(doc.file_type)} fa-3x text-muted py-4"></i>`}
                </div>
                
                <div class="card-body">
                    <h3 class="card-title h6 text-truncate mb-2" title="${doc.title}">
                        ${doc.title}
                    </h3>
                    <p class="card-text small text-muted mb-2">
                        <i class="fas fa-calendar" aria-hidden="true"></i>
                        <span>${utils.formatDate(doc.upload_date)}</span>
                    </p>
                    ${doc.tag_list ? `
                    <div class="tag-list">
                        ${doc.tag_list.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    ` : ''}
                </div>
                
                <div class="card-footer bg-transparent border-0">
                    <div class="btn-group w-100">
                        <a href="/document/view/${doc.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i>
                            <span>عرض</span>
                        </a>
                        <a href="/document/download/${doc.id}" class="btn btn-sm btn-outline-success">
                            <i class="fas fa-download"></i>
                            <span>تحميل</span>
                        </a>
                    </div>
                </div>
            </div>`;
    }
}

// Document Filter Manager
export class FilterManager {
    constructor() {
        this.form = document.getElementById('filterForm');
        this.resetBtn = document.getElementById('resetFiltersBtn');
        this.clearTagBtn = document.getElementById('clearTagBtn');
        this.tagInput = document.getElementById('tagInput');
        this.params = utils.getQueryParams();

        if (this.form) {
            this.initializeEventListeners();
            this.initializeFromURL();
        }
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.resetBtn?.addEventListener('click', () => this.resetFilters());
        this.clearTagBtn?.addEventListener('click', () => this.clearTag());

        // Debounce filter updates
        const debouncedUpdate = utils.debounce(() => this.updateFilters(), 300);
        this.form.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', debouncedUpdate);
        });
    }

    initializeFromURL() {
        Object.entries(this.params).forEach(([key, value]) => {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        this.updateFilters();
    }

    updateFilters() {
        const formData = new FormData(this.form);
        const params = new URLSearchParams();
        
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                params.append(key, value.trim());
            }
        }
        
        // Preserve search parameter if it exists
        const search = this.params.search;
        if (search) {
            params.append('search', search);
        }

        // Update URL without page reload if supported
        if (window.history && window.history.pushState) {
            const newURL = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newURL }, '', newURL);
            this.fetchFilteredResults(params);
        } else {
            window.location.href = `${this.form.action}?${params.toString()}`;
        }
    }

    async fetchFilteredResults(params) {
        eventBus.publish(EVENTS.UI_LOADING);
        
        try {
            const response = await api.get('/api/documents', Object.fromEntries(params));
            if (response.ok) {
                const grid = document.querySelector('.document-grid');
                if (grid) {
                    grid.innerHTML = response.data.html;
                    // Reinitialize document manager for new content
                    new DocumentManager();
                }
            }
        } catch (error) {
            console.error('Failed to fetch filtered results:', error);
        } finally {
            eventBus.publish(EVENTS.UI_LOADED);
        }
    }

    resetFilters() {
        this.form.reset();
        this.updateFilters();
    }

    clearTag() {
        if (this.tagInput) {
            this.tagInput.value = '';
            this.tagInput.focus();
            this.updateFilters();
        }
    }
}

// UI Manager
export class UIManager {
    constructor() {
        this.initializeTooltips();
        this.initializeLoadingIndicator();
    }

    initializeTooltips() {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        if (tooltips.length && typeof bootstrap?.Tooltip === 'function') {
            tooltips.forEach(el => new bootstrap.Tooltip(el));
        }
    }

    initializeLoadingIndicator() {
        eventBus.subscribe(EVENTS.UI_LOADING, () => {
            document.body.classList.add('loading');
        });

        eventBus.subscribe(EVENTS.UI_LOADED, () => {
            document.body.classList.remove('loading');
        });
    }
}
