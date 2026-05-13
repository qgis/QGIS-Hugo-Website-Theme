/**
 * Language Switcher with localStorage support
 * 
 * Features:
 * - Saves selected language to localStorage
 * - Restores language preference on next visit
 * - Updates the dropdown display to show current language
 * - Handles language redirects
 */

(function() {
  const STORAGE_KEY = 'qgis-preferred-language';
  const DEFAULT_LANG = 'en';
  const STORAGE_EXPIRY_DAYS = 365;

  // Save language preference with a timestamp for expiry tracking.
  // English is saved explicitly so that lang-redirect.js can detect
  // that the user deliberately chose English and not auto-redirect.
  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang: lang || DEFAULT_LANG, ts: Date.now() }));
    } catch (e) { /* storage unavailable */ }
  }

  // Load language preference, returning null if absent or expired.
  // Backwards-compatible with the old plain-string format.
  function loadLang() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      let data;
      try { data = JSON.parse(raw); } catch (e) { return raw; } // old plain-string
      if (!data || typeof data !== 'object') return String(raw);
      if ((Date.now() - data.ts) / 86400000 > STORAGE_EXPIRY_DAYS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data.lang || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Initialize language switcher
   */
  function initLanguageSwitcher() {
    // Get the current language from the URL or default to English
    const currentLang = getCurrentLanguage();
    
    // Update the display
    updateLanguageDisplay(currentLang);
    
    // Restore saved preference if on homepage/root and no language prefix
    restoreSavedLanguage();
    
    // Add event listeners to language options
    attachLanguageSwitchListeners();
  }

  /**
   * Get current language from URL
   */
  function getCurrentLanguage() {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    
    // Check if first part is a language code
    if (parts.length > 0) {
      const langPattern = /^[a-z]{2}(-[a-z]{2,}|_[a-z]{2})?$/i; // Matches 'en', 'pt-br', 'pt_br', 'zh-hans', etc.
      if (langPattern.test(parts[0])) {
        return parts[0];
      }
    }
    
    return DEFAULT_LANG;
  }

  /**
   * Update the dropdown display to show current language
   */
  function updateLanguageDisplay(lang) {
    const display = document.getElementById('current-lang-display');
    if (!display) return;
    
    // Find the language option that matches
    const langOption = document.querySelector(`[data-lang="${lang}"]`);
    if (langOption) {
      display.textContent = langOption.textContent;
    }
  }

  /**
   * Restore saved language preference.
   * Redirects to saved language only after verifying the target page exists,
   * preventing redirect loops when a page hasn't been translated.
   */
  function restoreSavedLanguage() {
    const savedLang = loadLang();
    if (!savedLang || savedLang === DEFAULT_LANG) return;

    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const langPattern = /^[a-z]{2}(-[a-z]{2,}|_[a-z]{2})?$/i;
    if (parts.length > 0 && langPattern.test(parts[0])) return; // already on a language-prefixed URL

    const newPath = `/${savedLang}${pathname}`;
    // HEAD-check before redirecting: if the translated page doesn't exist,
    // stay on the current page rather than bouncing to a 404.
    fetch(newPath, { method: 'HEAD' })
      .then(function(resp) {
        if (resp.ok) window.location.href = newPath;
      })
      .catch(function() { /* network error — stay on current page */ });
  }

  /**
   * Attach click listeners to language options
   */
  function attachLanguageSwitchListeners() {
    const langOptions = document.querySelectorAll('.lang-option');
    
    langOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.preventDefault();
        
        const lang = this.getAttribute('data-lang');
        const langName = this.textContent;
        
        // Save to localStorage (with expiry timestamp)
        saveLang(lang);
        
        // Update display
        updateLanguageDisplay(lang);
        
        // Navigate to the language version
        navigateToLanguage(lang);
      });
    });
  }

  /**
   * Navigate to the selected language version of the page
   */
  function navigateToLanguage(lang) {
    let currentPath = window.location.pathname;
    
    // Remove language prefix if it exists
    const parts = currentPath.split('/').filter(Boolean);
    const langPattern = /^[a-z]{2}(-[a-z]{2,}|_[a-z]{2})?$/i;
    
    if (parts.length > 0 && langPattern.test(parts[0])) {
      // Remove the language prefix
      parts.shift();
      currentPath = '/' + parts.join('/');
    }
    
    // Construct new path with language prefix
    if (lang === DEFAULT_LANG) {
      // English: no language prefix
      window.location.href = currentPath || '/';
    } else {
      // Other languages: add language prefix
      window.location.href = `/${lang}${currentPath}`;
    }
  }

  /**
   * Handle dropdown click to toggle open/close
   */
  function setupDropdownBehavior() {
    const dropdown = document.getElementById('language-dropdown');
    const dropdownTrigger = dropdown ? dropdown.querySelector('.dropdown-trigger') : null;
    const langOptions = document.querySelectorAll('.lang-option');
    
    // Toggle dropdown on trigger click
    if (dropdownTrigger) {
      dropdownTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('is-active');
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-active');
      }
    });
    
    // Close dropdown after selecting an option
    langOptions.forEach(option => {
      option.addEventListener('click', function() {
        if (dropdown) {
          dropdown.classList.remove('is-active');
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initLanguageSwitcher();
      setupDropdownBehavior();
    });
  } else {
    initLanguageSwitcher();
    setupDropdownBehavior();
  }
})();
