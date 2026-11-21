(() => {
  const { THEME_PRESETS, LAYOUT_PRESETS, DEFAULT_AI_TOOLS, DEFAULT_SETTINGS, loadSettings, saveSettings } = window.AurexDefaults;

  let settings = null;
  let weatherCache = null;
  let detectedScene = "rain";
  let topZIndex = 40;
  let calendarOffset = 0;

  let focusDuration = 25 * 60;
  let focusRemaining = 25 * 60;
  let focusTimerId = null;

  const SOUND_MODES = [
    { id: "off", icon: "🔇", label: "Sound" },
    { id: "rain", icon: "🌧", label: "Rain Audio" },
    { id: "wind", icon: "🌙", label: "Night Focus" }
  ];
  let soundIndex = 0;

  const SEARCH_URLS = {
    google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    perplexity: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
    youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    github: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`
  };

  const WIDGET_META = [
    { id: "clock", name: "Clock", desc: "Live precision digital clock" },
    { id: "weather", name: "Weather", desc: "Current conditions & wind" },
    { id: "calendar", name: "Calendar", desc: "Interactive monthly calendar" },
    { id: "notes", name: "Notes", desc: "Floating synced scratchpad" },
    { id: "todo", name: "To-Do List", desc: "Actionable daily checklist" },
    { id: "battery", name: "Battery Status", desc: "Live power & charge telemetry" },
    { id: "system", name: "System Info", desc: "CPU, RAM, display & network" }
  ];

  const WMO_CODES = {
    0: ["Clear Sky", "☀️", "sunny"],
    1: ["Mostly Clear", "🌤", "sunny"],
    2: ["Partly Cloudy", "⛅", "cloudy"],
    3: ["Overcast", "☁️", "cloudy"],
    45: ["Foggy", "🌫", "cloudy"],
    48: ["Depositing Fog", "🌫", "cloudy"],
    51: ["Light Drizzle", "🌦", "rain"],
    53: ["Drizzle", "🌦", "rain"],
    55: ["Dense Drizzle", "🌧", "rain"],
    61: ["Light Rain", "🌧", "rain"],
    63: ["Rain", "🌧", "rain"],
    65: ["Heavy Rain", "🌧", "rain"],
    71: ["Light Snow", "🌨", "snow"],
    73: ["Snow", "❄️", "snow"],
    75: ["Heavy Snow", "❄️", "snow"],
    80: ["Rain Showers", "🌦", "rain"],
    81: ["Showers", "🌧", "rain"],
    82: ["Heavy Showers", "⛈", "storm"],
    95: ["Thunderstorm", "⛈", "storm"],
    96: ["Thunderstorm", "⛈", "storm"],
    99: ["Severe Storm", "⛈", "storm"]
  };

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2500);
  }

  function faviconUrl(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
    } catch {
      return "../assets/icon48.png";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchJsonWithTimeout(url, ms = 3200) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ===== Apply Modular ON/OFF Visibility ===== */
  function applyModulesVisibility() {
    const mods = { ...LAYOUT_PRESETS.minimal, ...(settings.modules || {}) };

    document.querySelectorAll("[data-module]").forEach((el) => {
      const key = el.dataset.module;
      const enabled = mods[key] !== false;
      el.classList.toggle("module-off", !enabled);
    });

    // Collapse empty hero columns gracefully
    const leftVisible = mods.clock || mods.greeting;
    const rightVisible = mods.weather || mods.searchBar || mods.searchEngines || mods.quickShortcuts;
    const clockCol = document.getElementById("m3-clock-col");
    const hubCol = document.getElementById("m3-hub-col");
    const heroStage = document.getElementById("m3-hero-stage");

    if (clockCol) clockCol.classList.toggle("module-off", !leftVisible);
    if (hubCol) hubCol.classList.toggle("module-off", !rightVisible);
    if (heroStage) heroStage.classList.toggle("single-col", !(leftVisible && rightVisible));

    // Check if any Bento card is ON
    const anyCardOn = Boolean(mods.topSites || mods.focusTimer || mods.notes || mods.bookmarks || mods.recentlyClosed);
    const bentoGrid = document.getElementById("bento-grid");
    if (bentoGrid) bentoGrid.classList.toggle("module-off", !anyCardOn);

    // Vertically center the dashboard when in clean minimal mode (no bento cards)
    document.body.classList.toggle("m3-minimal-center", !anyCardOn);
  }

  /* ===== Scalloped Material 3 Clock ===== */
  function buildM3ScallopDial() {
    const pathEl = document.getElementById("m3-scallop-path");
    const dotsEl = document.getElementById("m3-dial-dots");
    if (pathEl) {
      const cx = 110, cy = 110, baseR = 92, amp = 7.5, lobes = 12, steps = 240;
      let d = "";
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const r = baseR + amp * Math.cos(lobes * theta);
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
      }
      pathEl.setAttribute("d", d + "Z");
    }
    if (dotsEl) {
      dotsEl.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const ang = (i * 30 - 90) * (Math.PI / 180);
        const x = 110 + 76 * Math.cos(ang);
        const y = 110 + 76 * Math.sin(ang);
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", x.toFixed(1));
        c.setAttribute("cy", y.toFixed(1));
        const isMajor = i % 3 === 0;
        c.setAttribute("r", isMajor ? "3.2" : "1.8");
        if (isMajor) c.classList.add("major");
        dotsEl.appendChild(c);
      }
    }
  }

  function applyClockMode() {
    const isDigital = settings.clockStyle === "digital";
    const analogEl = document.getElementById("m3-analog-shell");
    const digitalEl = document.getElementById("m3-digital-shell");
    if (analogEl) analogEl.classList.toggle("hidden", isDigital);
    if (digitalEl) digitalEl.classList.toggle("hidden", !isDigital);
  }

  function updateClock() {
    const now = new Date();
    const is24 = settings && settings.clockFormat === "24h";
    const hours24 = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const minsStr = String(mins).padStart(2, "0");
    const secsStr = String(secs).padStart(2, "0");

    const displayTime = is24
      ? `${String(hours24).padStart(2, "0")}:${minsStr}`
      : `${hours24 % 12 || 12}:${minsStr}`;
    const suffix = is24 ? "" : hours24 >= 12 ? " PM" : " AM";

    const heroClock = document.getElementById("hero-clock");
    if (heroClock) heroClock.textContent = displayTime;

    const miniTime = document.getElementById("m3-mini-time");
    if (miniTime) miniTime.textContent = `${displayTime}${suffix}`;

    const hEl = document.getElementById("hand-hour");
    const mEl = document.getElementById("hand-minute");
    const sEl = document.getElementById("hand-second");
    if (hEl) hEl.style.transform = `rotate(${((hours24 % 12) + mins / 60) * 30}deg)`;
    if (mEl) mEl.style.transform = `rotate(${(mins + secs / 60) * 6}deg)`;
    if (sEl) sEl.style.transform = `rotate(${secs * 6}deg)`;

    const heroDate = document.getElementById("hero-date");
    if (heroDate) {
      heroDate.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    }

    const greetEl = document.getElementById("hero-greeting");
    if (greetEl) {
      let period = "Good Evening";
      if (hours24 < 12) period = "Good Morning";
      else if (hours24 < 17) period = "Good Afternoon";
      const name = settings && settings.profileName ? `, ${settings.profileName}` : "";
      greetEl.textContent = `${period}${name}`;
    }

    const widgetClockTime = document.querySelector(".w-clock-time");
    if (widgetClockTime) widgetClockTime.textContent = `${displayTime}:${secsStr}${suffix}`;
  }

  /* ===== Weather Scene Sync ===== */
  function mapWeatherToScene(code, isDay) {
    const entry = WMO_CODES[code];
    const base = entry ? entry[2] : "sunny";
    if (base === "rain" || base === "storm" || base === "snow") return base;
    if (!isDay) return "night";
    return base;
  }

  function applyActiveAtmosphere() {
    const pref = settings.weatherAtmosphere || "rain";
    const activeScene = pref === "auto" ? detectedScene : pref;
    window.AurexGlassEngine.setWeatherScene(activeScene);

    const badge = document.getElementById("atmo-live-badge");
    if (badge) badge.textContent = pref === "auto" ? `LIVE • ${activeScene.toUpperCase()}` : activeScene.toUpperCase();
    const sel = document.getElementById("atmo-select");
    if (sel) sel.value = pref;
  }

  /* ===== Quick Preset Strip ===== */
  function renderPresetStrip() {
    const strip = document.getElementById("quick-preset-strip");
    if (!strip) return;
    strip.innerHTML = "";
    Object.values(THEME_PRESETS).forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-dot" + (settings.theme.id === preset.id ? " active" : "");
      btn.title = preset.name;
      btn.style.background = `linear-gradient(135deg, ${preset.previewColors[1]}, ${preset.previewColors[2]})`;
      btn.addEventListener("click", async () => {
        settings = await saveSettings({ theme: { ...preset } });
        window.AurexGlassEngine.apply(settings);
        applyActiveAtmosphere();
        renderPresetStrip();
        showToast(`Theme: ${preset.name}`);
      });
      strip.appendChild(btn);
    });
  }

  /* ===== Search & Voice ===== */
  function setupSearch() {
    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    const voiceBtn = document.getElementById("btn-voice-search");
    const chips = document.querySelectorAll("#m3-engine-pills .m3-seg-chip");

    const syncEngineChips = () => {
      const current = settings.searchEngine || "google";
      chips.forEach((c) => c.classList.toggle("active", c.dataset.engine === current));
    };
    syncEngineChips();

    chips.forEach((chip) => {
      chip.addEventListener("click", async () => {
        settings = await saveSettings({ searchEngine: chip.dataset.engine });
        syncEngineChips();
        input.focus();
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      if (/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/.test(q)) {
        window.location.href = q.startsWith("http") ? q : `https://${q}`;
        return;
      }
      const fn = SEARCH_URLS[settings.searchEngine] || SEARCH_URLS.google;
      window.location.href = fn(q);
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceBtn.addEventListener("click", () => {
      if (!SpeechRecognition) { showToast("Voice search not supported."); return; }
      const rec = new SpeechRecognition();
      rec.lang = navigator.language || "en-US";
      rec.interimResults = false;
      voiceBtn.classList.add("listening");
      showToast("Listening... Speak now");
      rec.onresult = (event) => {
        input.value = event.results[0][0].transcript;
        voiceBtn.classList.remove("listening");
        form.dispatchEvent(new Event("submit"));
      };
      rec.onerror = () => { voiceBtn.classList.remove("listening"); showToast("Voice capture cancelled."); };
      rec.onend = () => voiceBtn.classList.remove("listening");
      rec.start();
    });
  }

  /* ===== Quick Shortcuts & AI Dock ===== */
  function renderQuickActions() {
    const container = document.getElementById("quick-actions");
    if (!container) return;
    container.innerHTML = "";
    (settings.quickLinks || []).forEach((item) => {
      const chip = document.createElement("a");
      chip.className = "quick-chip";
      chip.href = item.url;
      chip.innerHTML = `<img src="${faviconUrl(item.url)}" alt="" /><span>${escapeHtml(item.title)}</span><button type="button" class="remove-ql" title="Remove">✕</button>`;
      chip.querySelector(".remove-ql").addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        settings = await saveSettings({ quickLinks: settings.quickLinks.filter((l) => l.id !== item.id) });
        renderQuickActions();
      });
      container.appendChild(chip);
    });
    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.className = "quick-chip"; addBtn.textContent = "+ Shortcut";
    addBtn.addEventListener("click", () => {
      document.getElementById("quicklink-modal").classList.remove("hidden");
      document.getElementById("ql-title").focus();
    });
    container.appendChild(addBtn);
  }

  function setupQuickLinkModal() {
    const modal = document.getElementById("quicklink-modal");
    const form = document.getElementById("quicklink-form");
    document.getElementById("btn-cancel-ql").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("ql-title").value.trim();
      let url = document.getElementById("ql-url").value.trim();
      if (!title || !url) return;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      settings = await saveSettings({ quickLinks: [...(settings.quickLinks || []), { id: "ql-" + Date.now(), title, url }] });
      form.reset(); modal.classList.add("hidden"); renderQuickActions();
      showToast("Shortcut added");
    });
  }

  function renderAIToolsDock() {
    const container = document.getElementById("ai-dock-items");
    if (!container) return;
    const tools = Array.isArray(settings.aiTools) && settings.aiTools.length ? settings.aiTools : DEFAULT_AI_TOOLS;
    container.innerHTML = "";
    tools.forEach((tool) => {
      const a = document.createElement("a");
      a.className = "ai-tool-pill";
      a.href = tool.url;
      a.title = `Open ${tool.name}`;
      a.innerHTML = `<img src="${faviconUrl(tool.url)}" alt="" /><span>${escapeHtml(tool.name)}</span><button type="button" class="ai-del" title="Remove">✕</button>`;
      a.querySelector(".ai-del").addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        settings = await saveSettings({ aiTools: tools.filter((t) => t.id !== tool.id) });
        renderAIToolsDock();
        showToast(`Removed ${tool.name}`);
      });
      container.appendChild(a);
    });
  }

  function setAIDockExpanded(expanded) {
    const dock = document.getElementById("ai-dock");
    const toggleBtn = document.getElementById("btn-toggle-ai-dock");
    const tray = document.getElementById("ai-dock-tray");
    if (!dock || !toggleBtn || !tray) return;
    dock.classList.toggle("expanded", expanded);
    toggleBtn.setAttribute("aria-expanded", String(expanded));
    tray.setAttribute("aria-hidden", String(!expanded));
  }

  function setupAIToolModal() {
    const dock = document.getElementById("ai-dock");
    const toggleBtn = document.getElementById("btn-toggle-ai-dock");
    const modal = document.getElementById("aitool-modal");
    const form = document.getElementById("aitool-form");

    // Always start collapsed cleanly unless user clicks AI Tools
    setAIDockExpanded(false);

    if (toggleBtn && dock) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dock.classList.contains("expanded");
        setAIDockExpanded(!isOpen);
      });

      document.addEventListener("click", (e) => {
        if (dock.classList.contains("expanded") && !dock.contains(e.target) && !modal.contains(e.target)) {
          setAIDockExpanded(false);
        }
      });

      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && dock.classList.contains("expanded")) {
          setAIDockExpanded(false);
        }
      });
    }

    document.getElementById("btn-add-ai-tool").addEventListener("click", () => {
      modal.classList.remove("hidden"); document.getElementById("ai-name").focus();
    });
    document.getElementById("btn-cancel-ai").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("ai-name").value.trim();
      let url = document.getElementById("ai-url").value.trim();
      if (!name || !url) return;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      const current = Array.isArray(settings.aiTools) ? settings.aiTools : DEFAULT_AI_TOOLS;
      settings = await saveSettings({ aiTools: [...current, { id: "ai-" + Date.now(), name, url }] });
      form.reset(); modal.classList.add("hidden"); renderAIToolsDock();
      setAIDockExpanded(true);
      showToast(`${name} added to AI Tools`);
    });
  }

  /* ===== Location & Weather ===== */
  async function detectLocationViaIP() {
    const providers = [
      async () => {
        const d = await fetchJsonWithTimeout("https://get.geojs.io/v1/ip/geo.json", 3000);
        return { lat: Number(d.latitude), lon: Number(d.longitude), city: d.city || d.region || "Local", country: d.country_code || "" };
      },
      async () => {
        const d = await fetchJsonWithTimeout("https://ipwho.is/", 3000);
        if (d.success === false) throw new Error("ipwho failed");
        return { lat: Number(d.latitude), lon: Number(d.longitude), city: d.city || d.region || "Local", country: d.country_code || "" };
      }
    ];
    for (const fn of providers) {
      try {
        const loc = await fn();
        if (loc && !Number.isNaN(loc.lat) && !Number.isNaN(loc.lon)) return loc;
      } catch {}
    }
    return { lat: 20.2961, lon: 85.8245, city: "Bhubaneswar", country: "IN" };
  }

  async function detectLocationWithGPS() {
    if (!navigator.geolocation) return detectLocationViaIP();
    const gpsPromise = new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        reject,
        { timeout: 3500, maximumAge: 300000 }
      );
    });
    const hardTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("GPS timeout")), 3800));
    try {
      const coords = await Promise.race([gpsPromise, hardTimeout]);
      try {
        const rev = await fetchJsonWithTimeout(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`,
          2800
        );
        return { lat: coords.lat, lon: coords.lon, city: rev.city || rev.locality || "Your Location", country: rev.countryCode || "" };
      } catch {
        return { lat: coords.lat, lon: coords.lon, city: "Your Location", country: "" };
      }
    } catch { return detectLocationViaIP(); }
  }

  async function fetchWeatherByCoords(lat, lon, cityLabel, countryLabel) {
    const unitParam = settings.weatherUnit === "F" ? "fahrenheit" : "celsius";
    const wData = await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=${unitParam}`,
      4500
    );
    const cur = wData.current;
    const isDay = cur.is_day === 1;
    const wmo = WMO_CODES[cur.weather_code] || ["Clear Sky", isDay ? "☀️" : "🌙", "sunny"];
    const icon = !isDay && (cur.weather_code === 0 || cur.weather_code === 1) ? "🌙" : wmo[1];

    detectedScene = mapWeatherToScene(cur.weather_code, isDay);
    weatherCache = {
      city: cityLabel || "Local Weather", country: countryLabel || "",
      temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature),
      unit: settings.weatherUnit === "F" ? "°F" : "°C",
      humidity: cur.relative_humidity_2m, wind: Math.round(cur.wind_speed_10m),
      label: wmo[0], icon, isDay, detectedScene
    };
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ aurexWeatherCache: weatherCache });
    }
    renderWeatherUI();
    applyActiveAtmosphere();
  }

  async function fetchWeather(manualCity, useGPS = false) {
    const cardBody = document.getElementById("card-weather-body");
    try {
      if (manualCity) {
        const geoData = await fetchJsonWithTimeout(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualCity)}&count=1&language=en&format=json`,
          4000
        );
        if (!geoData.results || !geoData.results.length) throw new Error("City not found");
        const loc = geoData.results[0];
        await fetchWeatherByCoords(loc.latitude, loc.longitude, loc.name, loc.country_code || "");
      } else {
        const loc = useGPS ? await detectLocationWithGPS() : await detectLocationViaIP();
        await fetchWeatherByCoords(loc.lat, loc.lon, loc.city, loc.country);
      }
    } catch {
      if (!weatherCache && cardBody) cardBody.innerHTML = `<div class="empty-state">Offline or city not found. Click ✎ to set city.</div>`;
    }
  }

  function renderWeatherUI() {
    if (!weatherCache) return;
    const html = `
      <div class="weather-main">
        <div class="weather-icon-orb">${weatherCache.icon}</div>
        <div style="min-width:0;">
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
            <span class="weather-temp">${weatherCache.temp}${weatherCache.unit}</span>
            <span class="weather-cond">${escapeHtml(weatherCache.city)}${weatherCache.country ? ", " + weatherCache.country : ""} • ${weatherCache.label}</span>
          </div>
          <div class="weather-meta">
            <span>Feels ${weatherCache.feels}${weatherCache.unit}</span>
            <span>💧 ${weatherCache.humidity}%</span>
            <span>💨 ${weatherCache.wind} km/h</span>
          </div>
        </div>
      </div>
    `;
    const cardBody = document.getElementById("card-weather-body");
    if (cardBody) cardBody.innerHTML = html;
    const widgetWeather = document.getElementById("widget-weather-content");
    if (widgetWeather) widgetWeather.innerHTML = html;
  }

  function setupWeather() {
    const form = document.getElementById("weather-city-form");
    const input = document.getElementById("weather-city-input");
    const editBtn = document.getElementById("btn-weather-edit");
    input.value = settings.weatherAutoLocation ? "" : (settings.weatherCity || "");

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["aurexWeatherCache"], (res) => {
        if (res && res.aurexWeatherCache) {
          weatherCache = res.aurexWeatherCache;
          if (weatherCache.detectedScene) detectedScene = weatherCache.detectedScene;
          renderWeatherUI();
          applyActiveAtmosphere();
        }
      });
    }

    editBtn.addEventListener("click", () => {
      form.classList.toggle("hidden");
      if (!form.classList.contains("hidden")) input.focus();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const city = input.value.trim();
      if (!city) return;
      settings = await saveSettings({ weatherAutoLocation: false, weatherCity: city });
      form.classList.add("hidden");
      fetchWeather(city, false);
      showToast(`Weather set to ${city}`);
    });
    document.getElementById("btn-weather-locate").addEventListener("click", async () => {
      settings = await saveSettings({ weatherAutoLocation: true, weatherCity: "" });
      input.value = ""; form.classList.add("hidden");
      showToast("Detecting your location...");
      fetchWeather(null, true);
    });
    document.getElementById("btn-weather-refresh").addEventListener("click", () => {
      fetchWeather(settings.weatherAutoLocation ? null : settings.weatherCity, false);
      showToast("Refreshing weather...");
    });
    fetchWeather(settings.weatherAutoLocation ? null : settings.weatherCity, false);
  }

  /* ===== Focus Timer, Top Sites, Bookmarks, Sessions, Notes ===== */
  function setupFocusTimer() {
    const display = document.getElementById("focus-time-display");
    const ring = document.getElementById("focus-ring-progress");
    const toggleBtn = document.getElementById("btn-focus-toggle");
    const resetBtn = document.getElementById("btn-focus-reset");
    const circumference = 2 * Math.PI * 50;

    const paint = () => {
      const m = String(Math.floor(focusRemaining / 60)).padStart(2, "0");
      const s = String(focusRemaining % 60).padStart(2, "0");
      display.textContent = `${m}:${s}`;
      ring.style.strokeDashoffset = String(circumference * (1 - focusRemaining / focusDuration));
    };

    document.querySelectorAll(".f-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        clearInterval(focusTimerId); focusTimerId = null; toggleBtn.textContent = "Start";
        document.querySelectorAll(".f-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        focusDuration = Number(tab.dataset.mins) * 60;
        focusRemaining = focusDuration; paint();
      });
    });

    toggleBtn.addEventListener("click", () => {
      if (focusTimerId) {
        clearInterval(focusTimerId); focusTimerId = null; toggleBtn.textContent = "Resume";
      } else {
        toggleBtn.textContent = "Pause";
        focusTimerId = setInterval(() => {
          focusRemaining -= 1;
          if (focusRemaining <= 0) {
            clearInterval(focusTimerId); focusTimerId = null; focusRemaining = 0;
            toggleBtn.textContent = "Start"; window.AurexGlassEngine.sound.chime();
            showToast("Focus session complete!");
          }
          paint();
        }, 1000);
      }
    });

    resetBtn.addEventListener("click", () => {
      clearInterval(focusTimerId); focusTimerId = null;
      focusRemaining = focusDuration; toggleBtn.textContent = "Start"; paint();
    });
    paint();
  }

  function loadTopSites() {
    const el = document.getElementById("top-sites-list");
    if (!el || !chrome.topSites) return;
    chrome.topSites.get((sites) => {
      const list = (sites || []).slice(0, 8);
      if (!list.length) { el.innerHTML = `<div class="empty-state">Visit websites to populate shortcuts.</div>`; return; }
      el.innerHTML = list.map((s) => {
        let shortLabel = s.title || "";
        if (!shortLabel) { try { shortLabel = new URL(s.url).hostname.replace(/^www\./, ""); } catch { shortLabel = s.url; } }
        return `<a class="site-tile" href="${escapeHtml(s.url)}" title="${escapeHtml(shortLabel)}"><img src="${faviconUrl(s.url)}" alt="" /><span>${escapeHtml(shortLabel)}</span></a>`;
      }).join("");
    });
  }

  function loadBookmarks() {
    const el = document.getElementById("bookmarks-list");
    if (!el || !chrome.bookmarks) return;
    chrome.bookmarks.getRecent(8, (items) => {
      const list = (items || []).filter((b) => b.url);
      if (!list.length) { el.innerHTML = `<div class="empty-state">No recent bookmarks yet.</div>`; return; }
      el.innerHTML = list.map((b) => `<a class="list-item" href="${escapeHtml(b.url)}" title="${escapeHtml(b.title)}"><img src="${faviconUrl(b.url)}" alt="" /><span>${escapeHtml(b.title || b.url)}</span></a>`).join("");
    });
  }

  function loadRecentlyClosed() {
    const el = document.getElementById("sessions-list");
    if (!el || !chrome.sessions) return;
    chrome.sessions.getRecentlyClosed({ maxResults: 6 }, (sessions) => {
      const items = (sessions || []).filter((s) => s.tab && s.tab.url);
      if (!items.length) { el.innerHTML = `<div class="empty-state">No recently closed tabs.</div>`; return; }
      el.innerHTML = "";
      items.forEach((s) => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "list-item";
        btn.innerHTML = `<img src="${faviconUrl(s.tab.url)}" alt="" /><span>${escapeHtml(s.tab.title || s.tab.url)}</span>`;
        btn.addEventListener("click", () => chrome.sessions.restore(s.tab.sessionId));
        el.appendChild(btn);
      });
    });
  }

  function setupNotes() {
    const area = document.getElementById("card-notes-area");
    const status = document.getElementById("notes-status");
    if (!area) return;
    area.value = settings.notesText || "";
    let timer = null;
    area.addEventListener("input", () => {
      if (status) status.textContent = "Saving...";
      clearTimeout(timer);
      timer = setTimeout(async () => {
        settings = await saveSettings({ notesText: area.value });
        const wn = document.getElementById("widget-notes-area");
        if (wn && wn !== document.activeElement) wn.value = area.value;
        if (status) status.textContent = "Saved";
      }, 280);
    });
  }

  /* ===== Floating Draggable Widgets ===== */
  function snap(val, grid = 20) { return Math.round(val / grid) * grid; }

  function renderWidgetDrawer() {
    const list = document.getElementById("widget-toggles-list");
    if (!list) return;
    list.innerHTML = "";
    WIDGET_META.forEach((meta) => {
      const cfg = (settings.widgets && settings.widgets[meta.id]) || DEFAULT_SETTINGS.widgets[meta.id];
      const row = document.createElement("div");
      row.className = "drawer-item";
      row.innerHTML = `<div class="drawer-item-info"><strong>${meta.name}</strong><span>${meta.desc}</span></div><label class="switch"><input type="checkbox" ${cfg.enabled ? "checked" : ""} /><span class="slider-toggle"></span></label>`;
      row.querySelector("input").addEventListener("change", async (e) => {
        settings = await saveSettings({ widgets: { ...settings.widgets, [meta.id]: { ...cfg, enabled: e.target.checked } } });
        renderWidgetsLayer();
      });
      list.appendChild(row);
    });
  }

  function buildCalendarHtml() {
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + calendarOffset, 1);
    const year = view.getFullYear(), month = view.getMonth();
    const monthName = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const firstDay = view.getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    let cells = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => `<div class="w-cal-day-name">${d}</div>`).join("");
    for (let i = 0; i < firstDay; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      cells += `<div class="w-cal-cell ${isToday ? "today" : ""}">${d}</div>`;
    }
    return `<div class="w-cal-header"><button type="button" class="mini-btn" id="cal-prev">‹</button><span>${monthName}</span><button type="button" class="mini-btn" id="cal-next">›</button></div><div class="w-cal-grid">${cells}</div>`;
  }

  function renderWidgetBody(id, container) {
    if (id === "clock") {
      container.innerHTML = `<div class="w-clock-time">--:--:--</div><div class="w-clock-sub">${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>`;
      updateClock(); return;
    }
    if (id === "weather") {
      container.innerHTML = `<div id="widget-weather-content"><div class="empty-state">Loading weather...</div></div>`;
      renderWeatherUI(); return;
    }
    if (id === "calendar") {
      const paintCal = () => {
        container.innerHTML = buildCalendarHtml();
        container.querySelector("#cal-prev").addEventListener("click", () => { calendarOffset -= 1; paintCal(); });
        container.querySelector("#cal-next").addEventListener("click", () => { calendarOffset += 1; paintCal(); });
      };
      paintCal(); return;
    }
    if (id === "notes") {
      container.innerHTML = `<textarea id="widget-notes-area" class="notes-textarea" style="height:100%;" placeholder="Floating note..."></textarea>`;
      const ta = container.querySelector("textarea");
      ta.value = settings.notesText || "";
      let t = null;
      ta.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(async () => {
          settings = await saveSettings({ notesText: ta.value });
          const cn = document.getElementById("card-notes-area");
          if (cn) cn.value = ta.value;
        }, 250);
      });
      return;
    }
    if (id === "todo") {
      const paintTodos = () => {
        const todos = settings.todos || [];
        container.innerHTML = `<form class="w-todo-form" id="w-todo-form"><input type="text" id="w-todo-input" placeholder="Add a task..." /><button type="submit">+</button></form><div class="w-todo-list">${todos.map((t) => `<div class="w-todo-item ${t.done ? "done" : ""}"><input type="checkbox" ${t.done ? "checked" : ""} data-id="${t.id}" /><span>${escapeHtml(t.text)}</span><button type="button" class="w-todo-del" data-del="${t.id}">✕</button></div>`).join("")}</div>`;
        container.querySelector("#w-todo-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const text = container.querySelector("#w-todo-input").value.trim();
          if (!text) return;
          settings = await saveSettings({ todos: [...(settings.todos || []), { id: "t-" + Date.now(), text, done: false }] });
          paintTodos();
        });
        container.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.addEventListener("change", async () => {
          settings = await saveSettings({ todos: (settings.todos || []).map((t) => (t.id === cb.dataset.id ? { ...t, done: cb.checked } : t)) });
          paintTodos();
        }));
        container.querySelectorAll(".w-todo-del").forEach((btn) => btn.addEventListener("click", async () => {
          settings = await saveSettings({ todos: (settings.todos || []).filter((t) => t.id !== btn.dataset.del) });
          paintTodos();
        }));
      };
      paintTodos(); return;
    }
    if (id === "battery") {
      if (navigator.getBattery) {
        navigator.getBattery().then((bat) => {
          const paintBat = () => {
            const pct = Math.round(bat.level * 100);
            container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;"><strong style="font-size:28px;">${pct}%</strong><span style="font-size:12px;color:var(--ax-text-muted);">${bat.charging ? "⚡ Charging" : "On Battery"}</span></div><div class="w-battery-bar"><div class="w-battery-fill" style="width:${pct}%"></div></div>`;
          };
          paintBat(); bat.addEventListener("levelchange", paintBat); bat.addEventListener("chargingchange", paintBat);
        });
      } else { container.innerHTML = `<div class="empty-state">Desktop Power • AC Connected</div>`; }
      return;
    }
    if (id === "system") {
      const cores = navigator.hardwareConcurrency || "N/A";
      const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "N/A";
      const res = `${window.screen.width}×${window.screen.height}`;
      const net = navigator.connection ? (navigator.connection.effectiveType || "Online").toUpperCase() : "Online";
      container.innerHTML = `<div class="w-sys-grid"><div class="w-sys-stat"><small>CPU</small><strong>${cores} Threads</strong></div><div class="w-sys-stat"><small>RAM</small><strong>${mem}</strong></div><div class="w-sys-stat"><small>Display</small><strong>${res}</strong></div><div class="w-sys-stat"><small>Network</small><strong>${net}</strong></div></div>`;
    }
  }

  function makeInteractiveWidget(el, id) {
    const header = el.querySelector(".widget-header");
    const resizeHandle = el.querySelector(".widget-resize-handle");
    el.addEventListener("mousedown", () => { el.style.zIndex = String(++topZIndex); });
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest(".widget-close")) return;
      e.preventDefault(); el.classList.add("dragging");
      const sx0 = e.clientX, sy0 = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      const onMove = (mv) => {
        el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, ox + (mv.clientX - sx0)))}px`;
        el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, oy + (mv.clientY - sy0)))}px`;
      };
      const onUp = async () => {
        document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp);
        el.classList.remove("dragging");
        const sx = snap(el.offsetLeft), sy = snap(el.offsetTop);
        el.style.left = `${sx}px`; el.style.top = `${sy}px`;
        settings = await saveSettings({ widgets: { ...settings.widgets, [id]: { ...settings.widgets[id], x: sx, y: sy } } });
      };
      document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
    });
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault(); e.stopPropagation(); el.classList.add("dragging");
      const sx0 = e.clientX, sy0 = e.clientY, ow = el.offsetWidth, oh = el.offsetHeight;
      const onMove = (mv) => {
        el.style.width = `${Math.max(220, Math.min(560, ow + (mv.clientX - sx0)))}px`;
        el.style.height = `${Math.max(130, Math.min(480, oh + (mv.clientY - sy0)))}px`;
      };
      const onUp = async () => {
        document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp);
        el.classList.remove("dragging");
        const sw = snap(el.offsetWidth), sh = snap(el.offsetHeight);
        el.style.width = `${sw}px`; el.style.height = `${sh}px`;
        settings = await saveSettings({ widgets: { ...settings.widgets, [id]: { ...settings.widgets[id], w: sw, h: sh } } });
      };
      document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
    });
  }

  function renderWidgetsLayer() {
    const layer = document.getElementById("widgets-layer");
    if (!layer) return;
    layer.innerHTML = "";
    WIDGET_META.forEach((meta) => {
      const cfg = (settings.widgets && settings.widgets[meta.id]) || DEFAULT_SETTINGS.widgets[meta.id];
      if (!cfg.enabled) return;
      const el = document.createElement("section");
      el.className = "ax-widget m3-surface";
      el.style.left = `${cfg.x}px`; el.style.top = `${cfg.y}px`;
      el.style.width = `${cfg.w}px`; el.style.height = `${cfg.h}px`;
      el.style.zIndex = String(++topZIndex);
      el.innerHTML = `<div class="widget-header"><span>${meta.name}</span><button type="button" class="widget-close">✕</button></div><div class="widget-content"></div><div class="widget-resize-handle"></div>`;
      el.querySelector(".widget-close").addEventListener("click", async () => {
        settings = await saveSettings({ widgets: { ...settings.widgets, [meta.id]: { ...cfg, enabled: false } } });
        renderWidgetsLayer(); renderWidgetDrawer();
      });
      layer.appendChild(el);
      renderWidgetBody(meta.id, el.querySelector(".widget-content"));
      makeInteractiveWidget(el, meta.id);
    });
  }

  /* ===== Actions, Command Palette & Live Sync ===== */
  async function setAtmosphere(mode) {
    settings = await saveSettings({ weatherAtmosphere: mode, theme: { ...settings.theme, bgMode: "weather" } });
    window.AurexGlassEngine.apply(settings);
    applyActiveAtmosphere();
    showToast(mode === "auto" ? "Live location weather active" : `Atmosphere: ${mode.toUpperCase()}`);
  }

  async function toggleZenMode() {
    const next = !settings.zenMode;
    settings = await saveSettings({ zenMode: next });
    document.body.classList.toggle("zen-mode", next);
    const btn = document.getElementById("btn-zen-mode");
    if (btn) btn.classList.toggle("active-pill", next);
  }

  async function toggleClockStyle() {
    const next = settings.clockStyle === "digital" ? "m3-analog" : "digital";
    settings = await saveSettings({ clockStyle: next });
    applyClockMode();
    showToast(next === "m3-analog" ? "Clock: Material 3 Scalloped Analog" : "Clock: Material 3 Digital");
  }

  function cycleAmbientSound() {
    soundIndex = (soundIndex + 1) % SOUND_MODES.length;
    const m = SOUND_MODES[soundIndex];
    window.AurexGlassEngine.sound.start(m.id);
    const icon = document.getElementById("sound-icon");
    const lbl = document.getElementById("sound-label");
    if (icon) icon.textContent = m.icon;
    if (lbl) lbl.textContent = m.label;
    const btn = document.getElementById("btn-ambient-sound");
    if (btn) btn.classList.toggle("active-pill", m.id !== "off");
    showToast(m.id === "off" ? "Ambient sound muted" : `Playing: ${m.label}`);
  }

  function setupCommandPalette() {
    const modal = document.getElementById("cmd-modal");
    const input = document.getElementById("cmd-input");
    const list = document.getElementById("cmd-list");

    const commands = [
      { label: "⚙ Open Material 3 Settings (Toggle Features)", tag: "Settings", run: () => chrome.runtime.openOptionsPage() },
      { label: "🕒 Switch Clock: M3 Analog / Digital", tag: "Clock", run: () => toggleClockStyle() },
      { label: "🌧 Atmosphere: Rainy Glass", tag: "Weather", run: () => setAtmosphere("rain") },
      { label: "📍 Atmosphere: Live Location Weather", tag: "Weather", run: () => setAtmosphere("auto") },
      { label: "☀️ Atmosphere: Sunny Rays", tag: "Weather", run: () => setAtmosphere("sunny") },
      { label: "🌙 Atmosphere: Starry Night", tag: "Weather", run: () => setAtmosphere("night") },
      { label: "🌧 Toggle Ambient Rain Audio", tag: "Audio", run: () => cycleAmbientSound() },
      { label: "✦ Toggle Zen Mode", tag: "View", run: () => toggleZenMode() }
    ];

    const renderCmds = (q = "") => {
      const clean = q.trim().toLowerCase();
      list.innerHTML = "";
      commands
        .filter((c) => c.label.toLowerCase().includes(clean) || c.tag.toLowerCase().includes(clean))
        .forEach((cmd) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "cmd-item";
          b.innerHTML = `<span>${cmd.label}</span><small>${cmd.tag}</small>`;
          b.addEventListener("click", () => { modal.classList.add("hidden"); cmd.run(); });
          list.appendChild(b);
        });
    };

    const openPalette = () => { modal.classList.remove("hidden"); input.value = ""; renderCmds(""); input.focus(); };
    document.getElementById("btn-cmd-palette").addEventListener("click", openPalette);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
    input.addEventListener("input", () => renderCmds(input.value));
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      else if (e.key === "Escape") modal.classList.add("hidden");
    });
  }

  function setupNavigation() {
    document.getElementById("btn-toggle-clock").addEventListener("click", toggleClockStyle);
    document.getElementById("atmo-select").addEventListener("change", (e) => setAtmosphere(e.target.value));
    document.getElementById("btn-ambient-sound").addEventListener("click", cycleAmbientSound);
    document.getElementById("btn-zen-mode").addEventListener("click", toggleZenMode);

    const drawer = document.getElementById("widgets-drawer");
    document.getElementById("btn-widgets-drawer").addEventListener("click", () => drawer.classList.toggle("open"));
    document.getElementById("btn-close-drawer").addEventListener("click", () => drawer.classList.remove("open"));
    document.getElementById("btn-reset-widgets").addEventListener("click", async () => {
      const reset = {};
      for (const key of Object.keys(DEFAULT_SETTINGS.widgets)) {
        reset[key] = { ...DEFAULT_SETTINGS.widgets[key], enabled: Boolean(settings.widgets[key] && settings.widgets[key].enabled) };
      }
      settings = await saveSettings({ widgets: reset });
      renderWidgetsLayer();
      showToast("Widget positions reset");
    });
    document.getElementById("btn-open-settings").addEventListener("click", () => {
      if (chrome.runtime && chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
      else window.open("../settings/settings.html", "_blank");
    });
  }

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.aurexSettings && changes.aurexSettings.newValue) {
        settings = changes.aurexSettings.newValue;
        window.AurexGlassEngine.apply(settings);
        applyActiveAtmosphere();
        applyClockMode();
        applyModulesVisibility();
        renderPresetStrip();
        renderAIToolsDock();
        updateClock();
      }
    });
  }

  async function boot() {
    settings = await loadSettings();
    buildM3ScallopDial();
    applyClockMode();
    applyModulesVisibility();

    document.body.classList.toggle("zen-mode", Boolean(settings.zenMode));
    const zenBtn = document.getElementById("btn-zen-mode");
    if (zenBtn) zenBtn.classList.toggle("active-pill", Boolean(settings.zenMode));

    window.AurexGlassEngine.apply(settings);
    applyActiveAtmosphere();

    updateClock();
    setInterval(updateClock, 1000);

    renderPresetStrip();
    setupSearch();
    renderQuickActions();
    setupQuickLinkModal();
    renderAIToolsDock();
    setupAIToolModal();
    setupFocusTimer();
    loadTopSites();
    loadBookmarks();
    loadRecentlyClosed();
    setupNotes();
    setupWeather();
    renderWidgetDrawer();
    renderWidgetsLayer();
    setupCommandPalette();
    setupNavigation();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
