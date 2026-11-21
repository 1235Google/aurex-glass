(() => {
  const { THEME_PRESETS, LAYOUT_PRESETS, DEFAULT_SETTINGS, loadSettings, saveSettings, replaceSettings } = window.AurexDefaults;

  let settings = null;
  const ACCENT_SWATCHES = ["#7cc4ff", "#d0bcff", "#80e5c3", "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#e4e4e7"];

  const MODULE_GROUPS = {
    hero: [
      { key: "clock", name: "Scalloped M3 Clock", desc: "Material 3 analog/digital clock on the hero stage" },
      { key: "greeting", name: "Greeting & Date Pill", desc: "Personalized Good Morning/Evening greeting and date" },
      { key: "weather", name: "Live Weather Card", desc: "Auto-detected local temperature, humidity & wind" },
      { key: "searchBar", name: "Search Bar", desc: "Material 3 pill search bar with voice search" },
      { key: "searchEngines", name: "Search Engine Chips", desc: "Quick switch chips (Google, DuckDuckGo, Perplexity, YouTube, GitHub)" },
      { key: "quickShortcuts", name: "Quick Shortcuts Row", desc: "Pinned website shortcut chips below search" },
      { key: "topBarExtras", name: "Top Bar Extras", desc: "Atmosphere dropdown, theme dots, Sound, Zen & ⌘K in top bar" }
    ],
    cards: [
      { key: "topSites", name: "Frequently Visited Card", desc: "4×2 grid of your most visited Chrome websites" },
      { key: "focusTimer", name: "Focus Pomodoro Timer", desc: "25m / 5m circular glass timer with chime" },
      { key: "notes", name: "Quick Notes Card", desc: "Auto-saving scratchpad card on New Tab" },
      { key: "bookmarks", name: "Recent Bookmarks Card", desc: "Quick list of your latest Chrome bookmarks" },
      { key: "recentlyClosed", name: "Recently Closed Tabs Card", desc: "One-click restore for recently closed tabs" }
    ],
    dock: [
      { key: "aiDock", name: "Bottom AI Tools Dock", desc: "Floating Material 3 pill dock for ChatGPT, Gemini, Claude, etc." },
      { key: "widgetsBtn", name: "Floating Widgets Button", desc: "Show the Widget Studio drawer button in the top bar" }
    ]
  };

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function switchSection(sectionId) {
    document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.section === sectionId));
    document.querySelectorAll(".page-section").forEach((sec) => sec.classList.toggle("active", sec.id === `sec-${sectionId}`));
  }

  function renderModuleToggles() {
    const mods = { ...LAYOUT_PRESETS.minimal, ...(settings.modules || {}) };

    const paintGroup = (containerId, items) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "module-row";
        row.innerHTML = `
          <div>
            <strong>${item.name}</strong>
            <span>${item.desc}</span>
          </div>
          <label class="switch">
            <input type="checkbox" ${mods[item.key] !== false ? "checked" : ""} />
            <span class="slider-toggle"></span>
          </label>
        `;
        row.querySelector("input").addEventListener("change", async (e) => {
          settings = await saveSettings({
            modules: { ...mods, [item.key]: e.target.checked }
          });
          renderHomeSummary();
          showToast(`${item.name} ${e.target.checked ? "turned ON" : "turned OFF"}`);
        });
        container.appendChild(row);
      });
    };

    paintGroup("modules-hero-list", MODULE_GROUPS.hero);
    paintGroup("modules-cards-list", MODULE_GROUPS.cards);
    paintGroup("modules-dock-list", MODULE_GROUPS.dock);
  }

  function updatePreview() {
    const t = settings.theme;
    const stage = document.getElementById("preview-stage");
    if (stage) {
      if (t.bgMode === "wallpaper" && settings.wallpaperDataUrl) {
        stage.style.backgroundImage = `url("${settings.wallpaperDataUrl}")`;
      } else if (t.bgMode === "solid") {
        stage.style.backgroundImage = "none";
        stage.style.backgroundColor = t.bgSolid;
      } else if (t.bgMode === "weather") {
        const scene = settings.weatherAtmosphere === "auto" ? "rain" : settings.weatherAtmosphere;
        const map = {
          sunny: "linear-gradient(155deg, #0284c7, #2563eb, #1e3a8a)",
          rain: "linear-gradient(160deg, #0b1933, #173560, #102042)",
          night: "linear-gradient(160deg, #070c22, #15214d, #1e1b54)",
          cloudy: "linear-gradient(160deg, #1e324d, #334e6e, #132038)",
          storm: "linear-gradient(170deg, #0a1026, #1c2952, #0b1124)",
          snow: "linear-gradient(165deg, #102a52, #234c82, #0e1f3b)"
        };
        stage.style.backgroundImage = map[scene] || map.rain;
      } else {
        stage.style.backgroundImage = `linear-gradient(135deg, ${t.bgGrad1}, ${t.bgGrad2}, ${t.bgGrad3})`;
      }
    }
    document.getElementById("pv-greet").textContent = `Good Evening, ${settings.profileName || "Creator"}`;
    document.getElementById("pv-theme-name").textContent = t.name || "Custom Glass";
    document.getElementById("pv-specs").textContent = `Blur ${t.blur}px • Radius ${t.radius}px`;
  }

  function renderHomeSummary() {
    const el = document.getElementById("home-summary-stats");
    if (!el) return;
    const mods = { ...LAYOUT_PRESETS.minimal, ...(settings.modules || {}) };
    const enabledModules = Object.values(mods).filter(Boolean).length;
    const activeSites = settings.websiteThemes.enabled
      ? Object.values(settings.websiteThemes.sites || {}).filter(Boolean).length
      : 0;
    el.innerHTML = `
      <div class="stat-box"><small>Active Theme</small><strong>${settings.theme.name || "Custom"}</strong></div>
      <div class="stat-box"><small>New Tab Modules</small><strong>${enabledModules} Active</strong></div>
      <div class="stat-box"><small>Atmosphere</small><strong style="text-transform:capitalize;">${settings.theme.bgMode === "weather" ? settings.weatherAtmosphere : settings.theme.bgMode}</strong></div>
      <div class="stat-box"><small>Website Themes</small><strong>${activeSites} Active</strong></div>
    `;
  }

  function renderPresets() {
    const grid = document.getElementById("presets-grid");
    if (!grid) return;
    grid.innerHTML = "";
    Object.values(THEME_PRESETS).forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-card" + (settings.theme.id === preset.id ? " active" : "");
      btn.innerHTML = `
        <div class="preset-swatch" style="background: linear-gradient(135deg, ${preset.previewColors[0]}, ${preset.previewColors[1]}, ${preset.previewColors[2]});"></div>
        <strong>${preset.name}</strong>
        <span>${preset.tagline}</span>
      `;
      btn.addEventListener("click", async () => {
        settings = await saveSettings({ theme: { ...preset } });
        syncAllControls();
        showToast(`Applied ${preset.name}`);
      });
      grid.appendChild(btn);
    });
  }

  function renderAccentSwatches() {
    const row = document.getElementById("accent-swatches");
    row.innerHTML = "";
    ACCENT_SWATCHES.forEach((hex) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "swatch-btn"; b.style.background = hex;
      b.addEventListener("click", async () => {
        settings = await saveSettings({ theme: { ...settings.theme, accent: hex } });
        syncAllControls();
      });
      row.appendChild(b);
    });
  }

  function renderCustomCssRules() {
    const list = document.getElementById("custom-css-list");
    const rules = (settings.websiteThemes && settings.websiteThemes.customCss) || [];
    list.innerHTML = "";
    rules.forEach((rule) => {
      const box = document.createElement("div");
      box.className = "css-rule-box";
      box.innerHTML = `
        <div class="css-rule-top">
          <input type="text" class="text-input rule-domain" value="${rule.domain.replace(/"/g, "&quot;")}" placeholder="Domain (e.g. reddit.com or *)" />
          <label class="switch"><input type="checkbox" class="rule-enabled" ${rule.enabled ? "checked" : ""} /><span class="slider-toggle"></span></label>
          <button type="button" class="btn-danger rule-delete">Delete</button>
        </div>
        <textarea class="css-textarea rule-css" placeholder="/* Write custom CSS here */"></textarea>
      `;
      const ta = box.querySelector(".rule-css");
      ta.value = rule.css || "";
      const persistRule = async () => {
        const updated = settings.websiteThemes.customCss.map((r) =>
          r.id === rule.id
            ? { ...r, domain: box.querySelector(".rule-domain").value.trim() || "*", enabled: box.querySelector(".rule-enabled").checked, css: ta.value }
            : r
        );
        settings = await saveSettings({ websiteThemes: { ...settings.websiteThemes, customCss: updated } });
      };
      box.querySelector(".rule-domain").addEventListener("change", persistRule);
      box.querySelector(".rule-enabled").addEventListener("change", async () => { await persistRule(); showToast("Custom CSS updated"); });
      let t = null;
      ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(persistRule, 400); });
      box.querySelector(".rule-delete").addEventListener("click", async () => {
        settings = await saveSettings({ websiteThemes: { ...settings.websiteThemes, customCss: settings.websiteThemes.customCss.filter((r) => r.id !== rule.id) } });
        renderCustomCssRules();
      });
      list.appendChild(box);
    });
  }

  function syncAllControls() {
    const previewScene = settings.weatherAtmosphere === "auto" ? "rain" : settings.weatherAtmosphere;
    window.AurexGlassEngine.setWeatherScene(previewScene);
    window.AurexGlassEngine.apply(settings);
    updatePreview();
    renderModuleToggles();
    renderHomeSummary();
    renderPresets();

    document.getElementById("input-profile-name").value = settings.profileName || "";
    document.getElementById("select-clock-style").value = settings.clockStyle || "m3-analog";
    document.getElementById("select-clock-format").value = settings.clockFormat || "12h";

    const t = settings.theme;
    document.getElementById("sl-opacity").value = t.glassOpacity;
    document.getElementById("val-opacity").textContent = `${Math.round(t.glassOpacity * 100)}%`;
    document.getElementById("sl-blur").value = t.blur;
    document.getElementById("val-blur").textContent = `${t.blur}px`;
    document.getElementById("sl-glow").value = t.glow;
    document.getElementById("val-glow").textContent = `${Math.round(t.glow * 100)}%`;
    document.getElementById("sl-radius").value = t.radius;
    document.getElementById("val-radius").textContent = `${t.radius}px`;
    document.getElementById("input-accent-color").value = t.accent || "#7cc4ff";

    document.querySelectorAll(".mode-pill[data-mode]").forEach((p) => p.classList.toggle("active", p.dataset.mode === t.bgMode));
    document.getElementById("select-weather-atmosphere").value = settings.weatherAtmosphere || "rain";
    document.getElementById("bg-solid-picker").value = t.bgSolid || "#0c182c";
    document.getElementById("bg-grad1-picker").value = t.bgGrad1 || "#0d1b34";
    document.getElementById("bg-grad2-picker").value = t.bgGrad2 || "#1c3866";

    document.getElementById("chk-specular").checked = settings.effects.glassSpecular !== false;
    document.getElementById("chk-particles").checked = Boolean(settings.effects.particles);
    document.getElementById("sl-particles").value = settings.effects.particleDensity || 55;
    document.getElementById("val-particles").textContent = String(settings.effects.particleDensity || 55);
    document.getElementById("chk-mouse-glow").checked = Boolean(settings.effects.mouseGlow);
    document.getElementById("chk-smooth").checked = Boolean(settings.effects.smoothTransitions);

    document.getElementById("chk-sites-master").checked = Boolean(settings.websiteThemes.enabled);
    document.getElementById("chk-site-youtube").checked = Boolean(settings.websiteThemes.sites.youtube);
    document.getElementById("chk-site-google").checked = Boolean(settings.websiteThemes.sites.google);
    document.getElementById("chk-site-github").checked = Boolean(settings.websiteThemes.sites.github);
    document.getElementById("chk-site-chatgpt").checked = Boolean(settings.websiteThemes.sites.chatgpt);

    document.getElementById("chk-weather-auto").checked = settings.weatherAutoLocation !== false;
    document.getElementById("input-weather-city").value = settings.weatherCity || "";
    document.getElementById("select-weather-unit").value = settings.weatherUnit || "C";
    document.getElementById("select-default-engine").value = settings.searchEngine || "google";
  }

  function compressImageToDataUrl(file, maxWidth = 1920) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
        };
        img.onerror = reject; img.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((btn) => btn.addEventListener("click", () => switchSection(btn.dataset.section)));
    document.querySelectorAll("[data-jump]").forEach((btn) => btn.addEventListener("click", () => switchSection(btn.dataset.jump)));
    document.getElementById("btn-open-newtab").addEventListener("click", () => {
      if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: "chrome://newtab" });
      else window.open("../newtab/newtab.html", "_blank");
    });

    // Layout presets
    document.getElementById("btn-layout-minimal").addEventListener("click", async () => {
      settings = await saveSettings({ modules: { ...LAYOUT_PRESETS.minimal } });
      syncAllControls(); showToast("Applied Clean M3 Minimal layout");
    });
    document.getElementById("btn-layout-productive").addEventListener("click", async () => {
      settings = await saveSettings({ modules: { ...LAYOUT_PRESETS.productive } });
      syncAllControls(); showToast("Applied Productive M3 layout");
    });
    document.getElementById("btn-layout-full").addEventListener("click", async () => {
      settings = await saveSettings({ modules: { ...LAYOUT_PRESETS.full } });
      syncAllControls(); showToast("Applied Full Dashboard layout");
    });

    document.getElementById("input-profile-name").addEventListener("input", async (e) => {
      settings = await saveSettings({ profileName: e.target.value }); updatePreview();
    });
    document.getElementById("select-clock-style").addEventListener("change", async (e) => {
      settings = await saveSettings({ clockStyle: e.target.value }); showToast("Clock style updated");
    });
    document.getElementById("select-clock-format").addEventListener("change", async (e) => {
      settings = await saveSettings({ clockFormat: e.target.value }); showToast("Clock format saved");
    });

    const bindSlider = (id, key, fmt) => {
      document.getElementById(id).addEventListener("input", async (e) => {
        const val = Number(e.target.value);
        document.getElementById(id.replace("sl-", "val-")).textContent = fmt(val);
        settings = await saveSettings({ theme: { ...settings.theme, [key]: val } });
        window.AurexGlassEngine.apply(settings); updatePreview();
      });
    };
    bindSlider("sl-opacity", "glassOpacity", (v) => `${Math.round(v * 100)}%`);
    bindSlider("sl-blur", "blur", (v) => `${v}px`);
    bindSlider("sl-glow", "glow", (v) => `${Math.round(v * 100)}%`);
    bindSlider("sl-radius", "radius", (v) => `${v}px`);

    document.getElementById("input-accent-color").addEventListener("input", async (e) => {
      settings = await saveSettings({ theme: { ...settings.theme, accent: e.target.value } });
      window.AurexGlassEngine.apply(settings); updatePreview();
    });

    document.querySelectorAll(".mode-pill[data-mode]").forEach((pill) => {
      pill.addEventListener("click", async () => {
        settings = await saveSettings({ theme: { ...settings.theme, bgMode: pill.dataset.mode } });
        syncAllControls();
      });
    });

    document.getElementById("select-weather-atmosphere").addEventListener("change", async (e) => {
      settings = await saveSettings({ weatherAtmosphere: e.target.value, theme: { ...settings.theme, bgMode: "weather" } });
      syncAllControls(); showToast("Weather atmosphere updated");
    });

    const bindBg = (id, key) => {
      document.getElementById(id).addEventListener("input", async (e) => {
        settings = await saveSettings({ theme: { ...settings.theme, [key]: e.target.value } });
        window.AurexGlassEngine.apply(settings); updatePreview();
      });
    };
    bindBg("bg-solid-picker", "bgSolid");
    bindBg("bg-grad1-picker", "bgGrad1");
    bindBg("bg-grad2-picker", "bgGrad2");

    document.getElementById("wallpaper-file-input").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await compressImageToDataUrl(file);
        settings = await saveSettings({ wallpaperDataUrl: dataUrl, theme: { ...settings.theme, bgMode: "wallpaper" } });
        syncAllControls(); showToast("Custom wallpaper applied");
      } catch { showToast("Failed to load image"); }
    });
    document.getElementById("btn-clear-wallpaper").addEventListener("click", async () => {
      settings = await saveSettings({ wallpaperDataUrl: "", theme: { ...settings.theme, bgMode: "weather" } });
      syncAllControls(); showToast("Switched back to Live Weather");
    });

    document.getElementById("chk-specular").addEventListener("change", async (e) => {
      settings = await saveSettings({ effects: { ...settings.effects, glassSpecular: e.target.checked } });
      window.AurexGlassEngine.apply(settings);
    });
    document.getElementById("chk-particles").addEventListener("change", async (e) => {
      settings = await saveSettings({ effects: { ...settings.effects, particles: e.target.checked } });
      window.AurexGlassEngine.apply(settings);
    });
    document.getElementById("sl-particles").addEventListener("input", async (e) => {
      const val = Number(e.target.value);
      document.getElementById("val-particles").textContent = String(val);
      settings = await saveSettings({ effects: { ...settings.effects, particleDensity: val } });
      window.AurexGlassEngine.apply(settings);
    });
    document.getElementById("chk-mouse-glow").addEventListener("change", async (e) => {
      settings = await saveSettings({ effects: { ...settings.effects, mouseGlow: e.target.checked } });
      window.AurexGlassEngine.apply(settings);
    });
    document.getElementById("chk-smooth").addEventListener("change", async (e) => {
      settings = await saveSettings({ effects: { ...settings.effects, smoothTransitions: e.target.checked } });
      window.AurexGlassEngine.apply(settings);
    });

    document.getElementById("chk-sites-master").addEventListener("change", async (e) => {
      settings = await saveSettings({ websiteThemes: { ...settings.websiteThemes, enabled: e.target.checked } });
      renderHomeSummary();
    });
    ["youtube", "google", "github", "chatgpt"].forEach((k) => {
      document.getElementById(`chk-site-${k}`).addEventListener("change", async (e) => {
        settings = await saveSettings({ websiteThemes: { ...settings.websiteThemes, sites: { ...settings.websiteThemes.sites, [k]: e.target.checked } } });
        renderHomeSummary();
      });
    });

    document.getElementById("btn-add-css-rule").addEventListener("click", async () => {
      settings = await saveSettings({
        websiteThemes: { ...settings.websiteThemes, customCss: [...(settings.websiteThemes.customCss || []), { id: "css-" + Date.now(), domain: "example.com", enabled: true, css: "body {\n  \n}" }] }
      });
      renderCustomCssRules();
    });

    document.getElementById("chk-weather-auto").addEventListener("change", async (e) => {
      settings = await saveSettings({ weatherAutoLocation: e.target.checked });
      showToast(e.target.checked ? "Auto location enabled" : "Manual city mode");
    });
    document.getElementById("input-weather-city").addEventListener("change", async (e) => {
      settings = await saveSettings({ weatherCity: e.target.value.trim(), weatherAutoLocation: false });
      document.getElementById("chk-weather-auto").checked = false;
      showToast("Manual weather city saved");
    });
    document.getElementById("select-weather-unit").addEventListener("change", async (e) => {
      settings = await saveSettings({ weatherUnit: e.target.value });
    });
    document.getElementById("select-default-engine").addEventListener("change", async (e) => {
      settings = await saveSettings({ searchEngine: e.target.value });
    });

    document.getElementById("btn-export-json").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "aurex-m3-v4.1-config.json"; a.click();
      URL.revokeObjectURL(url);
      showToast("Configuration exported");
    });
    document.getElementById("input-import-json").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        settings = await replaceSettings(JSON.parse(await file.text()));
        syncAllControls(); renderCustomCssRules(); showToast("Configuration imported");
      } catch { showToast("Invalid JSON file"); }
    });
    document.getElementById("btn-reset-all").addEventListener("click", async () => {
      settings = await replaceSettings(DEFAULT_SETTINGS);
      syncAllControls(); renderCustomCssRules(); showToast("Reset to clean M3 defaults");
    });
  }

  async function boot() {
    settings = await loadSettings();
    renderAccentSwatches();
    syncAllControls();
    renderCustomCssRules();
    bindEvents();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
