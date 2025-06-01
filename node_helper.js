/**
 * MMM-Photoprism Node Helper
 * Handles server-side communication with PhotoPrism API
 * Avoids CORS issues by making requests from the server
 */

const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");

console.log("[MMM-Photoprism] Node helper file loaded");

module.exports = NodeHelper.create({
    /**
     * Initialize the node helper
     * Sets up photo list and index tracking
     */
    start: function() {
        try {
            console.log("[MMM-Photoprism] Node helper starting...");
            this.photoList = [];      // Store list of photos from album
            this.currentPhotoIndex = 0; // Track current photo position
            console.log("[MMM-Photoprism] Node helper initialized");
        } catch (error) {
            console.error("[MMM-Photoprism] Error in node helper start:", error);
        }
    },

    /**
     * Handle incoming socket notifications from the frontend
     * @param {string} notification - Type of notification
     * @param {object} payload - Data sent with notification
     */
    socketNotificationReceived: function(notification, payload) {
        try {
            console.log("[MMM-Photoprism] Node helper received notification:", notification);
            
            if (notification === "GET_PHOTOS") {
                // Initial request or refresh request for photos
                console.log("[MMM-Photoprism] Processing GET_PHOTOS request with config:", {
                    apiUrl: payload.apiUrl,
                    albumId: payload.albumId,
                    authMethod: payload.authMethod,
                    hasToken: !!payload.token
                });
                this.getPhotos(payload);
            } else if (notification === "NEXT_PHOTO") {
                // Request for next photo in rotation
                this.sendNextPhoto();
            }
        } catch (error) {
            console.error("[MMM-Photoprism] Error in socketNotificationReceived:", error);
            this.sendSocketNotification("PHOTOS_ERROR", error.message);
        }
    },

    /**
     * Make HTTP/HTTPS request to PhotoPrism API
     * @param {string} url - API endpoint URL
     * @param {object} headers - Request headers including auth
     * @param {boolean} isBinary - Whether to expect binary response
     * @returns {Promise} - Resolves with response data
     */
    makeRequest: function(url, headers, isBinary = false) {
        console.log("[MMM-Photoprism] Making request to:", url);
        console.log("[MMM-Photoprism] With headers:", headers);
        
        return new Promise((resolve, reject) => {
            // Choose HTTP or HTTPS client based on URL
            const client = url.startsWith('https') ? https : http;
            console.log("[MMM-Photoprism] Using", url.startsWith('https') ? "HTTPS" : "HTTP", "client");
            
            const request = client.get(url, { headers }, (response) => {
                console.log("[MMM-Photoprism] Response received:", {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers
                });
                
                if (isBinary) {
                    // Handle binary responses (like images)
                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => {
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            const buffer = Buffer.concat(chunks);
                            resolve(buffer);
                        } else {
                            reject(new Error(`Request failed with status ${response.statusCode}`));
                        }
                    });
                } else {
                    // Handle JSON responses
                    let data = '';
                    response.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    response.on('end', () => {
                        console.log("[MMM-Photoprism] Response data received, length:", data.length);
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            try {
                                const jsonData = JSON.parse(data);
                                console.log("[MMM-Photoprism] Successfully parsed JSON response");
                                resolve(jsonData);
                            } catch (error) {
                                console.error("[MMM-Photoprism] Failed to parse JSON:", error);
                                reject(new Error(`Failed to parse JSON: ${error.message}`));
                            }
                        } else {
                            console.error("[MMM-Photoprism] Request failed with status:", response.statusCode);
                            reject(new Error(`Request failed with status ${response.statusCode}: ${data}`));
                        }
                    });
                }
            });
            
            request.on('error', (error) => {
                console.error("[MMM-Photoprism] Request error:", error);
                reject(new Error(`Request failed: ${error.message}`));
            });
        });
    },

    /**
     * Fetch photos from PhotoPrism API
     * @param {object} config - Module configuration
     */
    getPhotos: async function(config) {
        try {
            console.log("[MMM-Photoprism] Starting photo fetch");
            
            // Get photos metadata using the photos endpoint with album ID
            const photosUrl = `${config.apiUrl}/api/v1/photos?count=100&offset=0&s=${config.albumId}&merged=true&order=oldest`;
            console.log("[MMM-Photoprism] Fetching photos from:", photosUrl);

            const headers = this.getAuthHeaders(config);
            console.log("[MMM-Photoprism] Using auth headers:", {
                method: config.authMethod,
                hasToken: !!config.token
            });

            console.log("[MMM-Photoprism] Making request for photo metadata");
            const photosData = await this.makeRequest(photosUrl, headers);
            console.log("[MMM-Photoprism] Photos metadata received:", {
                photoCount: photosData ? photosData.length : 0
            });

            if (!photosData || !Array.isArray(photosData) || photosData.length === 0) {
                throw new Error("No photos found");
            }

            // Store just the essential photo data to minimize memory usage
            this.photoList = photosData.map(photo => ({
                UID: photo.UID,
                Hash: photo.Hash,
                Title: photo.Title || '',
                TakenAt: photo.TakenAt || ''
            }));

            console.log("[MMM-Photoprism] Processed photo list, count:", this.photoList.length);
            this.currentPhotoIndex = 0;
            this.config = config;

            // Send the first photo to start the rotation
            this.sendNextPhoto();

        } catch (error) {
            console.error("[MMM-Photoprism] Error:", error.message);
            this.sendSocketNotification("PHOTOS_ERROR", error.message);
        }
    },

    /**
     * Send next photo in rotation to frontend
     * Includes thumbnail and download URLs
     */
    sendNextPhoto: function() {
        if (!this.photoList || this.photoList.length === 0) {
            console.log("[MMM-Photoprism] No photos available");
            return;
        }

        const photo = this.photoList[this.currentPhotoIndex];
        console.log("[MMM-Photoprism] Sending photo:", {
            index: this.currentPhotoIndex,
            uid: photo.UID,
            title: photo.Title
        });

        // Send the photo data to the module with URLs for display
        this.sendSocketNotification("PHOTO_DATA", {
            photo: {
                ...photo,
                thumb: `${this.config.apiUrl}/api/v1/t/${photo.Hash}/${photo.UID}/fit_500`,
                download: `${this.config.apiUrl}/api/v1/photos/${photo.UID}/dl`
            }
        });

        // Move to next photo, wrap around to start if at end
        this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photoList.length;
    },

    /**
     * Generate authentication headers based on config
     * @param {object} config - Module configuration
     * @returns {object} Headers object with auth token
     */
    getAuthHeaders: function(config) {
        if (config.authMethod === "bearer") {
            return {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json'
            };
        } else {
            return {
                'X-Auth-Token': config.token,
                'Accept': 'application/json'
            };
        }
    },

    /**
     * Debug logging helper
     * Only logs if debug is enabled in config
     */
    debugLog: function(...args) {
        if (this.config && this.config.debug) {
            console.log("[MMM-Photoprism Node Helper]", ...args);
        }
    }
}); 