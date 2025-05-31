Module.register("MMM-Photoprism", {
    defaults: {
        apiUrl: "http://photoprism.local:2342",
        albumId: "",
        token: "",
        authMethod: "bearer",
        updateInterval: 1000 * 60 * 5,
        fadeSpeed: 2000,
        maxWidth: "100%",
        maxHeight: "100%"
    },

    start: function() {
        this.photoList = [];
        this.currentPhotoIndex = 0;
        this.loaded = false;

        // Validate configuration
        if (!this.config.token) {
            this.error("PhotoPrism API token is required!");
            return;
        }

        if (!this.config.albumId) {
            this.error("Album ID is required!");
            return;
        }

        if (!this.config.apiUrl) {
            this.error("PhotoPrism API URL is required!");
            return;
        }

        if (!["bearer", "x-auth-token"].includes(this.config.authMethod)) {
            this.error("Invalid authentication method. Must be 'bearer' or 'x-auth-token'");
            return;
        }

        // Start the update cycle
        this.getPhotos();
        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        setInterval(() => {
            this.getPhotos();
        }, this.config.updateInterval);
    },

    getAuthHeader: function() {
        if (this.config.authMethod === "bearer") {
            return {
                'Authorization': `Bearer ${this.config.token}`,
                'Accept': 'application/json',
                'Origin': window.location.origin,
                'Access-Control-Allow-Origin': '*'
            };
        } else {
            return {
                'X-Auth-Token': this.config.token,
                'Accept': 'application/json',
                'Origin': window.location.origin,
                'Access-Control-Allow-Origin': '*'
            };
        }
    },

    getPhotos: function() {
        const url = `${this.config.apiUrl}/api/v1/albums/${this.config.albumId}/photos`;
        
        fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: this.getAuthHeader()
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.photos) {
                this.photoList = data.photos;
                this.loaded = true;
                this.updateDom();
            }
        })
        .catch(error => {
            this.error("Failed to fetch photos: " + error);
            console.error("Full error details:", error);
        });
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "photoprism-container";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }

        if (this.photoList.length === 0) {
            wrapper.innerHTML = "No photos found";
            return wrapper;
        }

        const photo = this.photoList[this.currentPhotoIndex];
        const img = document.createElement("img");
        img.src = `${this.config.apiUrl}/api/v1/photos/${photo.uid}/tile_500`;
        img.style.maxWidth = this.config.maxWidth;
        img.style.maxHeight = this.config.maxHeight;
        img.style.opacity = 0;
        
        // Fade in effect
        setTimeout(() => {
            img.style.transition = `opacity ${this.config.fadeSpeed}ms`;
            img.style.opacity = 1;
        }, 100);

        wrapper.appendChild(img);

        // Rotate to next photo
        setTimeout(() => {
            this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photoList.length;
            this.updateDom();
        }, this.config.fadeSpeed * 2);

        return wrapper;
    },

    error: function(message) {
        console.error(`[MMM-Photoprism] ${message}`);
        this.loaded = false;
        this.updateDom();
    }
}); 