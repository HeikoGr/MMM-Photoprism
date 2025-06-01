Module.register("MMM-Photoprism", {
    defaults: {
        apiUrl: "http://localhost:2342",
        apiKey: "",
        albumId: "",
        updateInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
        fadeSpeed: 1000, // Fade speed in milliseconds
        maxWidth: "100%",
        maxHeight: "100%",
        cacheRetentionDays: 5 // Number of days to keep cached images
    },

    start: function() {
        console.log("[MMM-Photoprism] Starting module");
        this.currentImage = null;
        this.loaded = false;
        this.error = null;
        this.sendSocketNotification("CONFIG", this.config);
        console.log("[MMM-Photoprism] Configuration sent to node helper");
    },

    getDom: function() {
        console.log("[MMM-Photoprism] Creating DOM");
        const wrapper = document.createElement("div");
        wrapper.className = "photoprism-container";

        if (this.error) {
            console.log("[MMM-Photoprism] Showing error:", this.error);
            wrapper.innerHTML = `Error: ${this.error}`;
            return wrapper;
        }

        if (!this.loaded) {
            console.log("[MMM-Photoprism] Module not loaded yet, showing loading message");
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }

        if (this.currentImage) {
            console.log("[MMM-Photoprism] Creating image element for:", this.currentImage.path);
            const img = document.createElement("img");
            img.src = this.currentImage.path;
            img.style.maxWidth = this.config.maxWidth;
            img.style.maxHeight = this.config.maxHeight;
            img.style.transition = `opacity ${this.config.fadeSpeed}ms ease-in-out`;
            wrapper.appendChild(img);

            if (this.currentImage.title) {
                console.log("[MMM-Photoprism] Adding title:", this.currentImage.title);
                const title = document.createElement("div");
                title.className = "photoprism-title";
                title.innerHTML = this.currentImage.title;
                wrapper.appendChild(title);
            }
        } else {
            console.log("[MMM-Photoprism] No image available to display");
            wrapper.innerHTML = "No image available";
        }

        return wrapper;
    },

    socketNotificationReceived: function(notification, payload) {
        console.log(`[MMM-Photoprism] Received socket notification: ${notification}`);
        if (notification === "IMAGE_READY") {
            console.log("[MMM-Photoprism] New image ready:", payload);
            this.currentImage = payload;
            this.loaded = true;
            this.error = null;
            this.updateDom(this.config.fadeSpeed);
        } else if (notification === "ERROR") {
            console.log("[MMM-Photoprism] Error received:", payload);
            this.error = payload;
            this.loaded = true;
            this.updateDom();
        }
    },

    notificationReceived: function(notification, payload, sender) {
        // Only process notifications we care about
        if (notification === "DOM_OBJECTS_CREATED") {
            console.log("[MMM-Photoprism] DOM objects created, starting update interval");
            // Start the update interval
            setInterval(() => {
                console.log("[MMM-Photoprism] Interval triggered, requesting new image");
                this.error = null;
                this.sendSocketNotification("CONFIG", this.config);
            }, this.config.updateInterval);
        }
    }
}); 