/**
 * MMM-Photoprism Frontend Module
 * Displays photos from PhotoPrism with fade transitions
 * Communicates with node helper for API requests
 */

console.log("[MMM-Photoprism] Main module file loaded");

Module.register("MMM-Photoprism", {
    /**
     * Default configuration values
     * Can be overridden in config.js
     */
    defaults: {
        apiUrl: "http://localhost:2342",  // PhotoPrism API URL
        albumId: "",                      // Album ID to display
        token: "",                        // API authentication token
        authMethod: "bearer",             // Authentication method
        updateInterval: 300000,           // Album refresh interval (5 minutes)
        fadeSpeed: 2000,                  // Photo transition time (2 seconds)
        maxWidth: "100%",                 // Maximum photo width
        maxHeight: "100%",                // Maximum photo height
        debug: false,                     // Enable debug logging
        maxRetries: 2                     // Maximum number of retries for image loading
    },

    requiresVersion: "2.2.0",

    /**
     * Module state properties
     */
    currentPhoto: null,    // Currently displayed photo
    loaded: false,         // Whether module is ready
    photoTimer: null,      // Timer for photo rotation
    retryCount: 0,         // Current retry count for image loading

    /**
     * Module initialization
     * Sets up initial state and requests first photo
     */
    start: function() {
        console.log("[MMM-Photoprism] Module starting with config:", {
            apiUrl: this.config.apiUrl,
            albumId: this.config.albumId,
            authMethod: this.config.authMethod,
            hasToken: !!this.config.token
        });
        
        this.resetState();
        console.log("[MMM-Photoprism] Sending initial GET_PHOTOS request");
        this.sendSocketNotification("GET_PHOTOS", this.config);
        this.scheduleUpdate();
    },

    /**
     * Reset module state
     * Clears current photo and timers
     */
    resetState: function() {
        console.log("[MMM-Photoprism] Resetting module state");
        this.currentPhoto = null;
        this.loaded = false;
        this.retryCount = 0;
        if (this.photoTimer) {
            clearTimeout(this.photoTimer);
            this.photoTimer = null;
        }
    },

    /**
     * Return required CSS files
     */
    getStyles: function() {
        return ["MMM-Photoprism.css"];
    },

    /**
     * Schedule periodic album refresh
     * Fetches new photos at configured interval
     */
    scheduleUpdate: function() {
        console.log("[MMM-Photoprism] Scheduling updates every", this.config.updateInterval, "ms");
        setInterval(() => {
            console.log("[MMM-Photoprism] Update interval triggered, requesting new photos");
            this.sendSocketNotification("GET_PHOTOS", this.config);
        }, this.config.updateInterval);
    },

    /**
     * Handle notifications from node helper
     * @param {string} notification - Type of notification
     * @param {object} payload - Data received from node helper
     */
    socketNotificationReceived: function(notification, payload) {
        console.log("[MMM-Photoprism] Received socket notification:", notification);
        
        if (notification === "PHOTO_DATA") {
            // New photo received from node helper
            console.log("[MMM-Photoprism] Received photo data:", {
                uid: payload.photo.UID,
                title: payload.photo.Title
            });
            this.currentPhoto = payload.photo;
            this.loaded = true;
            this.retryCount = 0;  // Reset retry count for new photo
            this.updateDom(this.config.fadeSpeed);

            // Schedule request for next photo after fade
            if (this.photoTimer) {
                clearTimeout(this.photoTimer);
            }
            this.photoTimer = setTimeout(() => {
                this.sendSocketNotification("NEXT_PHOTO");
            }, this.config.fadeSpeed);
        } else if (notification === "PHOTOS_ERROR") {
            // Error occurred in node helper
            console.error("[MMM-Photoprism] Error:", payload);
            this.loaded = false;
            this.updateDom(this.config.fadeSpeed);
        }
    },

    /**
     * Create module DOM
     * @returns {HTMLElement} Module wrapper with current photo
     */
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-photoprism";
        
        console.log("[MMM-Photoprism] getDom called, loaded:", this.loaded);

        if (!this.loaded) {
            wrapper.innerHTML = "Loading photos...";
            return wrapper;
        }

        if (!this.currentPhoto) {
            wrapper.innerHTML = "No photos found";
            return wrapper;
        }

        // Create and configure image element
        const img = document.createElement("img");
        img.src = this.currentPhoto.thumb;
        img.className = "photo";
        
        // Handle image loading errors
        img.onerror = () => {
            console.error("[MMM-Photoprism] Failed to load thumbnail:", this.currentPhoto.thumb);
            
            if (this.retryCount < this.config.maxRetries) {
                this.retryCount++;
                console.log(`[MMM-Photoprism] Retry ${this.retryCount}/${this.config.maxRetries}: Trying download URL`);
                img.src = this.currentPhoto.download;
            } else {
                console.error("[MMM-Photoprism] Max retries reached, requesting next photo");
                this.sendSocketNotification("NEXT_PHOTO");
            }
        };

        // Handle successful image load
        img.onload = () => {
            console.log("[MMM-Photoprism] Successfully loaded image");
            this.retryCount = 0;  // Reset retry count on successful load
        };

        wrapper.appendChild(img);
        return wrapper;
    },

    /**
     * Handle module errors
     * @param {string} message - Error message
     */
    error: function(message) {
        console.error(`[MMM-Photoprism] ${message}`);
        this.loaded = false;
        this.updateDom();
    }
}); 