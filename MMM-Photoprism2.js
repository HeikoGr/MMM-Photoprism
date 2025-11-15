Module.register("MMM-Photoprism2", {
  updateTimer: null,
  defaults: {
    apiUrl: "http://photoprism.local:2342",
    apiKey: "", // see README for how to obtain (curl is easiest)
    albumId: "", // you can find it in the URL when you browse to your album
    updateInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
    fadeSpeed: 1000, // Fade speed in milliseconds
    maxWidth: "100%",
    maxHeight: "100%",
    cacheRetentionDays: 1, // Number of days to keep cached images
    // Optional thumbnail usage to avoid downloading full images
    useThumbnails: true,
    // Optional exact thumbnail size string (e.g. "fit_1920" or "tile_500").
    // Use "auto" to pick a sensible size based on the browser window (default).
    thumbnailSize: "auto",
    // Whether to preload images into the browser cache (hidden <img>)
    preloadInBrowser: true
  },

  getStyles() {
    return ["MMM-Photoprism2.css"];
  },

  start() {
    console.log("[MMM-Photoprism2] Starting module");
    this.currentImage = null;
    this.loaded = false;
    this.error = null;
    this.preloadImg = null; // hidden image element used to force browser caching
    this.isSuspended = false;

    // Initial configuration send to node helper is done in resume()
  },

  // Preload an image into the browser (hidden) to warm the cache.
  preloadImage(url) {
    if (!this.config || !this.config.preloadInBrowser || !url)
      return Promise.resolve();

    return new Promise((resolve) => {
      try {
        // If we already have a preload image with same src, keep it
        if (this.preloadImg && this.preloadImg.src === url) {
          this.log &&
            console.log("[MMM-Photoprism2] Preload image already present");
          return resolve();
        }

        // Remove old preload if present
        if (this.preloadImg && this.preloadImg.parentNode) {
          try {
            this.preloadImg.parentNode.removeChild(this.preloadImg);
          } catch (e) {}
        }

        const img = document.createElement("img");
        img.style.display = "none";
        img.className = "photoprism-preload";
        img.onload = () => {
          console.log("[MMM-Photoprism2] Preload complete for:", url);
          resolve();
        };
        img.onerror = (e) => {
          console.log("[MMM-Photoprism2] Preload failed for:", url, e);
          // still resolve so UI can continue
          resolve();
        };
        img.src = url;
        // append to body so it persists even when module DOM is re-rendered or suspended
        (document.body || document.documentElement).appendChild(img);
        this.preloadImg = img;
      } catch (err) {
        console.log("[MMM-Photoprism2] Preload exception:", err);
        resolve();
      }
    });
  },

  // Build an effective config to send to the node helper. If thumbnailSize is
  // set to 'auto' (or null), derive a sensible fit_<size> based on the browser
  // window and devicePixelRatio. This keeps server requests aligned with the
  // display resolution and avoids downloading unnecessarily large thumbnails.
  getEffectiveConfig() {
    if (!this.config) return null;
    const cfg = Object.assign({}, this.config);

    if (cfg.useThumbnails) {
      let size = cfg.thumbnailSize;
      if (!size || size === "auto") {
        try {
          const dpr = window.devicePixelRatio || 1;
          const maxPx =
            Math.max(window.innerWidth || 1920, window.innerHeight || 1080) *
            dpr;
          // Photoprism standard sizes (increasing). We'll pick the smallest fit_ value
          // that is >= maxPx, otherwise the largest available.
          const available = [
            720, 1280, 1600, 1920, 2048, 2560, 3840, 4096, 5120, 7680
          ];
          const chosen =
            available.find((s) => s >= Math.ceil(maxPx)) ||
            available[available.length - 1];
          size = `fit_${chosen}`;
        } catch (e) {
          // Fallback to a sensible default
          size = "fit_1920";
        }
      }
      cfg.thumbnailSize = size;
    }

    return cfg;
  },

  getDom() {
    console.log("[MMM-Photoprism2] Creating DOM");
    const wrapper = document.createElement("div");
    wrapper.className = "photoprism-container";

    if (this.error) {
      console.log("[MMM-Photoprism2] Showing error:", this.error);
      wrapper.innerHTML = `Error: ${this.error}`;
      return wrapper;
    }

    if (!this.loaded) {
      console.log(
        "[MMM-Photoprism2] Module not loaded yet or suspended, showing loading message"
      );
      wrapper.innerHTML = "Loading...";
      return wrapper;
    }

    if (this.currentImage) {
      console.log(
        "[MMM-Photoprism2] Creating image element for:",
        this.currentImage.path
      );
      const img = document.createElement("img");
      img.src = this.currentImage.path;
      img.className = "photoprism-image";
      wrapper.appendChild(img);

      if (this.currentImage.title || this.currentImage.location) {
        console.log("[MMM-Photoprism2] Adding title and location");
        const infoContainer = document.createElement("div");
        infoContainer.className = "photoprism-info";

        if (this.currentImage.title) {
          const title = document.createElement("div");
          title.className = "photoprism-title";
          title.innerHTML = this.currentImage.title;
          infoContainer.appendChild(title);
        }

        if (this.currentImage.location) {
          const location = document.createElement("div");
          location.className = "photoprism-location";
          location.innerHTML = this.currentImage.location;
          infoContainer.appendChild(location);
        }

        wrapper.appendChild(infoContainer);
      }
    } else {
      console.log("[MMM-Photoprism2] No image available to display");
      wrapper.innerHTML = "No image available";
    }

    return wrapper;
  },

  async socketNotificationReceived(notification, payload) {
    console.log(
      `[MMM-Photoprism2] Received socket notification: ${notification}`
    );
    if (notification === "IMAGE_READY") {
      console.log("[MMM-Photoprism2] New image ready:", payload);

      // Preload in browser first (if enabled) so displayed image is already cached
      try {
        await this.preloadImage(payload.path);
      } catch (e) {
        console.log("[MMM-Photoprism2] Error during preload:", e);
      }

      this.currentImage = payload;
      this.loaded = true;
      this.error = null;
      this.updateDom(this.config.fadeSpeed);
    } else if (notification === "ERROR") {
      console.log("[MMM-Photoprism2] Error received:", payload);
      this.error = payload;
      this.loaded = true;
      this.updateDom();
    }
  },

  notificationReceived(notification, payload, sender) {
    // Only process notifications we care about
    if (notification === "DOM_OBJECTS_CREATED") {
      console.log(
        "[MMM-Photoprism2] DOM objects created, starting update interval"
      );
      // Start the update interval
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
      }
      this.updateTimer = setInterval(() => {
        console.log(
          "[MMM-Photoprism2] Interval triggered, requesting new image"
        );
        this.error = null;
        const cfg = this.getEffectiveConfig();
        this.sendSocketNotification("CONFIG", cfg);
      }, this.config.updateInterval);
    }
  },

  suspend() {
    console.log("[MMM-Photoprism2] Module suspended");

    // Keep the currentImage and preload element so the browser keeps the image cached.
    this.isSuspended = true;
    this.error = null;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  },

  resume() {
    console.log("[MMM-Photoprism2] Module resumed");

    const cfg = this.getEffectiveConfig();
    this.sendSocketNotification("CONFIG", cfg);

    // Intervall neu starten
    if (!this.updateTimer) {
      this.updateTimer = setInterval(() => {
        console.log(
          "[MMM-Photoprism2] Interval triggered, requesting new image"
        );
        this.error = null;
        const cfg = this.getEffectiveConfig();
        this.sendSocketNotification("CONFIG", cfg);
      }, this.config.updateInterval);
    }
    this.isSuspended = false;
  }
});
