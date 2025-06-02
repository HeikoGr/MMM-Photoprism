Module.register("MMM-Photoprism", {
    defaults: {
        apiUrl: "http://photoprism.local:2342",
        apiKey: "", //see README for how to obtain (curl is easiest)
        albumId: "", //you can find it in the URL when you browse to your album
        updateInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
        fadeSpeed: 1000, // Fade speed in milliseconds
        maxWidth: "100%",
        maxHeight: "100%",
        cacheRetentionDays: 1 // Number of days to keep cached images
    },

    getStyles: function() {
        return ["MMM-Photoprism.css"];
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
            img.className = "photoprism-image";
            wrapper.appendChild(img);

            if (this.currentImage.title || this.currentImage.location) {
                console.log("[MMM-Photoprism] Adding title and location");
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