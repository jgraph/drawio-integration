/**
 * Content script for draw.io Chrome Extension integration.
 *
 * This is a generic template based on a real-world integration.
 * It demonstrates how to:
 * - Detect .drawio.svg images on a host web application
 * - Open the draw.io inline editor when images are clicked
 * - Save edited diagrams back to the host application's API
 * - Handle dark mode for SVG diagrams
 *
 * To adapt this for your application:
 * 1. Replace YOUR_APP domain checks with your host domain
 * 2. Implement saveDiagramToHost() with your app's storage/upload API
 * 3. Adjust DOM selectors for your app's page structure
 * 4. Update getScrollContainer() to return your app's scrollable element
 */
(function()
{
	function isDevMode()
	{
		return !('update_url' in chrome.runtime.getManifest());
	};

	// =========================================================================
	// Configuration - Customize these for your host application
	// =========================================================================

	// The domain your extension targets
	var HOST_DOMAIN = 'your-app.example.com';

	// CSS class or selector for editable content areas in your app
	var EDITABLE_CONTENT_SELECTOR = '[contenteditable="true"]';

	// CSS class used by your app to indicate dark mode on <body> or a parent
	var DARK_MODE_CLASS = 'dark-theme';

	// Background color used in dark mode
	var backgroundColor = '#191919';

	// =========================================================================
	// Editor setup
	// =========================================================================

	var editor = isDevMode() ?
		'https://test.draw.io/?dev=1&embedInline=1&libraries=1&configure=1' :
		'https://embed.diagrams.net/?embedInline=1&libraries=1&configure=1';

	var session = Date.now();
	var debug = isDevMode();
	var enabled = getDomainName(window.location.hostname) == HOST_DOMAIN;
	var initialized = false;
	var activeImage = null;

	// CSS for dark mode inversion of legacy diagrams (without color-scheme support)
	var legacyCss = '@media (prefers-color-scheme: dark)' +
	'{' +
	'	svg {' +
	'		filter: invert(93%) hue-rotate(180deg);' +
	'	}' +
	'	svg[style^="background-color: rgb(255, 255, 255);"] {' +
	'		background-color: transparent !important;' +
	'	}' +
	'	image {' +
	'		filter: invert(100%) hue-rotate(180deg) saturate(1.25);' +
	'	}' +
	'}';

	// =========================================================================
	// Logging helpers
	// =========================================================================

	function writeDebug()
	{
		try
		{
			if (window.console != null && debug)
			{
				var args = [new Date().toISOString(),
					'[Session ' + session + ']',
					'[draw.io Extension]', '[debug]'];

				for (var i = 0; i < arguments.length; i++)
				{
					args.push(arguments[i]);
				}

				console.log.apply(console, args);
			}
		}
		catch (e)
		{
			// ignore
		}
	};

	function writeLog()
	{
		try
		{
			if (window.console != null)
			{
				var args = [new Date().toISOString(),
					'[Session ' + session + ']',
					'[draw.io Extension]', '[info]'];

				for (var i = 0; i < arguments.length; i++)
				{
					args.push(arguments[i]);
				}

				console.log.apply(console, args);
			}
		}
		catch (e)
		{
			// ignore
		}
	};

	if (!enabled)
	{
		writeLog('Editor disabled for hostname ' + window.location.hostname);
	}

	// =========================================================================
	// Utility functions
	// =========================================================================

	function getDomainName(hostName)
	{
		return hostName.substring(hostName.lastIndexOf(".", hostName.lastIndexOf(".") - 1) + 1);
	};

	function uuidv4()
	{
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		);
	};

	function lengthInUtf8Bytes(str)
	{
		var m = encodeURIComponent(str).match(/%[89ABab]/g);

		return str.length + (m ? m.length : 0);
	};

	function getFilename(url)
	{
		var tokens = url.split('?')[0].split('/');

		return tokens[tokens.length - 1];
	};

	function crossfade(source, target, done)
	{
		target.style.visibility = '';

		window.setTimeout(function()
		{
			source.style.visibility = 'hidden';

			if (done != null)
			{
				done();
			}
		}, 50);
	};

	// =========================================================================
	// SVG / dark mode helpers
	// =========================================================================

	function getSvg(data)
	{
		return '<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
			decodeURIComponent(escape(atob(data.substring(data.indexOf(',') + 1))));
	};

	function createSvgDataUri(doc)
	{
		return 'data:image/svg+xml;base64,' +
			btoa(unescape(encodeURIComponent(
				new XMLSerializer().serializeToString(
					doc.documentElement))));
	};

	function addCssToSvg(doc)
	{
		doc.documentElement.style.colorScheme = 'light dark';
		var defs = doc.getElementsByTagName('defs');
		var style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
		style.appendChild(doc.createTextNode(legacyCss));
		defs[0].appendChild(style);

		return doc;
	};

	function invertImage(img, done)
	{
		var req = new XMLHttpRequest();

		req.addEventListener('load', function()
		{
			if (req.status >= 200 && req.status <= 299 && this.responseXML != null)
			{
				var modified = false;

				if (this.responseXML.documentElement.style.colorScheme != 'light dark')
				{
					var data = createSvgDataUri(addCssToSvg(this.responseXML));
					imageChanged(img, getFilename(img.src), data, img.width);
					modified = true;
				}

				done(modified);
			}
		});

		req.open('GET', img.src);
		req.send();
	};

	// =========================================================================
	// Scroll container - customize for your app's layout
	// =========================================================================

	/**
	 * Returns the main scrollable container element in your host application.
	 * The draw.io editor iframe is appended to this container so it scrolls
	 * with the page content.
	 *
	 * TODO: Replace with a selector that matches your app's scrollable wrapper.
	 */
	function getScrollContainer()
	{
		return document.querySelector('.app-scroll-container') || document.documentElement;
	};

	// =========================================================================
	// Editor iframe setup
	// =========================================================================

	var iframe = document.createElement('iframe');
	iframe.style.position = 'absolute';
	iframe.style.border = '0';
	iframe.style.top = '0px';
	iframe.style.left = '0px';
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.style.zIndex = '4';

	function getViewport()
	{
		var container = iframe.parentNode;
		var viewport = container.getBoundingClientRect();
		viewport.x = container.scrollLeft;
		viewport.y = container.scrollTop;

		return viewport;
	};

	function scrollHandler()
	{
		if (initialized && iframe.style.visibility != 'hidden')
		{
			iframe.contentWindow.postMessage(JSON.stringify(
				{action: 'viewport', viewport: getViewport()}), '*');
		}
	};

	// =========================================================================
	// Fullscreen handling
	// =========================================================================

	var fullscreen = false;
	var prevOverflow = null;

	function updateFrame()
	{
		if (fullscreen)
		{
			prevOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			iframe.style.position = 'fixed';
			iframe.style.top = '0px';
			iframe.style.left = '0px';
			iframe.style.width = '100%';
			iframe.style.height = '100%';
		}
		else
		{
			document.body.style.overflow = prevOverflow;
			iframe.style.position = 'absolute';
			iframe.style.left = '0px';
			iframe.style.top = '0px';

			if (iframe.parentNode)
			{
				iframe.style.width = iframe.parentNode.clientWidth + 'px';
				iframe.style.height = iframe.parentNode.scrollHeight + 'px';
			}
		}
	};

	function setFullscreen(value)
	{
		if (fullscreen != value)
		{
			fullscreen = value;
			updateFrame();
			iframe.contentWindow.postMessage(JSON.stringify(
				{action: 'fullscreenChanged',
				value: value}), '*');
		}
	};

	// =========================================================================
	// Editor lifecycle
	// =========================================================================

	function editImage(img, isNew, onChange)
	{
		iframe.doResize = function(msg)
		{
			setFullscreen(msg.fullscreen);
			img.style.width = msg.rect.width + 'px';
			img.style.height = (msg.rect.height - 22) + 'px';
		};

		var prev = img.parentNode.style.cursor;
		img.parentNode.style.cursor = 'wait';
		iframe.style.cursor = 'wait';

		iframe.doInit = function(errorCode)
		{
			if (errorCode != null)
			{
				img.parentNode.style.cursor = prev;
				onChange({});
				alert('Error ' + errorCode + ': Cannot load editor');
			}
			else
			{
				crossfade(img, iframe);
				iframe.style.cursor = '';
				img.parentNode.style.cursor = prev;
			}
		};

		iframe.doUpdate = onChange;
		startEditor(img, isNew);
	};

	function startEditor(img, isNew)
	{
		var req = new XMLHttpRequest();

		req.addEventListener('load', function()
		{
			if (req.status >= 200 && req.status <= 299)
			{
				try
				{
					var rect = img.parentNode.getBoundingClientRect();
					var r = iframe.parentNode.getBoundingClientRect();

					if (rect.y < r.y + 66 || rect.y > iframe.parentNode.scrollTop + r.height)
					{
						img.scrollIntoView();
						iframe.parentNode.scrollTop -= 60;
						rect = img.parentNode.getBoundingClientRect();
					}

					var mw = Math.min(600, window.innerWidth - 60);
					var mh = Math.min(400, window.innerHeight - 60);

					var border = 8;
					rect.x -= border + 3 + r.x - Math.min(0, (rect.width - mw) / 2);
					rect.y -= border + 3 - iframe.parentNode.scrollTop + r.y;
					rect.width = Math.max(mw, rect.width + (2 * border + 2));
					rect.height = Math.max(mh, rect.height + (2 * border + 2));

					iframe.contentWindow.postMessage(JSON.stringify(
						{action: 'load', xml: this.responseText, border: border,
						rect: rect, maxFitScale: 1.5,
						minWidth: Math.min(mw, rect.width + (2 * border + 2)),
						minHeight: Math.min(mh, rect.height + (2 * border + 2)),
						dark: document.body.classList.contains(DARK_MODE_CLASS),
						viewport: getViewport()}), '*');
					updateFrame();

					writeLog('Editor started for image', getFilename(img.src));
				}
				catch (e)
				{
					iframe.doInit(e.message);
				}
			}
			else
			{
				iframe.doInit(req.status);
			}
		});

		req.open('GET', img.src);
		req.send();

		writeLog('Starting editor for', getFilename(img.src));
	};

	var lastSnapshot = null;

	function prepareEditor(img, filename, url, isNew)
	{
		if (!iframe.busy)
		{
			iframe.busy = true;
			activeImage = img;

			var width = img.style.width;
			var height = img.style.height;
			var boxSizing = img.style.boxSizing;

			// Listens for remote changes to the image src
			var mutationObserver = new MutationObserver(function(evt)
			{
				if (url != img.src && activeImage == img)
				{
					url = img.src;
					mergeChanges(url);
				}
			});

			mutationObserver.observe(img, {attributes: true});

			editImage(img, isNew, function(msg, override)
			{
				if (msg.data != null && msg.exit != null &&
					!msg.exit && !override)
				{
					lastSnapshot = msg;
				}
				else
				{
					mutationObserver.disconnect();
					setFullscreen(false);
					img.style.width = width;
					img.style.height = height;
					img.style.boxSizing = boxSizing;
					imageChanged(img, filename, msg.data);

					crossfade(iframe, img, function()
					{
						writeDebug('Editor stopped');
						iframe.busy = false;
						lastSnapshot = null;
						activeImage = null;
						img.focus();
					});
				}
			});
		}
	};

	function mergeChanges(url)
	{
		var req = new XMLHttpRequest();

		req.addEventListener('load', function()
		{
			if (req.status >= 200 && req.status <= 299)
			{
				iframe.contentWindow.postMessage(JSON.stringify({action: 'merge',
					xml: this.responseText}), '*');
			}
		});

		req.open('GET', url);
		req.send();
	};

	// =========================================================================
	// Saving diagrams - IMPLEMENT FOR YOUR HOST APPLICATION
	// =========================================================================

	/**
	 * Called when a diagram has been edited and needs to be saved.
	 *
	 * This is the main integration point you need to implement.
	 * The function receives the SVG data and image metadata, and should
	 * upload/save it using your host application's API.
	 *
	 * @param {Object} msg - Save message with the following properties:
	 *   - data: SVG string content of the diagram
	 *   - width: pixel width of the diagram
	 *   - height: pixel height of the diagram
	 *   - aspect: height/width aspect ratio
	 *   - filename: original filename (e.g. "Diagram.drawio.svg")
	 *   - url: current image src URL
	 * @param {Function} callback - Call with (msg, response) when done.
	 *   Set msg.error = true on failure.
	 */
	function saveDiagramToHost(msg, callback)
	{
		// TODO: Implement your host application's save/upload API here.
		//
		// Example flow:
		// 1. Get an upload URL from your API
		// 2. PUT the SVG data to the upload URL
		// 3. Update the resource record with new metadata (size, title, etc.)
		// 4. Call callback(msg) on success or set msg.error on failure
		//
		// Example skeleton:
		//
		// fetch('/api/upload', {
		//     method: 'POST',
		//     headers: {'Content-Type': 'application/json'},
		//     body: JSON.stringify({
		//         filename: msg.filename,
		//         contentType: 'image/svg+xml',
		//         contentLength: lengthInUtf8Bytes(msg.data)
		//     })
		// })
		// .then(res => res.json())
		// .then(uploadInfo => {
		//     return fetch(uploadInfo.uploadUrl, {
		//         method: 'PUT',
		//         headers: {'Content-Type': 'image/svg+xml'},
		//         body: msg.data
		//     });
		// })
		// .then(() => callback(msg))
		// .catch(err => {
		//     msg.error = true;
		//     msg.errStatus = err.status || 500;
		//     callback(msg, {message: err.message});
		// });

		writeLog('saveDiagramToHost() not implemented - diagram data logged to console');
		console.log('Diagram to save:', msg);
		callback(msg);
	};

	function imageChanged(img, filename, data, newWidth)
	{
		if (data != null)
		{
			var svg = getSvg(data);

			// Checks for prior app version diagrams and adds required CSS
			var svgDoc = new DOMParser().parseFromString(svg, 'text/xml');

			if (svgDoc.documentElement.style.colorScheme != 'light dark')
			{
				data = createSvgDataUri(addCssToSvg(svgDoc));
				svg = getSvg(data);
			}

			// Gets image size and aspect ratio
			var tempImg = new Image();
			tempImg.src = data;

			tempImg.onload = function()
			{
				var width = tempImg.width;
				var height = tempImg.height;
				var aspect = height / width;

				var saveMessage = {
					data: svg,
					width: width,
					height: height,
					aspect: aspect,
					filename: filename,
					url: img.getAttribute('src')};

				// Immediate preview
				img.setAttribute('src', data);
				writeLog('Saving diagram', saveMessage);

				saveDiagramToHost(saveMessage, function(msg, res)
				{
					if (msg.error != null)
					{
						var message = 'Error ' + msg.errStatus + ': Cannot update diagram';

						if (res != null && res.message != null)
						{
							message += '\n' + res.message;
						}

						alert(message);
					}
				});
			};
		}

		iframe.style.width = '100%';
		iframe.style.height = '100%';
		iframe.doUpdate = null;
		iframe.doResize = null;
	};

	// =========================================================================
	// PostMessage handler - draw.io editor communication
	// =========================================================================

	writeDebug('Adding message listener');

	window.addEventListener('message', function(evt)
	{
		if (evt.source === iframe.contentWindow)
		{
			writeDebug('Message', evt);

			var msg = JSON.parse(evt.data);

			if (msg.event == 'init')
			{
				initialized = true;
				writeDebug('Editor initialized');
			}
			else if (msg.event == 'configure')
			{
				iframe.contentWindow.postMessage(JSON.stringify({action: 'configure',
					config: {
						darkColor: backgroundColor,
						// Change this settings key to scope editor preferences per app
						settingsName: 'chrome-extension'
					}
				}), '*');
			}
			else if (msg.event == 'load' && iframe.doInit != null)
			{
				iframe.doInit();
				writeDebug('Editor started');
			}
			else if ((msg.event == 'export' || msg.event == 'exit') &&
				iframe.doUpdate != null)
			{
				iframe.doUpdate(msg);
			}
			else if (msg.event == 'resize' && iframe.doResize != null)
			{
				iframe.doResize(msg);
			}
		}
	});

	// =========================================================================
	// Image detection - scans DOM for .drawio.svg images
	// =========================================================================

	var checked = [];

	function updateChecked()
	{
		var temp = [];

		for (var i = 0; i < checked.length; i++)
		{
			if (document.body.contains(checked[i]))
			{
				temp.push(checked[i]);
			}
		}

		return temp;
	};

	function checkDiagram(img)
	{
		var filename = getFilename(img.src);
		var result = false;

		if (filename.endsWith('.drawio.svg'))
		{
			if (enabled)
			{
				installEditor(img, filename, img.src);
			}

			result = true;
		}

		return result;
	};

	function checkImage(img)
	{
		if (checked.indexOf(img) < 0)
		{
			checked.push(img);

			if (!checkDiagram(img))
			{
				// Watch for src changes in case it becomes a .drawio.svg later
				var mutationObserver = new MutationObserver(function()
				{
					if (checkDiagram(img))
					{
						mutationObserver.disconnect();
					}
				});

				mutationObserver.observe(img, {attributes: true});
			}
		};
	};

	function checkImages()
	{
		checked = updateChecked();
		var imgs = document.getElementsByTagName('img');

		for (var i = 0; i < imgs.length; i++)
		{
			checkImage(imgs[i]);
		}
	};

	function installEditor(img, filename, url)
	{
		img.parentNode.addEventListener('click', function()
		{
			if (enabled)
			{
				if (!initialized)
				{
					var prev = img.parentNode.style.cursor;
					img.parentNode.style.cursor = 'not-allowed';

					window.setTimeout(function()
					{
						img.parentNode.style.cursor = prev;

						if (!initialized)
						{
							iframe.removeAttribute('src');
							iframe.setAttribute('src', editor);
							alert('draw.io editor is not ready yet.');
						}
					}, 300);
				}
				else
				{
					prepareEditor(img, filename, url);
				}
			}
		});
	};

	// =========================================================================
	// Frame management - keeps editor iframe attached to scroll container
	// =========================================================================

	function checkFrame()
	{
		// Checks if pending snapshot exists
		if (iframe.doUpdate != null && lastSnapshot != null &&
			!document.body.contains(iframe))
		{
			iframe.doUpdate(lastSnapshot, true);
		}

		var container = getScrollContainer();

		// Re-insert editor iframe if its parent was removed from DOM
		if (container && !container.contains(iframe))
		{
			iframe.removeAttribute('src');

			if (iframe.parentNode != null)
			{
				iframe.parentNode.removeEventListener('scroll', scrollHandler);
			}

			initialized = false;
			iframe.busy = false;
			iframe.style.visibility = 'hidden';
			container.appendChild(iframe);
			iframe.parentNode.addEventListener('scroll', scrollHandler);

			window.setTimeout(function()
			{
				iframe.setAttribute('src', editor);
				writeDebug('Initializing editor', iframe);
			}, 0);
		}
	};

	// Creates a snapshot when user moves away from editor area
	iframe.addEventListener('mouseleave', function()
	{
		if (activeImage != null && iframe.contentWindow != null)
		{
			writeDebug('Preparing to save snapshot');

			iframe.contentWindow.postMessage(JSON.stringify(
				{action: 'snapshot'}), '*');
		}
	}, true);

	// =========================================================================
	// DOM observer - watches for new images and page changes
	// =========================================================================

	function pageChanged()
	{
		if (enabled)
		{
			checkFrame();
		}

		checkImages();
	};

	new MutationObserver(pageChanged).observe(
		document.body, {childList: true, subtree: true});

	// Listen for system dark mode changes and close the editor
	if (window.matchMedia != null)
	{
		window.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', function()
		{
			if (activeImage != null)
			{
				iframe.contentWindow.postMessage(JSON.stringify(
					{action: 'exit'}), '*');
			}
		});
	}

	// Debounced resize handler
	var resizeThread = null;

	window.addEventListener('resize', function()
	{
		window.clearTimeout(resizeThread);

		resizeThread = window.setTimeout(function()
		{
			if (iframe.contentWindow != null && iframe.style.visibility != 'hidden')
			{
				iframe.contentWindow.postMessage(JSON.stringify(
					{action: 'viewport', viewport: getViewport()}), '*');

				updateFrame();
			}
		}, 1000);
	});

	// =========================================================================
	// Extension message handler - receives commands from popup
	// =========================================================================

	chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse)
	{
		writeDebug('Message', location.href, location.hostname, msg);

		switch (msg.msg)
		{
			case 'updateDiagrams':

				var imgs = document.querySelectorAll('img[src*=".drawio.svg"]');
				writeLog('Checking diagrams', imgs.length);

				for (var i = 0; i < imgs.length; i++)
				{
					(function(img, index)
					{
						invertImage(img, function(modified)
						{
							writeLog('Checked diagram', (index + 1), 'of', imgs.length, 'modified', modified);
						});
					}(imgs[i], i));
				}

				break;

			case 'insertDiagram':

				// Stop active editing
				if (activeImage != null)
				{
					iframe.contentWindow.postMessage(JSON.stringify(
						{action: 'exit'}), '*');
				}

				// TODO: Implement diagram insertion for your host application.
				//
				// This typically involves:
				// 1. Finding the active/focused content area
				// 2. Creating a File object with the SVG template data
				// 3. Dispatching drag/drop events or using your app's insert API
				//
				// Example using drag-and-drop (works with many rich text editors):
				//
				// var target = document.querySelector(EDITABLE_CONTENT_SELECTOR);
				// if (target != null)
				// {
				//     var dataTransfer = new DataTransfer();
				//     dataTransfer.items.add(new File(
				//         [msg.data],
				//         'Diagram.drawio.svg',
				//         {type: 'image/svg+xml'}));
				//     var rect = target.getBoundingClientRect();
				//
				//     target.dispatchEvent(new DragEvent('dragover', {
				//         dataTransfer: dataTransfer,
				//         clientX: rect.left,
				//         clientY: rect.top + rect.height / 2,
				//         bubbles: true, cancelable: true, view: window
				//     }));
				//
				//     target.dispatchEvent(new DragEvent('drop', {
				//         dataTransfer: dataTransfer,
				//         clientX: rect.left,
				//         clientY: rect.top + rect.height / 2,
				//         bubbles: true, cancelable: true, view: window
				//     }));
				// }

				writeLog('insertDiagram: implement for your host application');
				break;
		}

		return true;
	});
})();
