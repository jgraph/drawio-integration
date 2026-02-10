# diagrams.net Integration

Integration, or "embed mode" is used for cases where the storage of the diagram is taken care of by a host application,
and diagrams.net is used for diagram editing. In this case, diagrams.net is used inside an iframe or window with special URL
parameters, and is remote controlled using the HTML5 Messaging API. Use embed.diagrams.net only for embed mode.

## Basic flow

1. Load embed.diagrams.net with special URL parameters inside an iframe
2. Send the diagram data to the iframe for editing
3. Receive and save diagram data from the iframe
4. Remove iframe

## Storage formats

Depending on the requirements, a PNG or SVG image or the XML for the diagram can be used as the storage format. Consider the following when picking the storage format:

- **Images (PNG and SVG)** should be used for fast loading with no initial delay. Embedding the diagram data for editing in PNG and SVG images can be used to avoid saving the image and diagram separately, but will result in bigger image files. When using a viewer or editor, images should be used to show a placeholder or preview.
- **SVG images** should be used if hyperlinks and vector images are required. (The SVG output of diagrams.net uses foreign objects, which are not supported in IE11 and earlier.)
- **XML** should be used if no image version of the diagram is required or to store the XML separately from the image. A viewer or editor is required to handle these files.
- **PNG images** should be used if a bitmap image is required, to support IE11 and earlier or for special fonts.

The storage can be any persistence mechanism. The image or XML file can be stored and used in the output of the host application, such as an image tag, SVG DOM or HTML viewer. Authentication, file descriptors, revisions etc must be handled by the host application. All communication between the host application and diagrams.net happens on the client-side.

## Protocol

The [protocol specification](https://desk.draw.io/support/solutions/articles/16000042544) describes the full messaging API.

The basic flow of the protocol is:

1. Wait for `init` event
2. Send `load` action
3. Wait for `save`/`exit` event

In some cases, additional steps may be required to check for a draft state or to export the diagram as an image. Special messages are available in the protocol to show draft states or a template dialog.

Fonts, colors, default styles, libraries, CSS and more can be configured to match the environment and style of the host application by using the `configure=1` URL parameter. See [localstorage-svg.html](examples/localstorage/localstorage-svg.html#L68).

## Examples

### [Embed Mode](examples/embed-mode/)

JavaScript API for editing embedded SVG and PNG images in an HTML page.

- [`diagram-editor.js`](examples/embed-mode/diagram-editor.js) - Reusable JavaScript API wrapper for the draw.io editor
- [`helloworld.html`](examples/embed-mode/helloworld.html) - Minimal example ([live](http://jgraph.github.io/drawio-integration/examples/embed-mode/helloworld.html))
- [`javascript.html`](examples/embed-mode/javascript.html) - Advanced example with multiple formats ([live](http://jgraph.github.io/drawio-integration/examples/embed-mode/javascript.html))
- [`collapsed.html`](examples/embed-mode/collapsed.html) - Collapsible diagram example

### [Inline Editing](examples/inline/)

Editing with `embedInline` mode and adapting embedded SVG images to dark mode.

- [`inline.js`](examples/inline/inline.js) - Inline editing implementation with dark mode support
- [`inline.html`](examples/inline/inline.html) - Example page ([live](http://jgraph.github.io/drawio-integration/examples/inline/inline.html))
- [`inline.drawio.svg`](examples/inline/inline.drawio.svg) - Sample SVG diagram

### [Local Storage](examples/localstorage/)

Saving and loading diagrams to/from HTML5 local storage.

- [`localstorage.html`](examples/localstorage/localstorage.html) - PNG format ([live](http://jgraph.github.io/drawio-integration/examples/localstorage/localstorage.html#default))
- [`localstorage-svg.html`](examples/localstorage/localstorage-svg.html) - SVG format with hyperlink support ([live](http://jgraph.github.io/drawio-integration/examples/localstorage/localstorage-svg.html#default))
- [`localfile.html`](examples/localstorage/localfile.html) - Self-modifying local file ([live](http://jgraph.github.io/drawio-integration/examples/localstorage/localfile.html))

### [WebDAV](examples/webdav/)

Roundtrip editing of diagrams stored on a WebDAV server.

- [`edit-diagram.html`](examples/webdav/edit-diagram.html) - Standalone editing page
- [`self-editing.svg`](examples/webdav/self-editing.svg) - Self-editing SVG file with embedded PNG
- [`self-editing.html`](examples/webdav/self-editing.html) - Self-editing HTML with embedded diagrams
- [`self-editing-embed.html`](examples/webdav/self-editing-embed.html) - Self-editing HTML using embed.js
- [`self-editing-image.html`](examples/webdav/self-editing-image.html) - Self-editing HTML using img tag
- [`embed.js`](examples/webdav/embed.js) - Double-click handler for editing drawio images

### [Chrome Extension](examples/chrome-extension/)

A template Chrome extension (Manifest V3) for adding draw.io diagram support to any web application. Based on a production integration. Includes diagram detection, inline editor, dark mode support, and placeholder save handler ready to be connected to your app's API.

- [`contentScript.js`](examples/chrome-extension/contentScript.js) - Main integration logic
- [`popup.html`](examples/chrome-extension/popup.html) / [`popup.js`](examples/chrome-extension/popup.js) - Extension popup UI
- [`manifest.json`](examples/chrome-extension/manifest.json) - Extension manifest
- [README](examples/chrome-extension/README.md) - Setup and customization guide

## Related

- [Using embed mode with GitHub](https://github.com/jgraph/drawio-github)
- [Supporting Dark Mode in SVG](https://github.com/jgraph/drawio-github/blob/master/DARK-MODE.md)
