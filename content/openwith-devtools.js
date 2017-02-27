/* globals Components, Services, XPCOMUtils, OpenWithCore */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

var HTML_NS = 'http://www.w3.org/1999/xhtml';
var XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

/* globals OpenWith */
this.OpenWith = {
	onLoad: function() {
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		Components.utils.import('resource://openwith/openwith.jsm');

		let box = document.getElementById('openwith-toolboxbox');
		let popup;

		if (box) {
			popup = document.getElementById('openwith-toolbox-menu');
		} else {
			box = document.createElementNS(HTML_NS, 'div');
			box.id = 'openwith-toolboxbox';

			let menuButton = document.createElementNS(XUL_NS, 'toolbarbutton');
			menuButton.className = 'command-button';
			menuButton.setAttribute('image', 'chrome://openwith/content/openwith16.png');
			menuButton.setAttribute('type', 'menu');

			popup = document.createElementNS(XUL_NS, 'menupopup');
			menuButton.appendChild(popup);
			box.appendChild(menuButton);

			let parent = document.getElementById('toolbox-buttons-end');
			parent.insertBefore(box, parent.firstChild);
		}

		this.location = {
			prefName: 'toolbox',
			empty: function() {
				while (this.container.childNodes.length > 1)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createToolbarButton,
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			container: box
		};

		this.menuLocation = {
			prefName: 'toolbox.menu',
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			container: popup
		};


		this.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', true);
		Services.obs.addObserver(this, 'openWithLocationsChanged', true);

	},

	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
	]),

	observe: function(subject, topic) {
		switch (topic) {
		case 'openWithListChanged':
		case 'openWithLocationsChanged':
			OpenWith.loadLists();
			break;
		}
	},

	loadLists: function() {
		if (!OpenWithCore.prefs.getBoolPref('toolbox.menu')) {
			this.menuLocation.container.parentNode.setAttribute('hidden', 'true');
		} else {
			this.menuLocation.container.parentNode.removeAttribute('hidden');
		}

		OpenWithCore.refreshUI(document, [this.location, this.menuLocation], { keyTargetType: OpenWithCore.TARGET_DEVTOOLS });
	}
};

XPCOMUtils.defineLazyGetter(OpenWith, 'toolbox', function() {
	let scope = {};
	try {
		Components.utils.import('resource://devtools/client/framework/gDevTools.jsm', scope);
	} catch (e) {
		Components.utils.import('resource://gre/modules/devtools/gDevTools.jsm', scope);
	}
	for (let [, toolbox] of scope.gDevTools._toolboxes) {
		if (toolbox.doc == document) {
			return toolbox;
		}
	}
	return null; // this should never happen
});

OpenWith.toolbox.on('ready', function() {
	OpenWith.onLoad();
});
