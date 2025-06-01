# MMM-Photoprism

A MagicMirror module that displays photos from your PhotoPrism installation.

## Prerequisites

- MagicMirror² installed
- Node.js installed on your Raspberry Pi
- PhotoPrism instance running and accessible

## Installation

1. Install Node.js on your Raspberry Pi:
```bash
# Update package lists
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node -v
npm -v
```

2. Clone this repository into your MagicMirror modules directory:
```bash
cd ~/MagicMirror/modules
git clone https://github.com/yourusername/MMM-Photoprism.git
```

3. Install the required dependencies:
```bash
cd MMM-Photoprism
npm install node-fetch
```

4. Add the module to your MagicMirror configuration file (`config/config.js`).

## Configuration

Add the following to your MagicMirror configuration file:

```javascript
{
    module: "MMM-Photoprism",
    position: "middle_center",  // or any other position
    config: {
        apiUrl: "http://your-photoprism-url:2342",  // Your PhotoPrism URL
        albumId: "your-album-id",                   // The ID of the album to display
        token: "your-api-token",                    // Your PhotoPrism API token
        authMethod: "bearer",                       // "bearer" or "x-auth-token"
        updateInterval: 300000,                     // Update interval in milliseconds (default: 5 minutes)
        fadeSpeed: 2000,                           // Fade transition speed in milliseconds
        maxWidth: "100%",                          // Maximum width of photos
        maxHeight: "100%",                         // Maximum height of photos
        debug: false                               // Enable debug logging
    }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `apiUrl` | The URL of your PhotoPrism instance | `"http://photoprism.local:2342"` |
| `albumId` | The ID of the album to display | `""` (required) |
| `token` | Your PhotoPrism API token | `""` (required) |
| `authMethod` | Authentication method: "bearer" or "x-auth-token" | `"bearer"` |
| `updateInterval` | How often to fetch new photos (in milliseconds) | `300000` (5 minutes) |
| `fadeSpeed` | Speed of fade transitions (in milliseconds) | `2000` |
| `maxWidth` | Maximum width of photos | `"100%"` |
| `maxHeight` | Maximum height of photos | `"100%"` |
| `debug` | Enable debug logging | `false` |

## Getting Your PhotoPrism API Token

1. Log in to your PhotoPrism instance
2. Go to Settings > Advanced
3. Click on "API Token"
4. Generate a new token
5. Copy the token and use it in your configuration

## Getting Your Album ID

1. Open your PhotoPrism instance in a web browser
2. Navigate to the album you want to display
3. The album ID is in the URL: `https://your-photoprism-url/albums/ALBUM_ID`

## Troubleshooting

### Prerequisites Check

If you're having issues, first verify that all prerequisites are installed:

1. Check Node.js installation:
```bash
node -v
```
If this command is not found, you need to install Node.js (see Installation section).

2. Check npm installation:
```bash
npm -v
```
If this command is not found, you need to install npm (see Installation section).

3. Verify node-fetch is installed:
```bash
cd ~/MagicMirror/modules/MMM-Photoprism
npm list node-fetch
```

### CORS Issues

This module is designed to avoid CORS issues by making API calls server-side through the node helper. If you're still experiencing issues:

1. Make sure your PhotoPrism instance is accessible from your MagicMirror server
2. Verify your API token is correct
3. Check that your album ID is valid
4. Enable debug mode in the configuration to see detailed logs

### Common Issues

1. **Module not loading photos**
   - Check the MagicMirror console for error messages
   - Verify your API token and album ID
   - Make sure your PhotoPrism instance is accessible
   - Enable debug mode for more detailed logs

2. **Node helper not starting**
   - Make sure Node.js is installed (`node -v`)
   - Make sure `node-fetch` is installed
   - Check MagicMirror logs for any error messages
   - Verify you have the correct permissions on the module directory

3. **Photos not displaying**
   - Check the network tab in your browser's developer tools
   - Verify the photo URLs are correct
   - Make sure your PhotoPrism instance is accessible from your browser

### Debug Mode

Enable debug mode in your configuration to see detailed logs:

```javascript
{
    module: "MMM-Photoprism",
    config: {
        // ... other config options ...
        debug: true
    }
}
```

This will show:
- Module initialization
- Node helper status
- API requests and responses
- Photo loading status
- Any errors that occur

## Contributing

Feel free to submit issues and pull requests. 

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
