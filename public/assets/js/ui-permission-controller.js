/**
 * مساعد التحكم في واجهة المستخدم بناءً على الصلاحيات
 * UI Permission Controller
 */

class UIPermissionController {
    constructor(authSystem) {
        this.auth = authSystem;
        this.protectedElements = new Map();
        this.permissionGroups = new Map();
        this.originalParents = new WeakMap();
        
        // Ensure auth system is properly initialized before attaching listeners
        if (!this.auth || typeof this.auth !== 'object') {
            console.warn('UIPermissionController: Invalid auth system provided');
            return;
        }
        
        // Auto-initialize when auth/permission state changes (API-agnostic)
        try {
            // Ensure correct `this` binding for methods captured by reference
            const onAuthChanged = this.auth.onAuthStateChanged || this.auth.onAuthStateChange;
            if (typeof onAuthChanged === 'function') {
                (onAuthChanged.bind(this.auth))(() => {
                    try { this.updateUI(); } catch (e) { console.warn('UIPermissionController.updateUI failed on auth change', e); }
                });
            }
        } catch (e) {
            console.warn('UIPermissionController: unable to attach auth state listener', e);
        }

        try {
            const onPermChanged = this.auth.onPermissionChange || this.auth.onPermissionsChanged;
            if (typeof onPermChanged === 'function') {
                (onPermChanged.bind(this.auth))(() => {
                    try { this.updateUI(); } catch (e) { console.warn('UIPermissionController.updateUI failed on permission change', e); }
                });
            }
        } catch (e) {
            console.warn('UIPermissionController: unable to attach permission change listener', e);
        }
    }

    // Register elements that require specific permissions
    registerElement(element, permission, options = {}) {
        const elementObj = typeof element === 'string' ? document.querySelector(element) : element;
        if (!elementObj) {
            // Silently ignore missing elements instead of warning
            return;
        }

        const config = {
            element: elementObj,
            permission: permission,
            hideMethod: options.hideMethod || 'display', // 'display', 'visibility', 'remove'
            showAlternative: options.showAlternative || null,
            onShow: options.onShow || null,
            onHide: options.onHide || null
        };

        this.protectedElements.set(elementObj, config);
    }

