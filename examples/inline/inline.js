(function()
{
	var editor = 'https://embed.diagrams.net/?embedInline=1&libraries=1';
	var iframe = document.createElement('iframe');
	iframe.style.position = 'absolute';
	iframe.style.border = '0';
	iframe.style.top = '0px';
	iframe.style.left = '0px';
	iframe.style.width = '100%';
	iframe.style.height = '100%';

	var dark = false;

	function invertSvg(doc)
	{
		var defs = doc.getElementsByTagName('defs');

		var style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
		style.appendChild(doc.createTextNode(
			':root {--light-color: #c9d1d9; --dark-color: #0d1117; }' +
			'svg:target[style^="background-color:"] { background-color: var(--dark-color) !important; }' +
			'g[filter="url(#dropShadow)"] { filter: none !important; }' +
			'[stroke="rgb(0, 0, 0)"] { stroke: var(--light-color); }' +
			'[stroke="rgb(255, 255, 255)"] { stroke: var(--dark-color); }' +
			'[fill="rgb(0, 0, 0)"] { fill: var(--light-color); }' +
			'[fill="rgb(255, 255, 255)"] { fill: var(--dark-color); }' +
			'g[fill="rgb(0, 0, 0)"] text { fill: var(--light-color); }' +
			'div[data-drawio-colors*="color: rgb(0, 0, 0)"]' +
			'	div { color: var(--light-color) !important; }' +
			'div[data-drawio-colors*="border-color: rgb(0, 0, 0)"]' +
			'	{ border-color: var(--light-color) !important; }' +
			'div[data-drawio-colors*="border-color: rgb(0, 0, 0)"]' +
			'	div { border-color: var(--light-color) !important; }' +
			'div[data-drawio-colors*="background-color: rgb(255, 255, 255)"]' +
			'	{ background-color: var(--dark-color) !important; }' +
			'div[data-drawio-colors*="background-color: rgb(255, 255, 255)"]' +
			'	div { background-color: var(--dark-color) !important; }'
		));
		defs[0].appendChild(style);

		return doc;
	};

	function createSvgDataUri(doc)
	{
		return 'data:image/svg+xml;base64,' +
			btoa(unescape(encodeURIComponent(
				new XMLSerializer().serializeToString(
					doc.documentElement))));
	};

	function invertImage(img, onChange)
	{
		if (img.src.substring(0, 26) == 'data:image/svg+xml;base64,')
		{
			img.src = createSvgDataUri(invertSvg(new DOMParser().
				parseFromString(decodeURIComponent(escape(atob(
					img.src.substring(img.src.indexOf(',') + 1)))),
						'text/xml')));
			onChange(img);
		}
		else
		{
			var req = new XMLHttpRequest();

			req.addEventListener('load', function()
			{
				img.src = createSvgDataUri(invertSvg(this.responseXML));
				onChange(img);
			});

			req.open('GET', img.src);
			req.send();
		}
	}

	function invertImages(imgs)
	{
		var force = imgs != null;
		var imgs = (imgs != null) ? imgs : document.getElementsByTagName('img');
		var result = [];

		for (var i = 0; i < imgs.length; i++)
		{
			var initialSrc = imgs[i].getAttribute('data-initial-src');

			if (initialSrc != null)
			{
				imgs[i].removeAttribute('data-initial-src');
				imgs[i].src = initialSrc;
			}
			else if (dark && (imgs[i].src.endsWith('.drawio.svg') || force))
			{
				imgs[i].setAttribute('data-initial-src', imgs[i].src);
				imgs[i].style.filter = 'invert(1)';

				invertImage(imgs[i], function(img)
				{
					img.style.filter = '';
				});
			}
			
			result.push(imgs[i]);
		}

		return result;
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

	var fullscreen = false;
	var prev = null;

	function updateFrame()
	{
		if (fullscreen)
		{
			prev = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			iframe.style.position = 'fixed';
			iframe.style.width = '100%';
			iframe.style.height = '100%';
		}
		else
		{
			document.body.style.overflow = prev;
			iframe.style.position = 'absolute';
			iframe.style.height = document.body.scrollHeight + 'px';
			iframe.style.width = document.body.scrollWidth + 'px';
		}
	};

	function setFullscreen(value)
	{
		if (fullscreen != value)
		{
			fullscreen = value;
			updateFrame();
		}
	}

	function editImage(img, onChange)
	{
		var req = new XMLHttpRequest();
		iframe.doUpdate = onChange;
		iframe.style.cursor = 'wait';

		iframe.doResize = function(msg)
		{
			setFullscreen(msg.fullscreen);
			img.style.boxSizing = 'border-box';
			img.style.width = msg.rect.width + 6 + 'px';
			img.style.height = msg.rect.height + 6 + 'px';
		};

		var initialized = false;

		iframe.doInit = function()
		{
			if (!initialized)
			{
				initialized = true;
				crossfade(img, iframe);
			}
		};
		
		req.addEventListener('load', function()
		{
			var rect = img.getBoundingClientRect();
			rect.x += document.body.scrollLeft + 5;
			rect.y += document.body.scrollTop + 5;
			rect.height -= 10;
			rect.width -= 2;

			iframe.contentWindow.postMessage(JSON.stringify(
				{action: 'load', xml: this.responseText,
				rect: rect, rough: true, dark: dark}), '*');
			iframe.style.cursor = '';
			updateFrame();
		});

		req.open('GET', img.src);
		req.send();
	};

	function installEditor(img)
	{
		var elt = document.activeElement
		img.style.cursor = 'pointer';

		img.addEventListener('click', function()
		{
			if (!iframe.busy)
			{
				iframe.busy = true;

				editImage(img, function(msg)
				{
					setFullscreen(false);
					var data = msg.data;

					if (dark)
					{
						data = createSvgDataUri(invertSvg(
							new DOMParser().parseFromString(atob(
								data.substring(data.indexOf(',') + 1)),
									'text/xml')));
						img.setAttribute('data-initial-src', msg.data);
					}

					img.setAttribute('src', data);
					img.style.boxSizing = '';
					img.style.width = '';
					img.style.height = '';

					iframe.style.width = '100%';
					iframe.style.height = '100%';
					iframe.doUpdate = null;
					iframe.doResize = null;
					
					crossfade(iframe, img, function()
					{
						iframe.busy = false;
						elt.focus();
					});
				});
			}
		});
	};

	window.addEventListener('message', function(evt)
	{
		if (evt, evt.source === iframe.contentWindow)
		{
			var msg = JSON.parse(evt.data);

			if (msg.event == 'init')
			{
				for (var i = 0; i < diagrams.length; i++)
				{
					installEditor(diagrams[i]);
				}
			}
			else if (msg.event == 'load' && iframe.doInit != null)
			{
				iframe.doInit();
			}
			else if (msg.event == 'export' && iframe.doUpdate != null)
			{
				iframe.doUpdate(msg);
			}
			else if (msg.event == 'resize' && iframe.doResize != null)
			{
				iframe.doResize(msg);
			}
		}
	});

	window.addEventListener('load', function()
	{
		iframe.style.visibility = 'hidden';
		document.body.appendChild(iframe);
		iframe.setAttribute('src', editor);
	});

	window.addEventListener('resize', function()
	{
		if (iframe.style.visibility != 'hidden')
		{
			updateFrame();
		}
	});

	var diagrams = invertImages();

	for (var i = 0; i < diagrams.length; i++)
	{			
		diagrams[i].style.cursor = 'wait';
	}

	var button = document.createElement('button');
	button.innerHTML = 'Dark';
	button.style.position = 'fixed';
	button.style.left = '10px';
	button.style.top = '10px';
	document.body.appendChild(button);
	var initial = document.body.style.background;

	button.addEventListener('click', function()
	{
		dark = !dark;

		if (dark)
		{
			document.body.style.background = '#2a2a2a';
			document.body.style.color = '#ffffff';
			button.innerHTML = 'Light';
		}
		else
		{
			document.body.style.background = initial;
			document.body.style.color = '';
			button.innerHTML = 'Dark';
		}
		
		invertImages(diagrams);
	});
})();
