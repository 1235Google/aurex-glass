(() => {
  const SCHEMA_VERSION = 6;

  const THEME_PRESETS = {
    materialOcean: {
      id: "materialOcean",
      name: "M3 Ocean Glass",
      tagline: "Material 3 expressive sky-indigo tonal glass",
      accent: "#7cc4ff",
      accentSecondary: "#a8c7fa",
      glassOpacity: 0.14,
      blur: 28,
      glow: 0.36,
      radius: 28,
      bgMode: "weather",
      bgSolid: "#0c182c",
      bgGrad1: "#0d1b34",
      bgGrad2: "#1c3866",
      bgGrad3: "#122142",
      surfaceTint: "215, 232, 255",
      borderTint: "230, 242, 255",
      previewColors: ["#122142", "#7cc4ff", "#a8c7fa"]
    },
    materialLavender: {
      id: "materialLavender",
      name: "M3 Lavender Bloom",
      tagline: "Organic Material You lavender & rose tonal glass",
      accent: "#d0bcff",
      accentSecondary: "#f2b8d5",
      glassOpacity: 0.15,
      blur: 28,
      glow: 0.36,
      radius: 28,
      bgMode: "aurora",
      bgSolid: "#171226",
      bgGrad1: "#1a1330",
      bgGrad2: "#3b2766",
      bgGrad3: "#211638",
      surfaceTint: "242, 232, 255",
      borderTint: "238, 224, 255",
      previewColors: ["#1a1330", "#d0bcff", "#f2b8d5"]
    },
    materialSage: {
      id: "materialSage",
      name: "M3 Sage Mint",
      tagline: "Calm botanical mint-teal tonal surfaces",
      accent: "#80e5c3",
      accentSecondary: "#67d5e8",
      glassOpacity: 0.14,
      blur: 26,
      glow: 0.32,
      radius: 28,
      bgMode: "aurora",
      bgSolid: "#0b1c1a",
      bgGrad1: "#0c201e",
      bgGrad2: "#17423c",
      bgGrad3: "#0e2629",
      surfaceTint: "218, 252, 242",
      borderTint: "225, 255, 246",
      previewColors: ["#0c201e", "#80e5c3", "#67d5e8"]
    },
    visionGlass: {
      id: "visionGlass",
      name: "Vision Liquid Glass",
      tagline: "Spatial platinum crystal glass with vivid edges",
      accent: "#60a5fa",
      accentSecondary: "#a78bfa",
      glassOpacity: 0.13,
      blur: 30,
      glow: 0.42,
      radius: 26,
      bgMode: "weather",
      bgSolid: "#0c152c",
      bgGrad1: "#0f1e3d",
      bgGrad2: "#1e3a6e",
      bgGrad3: "#131b3a",
      surfaceTint: "238, 246, 255",
      borderTint: "255, 255, 255",
      previewColors: ["#172554", "#60a5fa", "#e2e8f0"]
    },
    minimalBlack: {
      id: "minimalBlack",
      name: "M3 Carbon Dark",
      tagline: "Sleek monochrome smoked glass for deep focus",
      accent: "#e4e4e7",
      accentSecondary: "#a1a1aa",
      glassOpacity: 0.09,
      blur: 22,
      glow: 0.2,
      radius: 24,
      bgMode: "solid",
      bgSolid: "#0b0b0f",
      bgGrad1: "#0b0b0f",
      bgGrad2: "#1e1e26",
      bgGrad3: "#0b0b0f",
      surfaceTint: "255, 255, 255",
      borderTint: "255, 255, 255",
      previewColors: ["#0b0b0f", "#27272a", "#e4e4e7"]
    }
  };

  const LAYOUT_PRESETS = {
    minimal: {
      topBarExtras: false,
      clock: true,
      greeting: true,
      weather: true,
      searchBar: true,
      searchEngines: true,
      quickShortcuts: false,
      topSites: false,
      focusTimer: false,
      notes: false,
      bookmarks: false,
      recentlyClosed: false,
      aiDock: true,
      widgetsBtn: true
    },
    productive: {
      topBarExtras: false,
      clock: true,
      greeting: true,
      weather: true,
      searchBar: true,
      searchEngines: true,
      quickShortcuts: true,
      topSites: true,
      focusTimer: true,
      notes: true,
      bookmarks: false,
      recentlyClosed: false,
      aiDock: true,
      widgetsBtn: true
    },
    full: {
      topBarExtras: true,
      clock: true,
      greeting: true,
      weather: true,
      searchBar: true,
      searchEngines: true,
      quickShortcuts: true,
      topSites: true,
      focusTimer: true,
      notes: true,
      bookmarks: true,
      recentlyClosed: true,
      aiDock: true,
      widgetsBtn: true
    }
  };

  const DEFAULT_AI_TOOLS = [
    { id: "ai-1", name: "ChatGPT", url: "https://chatgpt.com" },
    { id: "ai-2", name: "Perplexity", url: "https://www.perplexity.ai" },
    { id: "ai-3", name: "Gemini", url: "https://gemini.google.com" },
    { id: "ai-4", name: "Claude", url: "https://claude.ai" }
  ];

  const DEFAULT_SETTINGS = {
    schemaVersion: SCHEMA_VERSION,
    profileName: "Creator",
    clockFormat: "12h",
    clockStyle: "m3-analog",
    searchEngine: "google",
    weatherAutoLocation: true,
    weatherCity: "",
    weatherUnit: "C",
    weatherAtmosphere: "rain",
    zenMode: false,
    modules: { ...LAYOUT_PRESETS.minimal },
    theme: { ...THEME_PRESETS.materialOcean },
    wallpaperDataUrl: "",
    effects: {
      particles: true,
      particleDensity: 55,
      mouseGlow: true,
      smoothTransitions: true,
      glassSpecular: true
    },
    quickLinks: [
      { id: "ql-1", title: "Gmail", url: "https://mail.google.com" },
      { id: "ql-2", title: "YouTube", url: "https://www.youtube.com" },
      { id: "ql-3", title: "GitHub", url: "https://github.com" },
      { id: "ql-4", title: "Drive", url: "https://drive.google.com" },
      { id: "ql-5", title: "Calendar", url: "https://calendar.google.com" }
    ],
    aiTools: DEFAULT_AI_TOOLS,
    aiDockExpanded: false,
    websiteThemes: {
      enabled: true,
      sites: {
        youtube: true,
        google: true,
        github: true,
        chatgpt: true
      },
      customCss: [
        {
          id: "sample-global",
          domain: "*",
          enabled: false,
          css: "/* Example custom CSS */\n::selection {\n  background: rgba(124, 196, 255, 0.35);\n  color: #ffffff;\n}"
        }
      ]
    },
    widgets: {
      clock: { enabled: false, x: 40, y: 100, w: 260, h: 160 },
      weather: { enabled: false, x: 40, y: 280, w: 280, h: 190 },
      calendar: { enabled: false, x: 340, y: 100, w: 300, h: 300 },
      notes: { enabled: false, x: 660, y: 100, w: 280, h: 220 },
      todo: { enabled: false, x: 660, y: 340, w: 300, h: 260 },
      battery: { enabled: false, x: 340, y: 420, w: 260, h: 150 },
      system: { enabled: false, x: 40, y: 490, w: 280, h: 200 }
    },
    notesText: "Welcome to Aurex Glass v4.2 — Material 3.\n\n• Click AI Tools at the bottom to show or hide ChatGPT, Perplexity, Gemini, and Claude.",
    todos: [
      { id: "t-1", text: "Customize which modules appear on New Tab", done: false },
      { id: "t-2", text: "Try the collapsible AI Tools pill at the bottom", done: false }
    ]
  };

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    const output = Array.isArray(target) ? [...target] : { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        output[key] = deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        output[key] = source[key];
      }
    }
    return output;
  }

  async function loadSettings() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(["aurexSettings"], (res) => {
          const saved = res.aurexSettings || {};
          const merged = deepMerge(DEFAULT_SETTINGS, saved);
          if (!saved.schemaVersion || saved.schemaVersion < SCHEMA_VERSION) {
            merged.schemaVersion = SCHEMA_VERSION;
            merged.aiTools = [...DEFAULT_AI_TOOLS];
            merged.aiDockExpanded = false;
            if (!saved.schemaVersion || saved.schemaVersion < 5) {
              merged.modules = { ...LAYOUT_PRESETS.minimal };
              merged.clockStyle = "m3-analog";
            }
            chrome.storage.local.set({ aurexSettings: merged });
          }
          resolve(merged);
        });
      });
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  async function saveSettings(partialOrFull) {
    const current = await loadSettings();
    const merged = deepMerge(current, partialOrFull);
    merged.schemaVersion = SCHEMA_VERSION;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ aurexSettings: merged }, () => resolve(merged));
      });
    }
    return merged;
  }

  async function replaceSettings(fullSettings) {
    const merged = deepMerge(DEFAULT_SETTINGS, fullSettings);
    merged.schemaVersion = SCHEMA_VERSION;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ aurexSettings: merged }, () => resolve(merged));
      });
    }
    return merged;
  }

  function hexToRgb(hex) {
    const clean = (hex || "#7cc4ff").replace("#", "").trim();
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return "124, 196, 255";
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  window.AurexDefaults = {
    THEME_PRESETS,
    LAYOUT_PRESETS,
    DEFAULT_AI_TOOLS,
    DEFAULT_SETTINGS,
    deepMerge,
    loadSettings,
    saveSettings,
    replaceSettings,
    hexToRgb
  };
})();
