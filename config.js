const config = {
    apiUrl: "http://10.0.2.5:7007",  // Default PhotoPrism API URL
    albumId: "aslakjfwq4cwftu3",                      // Album ID to display
    updateInterval: 1000 * 60 * 5,    // Update every 5 minutes
    fadeSpeed: 2000,                  // Fade speed in milliseconds
    maxWidth: "100%",                 // Maximum width of the image
    maxHeight: "100%",                // Maximum height of the image
    token: "3e8d0d1315ae9cb0d7539c376d7359522cd65c28c0f8c050",                        // PhotoPrism API token
    authMethod: "bearer",             // Authentication method: "bearer" or "x-auth-token"
};

module.exports = config; 