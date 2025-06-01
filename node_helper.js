const NodeHelper = require("node_helper");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.images = [];
        this.currentImage = null;
        this.DEBUG = true; // Enable verbose logging
        this.cacheDir = path.join(__dirname, "cache");
        this.tokens = {
            download: null,
            preview: null
        };
        
        // Create cache directory if it doesn't exist
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir);
        }
        this.log("Node helper started");
    },

    log: function(message, data = null) {
        if (this.DEBUG) {
            if (data) {
                // If data is an array, limit the output
                if (Array.isArray(data)) {
                    const limitedData = data.slice(0, 3).map(item => ({
                        ID: item.ID,
                        UID: item.UID,
                        FileName: item.FileName,
                        FileUID: item.FileUID,
                        Files: item.Files,
                        TakenAt: item.TakenAt,
                        PlaceLabel: item.PlaceLabel
                    }));
                    console.log(`[MMM-Photoprism] ${message}`, limitedData);
                } else {
                    console.log(`[MMM-Photoprism] ${message}`, data);
                }
            } else {
                console.log(`[MMM-Photoprism] ${message}`);
            }
        }
    },

    socketNotificationReceived: function(notification, payload) {
        this.log(`Received notification: ${notification}`);
        if (notification === "CONFIG") {
            this.config = payload;
            this.log("Configuration received:", {
                apiUrl: this.config.apiUrl,
                albumId: this.config.albumId,
                updateInterval: this.config.updateInterval,
                cacheRetentionDays: this.config.cacheRetentionDays
            });
            this.cleanupCache();
            this.fetchAlbum();
        }
    },

    cleanupCache: function() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const now = new Date();
            const retentionPeriod = this.config.cacheRetentionDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

            this.log(`Cleaning up cache directory. Retention period: ${this.config.cacheRetentionDays} days`);
            
            files.forEach(file => {
                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtime;

                if (fileAge > retentionPeriod) {
                    this.log(`Removing old cached file: ${file} (age: ${Math.round(fileAge / (24 * 60 * 60 * 1000))} days)`);
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {
            this.log("Error cleaning up cache:", error.message);
        }
    },

    async fetchAlbum() {
        try {
            const url = `${this.config.apiUrl}/api/v1/photos`;
            const params = {
                count: 1000, // Large number to get all photos
                offset: 0,
                s: this.config.albumId,
                merged: true,
                order: "oldest"
            };

            this.log("Fetching album with params:", params);
            this.log("Making request to URL:", url);
            
            const response = await axios.get(url, {
                params: params,
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`
                },
                timeout: 10000 // 10 second timeout
            });

            this.log("Response status:", response.status);
            this.log("Response headers:", response.headers);

            // Store tokens from response headers
            this.tokens.download = response.headers['x-download-token'];
            this.tokens.preview = response.headers['x-preview-token'];
            this.log("Stored tokens:", this.tokens);

            // The API returns the photos array directly
            if (Array.isArray(response.data)) {
                this.images = response.data;
                this.log(`Found ${this.images.length} images in album`);
                
                // Log a summary of the first few images with limited fields
                const summary = this.images.slice(0, 3).map(img => ({
                    ID: img.ID,
                    UID: img.UID,
                    FileName: img.FileName,
                    FileUID: img.FileUID,
                    Files: img.Files,
                    TakenAt: img.TakenAt,
                    PlaceLabel: img.PlaceLabel
                }));
                this.log("Sample of album contents:", summary);
                
                this.selectRandomImage();
            } else {
                this.log("Invalid response format:", response.data);
                this.sendSocketNotification("ERROR", "Invalid response format from server");
            }
        } catch (error) {
            this.log("Error fetching album:", error.message);
            if (error.response) {
                this.log("Error response status:", error.response.status);
                this.log("Error response headers:", error.response.headers);
                this.log("Error response data:", error.response.data);
            } else if (error.request) {
                this.log("No response received. Request details:", error.request);
            } else {
                this.log("Error details:", error);
            }
            this.sendSocketNotification("ERROR", "Failed to fetch album");
        }
    },

    async selectRandomImage() {
        if (this.images.length === 0) {
            this.log("No images available in album");
            this.sendSocketNotification("ERROR", "No images available in album");
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.images.length);
        const selectedImage = this.images[randomIndex];
        this.log("Selected random image:", {
            ID: selectedImage.ID,
            UID: selectedImage.UID,
            FileName: selectedImage.FileName,
            FileUID: selectedImage.FileUID,
            Files: selectedImage.Files,
            TakenAt: selectedImage.TakenAt,
            PlaceLabel: selectedImage.PlaceLabel
        });

        try {
            // Use the download endpoint with the download token
            const imageUrl = `${this.config.apiUrl}/api/v1/dl/${selectedImage.UID}?t=${this.tokens.download}`;
            this.log(`Downloading image from: ${imageUrl}`);
            
            const response = await axios.get(imageUrl, {
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`
                },
                responseType: "arraybuffer",
                timeout: 10000 // 10 second timeout
            });

            // Check if the response is actually an image
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.startsWith('image/')) {
                this.log("Invalid response content type:", contentType);
                this.sendSocketNotification("ERROR", "Invalid image response from server");
                return;
            }

            this.log("Image download response status:", response.status);
            this.log("Image download response headers:", response.headers);

            // Add timestamp to filename to prevent conflicts
            const timestamp = new Date().getTime();
            const imagePath = path.join(this.cacheDir, `${selectedImage.UID}_${timestamp}.jpg`);
            fs.writeFileSync(imagePath, response.data);
            this.log(`Image saved to: ${imagePath}`);
            
            // Clean up old versions of this image
            this.cleanupOldVersions(selectedImage.UID, timestamp);
            
            this.currentImage = {
                path: `/modules/MMM-Photoprism/cache/${selectedImage.UID}_${timestamp}.jpg`,
                title: selectedImage.Title || "Untitled",
                takenAt: selectedImage.TakenAt
            };

            this.log("Image ready for display:", this.currentImage);
            this.sendSocketNotification("IMAGE_READY", this.currentImage);
        } catch (error) {
            this.log("Error downloading image:", error.message);
            if (error.response) {
                this.log("Error response status:", error.response.status);
                this.log("Error response headers:", error.response.headers);
                this.log("Error response data:", error.response.data);
            } else if (error.request) {
                this.log("No response received. Request details:", error.request);
            } else {
                this.log("Error details:", error);
            }
            this.sendSocketNotification("ERROR", "Failed to download image");
        }
    },

    cleanupOldVersions: function(imageUID, currentTimestamp) {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const pattern = new RegExp(`^${imageUID}_\\d+\\.jpg$`);
            
            files.forEach(file => {
                if (pattern.test(file)) {
                    const filePath = path.join(this.cacheDir, file);
                    const stats = fs.statSync(filePath);
                    const fileTimestamp = parseInt(file.split('_')[1].split('.')[0]);
                    
                    // Keep only the current version
                    if (fileTimestamp !== currentTimestamp) {
                        this.log(`Removing old version of image: ${file}`);
                        fs.unlinkSync(filePath);
                    }
                }
            });
        } catch (error) {
            this.log("Error cleaning up old versions:", error.message);
        }
    }
}); 