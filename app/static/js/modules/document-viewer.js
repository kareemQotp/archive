import { api } from './api.js';
import { eventBus, EVENTS } from './events.js';
import { toast, LoadingIndicator } from './ui.js';

export class DocumentViewer {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'document-viewer');
        this.pageContainer = document.getElementById('page-container');
        this.currentPage = 1;
        this.totalPages = 1;
        this.scale = 1.0;
        this.documentId = options.documentId;
        this.loading = new LoadingIndicator(this.container);

        // Initialize PDF.js if container exists
        if (this.container) {
            this.initializePdfJs();
        }
    }

    async initializePdfJs() {
        try {
            // Import PDF.js dynamically
            const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.mjs';
            
            this.pdfLib = pdfjsLib;
            this.setupControls();
            this.loadDocument();
        } catch (error) {
            console.error('Failed to initialize PDF.js:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في تحميل عارض المستندات'
            });
        }
    }

    setupControls() {
        // Page navigation
        document.getElementById('prev-page')?.addEventListener('click', () => this.prevPage());
        document.getElementById('next-page')?.addEventListener('click', () => this.nextPage());
        document.getElementById('page-number')?.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));

        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-fit')?.addEventListener('click', () => this.zoomFit());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    if (document.dir === 'rtl') this.nextPage();
                    else this.prevPage();
                    break;
                case 'ArrowRight':
                    if (document.dir === 'rtl') this.prevPage();
                    else this.nextPage();
                    break;
                case '+':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomIn();
                    }
                    break;
                case '-':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomOut();
                    }
                    break;
                case '0':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomFit();
                    }
                    break;
            }
        });
    }

    async loadDocument() {
        if (!this.documentId) return;

        try {
            this.loading.show();
            
            // Fetch document URL from API
            const response = await api.get(`/api/documents/${this.documentId}/view`);
            if (!response.ok) throw new Error('Failed to fetch document URL');

            // Load PDF document
            const pdf = await this.pdfLib.getDocument(response.data.url).promise;
            this.pdfDoc = pdf;
            this.totalPages = pdf.numPages;
            
            // Update UI
            this.updatePageCount();
            this.renderPage();
        } catch (error) {
            console.error('Failed to load document:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في تحميل المستند'
            });
        } finally {
            this.loading.hide();
        }
    }

    async renderPage() {
        if (!this.pdfDoc) return;

        try {
            this.loading.show();
            
            // Get page
            const page = await this.pdfDoc.getPage(this.currentPage);
            
            // Calculate scale to fit width
            const viewport = page.getViewport({ scale: this.scale });
            
            // Prepare canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Clear existing content
            this.pageContainer.innerHTML = '';
            this.pageContainer.appendChild(canvas);
            
            // Render page
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Update page number input
            const pageInput = document.getElementById('page-number');
            if (pageInput) {
                pageInput.value = this.currentPage;
            }
        } catch (error) {
            console.error('Failed to render page:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في عرض الصفحة'
            });
        } finally {
            this.loading.hide();
        }
    }

    updatePageCount() {
        const pageCount = document.getElementById('page-count');
        if (pageCount) {
            pageCount.textContent = this.totalPages;
        }
    }

    async goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.totalPages) return;
        
        this.currentPage = pageNumber;
        await this.renderPage();
    }

    async prevPage() {
        if (this.currentPage > 1) {
            await this.goToPage(this.currentPage - 1);
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            await this.goToPage(this.currentPage + 1);
        }
    }

    async zoomIn() {
        this.scale *= 1.25;
        await this.renderPage();
    }

    async zoomOut() {
        this.scale *= 0.8;
        await this.renderPage();
    }

    async zoomFit() {
        if (!this.pdfDoc || !this.pageContainer) return;

        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate scale to fit container width
            this.scale = this.pageContainer.clientWidth / viewport.width;
            await this.renderPage();
        } catch (error) {
            console.error('Failed to zoom fit:', error);
        }
    }
}
