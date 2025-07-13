/**
 * User preferences manager for persisting user settings
 */
export class PreferencesManager {
    constructor() {
        this.storageKey = 'user_preferences';
        this.defaults = {
            theme: 'auto', // auto, light, dark
            fontSize: 'normal', // small, normal, large
            compactMode: false,
            scannerPreferences: {
                beepEnabled: true,
                vibrationEnabled: true,
                autoUpload: true,
                resizeImages: true,
                maxImageSize: 2048 // pixels
            },
            documentPreferences: {
                defaultView: 'grid', // grid, list
                sortBy: 'date', // date, name, size
                sortOrder: 'desc', // asc, desc
                previewEnabled: true,
                thumbnailSize: 'medium' // small, medium, large
            },
            accessibility: {
                reduceMotion: false,
                highContrast: false,
                largeText: false
            },
            notifications: {
                desktop: true,
                sound: true,
                documentUpdates: true,
                systemUpdates: true
            }
        };
        
        this.preferences = this.load();
    }

    /**
     * Load preferences from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? { ...this.defaults, ...JSON.parse(stored) } : { ...this.defaults };
        } catch (error) {
            console.error('Error loading preferences:', error);
            return { ...this.defaults };
        }
    }

    /**
     * Save preferences to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
            this.applyPreferences();
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    /**
     * Get a preference value
     */
    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.preferences);
    }

    /**
     * Set a preference value
     */
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!(k in obj)) obj[k] = {};
            return obj[k];
        }, this.preferences);
        
        target[lastKey] = value;
        this.save();
    }

    /**
     * Reset preferences to defaults
     */
    reset() {
        this.preferences = { ...this.defaults };
        this.save();
    }

    /**
     * Apply current preferences to the UI
     */
    applyPreferences() {
        // Apply theme
        this.applyTheme();

        // Apply font size
        document.documentElement.style.fontSize = {
            small: '14px',
            normal: '16px',
            large: '18px'
        }[this.preferences.fontSize] || '16px';

        // Apply compact mode
        document.body.classList.toggle('compact-mode', this.preferences.compactMode);

        // Apply accessibility preferences
        const { accessibility } = this.preferences;
        document.documentElement.classList.toggle('reduce-motion', accessibility.reduceMotion);
        document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
        document.documentElement.classList.toggle('large-text', accessibility.largeText);

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('preferencesChanged', {
            detail: { preferences: this.preferences }
        }));
    }

    /**
     * Apply theme preference
     */
    applyTheme() {
        const { theme } = this.preferences;
        const isDark = theme === 'dark' || 
            (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        document.documentElement.classList.toggle('dark-theme', isDark);
    }

    /**
     * Initialize preferences manager
     */
    initialize() {
        // Apply initial preferences
        this.applyPreferences();

        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.preferences.theme === 'auto') {
                this.applyTheme();
            }
        });

        // Watch for reduced motion preference
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (!this.preferences.accessibility.reduceMotion) {
                document.documentElement.classList.toggle('reduce-motion', e.matches);
            }
        });
    }
}

// Export singleton instance
export const preferences = new PreferencesManager();
