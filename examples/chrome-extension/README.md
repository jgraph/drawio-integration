# draw.io Chrome Extension Integration

A template Chrome extension (Manifest V3) that adds draw.io diagram editing to any web application. Based on a production integration with a real-world SaaS application.

## How it works

1. A **content script** runs on your target domain and scans the page for `.drawio.svg` images
2. When a user clicks a diagram image, the draw.io inline editor opens in an iframe overlay
3. On save, the edited SVG is passed to your save handler for upload to your app's storage
4. A **popup** provides buttons to insert new diagrams or update existing ones for dark mode

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest - set your target domain here |
| `contentScript.js` | Main integration logic - diagram detection, editor lifecycle, save handler |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup logic - sends messages to content script |
| `images/` | Extension icons (16, 32, 48, 128px) - add your own |

## Adapting for your application

1. **`manifest.json`** - Replace `your-app.example.com` with your target domain in `host_permissions` and `content_scripts.matches`

2. **`contentScript.js`** - Customize the configuration section at the top:
   - `HOST_DOMAIN` - your app's domain
   - `DARK_MODE_CLASS` - CSS class your app uses for dark mode
   - `EDITABLE_CONTENT_SELECTOR` - selector for content-editable areas

3. **`contentScript.js: saveDiagramToHost()`** - Implement your app's upload/save API. This function receives the SVG data and metadata and should persist it.

4. **`contentScript.js: getScrollContainer()`** - Return your app's main scrollable element so the editor iframe scrolls with the page.

5. **`contentScript.js: insertDiagram` handler** - Implement diagram insertion using your app's content insertion mechanism (drag-and-drop, paste API, etc.)

## Key concepts

- **embedInline mode** - The editor opens inline within the page (not in a separate window), controlled via the `embedInline=1` URL parameter
- **postMessage protocol** - All communication between the host page and the draw.io editor uses `window.postMessage`. See the [protocol specification](https://www.drawio.com/doc/faq/embed-mode)
- **Dark mode** - Diagrams use `color-scheme: light dark` CSS and a `@media (prefers-color-scheme: dark)` inversion filter for automatic dark/light adaptation
- **Snapshot recovery** - The editor takes snapshots when the user moves the mouse away, so unsaved work can be recovered if the editor is unexpectedly removed from the DOM

## Loading the extension for development

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Navigate to your target application to test
