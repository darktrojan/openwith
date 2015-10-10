/* globals Components, Services, XPCOMUtils, OpenWithCore */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

this.OpenWith = {
	onLoad: function() {
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		Components.utils.import('resource://openwith/openwith.jsm');

		this.location = {
			prefName: 'toolbox',
			empty: function() {
				while (this.container.childNodes.length > 1)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createToolbarButton,
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			container: document.getElementById('openwith-toolboxbox')
		};

		this.menuLocation = {
			prefName: 'toolbox.menu',
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			container: document.getElementById('openwith-toolbox-menu')
		};

		this.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', true);
		Services.obs.addObserver(this, 'openWithLocationsChanged', true);

		XPCOMUtils.defineLazyGetter(OpenWith, 'toolbox', function() {
			let scope = {};
			Components.utils.import('resource:///modules/devtools/gDevTools.jsm', scope);
			for (let [, toolbox] of scope.gDevTools._toolboxes) {
				if (toolbox.doc == document) {
					return toolbox;
				}
			}
			return null; // this should never happen
		});
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

window.addEventListener('load', OpenWith.onLoad, false);
