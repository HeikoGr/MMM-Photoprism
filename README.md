# MMM-Photoprism

A MagicMirror module that displays random photos from your PhotoPrism albums. The module will automatically fetch a new random photo every 5 minutes from a specified album.

## Features

- Displays random photos from a specified PhotoPrism album
- Automatic updates every 5 minutes
- Smooth fade transitions between photos
- Displays photo titles (if available)
- Caches images locally for better performance
- Detailed logging for troubleshooting

## Installation

1. Clone this repository into your MagicMirror modules directory:
```bash
cd ~/MagicMirror/modules
git clone https://github.com/yourusername/MMM-Photoprism.git
```

2. Install the required dependencies:
```bash
cd MMM-Photoprism
npm install
```

## Configuration

Add the following configuration block to your MagicMirror config.js file:

```javascript
{
    module: "MMM-Photoprism",
    position: "middle_center", // This can be any of the MagicMirror positions
    config: {
        apiUrl: "http://your-photoprism-server:2342", // Your PhotoPrism server URL
        apiKey: "your-api-key", // Your PhotoPrism API key
        albumId: "your-album-id", // The ID of the album to display
        updateInterval: 5 * 60 * 1000, // Update interval in milliseconds (default: 5 minutes)
        fadeSpeed: 1000, // Fade transition speed in milliseconds
        maxWidth: "100%", // Maximum width of the image
        maxHeight: "100%" // Maximum height of the image
    }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `apiUrl` | The URL of your PhotoPrism server | "http://localhost:2342" |
| `apiKey` | Your PhotoPrism API key | "" |
| `albumId` | The ID of the album to display photos from | "" |
| `updateInterval` | How often to fetch a new photo (in milliseconds) | 300000 (5 minutes) |
| `fadeSpeed` | Speed of the fade transition between photos (in milliseconds) | 1000 |
| `maxWidth` | Maximum width of the displayed image | "100%" |
| `maxHeight` | Maximum height of the displayed image | "100%" |

## Getting Your PhotoPrism API Key

1. Log in to your PhotoPrism instance
2. Go to Settings > Advanced
3. Generate a new API key
4. Copy the key and use it in the module configuration

## Troubleshooting

The module includes detailed logging that can be enabled by setting `DEBUG = true` in the node_helper.js file. This will show:
- API request details
- Response data
- Image selection process
- Download status
- Any errors that occur

## License

This project is licensed under the MIT License - see the LICENSE file for details. 