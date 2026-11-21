(() => {
  const { THEME_PRESETS, loadSettings, saveSettings } = window.AurexDefaults;

  async function init() {
    let settings = await loadSettings();

    const toggle = document.getElementById("popup-sites-toggle");
    toggle.checked = Boolean(settings.websiteThemes.enabled);
    toggle.addEventListener("change", async () => {
      settings = await saveSettings({ websiteThemes: { ...settings.websiteThemes, enabled: toggle.checked } });
    });

    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const hostEl = document.getElementById("current-host");
        if (tabs && tabs[0] && tabs[0].url) {
          try { hostEl.textContent = new URL(tabs[0].url).hostname; } catch { hostEl.textContent = "Browser page"; }
        }
      });
    }

    const syncAtmo = () => {
      document.querySelectorAll("#popup-weather-pills .p-pill").forEach((b) => {
        b.classList.toggle("active", b.dataset.atmo === (settings.weatherAtmosphere || "rain"));
      });
    };
    document.querySelectorAll("#popup-weather-pills .p-pill").forEach((b) => {
      b.addEventListener("click", async () => {
        settings = await saveSettings({
          weatherAtmosphere: b.dataset.atmo,
          theme: { ...settings.theme, bgMode: "weather" }
        });
        syncAtmo();
      });
    });
    syncAtmo();

    const container = document.getElementById("popup-presets");
    const renderPresets = () => {
      container.innerHTML = "";
      Object.values(THEME_PRESETS).forEach((preset) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "p-pill" + (settings.theme.id === preset.id ? " active" : "");
        btn.textContent = preset.name;
        btn.addEventListener("click", async () => {
          settings = await saveSettings({ theme: { ...preset } });
          renderPresets();
        });
        container.appendChild(btn);
      });
    };
    renderPresets();

    document.getElementById("btn-popup-newtab").addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://newtab" });
      window.close();
    });
    document.getElementById("btn-popup-settings").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
