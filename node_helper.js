const NodeHelper = require("node_helper");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start () {
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

  log (message, data = null) {
    if (this.DEBUG) {
      if (data) {
        // If data is an array, limit the output
        if (Array.isArray(data)) {
          const limitedData = data.slice(0, 3).map((item) => ({
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

  socketNotificationReceived (notification, payload) {
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

  cleanupCache () {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = new Date();
      const retentionPeriod = this.config.cacheRetentionDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      this.log(`Cleaning up cache directory. Retention period: ${this.config.cacheRetentionDays} days`);

      files.forEach((file) => {
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

  async fetchAlbum () {
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
        params,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        },
        timeout: 10000 // 10 second timeout
      });

      this.log("Response status:", response.status);
      this.log("Response headers:", response.headers);

      // Store tokens from response headers
      this.tokens.download = response.headers["x-download-token"];
      this.tokens.preview = response.headers["x-preview-token"];
      this.log("Stored tokens:", this.tokens);

      // The API returns the photos array directly
      if (Array.isArray(response.data)) {
        this.images = response.data;
        this.log(`Found ${this.images.length} images in album`);

        // Log a summary of the first few images with limited fields
        const summary = this.images.slice(0, 3).map((img) => ({
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

  async selectRandomImage () {
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
      // Get the first file from the Files array
      if (!selectedImage.Files || selectedImage.Files.length === 0) {
        this.log("No files found for image:", selectedImage);
        this.sendSocketNotification("ERROR", "No files found for selected image");
        return;
      }

      const file = selectedImage.Files[0];
      this.log("Selected file for download:", {
        Hash: file.Hash,
        Name: file.Name,
        Type: file.Type
      });

      // Use the download endpoint with the file hash
      let response;
      if (this.config && this.config.useThumbnails) {
  // Use PhotoPrism Thumbnail API documented form: /api/v1/t/:hash/:token/:size
  // size may be a named size like "fit_1920" or "tile_500". Prefer config.thumbnailSize;
  // if not provided, default to a sensible medium-high resolution.
  const size = this.config.thumbnailSize || 'fit_1920';
        // Use preview token if available, otherwise try download token, otherwise fallback to "public".
        const token = this.tokens.preview || this.tokens.download || "public";
        const thumbUrl = `${this.config.apiUrl}/api/v1/t/${file.Hash}/${token}/${size}`;
        this.log(`Downloading thumbnail from: ${thumbUrl}`);

        response = await axios.get(thumbUrl, {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`
          },
          responseType: "arraybuffer",
          timeout: 10000 // 10 second timeout
        });
      } else {
        const imageUrl = `${this.config.apiUrl}/api/v1/dl/${file.Hash}?t=${this.tokens.download}`;
        this.log(`Downloading image from: ${imageUrl}`);

        response = await axios.get(imageUrl, {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`
          },
          responseType: "arraybuffer",
          timeout: 10000 // 10 second timeout
        });
      }

      // Check if the response is actually an image
      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.startsWith("image/")) {
        this.log("Invalid response content type:", contentType);
        this.sendSocketNotification("ERROR", "Invalid image response from server");
        return;
      }

      this.log("Image download response status:", response.status);
      this.log("Image download response headers:", response.headers);


      // Add timestamp to filename to prevent conflicts
      const timestamp = new Date().getTime();
  const suffix = (this.config && this.config.useThumbnails) ? "_thumb.jpg" : ".jpg";
      const imagePath = path.join(this.cacheDir, `${file.Hash}_${timestamp}${suffix}`);
      fs.writeFileSync(imagePath, response.data);
      this.log(`Image saved to: ${imagePath}`);

      // Clean up old versions of this image
      this.cleanupOldVersions(file.Hash, timestamp);

      this.currentImage = {
        path: `/modules/MMM-Photoprism/cache/${file.Hash}_${timestamp}${suffix}`,
        title: selectedImage.Title || "Untitled",
        takenAt: selectedImage.TakenAt,
        fileHash: file.Hash
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

  cleanupOldVersions (fileHash, currentTimestamp) {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const pattern = new RegExp(`^${fileHash}_\\d+\\.jpg$`);

      files.forEach((file) => {
        if (pattern.test(file)) {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          const fileTimestamp = parseInt(file.split("_")[1].split(".")[0]);

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
