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

		this.menuLocation = {
			prefName: 'toolbox.menu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_DEVTOOLS,
			suffix: '_toolboxmenu',
			container: document.getElementById('openwith-toolbox-menu'),
			submenu: false
		};

		this.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', false);
		Services.obs.addObserver(this, 'openWithLocationsChanged', false);
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
	}
};

window.addEventListener('load', OpenWith.onLoad, false);
