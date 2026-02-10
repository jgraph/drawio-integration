# draw.io WebDav Integration

Please read <a href="https://github.com/jgraph/drawio-integration/" target="_blank">this</a> for a high-level introduction.

Examples for using draw.io with WebDav.

* <a href="http://jgraph.github.io/drawio-integration/webdav/edit-diagram.html" target="_blank">Standalone page for editing</a>
* <a href="http://jgraph.github.io/drawio-integration/webdav/self-editing.svg" target="_blank">Self-editing SVG file (with embedded PNG)</a>
* <a href="http://jgraph.github.io/drawio-integration/webdav/self-editing.html" target="_blank"> Self-editing HTML file with embedded diagram(s)</a>
* <a href="http://jgraph.github.io/drawio-integration/webdav/self-editing-embed.html" target="_blank"> Self-editing HTML file with embedded diagram (using embed.js)</a>
* <a href="http://jgraph.github.io/drawio-integration/webdav/self-editing-image.html" target="_blank"> Self-editing HTML file with embedded diagram (using img tag)</a>

These files must be hosted on a WebDav server for roundtrip-editing. Eg. Apache requires the following configuration:

```
DavLockDB /tmp/DavLock

<Directory "/Library/WebServer/Documents/Webdav">
  Options Indexes
  DAV On
  AuthType Basic
  AuthName "Webdav"
  AuthUserFile /etc/apache2/webdav.password
  Header set Access-Control-Allow-Origin http://www.example.com
  Header set Access-Control-Allow-Credentials true
  Header set Access-Control-Allow-Methods "POST, GET, PUT, DELETE, OPTIONS"
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Require valid-user
</Directory>
```
