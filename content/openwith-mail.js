/* globals gContextMenu, OpenWithCore */
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

var OpenWith = {
	locations: [],

	onLoad: function() {
		window.OpenWithCore = ChromeUtils.import('resource://openwith/openwith.jsm').OpenWithCore;
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		let contextMenu = document.getElementById('mailContext');
		contextMenu.addEventListener('popupshowing', this.popupShowing, false);
		contextMenu.addEventListener('popuphidden', this.popupHidden, false);

		let separator = document.getElementById('mailContext-sep-open-browser') || document.getElementById('mailContext-sep-link');

		/** context menu (links) **/
		this.contextMenuLinkPlaceholder = document.getElementById('openwith-contextmenulinkplaceholder');
		this.contextMenuLinkItems = [];
		this.locations.push({
			prefName: 'contextmenulink',
			targetType: OpenWithCore.TARGET_LINK,
			container: this.contextMenuLinkItems
		});
		contextMenu.insertBefore(this.contextMenuLinkPlaceholder, separator);

		/** context menu (links) submenu **/
		this.contextLinkSubmenu = document.getElementById('openwith-contextlinksubmenu');
		this.contextLinkSubmenuPopup = document.getElementById('openwith-contextlinksubmenupopup');
		this.locations.push({
			prefName: 'contextmenulink.submenu',
			targetType: OpenWithCore.TARGET_LINK,
			container: this.contextLinkSubmenuPopup
		});
		contextMenu.insertBefore(this.contextLinkSubmenu, separator);

		OpenWithCore.loadList(false);
		OpenWith.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', true);
		Services.obs.addObserver(this, 'openWithLocationsChanged', true);
	},

	QueryInterface: ChromeUtils.generateQI([
		Ci.nsIObserver,
		Ci.nsISupportsWeakReference,
		Ci.nsISupports
	]),

	observe: function() {
		OpenWith.loadLists();
	},

	loadLists: function() {
		this.emptyList = OpenWithCore.list.length === 0;
		OpenWithCore.refreshUI(document, this.locations, {});
	},

	popupShowing: function(event) {
		if (event.target != this) {
			return;
		}
		let contextMenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink');
		let contextSubmenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink.submenu');

		OpenWith.contextMenuLinkPlaceholder.hidden = true;
		OpenWith.contextLinkSubmenu.hidden = !contextSubmenuLinkPref ||
					OpenWith.emptyList || !gContextMenu.onLink || gContextMenu.onMailtoLink;

		if (contextMenuLinkPref && gContextMenu.onLink && !gContextMenu.onMailtoLink) {
			let next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
			for (let item of OpenWith.contextMenuLinkItems) {
				if ('__MenuEdit_insertBefore_orig' in this) {
					this.__MenuEdit_insertBefore_orig(item, next);
				} else {
					this.insertBefore(item, next);
				}
			}
		}
	},

	popupHidden: function(event) {
		if (event.target != this) {
			return;
		}

		OpenWith.contextMenuLinkPlaceholder.hidden = false;

		let next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
		while (next && next.classList.contains('openwith')) {
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