    // Register multiple elements with the same permission
    registerElements(selector, permission, options = {}) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            this.registerElement(element, permission, options);
        });
    }

    // Register permission groups for easier management
    registerPermissionGroup(groupName, elements) {
        this.permissionGroups.set(groupName, elements);
        
        // Auto-register all elements in the group
        elements.forEach(item => {
            this.registerElement(item.selector, item.permission, item.options);
        });
    }

    // Update UI based on current permissions
    updateUI() {
        this.protectedElements.forEach((config, element) => {
            let hasPermission = true;
            try {
                if (typeof this.auth.hasPermission === 'function') {
                    hasPermission = this.auth.hasPermission(config.permission);
                }
            } catch (e) {
                console.warn('UIPermissionController.hasPermission error', e);
            }
            if (hasPermission) {
                this.showElement(config);
            } else {
                this.hideElement(config);
            }
        });

        // Update role-based content
        this.updateRoleBasedContent();
        this.updateUserInfo();
    }

    showElement(config) {
        const { element, hideMethod, onShow } = config;
        
        switch (hideMethod) {
            case 'display':
                element.style.display = '';
                break;
            case 'visibility':
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                break;
            case 'remove':
                {
                    const parent = this.originalParents.get(element);
                    if (parent && !parent.contains(element)) {
                        parent.appendChild(element);
                    }
                }
                break;
        }

        // Remove disabled state
        element.removeAttribute('disabled');
        element.classList.remove('permission-denied');
        
        // Execute show callback
        if (onShow) onShow(element);
    }

    hideElement(config) {
        const { element, hideMethod, showAlternative, onHide } = config;
        
        switch (hideMethod) {
            case 'display':
                element.style.display = 'none';
                break;
            case 'visibility':
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                break;
            case 'remove':
                if (element.parentNode) {
                    this.originalParents.set(element, element.parentNode);
                    element.remove();
                }
                break;
        }

        // Add disabled state for form elements
        if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'SELECT') {
            element.setAttribute('disabled', 'true');
        }
        
        element.classList.add('permission-denied');

        // Show alternative content if provided
        if (showAlternative) {
            const altElement = document.querySelector(showAlternative);
            if (altElement) {
                altElement.style.display = '';
            }
        }

        // Execute hide callback
        if (onHide) onHide(element);
    }

    // Update content based on user role
    updateRoleBasedContent() {
        const userRole = this.auth.userRole || (typeof this.auth.getCurrentUserRole === 'function' ? this.auth.getCurrentUserRole() : 'viewer') || 'viewer';
        
        // Show/hide role-specific content
        document.querySelectorAll('[data-role]').forEach(element => {
            const requiredRoles = element.dataset.role.split(',').map(r => r.trim());
            const hasRole = requiredRoles.includes(userRole) || requiredRoles.includes('any');
            
            element.style.display = hasRole ? '' : 'none';
        });

        // Update role-specific text content
        document.querySelectorAll('[data-role-text]').forEach(element => {
            try {
                const roleTexts = JSON.parse(element.dataset.roleText);
                if (roleTexts[userRole]) {
                    element.textContent = roleTexts[userRole];
                }
            } catch (_) { /* ignore invalid JSON */ }
        });
    }

    // Update user information in UI
    updateUserInfo() {
        const profile = this.auth.profile || this.auth.getProfile?.();
        const user = this.auth.user || this.auth.currentUser || this.auth.getCurrentUser?.();
        
        if (!profile || !user) return;

        // Update user name displays
        document.querySelectorAll('[data-user-name]').forEach(element => {
            element.textContent = this.auth.userName;
        });

        // Update user email displays
        document.querySelectorAll('[data-user-email]').forEach(element => {
            element.textContent = user.email;
        });

        // Update user role displays
        document.querySelectorAll('[data-user-role]').forEach(element => {
            const role = this.auth.userRole || this.auth.getCurrentUserRole?.();
            element.textContent = this.getRoleDisplayName(role);
        });

        // Update user department displays
        document.querySelectorAll('[data-user-department]').forEach(element => {
            element.textContent = this.auth.userDepartment;
        });

        // Update profile images
        document.querySelectorAll('[data-user-avatar]').forEach(element => {
            const photoURL = user.photoURL || profile.photoURL;
            if (photoURL) {
                element.src = photoURL;
            } else {
                // Use default avatar with user initials
                element.src = this.generateDefaultAvatar(this.auth.userName);
            }
        });
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': 'مدير النظام',
            'manager': 'مدير',
            'employee': 'موظف',
            'viewer': 'مستعرض'
        };
        return roleNames[role] || role;
    }

    generateDefaultAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 100;
        canvas.height = 100;
        
        // Generate color based on name
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const colorIndex = name.charCodeAt(0) % colors.length;
        
        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(0, 0, 100, 100);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 50, 50);
        
        return canvas.toDataURL();
    }

    // Navigation menu management
    setupNavigationMenu() {
        // Define navigation items with their required permissions
        const navigationItems = [
            { id: 'nav-dashboard', permission: 'files.view', href: 'index.html' },
            { id: 'nav-upload', permission: 'files.create', href: 'upload.html' },
            { id: 'nav-search', permission: 'files.view', href: 'search.html' },
            { id: 'nav-scanner', permission: 'scanner.access', href: 'scanner.html' },
            { id: 'nav-users', permission: 'users.view', href: 'user-management.html' },
            { id: 'nav-admin', permission: 'users.create', href: 'admin-management.html' },
            { id: 'nav-roles', permission: 'roles.manage', href: 'role-manager.html' },
            { id: 'nav-invitations', permission: 'invitations.manage', href: 'invitations.html' },
            { id: 'nav-reports', permission: 'reports.view', href: 'movement-reports.html' },
            { id: 'nav-analytics', permission: 'system.admin', href: 'system-analytics.html' },
            { id: 'nav-activity-logs', permission: 'view_logs', href: 'activity-logs.html' },
            { id: 'nav-file-tracking', permission: 'files.view', href: 'file-tracking.html' },
            { id: 'nav-file-management', permission: 'files.edit', href: 'file-management-dashboard.html' },
            { id: 'nav-permissions', permission: 'roles.manage', href: 'page-permissions.html' }
        ];

        // Register all navigation items
        navigationItems.forEach(item => {
            this.registerElement(`#${item.id}`, item.permission, {
                hideMethod: 'remove'
            });
        });
    }

    // Form field management based on permissions
    setupFormPermissions() {
        // Register form fields with edit permissions
        this.registerElements('[data-permission-edit]', 'files.edit', {
            hideMethod: 'visibility',
            onHide: (element) => {
                element.setAttribute('readonly', 'true');
                element.classList.add('form-control-plaintext');
            },
            onShow: (element) => {
                element.removeAttribute('readonly');
                element.classList.remove('form-control-plaintext');
            }
        });

        // Register delete buttons
        this.registerElements('[data-permission-delete]', 'files.delete');

        // Register admin-only sections
        this.registerElements('[data-permission-admin]', 'system.admin');
    }

    // Button management
    setupButtonPermissions() {
        // Map buttons to permissions automatically
        const buttonPermissions = {
            'btn-create': 'files.create',
            'btn-edit': 'files.edit',
            'btn-delete': 'files.delete',
            'btn-admin': 'system.admin',
            'btn-manage-users': 'users.view',
            'btn-scanner': 'scanner.access'
        };

        Object.entries(buttonPermissions).forEach(([className, permission]) => {
            this.registerElements(`.${className}`, permission);
        });
    }

    // Initialize all UI permission controls
    initialize() {
        this.setupNavigationMenu();
        this.setupFormPermissions();
        this.setupButtonPermissions();
        
        // Initial UI update
    if (this.auth.isAuthenticated || this.auth.currentUser) {
            this.updateUI();
        }

        console.log('UI Permission Controller initialized');
    }

    // Cleanup method
    destroy() {
        this.protectedElements.clear();
        this.permissionGroups.clear();
    }
}

// Auto-initialize when unified auth is available
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.unifiedAuth) {
            // Wait for unified auth to be fully initialized
            let attempts = 0;
            while (!window.unifiedAuth.isInitialized && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.unifiedAuth.isInitialized || attempts >= 50) {
                window.uiPermissionController = new UIPermissionController(window.unifiedAuth);
                window.uiPermissionController.initialize();
            } else {
                console.warn('UIPermissionController: UnifiedAuth not initialized after 5 seconds');
            }
        }
    } catch (e) {
        console.error('Failed to initialize UI Permission Controller', e);
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIPermissionController;
}
