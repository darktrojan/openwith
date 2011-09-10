var OpenWith = {
	
	locations: [],
	
	onLoad: function () {
		window.removeEventListener ("load", OpenWith.onLoad, false);
		OpenWith.init ();
	},
	
	init: function () {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cu = Components.utils;

		Cu.import ('resource://openwith/openwith.jsm');
		Cu.import ('resource://gre/modules/Services.jsm');

		var contextMenu = document.getElementById ('mailContext');
		contextMenu.addEventListener ('popupshowing', this.popupShowing, false);
		contextMenu.addEventListener ('popuphidden', this.popupHidden, false);

		/** context menu (links) **/
		this.contextMenuLinkPlaceholder = document.getElementById ('openwith-contextmenulinkplaceholder');
		this.contextMenuLinkItems = [];
		this.locations.push ({
			prefName: 'contextmenulink',
			empty: function () { this.container.splice (0, this.container.length); },
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_LINK,
			suffix: '_contextmenulink',
			container: this.contextMenuLinkItems,
			submenu: false
		});
		
		/** context menu (links) submenu **/
		this.contextLinkSubmenu = document.getElementById ('openwith-contextlinksubmenu');
		this.contextLinkSubmenuPopup = document.getElementById ('openwith-contextlinksubmenupopup');
		this.locations.push ({
			prefName: 'contextmenulink.submenu',
			empty: function () {
				while (this.container.lastChild)
					this.container.removeChild (this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_LINK,
			suffix: '_contextmenulinksubmenu',
			container: this.contextLinkSubmenuPopup,
			submenu: true
		});

		OpenWithCore.loadList (false);
		OpenWith.loadLists ();
		
		Services.obs.addObserver (this, "openWithListChanged", false);
		Services.obs.addObserver (this, "openWithLocationsChanged", false);
	},
	
	observe: function (subject, topic, data) {
		OpenWith.loadLists ();
	},
	
	loadLists: function () {
		this.emptyList = OpenWithCore.list.length == 0;
		OpenWithCore.refreshUI (document, this.locations);
	},
	
	popupShowing: function (event) {
		if (event.target != this) {
			return;
		}
		var contextMenuLinkPref = OpenWithCore.prefs.getBoolPref ("contextmenulink");
		var contextSubmenuLinkPref = OpenWithCore.prefs.getBoolPref ("contextmenulink.submenu");

		// from http://mxr.mozilla.org/mozilla-central/source/browser/base/content/nsContextMenu.js
		var shouldShow = !(gContextMenu.isContentSelected || gContextMenu.onLink ||
			gContextMenu.onImage || gContextMenu.onCanvas || gContextMenu.onVideo ||
			gContextMenu.onAudio || gContextMenu.onTextInput);

		OpenWith.contextMenuLinkPlaceholder.hidden = true;
		OpenWith.contextLinkSubmenu.hidden = !contextSubmenuLinkPref || 
					OpenWith.emptyList || !gContextMenu.onLink || gContextMenu.onMailtoLink;
		
		if (contextMenuLinkPref && gContextMenu.onLink && !gContextMenu.onMailtoLink) {
			var next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
			for (var i = 0, iCount = OpenWith.contextMenuLinkItems.length; i < iCount; i++) {
				if ("__MenuEdit_insertBefore_orig" in this) {
					this.__MenuEdit_insertBefore_orig (OpenWith.contextMenuLinkItems [i], next);
				} else {
					this.insertBefore (OpenWith.contextMenuLinkItems [i], next);
				}
			}
		}
	},

	popupHidden: function (event) {
		if (event.target != this) {
			return;
		}

		OpenWith.contextMenuLinkPlaceholder.hidden = false;

		var next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
		while (next && next.className.indexOf ('openwith') == 0) {
			if ("__MenuEdit_removeChild_orig" in this) {
				this.__MenuEdit_removeChild_orig (next);
			} else {
				this.removeChild (next);
			}
			next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
		}
	}
}

window.addEventListener ("load", OpenWith.onLoad, false);
