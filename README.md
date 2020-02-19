# draw.io Integration

Integration, or "embed mode" is used for cases where the storage of the diagram is taken care of by a host application,
and draw.io is used for diagram editing. In this case, draw.io is used inside an iframe or window with special URL
parameters, and is remote controlled using the HTML5 Messaging API.

The basic flow is as follows:

1. Load draw.io with special URL parameters inside an iframe
2. Send the diagram data to the iframe for editing
3. Receive and save diagram data from the iframe
4. Remove iframe

Depending on the requirements, a PNG or SVG image or the XML for the diagram can be used as the storage format. Consider the following when picking the storage format:

- Images (PNG and SVG) should be used for fast loading with no initial delay. Embedding the diagram data for editing in PNG and SVG images can be used to avoid saving the image and diagram separately, but will result in bigger image files. When using a viewer or editor, images should be used to show a placeholder or preview.
- SVG images should be used if hyperlinks and vector images are required. (The SVG output of draw.io uses foreign objects, which are not
supported in IE11 and earlier. To fully support IE11 in SVG output, certain application features must be disabled, which is not recommended.)
- XML should be used if no image version of the diagram is required or to store the XML separately from the image. A viewer or editor is required
to handle these files.
- PNG images should be used if a bitmap image is required, to support IE11 and earlier or for special fonts.

The storage can be any persistence mechanism. The image or XML file can be stored and used in the output of the host application, such as an image tag, SVG DOM or HTML viewer. Authentication, file descriptors, revisions etc must be handled by the host application. All communication between the host application and draw.io happens on the client-side. The protocol specification is <a href="https://desk.draw.io/support/solutions/articles/16000042544" target="_blank">here</a>.

The basic flow of the protocol is as follows:

1. Wait for init event
2. Send load action
3. Wait for save/exit event

In some cases, additional steps may be required to check for a draft state or to export the diagram as an image. <a href="https://support.draw.io/pages/viewpage.action?pageId=8945851" target="_blank">Here</a> is a simple embedding walk-through. Special messages are available in the protocol to show draft states or a template dialog.

Fonts, colors, default styles, libraries, CSS and more can be configured to match the environment and style of the host application by using the configure=1 URL parameter. See <a href="https://github.com/jgraph/drawio-integration/blob/master/localstorage-svg.html#L68" target="_blank">localstorage-svg.html</a>.

The following examples are available:

* <a href="https://github.com/jgraph/drawio-integration/blob/master/diagram-editor.js" target="_blank">JavaScript API</a> for editing embedded SVG and PNG images in a HTML page (see <a href="http://jgraph.github.io/drawio-integration/helloworld.html" target="_blank">example1</a>, <a href="http://jgraph.github.io/drawio-integration/javascript.html" target="_blank">example2</a>)
* <a href="http://jgraph.github.io/drawio-integration/localstorage.html#default" target="_blank">Using Local Storage</a> Saving and loading a draw.io diagram to/from HTML5 local storage (use the part of the hash-tag to change the local storage key)
* <a href="http://jgraph.github.io/drawio-integration/localstorage-svg.html#default" target="_blank">Using Local Storage (SVG)</a> Saving and loading a draw.io diagram to/from HTML5 local storage as SVG (use the part of the hash-tag to change the local storage key). This example uses an SVG element instead of an image to support hyperlinks. Keep in mind that draw.io uses foreignObjects for text labels in static SVG output. ForeignObjects are not supported in IE11 and earlier. (For draft states, a special dialog is now available.)
* <a href="http://jgraph.github.io/drawio-integration/localfile.html" target="_blank">Using Local File</a> Saving and loading to/from a self-modifying local file
* <a href="https://github.com/jgraph/drawio-integration/tree/master/webdav" target="_blank">Using embed mode with WebDav</a>
* <a href="https://github.com/jgraph/drawio-github" target="_blank">Using embed mode with GitHub</a>
