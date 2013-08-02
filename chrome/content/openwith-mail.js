var OpenWith = {

	locations: [],

	onLoad: function() {
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cu = Components.utils;

		Cu.import('resource://openwith/openwith.jsm');
		Cu.import('resource://gre/modules/Services.jsm');

		var contextMenu = document.getElementById('mailContext');
		contextMenu.addEventListener('popupshowing', this.popupShowing, false);
		contextMenu.addEventListener('popuphidden', this.popupHidden, false);

		var separator = document.getElementById('mailContext-sep-open-browser') || document.getElementById('mailContext-sep-link');

		/** context menu (links) **/
		this.contextMenuLinkPlaceholder = document.getElementById('openwith-contextmenulinkplaceholder');
		this.contextMenuLinkItems = [];
		this.locations.push({
			prefName: 'contextmenulink',
			empty: function() { this.container.splice(0, this.container.length); },
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_LINK,
			suffix: '_contextmenulink',
			container: this.contextMenuLinkItems,
			submenu: false
		});
		contextMenu.insertBefore(this.contextMenuLinkPlaceholder, separator);

		/** context menu (links) submenu **/
		this.contextLinkSubmenu = document.getElementById('openwith-contextlinksubmenu');
		this.contextLinkSubmenuPopup = document.getElementById('openwith-contextlinksubmenupopup');
		this.locations.push({
			prefName: 'contextmenulink.submenu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_LINK,
			suffix: '_contextmenulinksubmenu',
			container: this.contextLinkSubmenuPopup,
			submenu: true
		});
		contextMenu.insertBefore(this.contextLinkSubmenu, separator);

		OpenWithCore.loadList(false);
		OpenWith.loadLists();

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
		OpenWith.loadLists();
	},

	loadLists: function() {
		this.emptyList = OpenWithCore.list.length == 0;
		OpenWithCore.refreshUI(document, this.locations);
	},

	popupShowing: function(event) {
		if (event.target != this) {
			return;
		}
		var contextMenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink');
		var contextSubmenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink.submenu');

		OpenWith.contextMenuLinkPlaceholder.hidden = true;
		OpenWith.contextLinkSubmenu.hidden = !contextSubmenuLinkPref ||
					OpenWith.emptyList || !gContextMenu.onLink || gContextMenu.onMailtoLink;

		var somethingWasInserted;
		if (gContextMenu.onLink && !gContextMenu.onMailtoLink) {
			if (contextMenuLinkPref) {
				somethingWasInserted = OpenWithCore.matchUtils.insertMatched(
						this,
						OpenWith.contextMenuLinkItems,
						OpenWith.contextMenuLinkPlaceholder,
						new String(gContextMenu.linkURI.spec)
				);
			}
			if (contextSubmenuLinkPref) {
				let somethingLeftVisible = OpenWithCore.matchUtils.hideMismatched(
						OpenWith.contextLinkSubmenu.menupopup.childNodes,
						new String(gContextMenu.linkURI.spec)
				);
				OpenWith.contextLinkSubmenu.hidden =
						OpenWith.contextLinkSubmenu.hidden || !somethingLeftVisible;
			}
		}
		// Hide separator if necessary
		let (
			inTabHidden = document.getElementById('context-openlinkintab').hidden,
			inWindowHidden = document.getElementById('context-openlink').hidden,
			submenuHidden = OpenWith.contextLinkSubmenu.hidden
		) {
			document.getElementById('mailContext-sep-link').hidden =
					inTabHidden && inWindowHidden && submenuHidden && !somethingWasInserted;
		}
	},

	popupHidden: function(event) {
		if (event.target != this) {
			return;
		}

		OpenWith.contextMenuLinkPlaceholder.hidden = false;

		var next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
		while (next && next.className.indexOf('openwith') == 0) {
			if ('__MenuEdit_removeChild_orig' in this) {
				this.__MenuEdit_removeChild_orig(next);
			} else {
				this.removeChild(next);
			}
			next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
		}
	}
};

window.addEventListener('load', OpenWith.onLoad, false);
