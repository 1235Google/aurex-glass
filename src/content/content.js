(() => {
  const STYLE_ID = "aurex-glass-website-theme";
  let cachedSettings = null;
  let observerBound = false;

  function hexToRgb(hex) {
    const clean = (hex || "#60a5fa").replace("#", "").trim();
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return "96, 165, 250";
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function detectSiteDarkMode(host) {
    const html = document.documentElement;
    if (!html) return false;

    // 1. YouTube uses <html dark>
    if (host.includes("youtube.com")) {
      return html.hasAttribute("dark");
    }

    // 2. GitHub uses data-color-mode="dark" or "auto" + prefers-color-scheme
    if (host.includes("github.com")) {
      const mode = (html.getAttribute("data-color-mode") || "").toLowerCase();
      if (mode === "dark") return true;
      if (mode === "light") return false;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    // 3. ChatGPT uses <html class="dark">
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
      if (html.classList.contains("dark")) return true;
      if (html.classList.contains("light")) return false;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    // 4. Google & general sites: check meta color-scheme, then native body bg
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaScheme) {
      const val = (metaScheme.content || "").toLowerCase();
      if (val.includes("dark") && !val.includes("light")) return true;
      if (val.includes("light") && !val.includes("dark")) return false;
    }

    // Temporarily disable our own style to measure true native page luminance
    const existing = document.getElementById(STYLE_ID);
    const prevDisabled = existing ? existing.disabled : false;
    if (existing) existing.disabled = true;

    let dark = false;
    try {
      const target = document.body || html;
      const bg = window.getComputedStyle(target).backgroundColor;
      const m = bg && bg.match(/\d+/g);
      if (m && m.length >= 3) {
        const a = m.length >= 4 ? Number(m[3]) : 1;
        if (a > 0) {
          const [r, g, b] = m.map(Number);
          dark = 0.299 * r + 0.587 * g + 0.114 * b < 128;
        }
      }
    } catch {}

    if (existing) existing.disabled = prevDisabled;
    return dark;
  }

  function getYouTubeCSS(accentRgb, blur, radius, isDark) {
    const shared = `
      ytd-thumbnail, #thumbnail.ytd-thumbnail, ytd-thumbnail img,
      yt-thumbnail-view-model, .yt-thumbnail-view-model__image {
        border-radius: ${Math.min(radius, 18)}px !important;
        overflow: hidden !important;
      }
      ytd-rich-item-renderer {
        transition: transform 0.22s ease !important;
      }
      ytd-rich-item-renderer:hover {
        transform: translateY(-2px) !important;
      }
    `;

    if (isDark) {
      return shared + `
        html[dark] #masthead-container.ytd-app,
        html[dark] ytd-masthead {
          background: rgba(15, 20, 34, 0.72) !important;
          backdrop-filter: blur(${blur}px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09) !important;
        }
        html[dark] #guide-content.ytd-app,
        html[dark] ytd-mini-guide-renderer,
        html[dark] tp-yt-app-drawer #contentContainer {
          background: rgba(15, 20, 34, 0.66) !important;
          backdrop-filter: blur(${blur}px) !important;
          -webkit-backdrop-filter: blur(${blur}px) !important;
        }
        html[dark] ytd-searchbox #container.ytd-searchbox,
        html[dark] .ytSearchboxComponentInputBox {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 999px !important;
          backdrop-filter: blur(16px) !important;
        }
      `;
    }

    // Clean Light Frosted Glass for YouTube Light Mode (100% readable, normal contrast)
    return shared + `
      html:not([dark]) #masthead-container.ytd-app,
      html:not([dark]) ytd-masthead {
        background: rgba(255, 255, 255, 0.78) !important;
        backdrop-filter: blur(${blur}px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
      }
      html:not([dark]) #guide-content.ytd-app,
      html:not([dark]) ytd-mini-guide-renderer,
      html:not([dark]) tp-yt-app-drawer #contentContainer {
        background: rgba(255, 255, 255, 0.76) !important;
        backdrop-filter: blur(${blur}px) !important;
        -webkit-backdrop-filter: blur(${blur}px) !important;
      }
      html:not([dark]) ytd-searchbox #container.ytd-searchbox,
      html:not([dark]) .ytSearchboxComponentInputBox {
        background: rgba(255, 255, 255, 0.72) !important;
        border: 1px solid rgba(15, 23, 42, 0.14) !important;
        border-radius: 999px !important;
        box-shadow: 0 4px 16px rgba(${accentRgb}, 0.08) !important;
      }
    `;
  }

  function getGoogleCSS(accentRgb, blur, isDark) {
    if (isDark) {
      return `
        body {
          background:
            radial-gradient(circle at 18% 0%, rgba(${accentRgb}, 0.16), transparent 45%),
            #0b1120 !important;
        }
        .sfbg, .minidiv .sfbg, #searchform.minidiv {
          background: rgba(11, 17, 32, 0.76) !important;
          backdrop-filter: blur(${blur}px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .RNNXgb, .minidiv .RNNXgb {
          background: rgba(255, 255, 255, 0.09) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          border-radius: 999px !important;
          backdrop-filter: blur(${blur}px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
        }
      `;
    }
    return `
      body {
        background:
          radial-gradient(circle at 16% 0%, rgba(${accentRgb}, 0.1), transparent 45%),
          #f8faff !important;
      }
      .sfbg, .minidiv .sfbg, #searchform.minidiv {
        background: rgba(248, 250, 255, 0.78) !important;
        backdrop-filter: blur(${blur}px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
      }
      .RNNXgb, .minidiv .RNNXgb {
        background: rgba(255, 255, 255, 0.8) !important;
        border: 1px solid rgba(15, 23, 42, 0.12) !important;
        border-radius: 999px !important;
        backdrop-filter: blur(${blur}px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(${blur}px) saturate(180%) !important;
      }
    `;
  }

  function getGitHubCSS(accentRgb, blur, radius, isDark) {
    if (isDark) {
      return `
        .AppHeader, header.Header, .js-header-wrapper {
          background: rgba(13, 17, 28, 0.74) !important;
          backdrop-filter: blur(${blur}px) saturate(170%) !important;
          -webkit-backdrop-filter: blur(${blur}px) saturate(170%) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .Box, .pinned-item-list-item {
          border-radius: ${Math.min(radius, 14)}px !important;
          background: rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(14px) !important;
        }
      `;
    }
    return `
      .AppHeader, header.Header, .js-header-wrapper {
        background: rgba(255, 255, 255, 0.78) !important;
        backdrop-filter: blur(${blur}px) saturate(170%) !important;
        -webkit-backdrop-filter: blur(${blur}px) saturate(170%) !important;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
      }
      .Box, .pinned-item-list-item {
        border-radius: ${Math.min(radius, 14)}px !important;
        box-shadow: 0 4px 16px rgba(${accentRgb}, 0.06) !important;
      }
    `;
  }

  function getChatGPTCSS(accentRgb, blur, radius, isDark) {
    if (isDark) {
      return `
        nav, aside, .bg-token-sidebar-surface-primary {
          background: rgba(14, 18, 30, 0.72) !important;
          backdrop-filter: blur(${blur}px) !important;
          -webkit-backdrop-filter: blur(${blur}px) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        [data-message-author-role="user"] > div > div {
          background: rgba(${accentRgb}, 0.22) !important;
          border: 1px solid rgba(${accentRgb}, 0.36) !important;
          border-radius: ${Math.min(radius, 20)}px !important;
        }
      `;
    }
    return `
      nav, aside, .bg-token-sidebar-surface-primary {
        background: rgba(248, 250, 255, 0.8) !important;
        backdrop-filter: blur(${blur}px) !important;
        -webkit-backdrop-filter: blur(${blur}px) !important;
        border-right: 1px solid rgba(15, 23, 42, 0.08) !important;
      }
      [data-message-author-role="user"] > div > div {
        background: rgba(${accentRgb}, 0.14) !important;
        border: 1px solid rgba(${accentRgb}, 0.26) !important;
        border-radius: ${Math.min(radius, 20)}px !important;
      }
    `;
  }

  function getSiteCSS(host, theme) {
    const accentRgb = hexToRgb(theme.accent || "#60a5fa");
    const blur = Math.max(8, Math.min(32, Number(theme.blur || 22)));
    const radius = Math.max(8, Math.min(24, Number(theme.radius || 18)));
    const isDark = detectSiteDarkMode(host);

    if (host.includes("youtube.com")) return { key: "youtube", css: getYouTubeCSS(accentRgb, blur, radius, isDark) };
    if (host.includes("google.com")) return { key: "google", css: getGoogleCSS(accentRgb, blur, isDark) };
    if (host.includes("github.com")) return { key: "github", css: getGitHubCSS(accentRgb, blur, radius, isDark) };
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) return { key: "chatgpt", css: getChatGPTCSS(accentRgb, blur, radius, isDark) };
    return null;
  }

  function domainMatches(ruleDomain, host) {
    const clean = (ruleDomain || "").trim().toLowerCase();
    if (!clean) return false;
    if (clean === "*" || clean === "all") return true;
    return host === clean || host.endsWith("." + clean) || host.includes(clean);
  }

  function applyWebsiteThemes(settings) {
    cachedSettings = settings;
    const existing = document.getElementById(STYLE_ID);
    const wt = settings && settings.websiteThemes;
    if (!wt || !wt.enabled) {
      if (existing) existing.remove();
      return;
    }
    const host = window.location.hostname.toLowerCase();
    const theme = settings.theme || {};
    let combinedCss = "";

    const matched = getSiteCSS(host, theme);
    if (matched && wt.sites && wt.sites[matched.key]) {
      combinedCss += matched.css + "\n";
    }
    if (Array.isArray(wt.customCss)) {
      for (const rule of wt.customCss) {
        if (rule && rule.enabled && rule.css && domainMatches(rule.domain, host)) {
          combinedCss += `\n/* Custom Rule: ${rule.domain} */\n${rule.css}\n`;
        }
      }
    }
    if (!combinedCss.trim()) {
      if (existing) existing.remove();
      return;
    }
    let styleEl = existing;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = combinedCss;
  }

  function bindThemeObserver() {
    if (observerBound || !document.documentElement) return;
    observerBound = true;
    const obs = new MutationObserver(() => {
      if (cachedSettings) applyWebsiteThemes(cachedSettings);
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dark", "class", "data-color-mode"]
    });
  }

  function loadAndApply() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(["aurexSettings"], (res) => {
      if (res && res.aurexSettings) applyWebsiteThemes(res.aurexSettings);
    });
  }

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    loadAndApply();
    document.addEventListener("DOMContentLoaded", () => {
      loadAndApply();
      bindThemeObserver();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.aurexSettings) {
        applyWebsiteThemes(changes.aurexSettings.newValue);
      }
    });
  }
})();
