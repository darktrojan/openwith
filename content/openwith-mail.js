/* globals Components, Services, OpenWithCore, gContextMenu */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('chrome://openwith/content/openwith.jsm');

{
	let menupopup = document.getElementById('mailContext');
	if (menupopup) {
		let menuitem = document.createElement('menuitem');
		menuitem.setAttribute('id', 'openwith-contextmenulinkplaceholder');
		menupopup.appendChild(menuitem);

		let menu = document.createElement('menu');
		menu.setAttribute('id', 'openwith-contextlinksubmenu');
		menu.setAttribute('label', OpenWithCore.strings.formatStringFromName('openLinkWithLabel', [''], 1));

		let submenupopup = document.createElement('menupopup');
		submenupopup.setAttribute('id', 'openwith-contextlinksubmenupopup');
		menu.appendChild(submenupopup);
		menupopup.appendChild(menu);
	}
}

/* globals OpenWith */
this.OpenWith = {

	locations: [],

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

	destroy: function() {
		for (let id of ['openwith-contextmenulinkplaceholder', 'openwith-contextlinksubmenu']) {
			let element = document.getElementById(id);
			if (element) {
				element.remove();
			}
		}

		Services.obs.removeObserver(this, 'openWithListChanged');
		Services.obs.removeObserver(this, 'openWithLocationsChanged');

		window.OpenWith = null;
		window.OpenWithCore = null;
	},

	QueryInterface: OpenWithCore.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
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

OpenWith.init();
