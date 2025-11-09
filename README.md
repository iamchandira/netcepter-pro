# NetCepter Pro - Chrome Extension

**NetCepter Pro** is a professional HTTP/HTTPS request and response interceptor for Chrome. Intercept, pause, inspect, and modify network traffic in real-time with a modern, intuitive interface. Perfect for developers, QA engineers, and security researchers.

---

**© Copyright 2025 | [Chandira Ekanayaka](https://iamchandira.com)**

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Features

✨ **Core Capabilities:**
- 🔍 Intercept all HTTP/HTTPS requests and responses
- ⏸️ Pause requests before they are sent
- ✏️ Edit request URLs, methods, headers, and body
- 📝 Modify response status codes, headers, and body
- 🚫 Block unwanted requests
- 🔄 Continue requests with or without modifications

🎯 **Advanced Features:**
- 🎨 Modern, clean UI with dark mode support
- 🔎 Filter by URL pattern, HTTP method, and resource type
- 📊 Real-time request list with status indicators
- 💾 Automatic settings persistence
- 🎭 Syntax-highlighted editors for headers and body
- 🔐 Uses Chrome Debugger API for powerful interception

## Installation

### Step 1: Download/Clone the Extension

If you haven't already, download or clone this repository to your local machine:

```bash
git clone https://github.com/iamchandira/netcepter-pro.git
cd netcepter-pro
```

Or simply download and extract the ZIP file.

### Step 2: Enable Developer Mode in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **Developer mode** ON (top-right corner)

### Step 3: Load the Extension

1. Click **Load unpacked** button
2. Navigate to the `netcepter-pro` folder (or the folder where you extracted the extension)
3. Select the folder and click **Select Folder**

### Step 4: Verify Installation

You should see the **NetCepter Pro** extension in your extensions list with a blue icon.

## Configuration & Usage

### Opening the NetCepter Pro Panel

1. Open Chrome DevTools (F12 or Right-click → Inspect)
2. Look for the **NetCepter Pro** tab in the DevTools panel
3. If you don't see it, click the `>>` button to find it in the overflow menu

![DevTools Panel](https://i.imgur.com/placeholder-panel.png)

### Basic Usage

#### 1. Enable Interception

The extension starts with interception **enabled** by default. You can toggle it on/off using the **Intercept** switch in the top-right corner.

- **ON**: All matching requests will be paused for inspection
- **OFF**: Requests will pass through without interception

#### 2. Intercepting Requests

When a request is intercepted:

1. The request appears in the **Request List** with a **PAUSED** status
2. The request details are shown with a yellow highlight
3. Click on the request to view full details

#### 3. Editing Requests

When a request is paused, you can edit:

**Request Tab:**
- **URL**: Change the destination URL
- **Method**: Change HTTP method (GET, POST, PUT, DELETE, etc.)
- **Headers**: Add, edit, or remove request headers
- **Body**: Modify the request body (for POST, PUT, PATCH requests)

**Response Tab** (when response is intercepted):
- **Status Code**: Change the HTTP status code
- **Headers**: Modify response headers
- **Body**: Edit the response body

#### 4. Action Buttons

After editing (or not), choose an action:

- **Continue**: Send the request/response as-is without modifications
- **Continue with Modifications**: Apply your edits and continue
- **Block Request**: Cancel the request entirely

### Filtering Requests

Use the filter bar to focus on specific requests:

1. **URL Filter**: Type a URL pattern (e.g., `api.example.com`)
2. **Method Filter**: Select specific HTTP methods (GET, POST, etc.)
3. **Type Filter**: Filter by resource type (XHR, Fetch, Document, etc.)

### Clearing the List

Click the **Clear** button in the top-right to remove all intercepted requests from the list.

### Reconnecting the Debugger

If the debugger becomes disconnected (status shows "Disconnected" or "Error"):

1. A **Reconnect** button will automatically appear next to the status indicator
2. Click the **Reconnect** button to re-establish the connection
3. The status will change to "Reconnecting..." then "Connected" when successful
4. All previous requests will be cleared, and new interception will begin

**Note**: The reconnect button only appears when the debugger is disconnected.

## Use Cases

### 1. API Development

Test how your application handles different API responses:

```
1. Intercept API requests
2. Modify response status codes (e.g., 404, 500)
3. Change response data to test edge cases
4. Continue with modifications
```

### 2. Security Testing

Analyze and modify security headers:

```
1. Intercept requests to your application
2. Remove or modify authentication headers
3. Test how your app handles unauthorized requests
4. Add/modify CORS headers for testing
```

### 3. Debugging

Debug complex request/response issues:

```
1. Pause requests to examine payloads
2. Modify request data to test different scenarios
3. Change response data to verify client-side handling
4. Block specific requests to test error handling
```

### 4. Performance Testing

Test application behavior under various conditions:

```
1. Block CDN requests to test fallbacks
2. Modify API response times (by pausing)
3. Test with different response sizes
```

## Advanced Configuration

### Persistence

The extension automatically saves:
- Interception enabled/disabled state
- Filter settings
- UI preferences

These settings persist across browser sessions.

### Tips & Tricks

1. **Keyboard Navigation**: Use arrow keys to navigate the request list
2. **Quick Clear**: Use the Clear button to start fresh
3. **Filter Combinations**: Combine URL and method filters for precise targeting
4. **Copy/Paste Headers**: Headers are editable text fields - copy/paste as needed

## Technical Details

### Architecture

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Core API**: Chrome Debugger API for network interception
- **UI Framework**: Vanilla JavaScript (no dependencies)
- **Communication**: Chrome Runtime messaging between components

### Components

1. **background.js**: Service worker handling debugger and interception logic
2. **devtools.js**: DevTools integration and panel registration
3. **panel.html/js/css**: Main UI for viewing and editing requests
4. **manifest.json**: Extension configuration

### Permissions

The extension requires:
- `debugger`: To intercept network requests
- `storage`: To persist user settings
- `tabs`: To access tab information

## Troubleshooting

### Extension Not Appearing

**Problem**: NetCepter Pro tab doesn't show in DevTools

**Solution**:
- Refresh the page after installing the extension
- Close and reopen DevTools
- Check if the extension is enabled in `chrome://extensions/`
- Look for "NetCepter Pro" in the DevTools tabs

### Requests Not Being Intercepted

**Problem**: Requests pass through without interception

**Solution**:
- Check if the Intercept toggle is ON (green)
- Verify the debugger is attached (status should show "Connected")
- Ensure filters aren't too restrictive
- Try refreshing the page

### Debugger Error

**Problem**: "Failed to attach debugger" error

**Solution**:
- Only one debugger can attach at a time
- Close other DevTools or debugging sessions
- Click the **Reconnect** button (appears automatically when disconnected)
- Refresh the page and try again
- Check if another extension is using the debugger

### Debugger Disconnected

**Problem**: Status shows "Disconnected" and requests aren't being intercepted

**Solution**:
- Click the **Reconnect** button that appears next to the status indicator
- The button will automatically show when the debugger is disconnected
- If reconnection fails, try:
  - Closing and reopening DevTools
  - Reloading the extension at `chrome://extensions/`
  - Refreshing the webpage

### Cannot Edit Request/Response

**Problem**: Input fields are disabled

**Solution**:
- This happens when a request is no longer paused
- The request must be in PAUSED state to edit
- Once you click Continue/Block, editing is disabled

### Details Panel Not Showing When Clicking Request

**Problem**: Nothing happens when clicking on a request in the list

**Solution**:
- On smaller screens (< 1024px), the details panel opens in overlay mode
- Look for the close button (X) in the top-right of the details panel
- On larger screens, details should appear in the right panel automatically
- If still not working, try reloading the extension
- Check browser console (F12) for any JavaScript errors

### Missing Icons

**Problem**: Icons not showing properly

**Solution**:
- Run `python generate_icons_simple.py` to regenerate icons
- Ensure Pillow is installed: `pip install Pillow`
- Reload the extension in `chrome://extensions/`

## Development

### Requirements

- Python 3.x (for icon generation)
- Pillow library: `pip install Pillow`

### Building Icons

```bash
python generate_icons_simple.py
```

This generates three icon sizes: 16x16, 48x48, and 128x128 pixels.

### File Structure

```
netcepter-pro/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── devtools.html          # DevTools page entry
├── devtools.js           # DevTools panel registration
├── panel.html            # Main UI structure
├── panel.js              # UI logic and event handling
├── panel.css             # Modern styling
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── generate_icons_simple.py  # Icon generation script
└── README.md             # This file
```

### Modifying the Extension

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the **Reload** button on the NetCepter Pro extension
4. Refresh DevTools to see changes

## Security & Privacy

⚠️ **Important Security Notes:**

- This extension has powerful capabilities that can intercept all network traffic
- Only use on websites you own or have permission to test
- Never use this extension for malicious purposes
- The extension operates locally - no data is sent to external servers
- Review code before installation if you have security concerns

## Limitations

- Only works with HTTP/HTTPS requests
- Cannot intercept WebSocket traffic after initial handshake
- One debugger attachment per tab (conflicts with other debugging tools)
- Cannot intercept requests from other extensions
- Service workers may have limited interception support

## Comparison with Tamper Dev

This extension is inspired by Tamper Dev but built from scratch with:

- ✅ Modern UI with better UX
- ✅ Clean, minimal design
- ✅ Vanilla JavaScript (no framework overhead)
- ✅ Dark mode support
- ✅ Improved header editing interface
- ✅ Better status indicators
- ✅ More intuitive controls

## License

MIT License - Feel free to use for educational and development purposes.

## Disclaimer

This tool is intended for:
- ✅ Development and testing of your own applications
- ✅ Educational purposes and learning
- ✅ Security research on applications you own or have permission to test

This tool should NOT be used for:
- ❌ Unauthorized access or modification of systems
- ❌ Any illegal or malicious activities
- ❌ Violating terms of service of websites

**Use responsibly and ethically.**

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

If you encounter any issues or have questions:

1. Check the Troubleshooting section above
2. Review the extension console logs in DevTools
3. Check Chrome's extension error logs at `chrome://extensions/`
4. Open an issue on GitHub with detailed information

## Changelog

### Version 1.0.0 (Initial Release)
- Core HTTP request/response interception
- Edit URL, method, headers, and body
- Filter by URL, method, and type
- Modern, responsive UI
- Dark mode support
- Settings persistence

---

**Happy Debugging! 🚀**

---

## Copyright & License

**© Copyright 2025 | [Chandira Ekanayaka](https://iamchandira.com)**

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.

For more information and updates, visit the [GitHub repository](https://github.com/iamchandira/netcepter-pro).

