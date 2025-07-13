import { DocumentViewer } from './modules/document-viewer.js';
import { eventBus, EVENTS } from './modules/events.js';
import { api } from './modules/api.js';
import { toast, ModalManager } from './modules/ui.js';

class DocumentViewPage {
    constructor() {
        // Get document ID from page
        this.documentId = document.getElementById('document-id')?.value;
        
        // Initialize components
        this.initializeComponents();
        this.setupEventListeners();
    }

    initializeComponents() {
        // Initialize document viewer
        this.viewer = new DocumentViewer({
            containerId: 'document-viewer',
            documentId: this.documentId
        });

        // Initialize permission modal
        this.permissionModal = new ModalManager('permission-modal');

        // Initialize delete confirmation modal
        this.deleteModal = new ModalManager('delete-modal');
    }

    setupEventListeners() {
        // Permission management
        document.getElementById('add-permission')?.addEventListener('click', () => this.handleAddPermission());
        document.getElementById('revoke-permission')?.addEventListener('click', () => this.handleRevokePermission());
        
        // Document actions
        document.getElementById('delete-document')?.addEventListener('click', () => this.handleDeleteDocument());
        document.getElementById('download-document')?.addEventListener('click', () => this.handleDownload());
        document.getElementById('print-document')?.addEventListener('click', () => this.handlePrint());

        // Tags management
        document.getElementById('add-tag')?.addEventListener('click', () => this.handleAddTag());
        document.getElementById('remove-tag')?.addEventListener('click', () => this.handleRemoveTag());
        
        // Handle print shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.handlePrint();
            }
        });
    }

    async handleAddPermission() {
        try {
            const form = document.getElementById('permission-form');
            if (!form) return;

            const formData = new FormData(form);
            const response = await api.post(`/api/documents/${this.documentId}/permissions`, {
                username: formData.get('username'),
                permission_type: formData.get('permission_type')
            });

            if (response.ok) {
                toast.show({
                    type: 'success',
                    title: 'تم',
                    message: 'تم منح الصلاحية بنجاح'
                });
                this.permissionModal.hide();
                // Refresh permissions list
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to add permission:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في منح الصلاحية'
            });
        }
    }

    async handleRevokePermission() {
        const username = document.getElementById('revoke-username')?.value;
        if (!username) return;

        try {
            const response = await api.delete(`/api/documents/${this.documentId}/permissions/${username}`);
            if (response.ok) {
                toast.show({
                    type: 'success',
                    title: 'تم',
                    message: 'تم إلغاء الصلاحية بنجاح'
                });
                // Refresh permissions list
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to revoke permission:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في إلغاء الصلاحية'
            });
        }
    }

    async handleDeleteDocument() {
        const confirmed = await this.deleteModal.confirm({
            title: 'حذف المستند',
            message: 'هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmText: 'حذف',
            cancelText: 'إلغاء'
        });

        if (confirmed) {
            try {
                const response = await api.delete(`/api/documents/${this.documentId}`);
                if (response.ok) {
                    toast.show({
                        type: 'success',
                        title: 'تم',
                        message: 'تم حذف المستند بنجاح'
                    });
                    // Redirect to documents list
                    window.location.href = '/document';
                }
            } catch (error) {
                console.error('Failed to delete document:', error);
                toast.show({
                    type: 'error',
                    title: 'خطأ',
                    message: 'فشل في حذف المستند'
                });
            }
        }
    }

    handleDownload() {
        window.location.href = `/document/download/${this.documentId}`;
    }

    handlePrint() {
        window.print();
    }

    async handleAddTag() {
        const tagInput = document.getElementById('tag-input');
        if (!tagInput?.value) return;

        try {
            const response = await api.post(`/api/documents/${this.documentId}/tags`, {
                tag: tagInput.value
            });

            if (response.ok) {
                toast.show({
                    type: 'success',
                    title: 'تم',
                    message: 'تمت إضافة الوسم بنجاح'
                });
                tagInput.value = '';
                // Refresh tags list
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to add tag:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في إضافة الوسم'
            });
        }
    }

    async handleRemoveTag() {
        const tag = document.getElementById('remove-tag-input')?.value;
        if (!tag) return;

        try {
            const response = await api.delete(`/api/documents/${this.documentId}/tags/${tag}`);
            if (response.ok) {
                toast.show({
                    type: 'success',
                    title: 'تم',
                    message: 'تم حذف الوسم بنجاح'
                });
                // Refresh tags list
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to remove tag:', error);
            toast.show({
                type: 'error',
                title: 'خطأ',
                message: 'فشل في حذف الوسم'
            });
        }
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentViewPage();
});
