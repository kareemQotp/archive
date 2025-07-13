import { eventBus, EVENTS } from './events.js';

export class ThemeManager {
    constructor() {
        this.storageKey = 'app-theme-preference';
        this.darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Initialize theme
        this.initializeTheme();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    initializeTheme() {
        // Check for stored preference
        const storedTheme = localStorage.getItem(this.storageKey);
        
        if (storedTheme) {
            // Use stored preference
            this.setTheme(storedTheme);
        } else {
            // Use system preference
            this.setTheme(this.darkThemeMq.matches ? 'dark' : 'light');
        }
    }

    setupEventListeners() {
        // Listen for system theme changes
        this.darkThemeMq.addEventListener('change', (e) => {
            if (!localStorage.getItem(this.storageKey)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        // Update data attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store preference
        localStorage.setItem(this.storageKey, theme);
        
        // Notify about theme change
        eventBus.publish(EVENTS.THEME_CHANGED, { theme });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme');
    }

    isDarkMode() {
        return this.getCurrentTheme() === 'dark';
    }
}

// Export singleton instance
export const themeManager = new ThemeManager();
