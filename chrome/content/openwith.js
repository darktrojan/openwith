Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

let OpenWith = {

	locations: [],

	onLoad: function() {
		window.removeEventListener('load', OpenWith.onLoad, false);
		OpenWith.init();
	},

	init: function() {
		Components.utils.import('resource://openwith/openwith.jsm');

		let appname = Services.appinfo.name;
		let appversion = parseFloat(Services.appinfo.version);

		let content = document.getElementById('content');

		/** view menu **/
		this.viewMenuPlaceholder = document.getElementById('openwith-viewmenuplaceholder');
		this.viewMenuSeparator = document.getElementById('openwith-viewmenuseparator');
		let viewMenu = document.getElementById('menu_viewPopup') ||
				document.getElementById('menu_View_Popup'); // seamonkey
		viewMenu.addEventListener('popupshowing', this.popupShowing, false);
		viewMenu.addEventListener('popuphidden', this.popupHidden, false);
		this.viewMenuItems = [];
		this.locations.push({
			prefName: 'viewmenu',
			empty: function() { this.container.splice(0, this.container.length); },
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_STANDARD,
			suffix: '_viewmenu',
			container: this.viewMenuItems,
			submenu: false
		});

		/** view menu submenu **/
		this.viewSubmenu = document.getElementById('openwith-viewsubmenu');
		this.viewSubmenuPopup = document.getElementById('openwith-viewsubmenupopup');
		this.locations.push({
			prefName: 'viewmenu.submenu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_STANDARD,
			suffix: '_viewsubmenu',
			container: this.viewSubmenuPopup,
			submenu: true
		});

		/** context menu **/
		this.contextMenuSeparator = document.getElementById('openwith-contextmenuseparator');
		this.contextMenuPlaceholder = document.getElementById('openwith-contextmenuplaceholder');

		let contextMenu = document.getElementById('contentAreaContextMenu');
		contextMenu.addEventListener('popupshowing', this.popupShowing, false);
		contextMenu.addEventListener('popuphidden', this.popupHidden, false);

		this.contextMenuItems = [];
		this.locations.push({
			prefName: 'contextmenu',
			empty: function() { this.container.splice(0, this.container.length); },
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_STANDARD,
			suffix: '_contextmenu',
			container: this.contextMenuItems,
			submenu: false
		});

		/** context menu submenu **/
		this.contextSubmenu = document.getElementById('openwith-contextsubmenu');
		this.contextSubmenuPopup = document.getElementById('openwith-contextsubmenupopup');
		this.locations.push({
			prefName: 'contextmenu.submenu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_STANDARD,
			suffix: '_contextmenusubmenu',
			container: this.contextSubmenuPopup,
			submenu: true
		});

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

		/** places context menu **/
		this.placesContextPlaceholder = document.getElementById('openwith-placescontextlinkplaceholder');

		let placesContext = document.getElementById('placesContext');
		placesContext.addEventListener('popupshowing', this.popupShowing, false);
		placesContext.addEventListener('popuphidden', this.popupHidden, false);

		this.placesContextItems = [];
		this.locations.push({
			prefName: 'placescontext',
			empty: function() { this.container.splice(0, this.container.length); },
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_PLACES,
			suffix: '_placescontext',
			container: this.placesContextItems,
			submenu: false
		});

		/** places context menu submenu **/
		this.placesContextSubmenu = document.getElementById('openwith-placescontextsubmenu');
		this.placesContextSubmenuPopup = document.getElementById('openwith-placescontextsubmenupopup');
		this.locations.push({
			prefName: 'placescontext.submenu',
			empty: function() {
				while (this.container.lastChild)
					this.container.removeChild(this.container.lastChild);
			},
			factory: OpenWithCore.createMenuItem,
			targetType: OpenWithCore.TARGET_PLACES,
			suffix: '_placescontextsubmenu',
			container: this.placesContextSubmenuPopup,
			submenu: true
		});

		/** tab menu **/
		try {
			let tabMenuItem, tabMenu;
			if (appname == 'SeaMonkey') {
				tabMenu = document.getAnonymousElementByAttribute(content, 'anonid', 'tabContextMenu');
				tabMenuItem = tabMenu.lastChild;
			} else {
				tabMenuItem = document.getElementById('context_openTabInWindow') ||
						document.getElementById('context_closeTab');
				tabMenu = tabMenuItem.parentNode;
			}

			this.tabMenuSeparator = document.createElement('menuseparator');
			this.tabMenuSeparator.id = 'openwith-tabmenuseparator';
			tabMenu.insertBefore(this.tabMenuSeparator, tabMenuItem.nextSibling);

			this.tabMenuPlaceholder = document.createElement('menuitem');
			this.tabMenuPlaceholder.id = 'openwith-tabmenuplaceholder';
			this.tabMenuPlaceholder.setAttribute('label',
				OpenWithCore.strings.GetStringFromName('openWithPlaceholderLabel'));
			tabMenu.insertBefore(this.tabMenuPlaceholder, this.tabMenuSeparator.nextSibling);

			this.tabSubmenu = document.createElement('menu');
			this.tabSubmenu.setAttribute('label',
				document.getElementById('openwith-viewsubmenu').getAttribute('label'));
			this.tabSubmenuPopup = document.createElement('menupopup');
			this.tabSubmenu.appendChild(this.tabSubmenuPopup);
			tabMenu.insertBefore(this.tabSubmenu, this.tabMenuPlaceholder.nextSibling);

			tabMenu.addEventListener('popupshowing', this.popupShowing, false);
			tabMenu.addEventListener('popuphidden', this.popupHidden, false);

			this.tabMenuItems = [];
			this.locations.push({
				prefName: 'tabmenu',
				empty: function() { this.container.splice(0, this.container.length); },
				factory: OpenWithCore.createMenuItem,
				targetType: OpenWithCore.TARGET_TAB,
				suffix: '_tabmenu',
				container: this.tabMenuItems,
				submenu: false
			});

			/** tab menu submenu **/
			this.locations.push({
				prefName: 'tabmenu.submenu',
				empty: function() {
					while (this.container.lastChild)
						this.container.removeChild(this.container.lastChild);
				},
				factory: OpenWithCore.createMenuItem,
				targetType: OpenWithCore.TARGET_TAB,
				suffix: '_tabsubmenu',
				container: this.tabSubmenuPopup,
				submenu: true
			});
		} catch (e) {
			this.tabMenuPlaceholder = null;
			Components.utils.reportError(e);
			Services.console.logStringMessage('OpenWith: tab menu items will be unavailable');
		}

		/** tab bar **/
		if (appname != 'Firefox' || appversion < 4) {
			try {
				this.tabButtonContainer = document.createElement('toolbaritem');
				this.tabButtonContainer.id = 'openwith-tabbarbox';
				if (appname == 'SeaMonkey') {
					this.tabButtonContainer.className = 'openwith-tabbarbox-seamonkey tabs-right';
				} else {
					this.tabButtonContainer.className = 'openwith-tabbarbox-firefox';
				}
				this.tabButtonContainer.setAttribute('align', 'center');
				this.tabButtonContainer.setAttribute('context', '');

				let parent, before;
				parent = document.getAnonymousElementByAttribute(content, 'anonid', 'tabcontainer');
				parent = document.getAnonymousNodes(parent).item(0).childNodes[1];
				if (appname == 'SeaMonkey') {
					parent = parent.firstChild;
				}
				before = parent.firstChild;
				while (before && before.localName != 'arrowscrollbox' &&
						before.id != 'tabs-right-space' && // tab mix plus
						(appname != 'SeaMonkey' || before.localName != 'hbox')) { // seamonkey
					before = before.nextSibling;
				}
				if (before) {
					before = before.nextSibling;
				}
				parent.insertBefore(this.tabButtonContainer, before);

				let toolbarButton = document.createElement('toolbarbutton');
				toolbarButton.setAttribute('type', 'menu');
				toolbarButton.setAttribute('image', 'chrome://openwith/content/openwith16.png');
				toolbarButton.setAttribute('tooltiptext',
					OpenWithCore.strings.GetStringFromName('openWithDropDownTooltip'));
				this.tabButtonContainer.appendChild(toolbarButton);

				this.tabBarMenu = document.createElement('menupopup');
				toolbarButton.appendChild(this.tabBarMenu);

				this.locations.push({
					prefName: 'tabbar',
					empty: function() {
						while (this.container.childNodes.length > 1)
							this.container.removeChild(this.container.lastChild);
					},
					factory: OpenWithCore.createToolbarButton,
					targetType: OpenWithCore.TARGET_STANDARD,
					suffix: '_tabbar',
					container: this.tabButtonContainer,
					submenu: false
				});

				/** tab bar menu **/
				this.locations.push({
					prefName: 'tabbar.menu',
					empty: function() {
						while (this.container.lastChild)
							this.container.removeChild(this.container.lastChild);
					},
					factory: OpenWithCore.createMenuItem,
					targetType: OpenWithCore.TARGET_STANDARD,
					suffix: '_tabbarmenu',
					container: this.tabBarMenu,
					submenu: false
				});
			} catch (e) {
				this.tabButtonContainer = null;
				Components.utils.reportError(e);
				Services.console.logStringMessage('OpenWith: tab bar buttons will be unavailable');
			}
		}

		/** tool bar **/
		this.toolbarButtonContainer = null;
		try {
			this.toolbarButtonContainer = document.getElementById('openwith-toolbarbox');
			if (!this.toolbarButtonContainer) {
				let palette = document.getElementById('navigator-toolbox').palette;
				for (let i = palette.childElementCount - 1; i >= 0; i--) {
					if (palette.children[i].id == 'openwith-toolbarbox') {
						this.toolbarButtonContainer = palette.children[i];
						break;
					}
				}
			}
			if (this.toolbarButtonContainer) {
				this.locations.push({
					prefName: 'toolbar',
					empty: function() {
						while (this.container.childNodes.length > 1)
							this.container.removeChild(this.container.lastChild);
					},
					factory: OpenWithCore.createToolbarButton,
					targetType: OpenWithCore.TARGET_STANDARD,
					suffix: '_toolbar',
					container: this.toolbarButtonContainer,
					submenu: false
				});

				/** tool bar menu **/
				this.toolbarMenu = this.toolbarButtonContainer.getElementsByTagName('menupopup').item(0);
				this.locations.push({
					prefName: 'toolbar.menu',
					empty: function() {
						while (this.container.lastChild)
							this.container.removeChild(this.container.lastChild);
					},
					factory: OpenWithCore.createMenuItem,
					targetType: OpenWithCore.TARGET_STANDARD,
					suffix: '_toolbarmenu',
					container: this.toolbarMenu,
					submenu: false
				});
			}
		} catch (e) {
			this.tabButtonContainer = null;
			Components.utils.reportError(e);
			Services.console.logStringMessage('OpenWith: toolbar buttons will be unavailable');
		}

		if ('CustomizableUI' in window) {
			let label = OpenWithCore.strings.GetStringFromName('openWithDropDownTooltip');
			CustomizableUI.createWidget({
				id: 'openwith-widget',
				label: label,
				tooltiptext: label,
				type: 'view',
				viewId: 'PanelUI-openwith',
				removable: true,
				defaultArea: CustomizableUI.AREA_PANEL,
				onCreated: function() {},
				onViewShowing: function() {},
				onViewHiding: function() {}
			});

			this.locations.push({
				empty: function() {
					while (this.container.lastChild)
						this.container.removeChild(this.container.lastChild);
				},
				factory: OpenWithCore.createToolbarButton,
				targetType: OpenWithCore.TARGET_PANEL_UI,
				suffix: '_widget',
				container: document.getElementById('PanelUI-openwith'),
				submenu: false
			});
		}

		OpenWithCore.loadList(false);
		OpenWith.loadLists();

		Services.obs.addObserver(this, 'openWithListChanged', true);
		Services.obs.addObserver(this, 'openWithLocationsChanged', true);
	},

	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
	]),

	observe: function(subject, topic, data) {
		switch (topic) {
		case 'openWithListChanged':
		case 'openWithLocationsChanged':
			OpenWith.loadLists();
			break;
		}
	},

	loadLists: function() {
		for (let j = 0, jCount = this.locations.length; j < jCount; j++) {
			this.locations[j].empty();
		}

		if (this.tabBarMenu) {
			if (!OpenWithCore.prefs.getBoolPref('tabbar.menu')) {
				this.tabBarMenu.parentNode.setAttribute('hidden', 'true');
			} else {
				this.tabBarMenu.parentNode.removeAttribute('hidden');
			}
		}

		if (this.toolbarMenu) {
			if (!OpenWithCore.prefs.getBoolPref('toolbar.menu')) {
				this.toolbarMenu.parentNode.setAttribute('hidden', 'true');
			} else {
				this.toolbarMenu.parentNode.removeAttribute('hidden');
			}
		}

		this.emptyList = OpenWithCore.list.length == 0;
		OpenWithCore.refreshUI(document, this.locations);
	},

	popupShowing: function(event) {
		if (event.target != this) {
			return;
		}

		switch (this.id) {
			case 'menu_viewPopup':
			case 'menu_View_Popup':
			case 'placesContext':
				let pref, submenuPref, placeholder, submenu, items;
				if (this.id == 'placesContext') {
					if ((document.popupNode.localName == 'menuitem' ||
							(document.popupNode.localName == 'toolbarbutton' && document.popupNode.getAttribute('type') != 'menu'))
							&& document.popupNode.classList.contains('bookmark-item')) {
						pref = OpenWithCore.prefs.getBoolPref('placescontext');
						submenuPref = OpenWithCore.prefs.getBoolPref('placescontext.submenu');
					}
					placeholder = OpenWith.placesContextPlaceholder;
					submenu = OpenWith.placesContextSubmenu;
					items = OpenWith.placesContextItems;
				} else {
					pref = OpenWithCore.prefs.getBoolPref('viewmenu');
					submenuPref = OpenWithCore.prefs.getBoolPref('viewmenu.submenu');
					OpenWith.viewMenuSeparator.hidden = (!pref && !submenuPref) || OpenWith.emptyList;
					placeholder = OpenWith.viewMenuPlaceholder;
					submenu = OpenWith.viewSubmenu;
					items = OpenWith.viewMenuItems;
				}

				placeholder.hidden = true;
				submenu.hidden = !submenuPref || OpenWith.emptyList;

				if (pref) {
					let next = placeholder.nextSibling;
					for (let i = 0, iCount = items.length; i < iCount; i++) {
						if ('__MenuEdit_insertBefore_orig' in this) {
							this.__MenuEdit_insertBefore_orig(items[i], next);
						} else {
							this.insertBefore(items[i], next);
						}
					}
				}
				return;
			case 'contentAreaContextMenu':
				let contextMenuPref = OpenWithCore.prefs.getBoolPref('contextmenu');
				let contextSubmenuPref = OpenWithCore.prefs.getBoolPref('contextmenu.submenu');
				let contextMenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink');
				let contextSubmenuLinkPref = OpenWithCore.prefs.getBoolPref('contextmenulink.submenu');

				// from http://mxr.mozilla.org/mozilla-central/source/browser/base/content/nsContextMenu.js
				let shouldShow = !(gContextMenu.isContentSelected || gContextMenu.onLink ||
					gContextMenu.onImage || gContextMenu.onCanvas || gContextMenu.onVideo ||
					gContextMenu.onAudio || gContextMenu.onTextInput);

				OpenWith.contextMenuLinkPlaceholder.hidden = true;
				OpenWith.contextMenuPlaceholder.hidden = true;

				OpenWith.contextMenuSeparator.hidden = (!contextMenuPref && !contextSubmenuPref) ||
							OpenWith.emptyList || !shouldShow;
				OpenWith.contextSubmenu.hidden = !contextSubmenuPref ||
							OpenWith.emptyList || !shouldShow;
				OpenWith.contextLinkSubmenu.hidden = !contextSubmenuLinkPref ||
							OpenWith.emptyList || !gContextMenu.onLink || gContextMenu.onMailtoLink;

				if (contextMenuLinkPref && gContextMenu.onLink && !gContextMenu.onMailtoLink) {
					let next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
					for (let i = 0, iCount = OpenWith.contextMenuLinkItems.length; i < iCount; i++) {
						if ('__MenuEdit_insertBefore_orig' in this) {
							this.__MenuEdit_insertBefore_orig(OpenWith.contextMenuLinkItems[i], next);
						} else {
							this.insertBefore(OpenWith.contextMenuLinkItems[i], next);
						}
					}
				}

				if (contextMenuPref && shouldShow) {
					let next = OpenWith.contextMenuPlaceholder.nextSibling;
					for (let i = 0, iCount = OpenWith.contextMenuItems.length; i < iCount; i++) {
						if ('__MenuEdit_insertBefore_orig' in this) {
							this.__MenuEdit_insertBefore_orig(OpenWith.contextMenuItems[i], next);
						} else {
							this.insertBefore(OpenWith.contextMenuItems[i], next);
						}
					}
				}
				return;
			default: // tab menu doesn't have an id
				if (OpenWith.tabMenuPlaceholder) {
					let tabMenuPref = OpenWithCore.prefs.getBoolPref('tabmenu');
					let tabSubmenuPref = OpenWithCore.prefs.getBoolPref('tabmenu.submenu');

					OpenWith.tabMenuPlaceholder.hidden = true;
					OpenWith.tabMenuSeparator.hidden = true;
					OpenWith.tabSubmenu.hidden = true;

					if (document.popupNode.localName != 'tab') {
						return;
					}

					OpenWith.tabMenuSeparator.hidden = (!tabMenuPref && !tabSubmenuPref) || OpenWith.emptyList;
					OpenWith.tabSubmenu.hidden = !tabSubmenuPref || OpenWith.emptyList;

					if (tabMenuPref) {
						let next = OpenWith.tabMenuPlaceholder.nextSibling;
						for (let i = 0, iCount = OpenWith.tabMenuItems.length; i < iCount; i++) {
							if ('__MenuEdit_insertBefore_orig' in this) {
								this.__MenuEdit_insertBefore_orig(OpenWith.tabMenuItems[i], next);
							} else {
								this.insertBefore(OpenWith.tabMenuItems[i], next);
							}
						}
					}
				}
				return;
		}
	},

	popupHidden: function(event) {
		if (event.target != this) {
			return;
		}

		switch (this.id) {
		case 'menu_viewPopup':
		case 'menu_View_Popup':
		case 'placesContext': {
				let placeholder;
				if (this.id == 'placesContext') {
					placeholder = OpenWith.placesContextPlaceholder;
				} else {
					placeholder = OpenWith.viewMenuPlaceholder;
				}

				placeholder.hidden = false;

				let next = placeholder.nextSibling;
				while (next && next.className.indexOf('openwith') == 0) {
					if ('__MenuEdit_removeChild_orig' in this) {
						this.__MenuEdit_removeChild_orig(next);
					} else {
						this.removeChild(next);
					}
					next = placeholder.nextSibling;
				}
				return;
			}
		case 'contentAreaContextMenu': {
				OpenWith.contextMenuLinkPlaceholder.hidden = false;
				OpenWith.contextMenuPlaceholder.hidden = false;

				let next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
				while (next && next.className.indexOf('openwith') == 0) {
					if ('__MenuEdit_removeChild_orig' in this) {
						this.__MenuEdit_removeChild_orig(next);
					} else {
						this.removeChild(next);
					}
					next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
				}

				next = OpenWith.contextMenuPlaceholder.nextSibling;
				while (next && next.className.indexOf('openwith') == 0) {
					if ('__MenuEdit_removeChild_orig' in this) {
						this.__MenuEdit_removeChild_orig(next);
					} else {
						this.removeChild(next);
					}
					next = OpenWith.contextMenuPlaceholder.nextSibling;
				}
				return;
			}
		default: { // tab menu doesn't have an id
				if (OpenWith.tabMenuPlaceholder) {
					OpenWith.tabMenuPlaceholder.hidden = false;

					let next = OpenWith.tabMenuPlaceholder.nextSibling;
					while (next && next.className.indexOf('openwith') == 0) {
						if ('__MenuEdit_removeChild_orig' in this) {
							this.__MenuEdit_removeChild_orig(next);
						} else {
							this.removeChild(next);
						}
						next = OpenWith.tabMenuPlaceholder.nextSibling;
					}
				}
				return;
			}
		}
	}
};

window.addEventListener('load', OpenWith.onLoad, false);
