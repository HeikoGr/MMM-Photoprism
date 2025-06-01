# Understanding MMM-Photoprism

## Project Goal
Create a MagicMirror module that displays photos from a PhotoPrism instance, rotating through them with a nice fade effect.

## The Journey

### Initial Approach
1. Started with direct API calls from the frontend module
2. Hit CORS (Cross-Origin Resource Sharing) issues
   - Browser security prevents direct API calls to different domains
   - PhotoPrism API doesn't allow cross-origin requests by default

### Solution: Node Helper
Created a node helper to handle API calls server-side, avoiding CORS issues entirely.

## Update Intervals

### Album Refresh
- Default: Every 5 minutes (300,000 ms)
- Configurable via `updateInterval` in config
- Fetches fresh list of photos from album
- Ensures new photos are included
- Prevents stale data

### Photo Rotation
- Default: Every 2 seconds (2,000 ms)
- Configurable via `fadeSpeed` in config
- Controls how long each photo is displayed
- Includes fade transition time
- One photo at a time to prevent memory issues

## API Endpoints Used

### 1. Get Photos List
```
GET /api/v1/photos?count=100&offset=0&s={albumId}&merged=true&order=oldest
```
- Returns metadata for photos in an album
- Parameters:
  - `count`: Number of photos to return
  - `offset`: Starting position
  - `s`: Album ID
  - `merged`: Include merged photos
  - `order`: Sort order (oldest/newest)

### 2. Get Thumbnail
```
GET /api/v1/t/{hash}/{uid}/fit_500
```
- Returns a thumbnail image
- Parameters:
  - `hash`: Photo hash
  - `uid`: Photo UID
  - `fit_500`: Size parameter (500px width, maintaining aspect ratio)

### 3. Download Original
```
GET /api/v1/photos/{uid}/dl
```
- Returns the original photo file
- Used as fallback if thumbnail fails

## Implementation Structure

### Node Helper (node_helper.js)
1. Handles all API communication
2. Maintains photo list and current index
3. Sends one photo at a time to frontend
4. Key functions:
   - `getPhotos()`: Fetches photo list
   - `sendNextPhoto()`: Sends next photo to frontend
   - `makeRequest()`: Handles HTTP requests

### Frontend Module (MMM-Photoprism.js)
1. Displays current photo
2. Handles fade transitions
3. Requests next photo after fade
4. Key features:
   - Fade effect between photos
   - Error handling for failed image loads
   - Fallback to download URL if thumbnail fails

## Lessons Learned
1. Always check API documentation thoroughly
2. Handle CORS issues early in development
3. Load resources one at a time to prevent overwhelming the system
4. Implement proper error handling and fallbacks
5. Use server-side components (node helper) for API calls

## If Starting From Scratch
1. Start with node helper implementation
2. Use correct API endpoints from the beginning
3. Implement one-photo-at-a-time loading
4. Add proper error handling
5. Then focus on UI/UX improvements

## API Authentication
- Uses Bearer token authentication
- Token must be provided in config
- Headers:
  ```
  Authorization: Bearer {token}
  Accept: application/json
  ``` 