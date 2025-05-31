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

Add the module to your MagicMirror's `config/config.js` file. Here's a practical example:

```javascript
{
    module: 'MMM-Photoprism',
    position: 'fullscreen_below',    // This can be any of the regions
    config: {
        apiUrl: "http://photoprism.local:2342",
        albumId: "abc123",           // Your album ID from PhotoPrism
        token: "7dbfa37b5a3db2a9e9dd186479018bfe2e3ce5a71fc2f955",
        authMethod: "bearer",
        updateInterval: 1000 * 60 * 5,    // Update every 5 minutes
        fadeSpeed: 2000,                  // 2 second fade
        maxWidth: "100%",
        maxHeight: "100%"
    }
},
```

### Required Configuration Options

- `apiUrl`: Your PhotoPrism instance URL (e.g., "http://photoprism.local:2342")
- `albumId`: The ID of the album you want to display
- `token`: Your PhotoPrism API token
- `authMethod`: Authentication method ("bearer" or "x-auth-token")

### Optional Configuration Options

- `updateInterval`: How often to refresh the photos (default: 5 minutes)
- `fadeSpeed`: How long the fade transition takes in milliseconds (default: 2000)
- `maxWidth`: Maximum width of the image (default: "100%")
- `maxHeight`: Maximum height of the image (default: "100%")

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

## Misc
if nothing loads, check the javascript console (F12 on Firefox) and if you get a CORS error, make sure you add this to photoprism:
       PHOTOPRISM_CORS_ORIGIN: "*"

## License

This project is licensed under the MIT License - see the LICENSE file for details.
