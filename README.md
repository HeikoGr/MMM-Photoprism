# MMM-Photoprism

A MagicMirror² module that displays photos from your PhotoPrism installation.

## Installation

1. Clone this repository into your MagicMirror's `modules` directory:
```bash
cd ~/MagicMirror/modules
git clone https://github.com/yourusername/MMM-Photoprism.git
```

2. Install the module:
```bash
cd MMM-Photoprism
npm install
```

## Configuration

You can configure the module in two ways:

### 1. Using the module's config file

Edit the `config.js` file in the module directory to set your default configuration:

```javascript
const config = {
    apiUrl: "http://photoprism.local:2342",  // Your PhotoPrism API URL
    albumId: "your-album-id",                // The ID of the album you want to display
    token: "your-api-token",                 // Your PhotoPrism API token
    authMethod: "bearer",                    // Authentication method: "bearer" or "x-auth-token"
    updateInterval: 1000 * 60 * 5,           // Update interval (default: 5 minutes)
    fadeSpeed: 2000,                         // Fade speed in milliseconds
    maxWidth: "100%",                        // Maximum width of the image
    maxHeight: "100%",                       // Maximum height of the image
};

module.exports = config;
```

### 2. Using MagicMirror's config file

Alternatively, you can override these settings in your MagicMirror's `config/config.js` file:

```javascript
{
    module: "MMM-Photoprism",
    position: "fullscreen_below", // This can be any position you prefer
    config: {
        apiUrl: "http://photoprism.local:2342",  // Your PhotoPrism API URL
        albumId: "your-album-id",                // The ID of the album you want to display
        token: "your-api-token",                 // Your PhotoPrism API token
        authMethod: "bearer",                    // Authentication method: "bearer" or "x-auth-token"
        updateInterval: 1000 * 60 * 5,           // Update interval (default: 5 minutes)
        fadeSpeed: 2000,                         // Fade speed in milliseconds
        maxWidth: "100%",                        // Maximum width of the image
        maxHeight: "100%",                       // Maximum height of the image
    }
}
```

Settings in the MagicMirror config file will override those in the module's `config.js`.

### Authentication Methods

The module supports two authentication methods:

1. **Bearer Token** (default):
   - Uses the standard `Authorization: Bearer <token>` header
   - Set `authMethod: "bearer"` in the config

2. **X-Auth-Token**:
   - Uses the `X-Auth-Token: <token>` header
   - Set `authMethod: "x-auth-token"` in the config

### Getting Your PhotoPrism API Token

To obtain an API token, you need to make a POST request to your PhotoPrism instance's OAuth endpoint. Here's how to do it:

1. Using curl:
```bash
curl -X POST "http://photoprism.local:2342/api/v1/oauth/token" \
     -H "Content-Type: application/json" \
     -d '{"username": "your-username", "password": "your-password"}'
```

2. Or using a tool like Postman:
   - Method: POST
   - URL: `http://photoprism.local:2342/api/v1/oauth/token`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
       "username": "your-username",
       "password": "your-password"
   }
   ```

The response will contain an `access_token` that you can use in the module's configuration.

### Finding Your Album ID

1. Open your PhotoPrism instance
2. Navigate to the album you want to display
3. The album ID is in the URL: `https://your-photoprism-url/albums/{album-id}`

## Features

- Displays photos from a selected PhotoPrism album
- Smooth transitions between photos
- Configurable update interval
- Responsive design
- Error handling and loading states
- Support for multiple authentication methods

## License

This project is licensed under the MIT License - see the LICENSE file for details.
