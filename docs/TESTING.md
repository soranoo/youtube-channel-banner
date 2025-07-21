# Testing Instructions

## Manual Testing Steps

### 1. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome` folder
4. Verify the extension appears in the extensions list

### 2. Test on YouTube

1. Go to <https://www.youtube.com>
2. Look for the "➕ Show Ban Buttons" button in the top right area
3. Click the extension icon to open the popup
4. Verify the popup shows "0 channels banned" initially

### 3. Test Ban Functionality

1. In the popup, enter a channel name (e.g., "Test Channel")
2. Click "Ban"
3. Verify the channel appears in the ban list
4. Click "➕ Show Ban Buttons" on the YouTube page
5. Look for ban buttons next to channel names

### 4. Test Unban Functionality

1. In the popup, click "Remove" next to a banned channel
2. Verify the channel is removed from the list
3. Or click "Clear All" to remove all banned channels

### 5. Test Content Hiding

1. Ban a channel that has visible content on the current page
2. Verify the content is replaced with a red message
3. Click the "✅ Unban" button on the hidden content
4. Verify the page reloads and content is restored

### 6. Test Persistence

1. Add some channels to the ban list
2. Close and reopen the popup
3. Verify the ban list persists
4. Refresh the YouTube page
5. Verify banned content remains hidden

## Expected Behavior

- ✅ Extension only runs on YouTube pages
- ✅ Ban list persists across browser sessions
- ✅ Banned content is immediately hidden
- ✅ Toggle button shows/hides ban buttons
- ✅ Popup updates in real-time
- ✅ Content script handles dynamic page changes

## Common Issues

- **Ban buttons not appearing**: Make sure you clicked the toggle button
- **Content not hidden**: Verify the channel name matches exactly
- **Popup not working**: Check the browser console for errors
- **Storage not persisting**: Verify the extension has storage permissions
