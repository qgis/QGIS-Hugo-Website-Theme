// SPDX-FileCopyrightText: 2026 Tim Sketcher <tim@kartoza.com>
// SPDX-License-Identifier: MIT

/**
 * OSGEO-Inject - Lightweight OSGeo affiliate badge system
 * @version 0.1.0
 * @license MIT
 *
 * A minimal, high-performance JavaScript widget that displays OSGeo
 * affiliation badges and announcements on participating project websites.
 */
(function () {
  // Detect base URL from script location
  function getBaseUrl() {
    // Try currentScript first (works during initial script execution)
    let script = document.currentScript;

    // Fallback: find the script by src attribute
    if (!script) {
      script = document.querySelector('script[src*="osgeo-inject"]');
    }

    // Check for explicit base URL override via data attribute
    if (script && script.dataset.baseUrl) {
      return script.dataset.baseUrl;
    }

    if (script && script.src) {
      // Extract base URL from script src (remove /js/osgeo-inject.js or similar)
      const url = new URL(script.src);
      const path = url.pathname.replace(/\/js\/osgeo-inject(\.min)?\.js$/, "");
      return url.origin + path;
    }
    return "https://affiliate.osgeo.org";
  }

  // Capture base URL immediately during script load
  const BASE_URL = getBaseUrl();

  // Configuration
  const CONFIG = {
    baseUrl: BASE_URL,
    matomoUrl: BASE_URL + "/matomo",
    matomoSiteId: 1,
    announcementEndpoint: "/content/announcement.json",
    osgeoUrl: "https://www.osgeo.org",
    osgeoProjectsUrl: "https://www.osgeo.org/projects/",
    logoPath: "/images/osgeo-logo.svg",
    cacheDuration: 3600000, // 1 hour in milliseconds
  };

  // Default options
  const DEFAULTS = {
    position: "top-right",
    collapsed: false,
    theme: "auto",
    inline: null,
    logoUrl: null,
  };

  /**
   * Get configuration from script tag data attributes
   * @returns {Object} Configuration options
   */
  function getOptions() {
    const script =
      document.currentScript ||
      document.querySelector('script[src*="osgeo-inject"]');

    if (!script) {
      return DEFAULTS;
    }

    return {
      position: script.dataset.position || DEFAULTS.position,
      collapsed: script.dataset.collapsed === "true",
      theme: script.dataset.theme || DEFAULTS.theme,
      inline: script.dataset.inline || DEFAULTS.inline,
      logoUrl: script.dataset.logoUrl || DEFAULTS.logoUrl,
    };
  }

  /**
   * Detect preferred color scheme
   * @returns {string} 'light' or 'dark'
   */
  function detectTheme(themeSetting) {
    if (themeSetting === "light" || themeSetting === "dark") {
      return themeSetting;
    }
    // Auto-detect based on system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }

  /**
   * Fetch announcement data with caching
   * @returns {Promise<Object>} Announcement data
   */
  async function fetchAnnouncement() {
    const cacheKey = "osgeo-inject-announcement";
    const cacheTimeKey = "osgeo-inject-announcement-time";

    // Check cache
    try {
      const cached = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(cacheTimeKey);

      if (cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime, 10);
        if (age < CONFIG.cacheDuration) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {
      // localStorage not available, proceed without caching
    }

    // Fetch fresh data
    try {
      const response = await fetch(CONFIG.baseUrl + CONFIG.announcementEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
        cache: "default",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (e) {
        // Caching failed, continue anyway
      }

      return data;
    } catch (error) {
      console.warn("OSGEO-Inject: Failed to fetch announcement:", error);
      return null;
    }
  }

  /**
   * Track page view with Matomo
   */
  function trackPageView() {
    // Create Matomo tracking pixel
    const img = document.createElement("img");
    img.style.cssText =
      "position:absolute;left:-9999px;width:1px;height:1px;";
    img.alt = "";

    const params = new URLSearchParams({
      idsite: CONFIG.matomoSiteId,
      rec: 1,
      url: window.location.href,
      action_name: document.title,
      rand: Math.random().toString(36).substring(2),
      _cvar: JSON.stringify({
        1: ["Host", window.location.hostname],
        2: ["Path", window.location.pathname],
      }),
    });

    img.src = `${CONFIG.matomoUrl}/matomo.php?${params.toString()}`;

    // Append and remove after load
    document.body.appendChild(img);
    img.onload = img.onerror = function () {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    };
  }

  /**
   * Create the badge container element
   * @param {Object} options - Configuration options
   * @param {Object} announcement - Announcement data
   * @returns {HTMLElement} Badge container
   */
  function createBadge(options, announcement) {
    const theme = detectTheme(options.theme);

    // Create container
    const container = document.createElement("div");
    container.id = "osgeo-inject-badge";
    container.className = `osgeo-inject osgeo-inject--${options.position} osgeo-inject--${theme}`;

    if (options.collapsed) {
      container.classList.add("osgeo-inject--collapsed");
    }

    // Build HTML structure
    container.innerHTML = `
      <div class="osgeo-inject__inner">
        <button class="osgeo-inject__toggle" aria-label="Toggle OSGeo badge" aria-expanded="${!options.collapsed}">
          <span class="osgeo-inject__toggle-icon">▼</span>
        </button>
        <div class="osgeo-inject__content">
          <a href="${CONFIG.osgeoUrl}" class="osgeo-inject__logo" target="_blank" rel="noopener noreferrer" aria-label="Visit OSGeo">
            <img src="${options.logoUrl || (CONFIG.baseUrl + CONFIG.logoPath)}" alt="OSGeo Logo" loading="lazy">
          </a>
          <div class="osgeo-inject__text">
            <a href="${CONFIG.osgeoProjectsUrl}" class="osgeo-inject__title" target="_blank" rel="noopener noreferrer">
              An OSGeo Project
            </a>
            ${announcement ? `
            <a href="${escapeHtml(announcement.link)}" class="osgeo-inject__announcement" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(announcement.message)}
            </a>
            ` : ""}
          </div>
        </div>
      </div>
    `;

    // Add toggle functionality
    const toggle = container.querySelector(".osgeo-inject__toggle");
    const logo = container.querySelector(".osgeo-inject__logo");

    function toggleBadge(e) {
      e.preventDefault();
      e.stopPropagation();
      const isCollapsed = container.classList.toggle("osgeo-inject--collapsed");
      toggle.setAttribute("aria-expanded", !isCollapsed);
    }

    toggle.addEventListener("click", toggleBadge);

    // Allow clicking logo to expand when collapsed
    logo.addEventListener("click", function (e) {
      if (container.classList.contains("osgeo-inject--collapsed")) {
        toggleBadge(e);
      }
    });

    return container;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    if (!str) {
      return "";
    }
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Create a compact inline badge for embedding in page content.
   * @param {string|null} logoUrl - Override URL for the logo image
   * @param {string} theme - 'light' or 'dark'
   * @returns {HTMLElement}
   */
  function createInlineBadge(logoUrl, theme) {
    const el = document.createElement("a");
    el.href = CONFIG.osgeoUrl;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.className = `osgeo-inject--inline osgeo-inject--${theme}`;
    el.setAttribute("aria-label", "An OSGeo Project");
    el.setAttribute("title", "An OSGeo Project");
    const img = document.createElement("img");
    img.src = logoUrl || (CONFIG.baseUrl + CONFIG.logoPath);
    img.alt = "OSGeo";
    img.loading = "lazy";
    el.appendChild(img);
    return el;
  }

  /**
   * Initialize the badge
   */
  async function init() {
    const options = getOptions();

    // Inline mode: mount the full badge inside a target element
    if (options.inline) {
      const target = document.getElementById(options.inline);
      if (target) {
        const announcement = await fetchAnnouncement();
        const badge = createBadge(options, announcement);
        // Replace fixed positioning with relative so it sits in page flow
        badge.classList.add("osgeo-inject--embedded");
        target.appendChild(badge);
        if (options.theme === "auto" && window.matchMedia) {
          window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", function (e) {
              badge.classList.remove("osgeo-inject--light", "osgeo-inject--dark");
              badge.classList.add(`osgeo-inject--${e.matches ? "dark" : "light"}`);
            });
        }
      }
      return; // don't also show floating badge
    }

    // Don't run floating badge if already initialized
    if (document.getElementById("osgeo-inject-badge")) {
      return;
    }

    // Fetch announcement data
    const announcement = await fetchAnnouncement();

    // Create and insert badge
    const badge = createBadge(options, announcement);
    document.body.appendChild(badge);

    // Track page view
    trackPageView();

    // Listen for theme changes (floating badge)
    if (options.theme === "auto" && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", function (e) {
          badge.classList.remove("osgeo-inject--light", "osgeo-inject--dark");
          badge.classList.add(`osgeo-inject--${e.matches ? "dark" : "light"}`);
        });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API for programmatic control
  window.OSGeoInject = {
    init: init,
    version: "0.1.0",
    config: CONFIG,
  };
})();
