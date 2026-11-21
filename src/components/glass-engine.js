(() => {
  class AurexSoundEngine {
    constructor() {
      this.ctx = null;
      this.activeNode = null;
      this.mode = "off";
    }

    stop() {
      if (this.activeNode) {
        try { this.activeNode.stop(); } catch {}
        try { this.activeNode.disconnect(); } catch {}
        this.activeNode = null;
      }
      this.mode = "off";
    }

    start(mode) {
      this.stop();
      if (!mode || mode === "off") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") this.ctx.resume();

      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (mode === "rain") {
          lastOut = (lastOut + 0.08 * white) / 1.08;
          data[i] = lastOut * 2.4 + (Math.random() > 0.999 ? (Math.random() - 0.5) * 0.6 : 0);
        } else {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.2;
        }
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = mode === "rain" ? "bandpass" : "lowpass";
      filter.frequency.value = mode === "rain" ? 1050 : 320;
      filter.Q.value = mode === "rain" ? 0.55 : 0.9;

      const gain = this.ctx.createGain();
      gain.gain.value = mode === "rain" ? 0.16 : 0.18;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();

      this.activeNode = noise;
      this.mode = mode;
    }

    chime() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(528, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(792, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.15);
    }
  }

  class AurexGlassEngine {
    constructor() {
      this.bgLayer = null;
      this.fxCanvas = null;
      this.fxCtx = null;
      this.mouseGlowEl = null;
      this.mouseGlowEnabled = false;
      this.mouseBound = false;
      this.animId = null;
      this.isVisible = !document.hidden;

      this.bgMode = "weather";
      this.weatherScene = "rain";
      this.particlesEnabled = true;
      this.particleDensity = 55;
      this.accentRgb = "96, 165, 250";

      this.rainDrops = [];
      this.glassDroplets = [];
      this.ripples = [];
      this.stars = [];
      this.shootingStars = [];
      this.snowFlakes = [];
      this.clouds = [];
      this.sunMotes = [];
      this.ambientParticles = [];
      this.lightningAlpha = 0;
      this.frameCount = 0;

      this.sound = new AurexSoundEngine();

      document.addEventListener("visibilitychange", () => {
        this.isVisible = !document.hidden;
        if (this.isVisible) this.startLoop();
        else this.stopLoop();
      });
    }

    ensureLayers() {
      if (!document.getElementById("ax-bg-layer")) {
        const bg = document.createElement("div");
        bg.id = "ax-bg-layer";
        bg.className = "ax-bg-layer";
        bg.innerHTML = `
          <div class="ax-sky-backdrop"></div>
          <div class="ax-sun-disc"></div>
          <div class="ax-moon-disc"></div>
          <div class="ax-aurora-orb ax-orb-1"></div>
          <div class="ax-aurora-orb ax-orb-2"></div>
          <div class="ax-aurora-orb ax-orb-3"></div>
          <div class="ax-aurora-orb ax-orb-4"></div>
          <div class="ax-wallpaper-img" id="ax-wallpaper-img"></div>
          <div class="ax-bg-scrim"></div>
        `;
        document.body.prepend(bg);
        this.bgLayer = bg;
      } else {
        this.bgLayer = document.getElementById("ax-bg-layer");
      }

      if (!document.getElementById("ax-fx-canvas")) {
        const canvas = document.createElement("canvas");
        canvas.id = "ax-fx-canvas";
        canvas.className = "ax-fx-canvas";
        this.bgLayer.after(canvas);
        this.fxCanvas = canvas;
        this.fxCtx = canvas.getContext("2d");
        window.addEventListener("resize", () => {
          this.resizeCanvas();
          this.seedEntities();
        });
        this.resizeCanvas();
      } else {
        this.fxCanvas = document.getElementById("ax-fx-canvas");
        this.fxCtx = this.fxCanvas.getContext("2d");
      }

      if (!document.getElementById("ax-mouse-glow")) {
        const glow = document.createElement("div");
        glow.id = "ax-mouse-glow";
        glow.className = "ax-mouse-glow";
        this.fxCanvas.after(glow);
        this.mouseGlowEl = glow;
      } else {
        this.mouseGlowEl = document.getElementById("ax-mouse-glow");
      }

      if (!this.mouseBound) {
        this.mouseBound = true;
        window.addEventListener(
          "mousemove",
          (e) => {
            if (!this.mouseGlowEnabled || !this.mouseGlowEl) return;
            this.mouseGlowEl.style.transform = `translate3d(${e.clientX - 280}px, ${e.clientY - 280}px, 0)`;
          },
          { passive: true }
        );
      }
    }

    resizeCanvas() {
      if (!this.fxCanvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.fxCanvas.width = window.innerWidth * dpr;
      this.fxCanvas.height = window.innerHeight * dpr;
      if (this.fxCtx) this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setWeatherScene(scene) {
      const valid = ["sunny", "rain", "night", "cloudy", "storm", "snow"];
      this.weatherScene = valid.includes(scene) ? scene : "rain";
      this.ensureLayers();
      this.bgLayer.dataset.weather = this.weatherScene;
      this.seedEntities();
      if (this.isVisible) this.startLoop();
    }

    apply(settings) {
      this.ensureLayers();
      const root = document.documentElement;
      const theme = settings.theme || window.AurexDefaults.DEFAULT_SETTINGS.theme;
      const effects = settings.effects || window.AurexDefaults.DEFAULT_SETTINGS.effects;

      const accentRgb = window.AurexDefaults.hexToRgb(theme.accent);
      const accent2Rgb = window.AurexDefaults.hexToRgb(theme.accentSecondary || theme.accent);
      this.accentRgb = accentRgb;

      root.style.setProperty("--ax-accent", theme.accent);
      root.style.setProperty("--ax-accent-rgb", accentRgb);
      root.style.setProperty("--ax-accent-2", theme.accentSecondary || theme.accent);
      root.style.setProperty("--ax-accent-2-rgb", accent2Rgb);
      root.style.setProperty("--ax-glass-opacity", String(theme.glassOpacity));
      root.style.setProperty("--ax-glass-hover-opacity", String(Math.min(0.36, Number(theme.glassOpacity) + 0.06)));
      root.style.setProperty("--ax-blur", `${theme.blur}px`);
      root.style.setProperty("--ax-glow", String(theme.glow));
      root.style.setProperty("--ax-radius", `${theme.radius}px`);
      root.style.setProperty("--ax-surface-rgb", theme.surfaceTint || "235, 245, 255");
      root.style.setProperty("--ax-border-rgb", theme.borderTint || "255, 255, 255");
      root.style.setProperty("--ax-bg-solid", theme.bgSolid || "#0c152c");
      root.style.setProperty("--ax-bg-grad-1", theme.bgGrad1 || "#0f1e3d");
      root.style.setProperty("--ax-bg-grad-2", theme.bgGrad2 || "#1e3a6e");
      root.style.setProperty("--ax-bg-grad-3", theme.bgGrad3 || "#131b3a");

      this.bgMode = theme.bgMode || "weather";
      this.bgLayer.dataset.mode = this.bgMode;
      this.bgLayer.dataset.weather = this.weatherScene;

      const wpEl = document.getElementById("ax-wallpaper-img");
      if (wpEl) {
        if (this.bgMode === "wallpaper" && settings.wallpaperDataUrl) {
          wpEl.style.backgroundImage = `url("${settings.wallpaperDataUrl}")`;
          wpEl.style.opacity = "1";
        } else {
          wpEl.style.backgroundImage = "none";
          wpEl.style.opacity = "0";
        }
      }

      document.body.classList.toggle("ax-no-transitions", !effects.smoothTransitions);
      document.body.classList.toggle("ax-no-specular", effects.glassSpecular === false);

      this.mouseGlowEnabled = Boolean(effects.mouseGlow);
      if (this.mouseGlowEl) {
        this.mouseGlowEl.style.opacity = this.mouseGlowEnabled ? "1" : "0";
      }

      this.particlesEnabled = Boolean(effects.particles);
      this.particleDensity = Number(effects.particleDensity || 55);

      this.seedEntities();
      if (this.isVisible) this.startLoop();
    }

    seedEntities() {
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 800;

      // Multi-depth falling rain streaks (background + foreground)
      const rainCount = this.weatherScene === "storm" ? 260 : 185;
      this.rainDrops = Array.from({ length: rainCount }, () => {
        const depth = Math.random(); // 0 = far, 1 = close
        return {
          x: Math.random() * (w + 260) - 80,
          y: Math.random() * h,
          len: 14 + depth * 28,
          speed: 9 + depth * 14,
          opacity: 0.16 + depth * 0.44,
          width: 0.7 + depth * 1.25,
          depth
        };
      });

      // 3D Refractive Glass Raindrops sliding down the viewport
      this.glassDroplets = Array.from({ length: 48 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 4.4 + 1.8,
        vy: Math.random() * 0.65 + 0.12,
        wobble: Math.random() * Math.PI * 2,
        pauseTicks: Math.floor(Math.random() * 50)
      }));

      this.ripples = [];

      // Twinkling stars
      this.stars = Array.from({ length: 145 }, () => ({
        x: Math.random() * w,
        y: Math.random() * (h * 0.85),
        r: Math.random() * 1.8 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.028 + 0.01
      }));
      this.shootingStars = [];

      // Sunny golden motes
      this.sunMotes = Array.from({ length: 65 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 3.8 + 1.2,
        vx: Math.random() * 0.4 + 0.1,
        vy: (Math.random() - 0.5) * 0.25,
        a: Math.random() * 0.5 + 0.18
      }));

      // Volumetric clouds
      this.clouds = Array.from({ length: 16 }, () => ({
        x: Math.random() * (w + 400) - 200,
        y: Math.random() * (h * 0.7),
        rx: Math.random() * 210 + 130,
        ry: Math.random() * 70 + 45,
        vx: Math.random() * 0.35 + 0.12,
        a: Math.random() * 0.15 + 0.07
      }));

      // Snowflakes
      this.snowFlakes = Array.from({ length: 115 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 3.0 + 1.0,
        vy: Math.random() * 1.5 + 0.6,
        vx: (Math.random() - 0.5) * 0.65,
        phase: Math.random() * Math.PI * 2
      }));

      const count = Math.max(15, Math.min(110, this.particleDensity));
      this.ambientParticles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.08,
        a: Math.random() * 0.5 + 0.16
      }));
    }

    drawRain(ctx, w, h, isStorm) {
      ctx.lineCap = "round";
      const slant = isStorm ? 5.2 : 2.8;

      // 1. Crisp Falling Rain Streaks
      for (const d of this.rainDrops) {
        d.x -= isStorm ? 3.2 : 1.7;
        d.y += d.speed * (isStorm ? 1.25 : 1);
        if (d.y > h + 30) {
          // Spawn subtle splash ripple near bottom for foreground drops
          if (d.depth > 0.68 && this.ripples.length < 18) {
            this.ripples.push({ x: d.x, y: h - 10 - Math.random() * 24, r: 2, maxR: 16 + Math.random() * 14, a: 0.45 });
          }
          d.y = -35;
          d.x = Math.random() * (w + 260) - 60;
        }
        if (d.x < -50) d.x = w + 50;

        const grad = ctx.createLinearGradient(d.x, d.y, d.x - slant, d.y + d.len);
        grad.addColorStop(0, "rgba(186, 224, 255, 0)");
        grad.addColorStop(0.55, `rgba(205, 232, 255, ${d.opacity * 0.85})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${d.opacity})`);

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - slant, d.y + d.len);
        ctx.strokeStyle = grad;
        ctx.lineWidth = d.width;
        ctx.stroke();
      }

      // 2. Bottom Splash Ripples
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const rp = this.ripples[i];
        rp.r += 0.9;
        rp.a -= 0.022;
        if (rp.a <= 0 || rp.r >= rp.maxR) {
          this.ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(210, 236, 255, ${rp.a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 3. 3D Refractive Glass Droplets sliding down the window
      for (const g of this.glassDroplets) {
        g.wobble += 0.035;
        if (g.pauseTicks > 0) {
          g.pauseTicks -= 1;
        } else {
          g.y += g.vy;
          g.x += Math.sin(g.wobble) * 0.18;
          if (Math.random() > 0.992) g.pauseTicks = 25 + Math.floor(Math.random() * 45);
        }
        if (g.y > h + 20) {
          g.y = -15;
          g.x = Math.random() * w;
          g.r = Math.random() * 4.4 + 1.8;
        }

        // Subtle vertical trail above sliding droplet
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - g.r * 4.5);
        ctx.lineTo(g.x, g.y);
        ctx.strokeStyle = "rgba(220, 240, 255, 0.14)";
        ctx.lineWidth = Math.max(0.8, g.r * 0.32);
        ctx.stroke();

        // Droplet body with refractive highlight & rim
        const grad = ctx.createRadialGradient(
          g.x - g.r * 0.32, g.y - g.r * 0.35, 0.2,
          g.x, g.y, g.r * 1.25
        );
        grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
        grad.addColorStop(0.45, "rgba(186, 226, 255, 0.32)");
        grad.addColorStop(0.85, "rgba(110, 175, 255, 0.14)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0.26)");

        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r * 0.88, g.r * 1.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // 4. Soft Lightning Flash for Storm
      if (isStorm) {
        if (this.lightningAlpha <= 0 && Math.random() > 0.993) {
          this.lightningAlpha = 0.3;
        }
        if (this.lightningAlpha > 0) {
          ctx.fillStyle = `rgba(215, 235, 255, ${this.lightningAlpha})`;
          ctx.fillRect(0, 0, w, h);
          this.lightningAlpha -= 0.025;
        }
      }
    }

    drawSunny(ctx, w, h) {
      ctx.save();
      const beamGrad = ctx.createLinearGradient(w * 0.88, 0, w * 0.25, h * 0.9);
      beamGrad.addColorStop(0, "rgba(255, 244, 184, 0.24)");
      beamGrad.addColorStop(0.5, "rgba(253, 224, 71, 0.08)");
      beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = beamGrad;
      const sway = Math.sin(this.frameCount * 0.006) * 30;
      ctx.beginPath();
      ctx.moveTo(w * 0.74 + sway, 0);
      ctx.lineTo(w * 0.98 + sway, 0);
      ctx.lineTo(w * 0.56 + sway, h);
      ctx.lineTo(w * 0.20 + sway, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      for (const m of this.sunMotes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x > w + 10) m.x = -10;
        if (m.y < -10) m.y = h + 10;
        if (m.y > h + 10) m.y = -10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 210, ${m.a})`;
        ctx.fill();
      }
    }

    drawNight(ctx, w, h) {
      for (const s of this.stars) {
        s.phase += s.speed;
        const alpha = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 245, 255, ${alpha})`;
        ctx.fill();
      }

      if (this.shootingStars.length < 1 && Math.random() > 0.991) {
        this.shootingStars.push({
          x: Math.random() * w * 0.7 + w * 0.15,
          y: Math.random() * h * 0.3,
          vx: 9 + Math.random() * 5,
          vy: 4 + Math.random() * 3,
          life: 1
        });
      }

      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        const st = this.shootingStars[i];
        st.x += st.vx;
        st.y += st.vy;
        st.life -= 0.022;
        if (st.life <= 0) {
          this.shootingStars.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(st.x, st.y, st.x - st.vx * 9, st.y - st.vy * 9);
        grad.addColorStop(0, `rgba(255, 255, 255, ${st.life})`);
        grad.addColorStop(1, "rgba(147, 197, 253, 0)");
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x - st.vx * 9, st.y - st.vy * 9);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    drawCloudy(ctx, w, h) {
      for (const c of this.clouds) {
        c.x += c.vx;
        if (c.x - c.rx > w + 100) c.x = -c.rx - 80;
        const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.rx);
        grad.addColorStop(0, `rgba(226, 238, 255, ${c.a})`);
        grad.addColorStop(1, "rgba(226, 238, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawSnow(ctx, w, h) {
      for (const f of this.snowFlakes) {
        f.phase += 0.02;
        f.y += f.vy;
        f.x += f.vx + Math.sin(f.phase) * 0.45;
        if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(241, 248, 255, 0.78)";
        ctx.fill();
      }
    }

    drawAmbientParticles(ctx, w, h) {
      for (const p of this.ambientParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.accentRgb}, ${p.a})`;
        ctx.fill();
      }
    }

    startLoop() {
      if (this.animId) return;
      const tick = () => {
        if (!this.isVisible || !this.fxCtx) {
          this.animId = null;
          return;
        }
        const w = window.innerWidth;
        const h = window.innerHeight;
        const ctx = this.fxCtx;
        ctx.clearRect(0, 0, w, h);
        this.frameCount++;

        if (this.bgMode === "weather") {
          if (this.weatherScene === "rain") this.drawRain(ctx, w, h, false);
          else if (this.weatherScene === "storm") this.drawRain(ctx, w, h, true);
          else if (this.weatherScene === "sunny") this.drawSunny(ctx, w, h);
          else if (this.weatherScene === "night") this.drawNight(ctx, w, h);
          else if (this.weatherScene === "cloudy") this.drawCloudy(ctx, w, h);
          else if (this.weatherScene === "snow") this.drawSnow(ctx, w, h);
        } else if (this.particlesEnabled) {
          this.drawAmbientParticles(ctx, w, h);
        }

        this.animId = requestAnimationFrame(tick);
      };
      this.animId = requestAnimationFrame(tick);
    }

    stopLoop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }
  }

  window.AurexGlassEngine = new AurexGlassEngine();
})();
