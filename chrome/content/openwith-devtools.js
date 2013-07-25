let OpenWith = {
	onLoad: function() {
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		const Cu = Components.utils;

		Cu.import('resource://openwith/openwith.jsm');
		Cu.import('resource://gre/modules/Services.jsm');

		this.location = {
			prefName: 'toolbox',
			empty: function() {
				while (this.container.childNodes.length > 1)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createToolbarButton,
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			suffix: '_toolbox',
			container: document.getElementById('openwith-toolboxbox'),
			submenu: false
		};

		this.toolboxMenu = document.getElementById('openwith-toolbox-menu');
		this.toolboxMenu.addEventListener('popupshowing', this.popupShowing, false);
		this.toolboxMenu.addEventListener('popuphidden', this.popupHidden, false);
		this.menuLocation = {
			prefName: 'toolbox.menu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			suffix: '_toolboxmenu',
			container: this.toolboxMenu,
			submenu: false
		};

		this.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', true);
		Services.obs.addObserver(this, 'openWithLocationsChanged', true);
	},

	QueryInterface: function QueryInterface(aIID) {
		if (aIID.equals(Components.interfaces.nsIObserver) ||
			aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
			aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	observe: function(subject, topic, data) {
		switch (topic) {
		case 'openWithListChanged':
		case 'openWithLocationsChanged':
			OpenWith.loadLists();
			break;
		}
	},

	loadLists: function() {
		this.location.empty();
		this.menuLocation.empty();

		if (!OpenWithCore.prefs.getBoolPref('toolbox.menu')) {
			this.menuLocation.container.parentNode.setAttribute('hidden', 'true');
		} else {
			this.menuLocation.container.parentNode.removeAttribute('hidden');
		}

		OpenWithCore.refreshUI(document, [this.location, this.menuLocation]);
	},

	popupShowing: function(event) {
		if (event.target != this) {
			return;
		}

		switch (this.id) {
			case 'openwith-toolbox-menu':
				let somethingLeftVisible = OpenWithCore.matchUtils.hideMismatched(
						OpenWith.toolboxMenu.childNodes,
						new String(window.top.gBrowser.selectedBrowser.currentURI.spec)
				);
				if (!somethingLeftVisible) {
					event.preventDefault(); // don't display popup
				}
				return;
			default:
				return;
		}
	},

	popupHidden: function(event) {},
};

window.addEventListener('load', OpenWith.onLoad, false);
