/**
 * Popup script for draw.io Chrome Extension integration.
 *
 * Provides two actions:
 * - Insert a new blank diagram into the host page
 * - Update existing diagrams (e.g. apply dark mode CSS)
 *
 * Communicates with contentScript.js via chrome.tabs.sendMessage.
 */
(function()
{
	// SVG template for a blank "Add a diagram" placeholder.
	// Replace this with your own template if needed.
	var svgTemplate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
		'<svg xmlns="http://www.w3.org/2000/svg" style="background: #ffffff; background-color: light-dark(#ffffff, var(--ge-dark-color, #121212)); color-scheme: light dark;"  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="419px" height="50px" viewBox="-0.5 -0.5 419 50"  content="&lt;mxfile host=&quot;app.diagrams.net&quot; version=&quot;20.8.10&quot;&gt;&lt;diagram name=&quot;Page-1&quot; id=&quot;IZTuIewHX-2reReE1Nqf&quot;&gt;ddHBEoIgEAbgp+FuME3dzerSyUNngk2ZkHUQR+vp0wFSpjoB3/4sDBCWN+PJ8ra+oARNaCZHwg6E0g3dsWmY5Rklo14qq6S3bIFSvSAEo/ZKQhfMk0PUTrUpCjQGhEuMW4tDGrujlgm0vILkGjOUgmv4il2VdLXX/XaVPoOq6njyJguVGxePymJvwnkGDfhKw2ObEO1qLnFYESsIyy2i87NmzEHP75q+2PFP9XNlC8b92DBNlt7TIvk8VrwB&lt;/diagram&gt;&lt;/mxfile&gt;"><defs/><rect fill="#ffffff" width="100%" height="100%" x="0" y="0" style="fill: light-dark(#ffffff, var(--ge-dark-color, #121212));"/><g><g><g><g><g><image x="12.5" y="12.5" width="24" height="24" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyNTAgMjUwIiBzdHlsZT0iY29sb3Itc2NoZW1lOmxpZ2h0IGRhcms7Ij4mI3hhOzxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MCB7IGZpbGw6IHRyYW5zcGFyZW50OyB9IC5zdDEgeyBmaWxsOiB0cmFuc3BhcmVudDsgfSAuc3QyIHsgZmlsbDogbGlnaHQtZGFyayhyZ2IoMCwgMCwgMCksIHJnYigyNTUsIDI1NSwgMjU1KSk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyB9IDwvc3R5bGU+JiN4YTs8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjM3LjUsMjI3LjljMCw1LjMtNC4zLDkuNi05LjUsOS42YzAsMCwwLDAsMCwwSDIyLjFjLTUuMywwLTkuNi00LjMtOS42LTkuNWMwLDAsMCwwLDAsMFYyMi4xICBjMC01LjMsNC4zLTkuNiw5LjUtOS42YzAsMCwwLDAsMCwwaDIwNS45YzUuMywwLDkuNiw0LjMsOS42LDkuNWMwLDAsMCwwLDAsMFYyMjcuOXoiLz4mI3hhOzxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMzcuNSwyMjcuOWMwLDUuMy00LjMsOS42LTkuNSw5LjZjMCwwLDAsMCwwLDBIODkuNkw0NC44LDE5MmwyNy45LTQ1LjVsODIuNy0xMDIuN2w4Mi4xLDg0LjVWMjI3Ljl6Ii8+JiN4YTs8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTk3LjEsMTM4LjNoLTIzLjdsLTI1LTQyLjdjNS43LTEuMiw5LjgtNi4yLDkuNy0xMlY1MS41YzAtNi44LTUuNC0xMi4zLTEyLjItMTIuM2MwLDAtMC4xLDAtMC4xLDBoLTQxLjcgIGMtNi44LDAtMTIuMyw1LjQtMTIuMywxMi4yYzAsMCwwLDAuMSwwLDAuMXYzMi4xYzAsNS44LDQsMTAuOCw5LjcsMTJsLTI1LDQyLjdINTIuOWMtNi44LDAtMTIuMyw1LjQtMTIuMywxMi4yYzAsMCwwLDAuMSwwLDAuMSAgdjMyLjFjMCw2LjgsNS40LDEyLjMsMTIuMiwxMi4zYzAsMCwwLjEsMCwwLjEsMGg0MS43YzYuOCwwLDEyLjMtNS40LDEyLjMtMTIuMmMwLDAsMC0wLjEsMC0wLjF2LTMyLjFjMC02LjgtNS40LTEyLjMtMTIuMi0xMi4zICBjMCwwLTAuMSwwLTAuMSwwaC00bDI0LjgtNDIuNGgxOS4zbDI0LjksNDIuNGgtNC4xYy02LjgsMC0xMi4zLDUuNC0xMi4zLDEyLjJjMCwwLDAsMC4xLDAsMC4xdjMyLjFjMCw2LjgsNS40LDEyLjMsMTIuMiwxMi4zICBjMCwwLDAuMSwwLDAuMSwwaDQxLjdjNi44LDAsMTIuMy01LjQsMTIuMy0xMi4yYzAsMCwwLTAuMSwwLTAuMXYtMzIuMWMwLTYuOC01LjQtMTIuMy0xMi4yLTEyLjMgIEMxOTcuMiwxMzguMywxOTcuMiwxMzguMywxOTcuMSwxMzguM3oiLz4mI3hhOzwvc3ZnPg==" preserveAspectRatio="none" opacity="0.44"/></g></g><g><g><rect x="-1" y="0" width="419" height="50" rx="3.5" ry="3.5" fill-opacity="0.07" fill="#000000" stroke="none" pointer-events="all" style="fill: light-dark(rgb(0, 0, 0), rgb(255, 255, 255));"/></g><g><g transform="translate(-0.5 -0.5)" opacity="0.44"><text x="51" y="29" fill="light-dark(#000000, #ffffff)" font-family="&quot;Helvetica&quot;" font-size="12px">Add a diagram</text></g></g></g><g><g><rect x="12.5" y="14" width="24.5" height="21" fill="none" stroke="#000000" stroke-opacity="0.44" pointer-events="all" style="stroke: light-dark(rgb(0, 0, 0), rgb(255, 255, 255));"/></g></g></g></g></g></svg>\n';

	document.getElementById('link').href = 'data:image/svg+xml;base64,' +
		btoa(unescape(encodeURIComponent(svgTemplate)));

	async function send(msg)
	{
		chrome.windows.getCurrent(async function (win)
		{
			var tabs = await chrome.tabs.query({});

			for (var tab of tabs)
			{
				if (tab.active && tab.windowId == win.id)
				{
					try
					{
						chrome.tabs.sendMessage(tab.id, msg)
							.then((response) => {
								// ok
							})
							.catch((error) => {
								// error
							});
					}
					catch (e)
					{
						// ignore
					}
				}
			}
	   });
	};

	document.getElementById('insertDiagram').onclick = async function()
	{
		send({msg: 'insertDiagram', data: svgTemplate});
	};

	document.getElementById('updateDiagrams').onclick = function()
	{
		send({msg: 'updateDiagrams'});
	};
})();
