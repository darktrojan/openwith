var OpenWith = {
	
	ID: "openwith@darktrojan.net",
	XULNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
	
	onLoad: function () {
		window.removeEventListener ("load", OpenWith.onLoad, false);
		window.addEventListener ("unload", OpenWith.onUnload, false);
		OpenWith.init ();
	},

	onUnload: function () {
		OpenWith.destroy ();
	},
	
	init: function () {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cu = Components.utils;

		this.consoleService = Cc ["@mozilla.org/consoleservice;1"].getService (Ci.nsIConsoleService);
		this.ioService = Cc ["@mozilla.org/network/io-service;1"].getService (Ci.nsIIOService);
		this.env = Cc ["@mozilla.org/process/environment;1"].getService (Ci.nsIEnvironment);
		this.prefService = Cc ["@mozilla.org/preferences-service;1"].getService (Ci.nsIPrefService);
		this.directoryService = Cc ["@mozilla.org/file/directory_service;1"].getService (Ci.nsIProperties);

		this.strings = document.getElementById ('openwith-strings');

		var appIsSeamonkey = Application.id == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

		this.viewMenuPlaceholder = document.getElementById ('openwith-viewmenuplaceholder');
		this.viewMenuSeparator = document.getElementById ('openwith-viewmenuseparator');
		var viewMenu = document.getElementById ('menu_viewPopup') ||
				document.getElementById ('menu_View_Popup'); // seamonkey
		viewMenu.addEventListener ('popupshowing', this.popupShowing, false);
		viewMenu.addEventListener ('popuphidden', this.popupHidden, false);
		
		this.contextMenuLinkPlaceholder = document.getElementById ('openwith-contextmenulinkplaceholder');
		this.contextMenuSeparator = document.getElementById ('openwith-contextmenuseparator');
		this.contextMenuPlaceholder = document.getElementById ('openwith-contextmenuplaceholder');

		var contextMenu = document.getElementById ('contentAreaContextMenu');
		contextMenu.addEventListener ('popupshowing', this.popupShowing, false);
		contextMenu.addEventListener ('popuphidden', this.popupHidden, false);
		
		var content = document.getElementById ('content');
		try {
			var tabMenu = document.getAnonymousElementByAttribute (content, 'anonid', 'tabContextMenu');
			var tabMenuItem = document.getElementById ('context_openTabInWindow') ||
					document.getElementById ('context_closeTab') || // Fx3.0
					tabMenu.lastChild; // seamonkey
				
			this.tabMenuSeparator = document.createElementNS (this.XULNS, 'menuseparator');
			this.tabMenuSeparator.id = 'openwith-tabmenuseparator';
			tabMenu.insertBefore (this.tabMenuSeparator, tabMenuItem.nextSibling);
				
			this.tabMenuPlaceholder = document.createElementNS (this.XULNS, 'menuitem');
			this.tabMenuPlaceholder.id = 'openwith-tabmenuplaceholder';
			this.tabMenuPlaceholder.setAttribute ('label', this.strings.getString ('openWithPlaceholderLabel'));
			tabMenu.insertBefore (this.tabMenuPlaceholder, this.tabMenuSeparator.nextSibling);
				
			tabMenu.addEventListener ('popupshowing', this.popupShowing, false);
			tabMenu.addEventListener ('popuphidden', this.popupHidden, false);
		} catch (e) {
			this.tabMenuPlaceholder = null;
			Cu.reportError (e);
			this.consoleService.logStringMessage ("OpenWith: tab menu items will be unavailable");
		}

		try {
			var tabs = document.getAnonymousElementByAttribute (content, 'anonid', 'tabcontainer');
			var tabsContainer = document.getAnonymousNodes (tabs).item (0).childNodes [1];
			if (appIsSeamonkey) {
				tabsContainer = tabsContainer.firstChild;
			}
			var before = tabsContainer.firstChild;
			while (before && before.localName != "arrowscrollbox" &&
					before.id != "tabs-right-space" && // tab mix plus
					(!appIsSeamonkey || before.localName != "hbox")) { // seamonkey
				before = before.nextSibling;
			}
			if (before) {
				before = before.nextSibling;
			}
			this.tabButtonContainer = document.createElementNS (this.XULNS, 'hbox');
			this.tabButtonContainer.id = 'openwith-tabbarbox';
			if (appIsSeamonkey) {
				this.tabButtonContainer.className = 'tabs-right';
			} else {
				this.tabButtonContainer.className = 'openwith-tabbarbox-firefox';
			}
			tabsContainer.insertBefore (this.tabButtonContainer, before);
		} catch (e) {
			this.tabButtonContainer = null;
			Cu.reportError (e);
			this.consoleService.logStringMessage ("OpenWith: tab bar buttons will be unavailable");
		}

		this.prefs = this.prefService.getBranch ("extensions.openwith.");
		this.prefs.QueryInterface (Ci.nsIPrefBranch2);

		var em = Cc ["@mozilla.org/extensions/manager;1"].getService (Ci.nsIExtensionManager);
		this.oldVersion = 0;
		this.currentVersion = em.getItemForID (this.ID).version;
		if (this.prefs.getPrefType ("version") == Ci.nsIPrefBranch.PREF_STRING) {
			this.oldVersion = this.prefs.getCharPref ("version");
		}
		this.prefs.setCharPref ("version", this.currentVersion);

		if (appIsSeamonkey && this.oldVersion == 0) {
			this.prefs.setCharPref ("hide", "seamonkey.exe");
		}

		if (Cc ["@mozilla.org/windows-registry-key;1"]) {
			try {
				this.registryKey = Cc ["@mozilla.org/windows-registry-key;1"]
					.createInstance (Ci.nsIWindowsRegKey);
				this.registryKey.open (this.registryKey.ROOT_KEY_LOCAL_MACHINE,
					"SOFTWARE\\Clients\\StartMenuInternet", Ci.nsIWindowsRegKey.ACCESS_READ);
			} catch (e) {
				Cu.reportError (e);
				this.registryKey = null;
			}
		}

		this.loadLists ();

		this.observerService = Cc ["@mozilla.org/observer-service;1"].getService (Ci.nsIObserverService);
		this.observerService.addObserver (this.observer, "sessionstore-windows-restored", false);
		this.prefs.addObserver ("", this.observer, false);
	},
	
	destroy: function () {
		this.prefs.removeObserver ("", this.observer);
		if (this.registryKey) {
			this.registryKey.close ();
		}
	},
	
	observer: {
		timer: null,
		observe: function (subject, topic, data) {
			switch (topic) {
				case "sessionstore-windows-restored":
					OpenWith.showNotifications ();
					break;
				case "nsPref:changed":
					switch (data) {
						case 'beep':
						case 'contextmenu':
						case 'contextmenulink':
						case 'hide':
						case 'tabbar':
						case 'tabmenu':
						case 'viewmenu':
							break;
						default:
							if (/^manual/.test (data))
								break;
							return;
					}
					if (this.timer == null) {
						this.timer = setTimeout (function () {
							OpenWith.observer.timer = null;
							OpenWith.loadLists ();
						}, 500);
					}
					break;
			}
		},
	},
	
	showNotifications: function () {
		const Ci = Components.interfaces;

		var notifyBox = gBrowser.getNotificationBox ();
		var label, value, buttons;
		if (this.emptyList) {
			label = OpenWith.strings.getString ("noBrowsersSetUp");
			value = "openwith-nobrowsers";
			buttons = [{
				label: OpenWith.strings.getString ("buttonLabel"),
				accessKey: OpenWith.strings.getString ("buttonAccessKey"),
				popup: null,
				callback: function (aNotificationBar, aButton) {
					var optionsURL = "chrome://openwith/content/options.xul";
					openDialog (optionsURL, "", "chrome,titlebar,toolbar,centerscreen");
				}
			}];
		} else {
			var locale = this.prefService.getCharPref ("general.useragent.locale");
			var donationReminder = 0;
			if (this.prefs.getPrefType ("donationreminder") == Ci.nsIPrefBranch.PREF_INT) {
				donationReminder = this.prefs.getIntPref ("donationreminder");
			}
			var date = new Date ();
			date.setMonth (date.getMonth () - 1);
			if (/^en/.test (locale) &&
					parseFloat (this.oldVersion) < parseFloat (this.currentVersion) &&
					donationReminder < date.valueOf () / 1000) {
				label = "Like OpenWith? Please consider making a donation to the project."
				value = "openwith-donate";
				buttons = [{
					label: "Donate",
					accessKey: "D",
					popup: null,
					callback: function (aNotificationBar, aButton) {
						var url = "https://addons.mozilla.org/addon/11097/about";
						gBrowser.selectedTab = gBrowser.addTab (url);
					}
				}];
				donationReminder = this.prefs.setIntPref ("donationreminder", Date.now ().valueOf () / 1000);
			} else {
				return;
			}
		}
		setTimeout (function () {
			notifyBox.appendNotification (label, value,
					"chrome://openwith/content/openwith16.png", notifyBox.PRIORITY_INFO_LOW, buttons);
		}, 0);
	},
	
	loadLists: function () {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cu = Components.utils;

		this.consoleService.logStringMessage ("OpenWith: reloading lists");

		var viewMenuPref = this.prefs.getBoolPref ("viewmenu");
		var contextMenuPref = this.prefs.getBoolPref ("contextmenu");
		var contextMenuLinkPref = this.prefs.getBoolPref ("contextmenulink");
		var tabMenuPref = this.prefs.getBoolPref ("tabmenu");
		var tabBarPref = this.prefs.getBoolPref ("tabbar");
		var hidePref = this.prefs.getCharPref ("hide").toLowerCase ();

		this.viewMenuItems = [];
		this.viewMenuPlaceholder.hidden = !viewMenuPref;

		this.contextMenuLinkItems = [];
		this.contextMenuLinkPlaceholder.hidden = !contextMenuPref;

		this.contextMenuItems = [];
		this.contextMenuPlaceholder.hidden = !contextMenuPref;

		this.tabMenuItems = [];
		if (this.tabMenuPlaceholder) {
			this.tabMenuPlaceholder.hidden = !tabMenuPref;
		}

		if (this.tabButtonContainer) {
			while (this.tabButtonContainer.lastChild) {
				this.tabButtonContainer.removeChild (this.tabButtonContainer.lastChild);
			}
		}

		var list = [];

		switch (navigator.platform) {
			case "Win32":
				if (!this.registryKey) break;
				for (var i = 0; i < this.registryKey.childCount; i++) {
					try {
						var name = this.registryKey.getChildName (i);
						if (hidePref.indexOf (name.toLowerCase ()) >= 0) {
							continue;
						}
						var subkey1 = this.registryKey.openChild (name, Ci.nsIWindowsRegKey.ACCESS_READ);
						var value = subkey1.readStringValue (null);
						subkey1.close ();
						var subkey2 = this.registryKey.openChild (name + '\\shell\\open\\command', Ci.nsIWindowsRegKey.ACCESS_READ);
						var command = subkey2.readStringValue (null);
						subkey2.close ();
						
						command = command.replace (/%(\w+)%/g, function (m) {
							return OpenWith.env.get (m.substring (1, m.length - 1));
						});
						
						list [value] = command;
					} catch (e) {
						Cu.reportError (e);
					}
				}
				break;
			case "MacIntel":
				var apps = ["Camino", "Google Chrome", "Opera", "Safari", "SeaMonkey"];
				var locAppDir = this.directoryService.get ("LocApp", Ci.nsIFile);
				for (var i = 0; i < apps.length; i++) {
					var appFile = locAppDir.clone ();
					appFile.append (apps [i] + ".app");
					if (appFile.exists ()) {
						list [apps [i]] = appFile.path;
					}
				}
				break;
			case "Linux i686":
				var bins = {"Google Chrome":"/opt/google/chrome/something", "Konqueror":"/usr/share/kde/kfmclient"};
				for (var i in bins) {
					var binFile = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
					binFile.initWithPath (bins [i]);
					if (binFile.exists ()) {
						list [i] = binFile.path;
					}
				}
				break;
		}

		var manual = this.prefs.getChildList ("manual.", {});
		manual.sort ();
		for (var i = 0; i < manual.length; i++) {
			var name = manual [i];
			if (/\.icon$/.test (name)) {
				continue;
			}
			var value = name.substring (7).replace ('_', ' ');
			var command = this.prefs.getCharPref (name);
			
			list [value] = command;
		}
		
		OpenWith.emptyList = true;
		for (var i in list) {
			OpenWith.emptyList = false;
			
			var command = list [i];
			var params, icon;
			var label = this.strings.getFormattedString ('openWithLabel', [i]);
			var linkLabel = this.strings.getFormattedString ('openLinkWithLabel', [i]);
			
			params = command.indexOf ('"') >= 0 ? command.replace (/^"[^"]+"\s*/, '').split (' ') : [];
			command = command.replace (/^"/, '').replace (/".*$/, '');

			for (var j = 0; j < params.length; j++) {
				if (params [j].length == 0) {
					params.splice (j, 1);
					j--;
				}
			}
			try {
				icon = this.prefs.getCharPref ("manual." + i.replace (' ', '_') + ".icon");
			} catch (e) {
				var file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
				try {
					file.initWithPath (command);
					icon = 'moz-icon:' + this.ioService.newFileURI (file).spec + '?size=menu';
				} catch (f) {
					Cu.reportError (e);
				}
			}
			this.consoleService.logStringMessage (i + ':\n\tCommand: ' +
				command + '\n\tParams: ' + params.join (' ') + '\n\tIcon URL: ' + icon);

			var menuItem1 = document.createElementNS (this.XULNS, 'menuitem');
			menuItem1.setAttribute ('class', 'openwith menuitem-iconic');
			menuItem1.setAttribute ('image', icon);
			menuItem1.setAttribute ('label', label);

			if (viewMenuPref) {
				menuItem1.id = 'openwith_' + i.replace (/[^\w]+/g, '-') + '_view';
				menuItem1.openWithCommand = command;
				menuItem1.openWithParams = params;
				menuItem1.addEventListener ('command', function (event) {
						var params = event.target.openWithParams;
						params.push (gBrowser.selectedBrowser.currentURI.spec);
						OpenWith.runApp (event.target.openWithCommand, params);
						params.pop ();
				}, false);
				this.viewMenuItems.push (menuItem1);
			}

			if (contextMenuPref) {
				var menuItem4 = menuItem1.cloneNode (false);
				menuItem4.id = 'openwith_' + i.replace (/[^\w]+/g, '-') + '_context';
				menuItem4.openWithCommand = command;
				menuItem4.openWithParams = params;
				menuItem4.addEventListener ('command', function (event) {
						var params = event.target.openWithParams;
						params.push (gBrowser.selectedBrowser.currentURI.spec);
						OpenWith.runApp (event.target.openWithCommand, params);
						params.pop ();
				}, false);
				this.contextMenuItems.push (menuItem4);
			}

			if (contextMenuLinkPref) {
				var menuItem2 = menuItem1.cloneNode (false);
				menuItem2.id = 'openwith_' + i.replace (/[^\w]+/g, '-') + '_contextlink';
				menuItem2.setAttribute ('label', linkLabel);
				menuItem2.openWithCommand = command;
				menuItem2.openWithParams = params;
				menuItem2.addEventListener ('command', function (event) {
						var params = event.target.openWithParams;
						if (typeof gContextMenu.linkURL == "function") { // seamonkey wtf?
							params.push (gContextMenu.linkURL ());
						} else {
							params.push (gContextMenu.linkURL);
						}
						OpenWith.runApp (event.target.openWithCommand, params);
						params.pop ();
				}, false);
				this.contextMenuLinkItems.push (menuItem2);
			}
			
			if (tabMenuPref && this.tabMenuPlaceholder) {
				var menuItem3 = menuItem1.cloneNode (false);
				menuItem3.id = 'openwith_' + i.replace (/[^\w]+/g, '-') + '_tab';
				menuItem3.openWithCommand = command;
				menuItem3.openWithParams = params;
				menuItem3.addEventListener ('command', function (event) {
						var params = event.target.openWithParams;
						params.push (gBrowser.mContextTab.linkedBrowser.currentURI.spec);
						OpenWith.runApp (event.target.openWithCommand, params);
						params.pop ();
				}, false);
				this.tabMenuItems.push (menuItem3);
			}

			if (tabBarPref && this.tabButtonContainer) {
				var toolbarButton = document.createElementNS (this.XULNS, 'toolbarbutton');
				toolbarButton.setAttribute ('tooltiptext', label);
				toolbarButton.setAttribute ('image', icon);
				toolbarButton.openWithCommand = command;
				toolbarButton.openWithParams = params;
				toolbarButton.addEventListener ('command', function (event) {
						var params = event.target.openWithParams;
						params.push (gBrowser.selectedBrowser.currentURI.spec);
						OpenWith.runApp (event.target.openWithCommand, params);
						params.pop ();
				}, false);
				this.tabButtonContainer.appendChild (toolbarButton);
			}
		}
	},

	popupShowing: function (event) {
		if (event.target != this) {
			return;
		}

		var viewMenuPref = OpenWith.prefs.getBoolPref ("viewmenu");
		var contextMenuPref = OpenWith.prefs.getBoolPref ("contextmenu");
		var contextMenuLinkPref = OpenWith.prefs.getBoolPref ("contextmenulink");
		var tabMenuPref = OpenWith.prefs.getBoolPref ("tabmenu");
		
		switch (this.id) {
			case "menu_viewPopup":
			case "menu_View_Popup":
				OpenWith.viewMenuPlaceholder.hidden = true;
				OpenWith.viewMenuSeparator.hidden = OpenWith.emptyList;
				
				if (viewMenuPref) {
					var next = OpenWith.viewMenuPlaceholder.nextSibling;
					for (var i = 0; i < OpenWith.viewMenuItems.length; i++) {
						if ("__MenuEdit_insertBefore_orig" in this) {
							this.__MenuEdit_insertBefore_orig (OpenWith.viewMenuItems [i], next);
						} else {
							this.insertBefore (OpenWith.viewMenuItems [i], next);
						}
					}
				}
				return;
			case "contentAreaContextMenu":
				OpenWith.contextMenuLinkPlaceholder.hidden = true;
				OpenWith.contextMenuPlaceholder.hidden = true;
				OpenWith.contextMenuSeparator.hidden = true;
				
				if (contextMenuLinkPref && gContextMenu.onLink && !gContextMenu.onMailtoLink) {
					var next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
					for (var i = 0; i < OpenWith.contextMenuLinkItems.length; i++) {
						if ("__MenuEdit_insertBefore_orig" in this) {
							this.__MenuEdit_insertBefore_orig (OpenWith.contextMenuLinkItems [i], next);
						} else {
							this.insertBefore (OpenWith.contextMenuLinkItems [i], next);
						}
					}
				} else if (contextMenuPref) {
					// from http://mxr.mozilla.org/mozilla-central/source/browser/base/content/nsContextMenu.js
					
					var shouldShow = !(gContextMenu.isContentSelected || gContextMenu.onLink ||
						gContextMenu.onImage || gContextMenu.onCanvas || gContextMenu.onVideo ||
						gContextMenu.onAudio || gContextMenu.onTextInput);

					if (shouldShow && !OpenWith.emptyList) {
						OpenWith.contextMenuSeparator.hidden = false;
						var next = OpenWith.contextMenuPlaceholder.nextSibling;
						for (var i = 0; i < OpenWith.contextMenuItems.length; i++) {
							if ("__MenuEdit_insertBefore_orig" in this) {
								this.__MenuEdit_insertBefore_orig (OpenWith.contextMenuItems [i], next);
							} else {
								this.insertBefore (OpenWith.contextMenuItems [i], next);
							}
						}
					}
				}
				return;
			default: // tab menu doesn't have an id
				if (OpenWith.tabMenuPlaceholder) {
					OpenWith.tabMenuPlaceholder.hidden = true;
					OpenWith.tabMenuSeparator.hidden = OpenWith.emptyList;
					
					if (tabMenuPref) {
						var next = OpenWith.tabMenuPlaceholder.nextSibling;
						for (var i = 0; i < OpenWith.tabMenuItems.length; i++) {
							if ("__MenuEdit_insertBefore_orig" in this) {
								this.__MenuEdit_insertBefore_orig (OpenWith.tabMenuItems [i], next);
							} else {
								this.insertBefore (OpenWith.tabMenuItems [i], next);
							}
						}
					}
				}
				return;
		}
	},

	popupHidden: function (event) {
		if (event.target != this) {
			return;
		}

		switch (this.id) {
			case "menu_viewPopup":
			case "menu_View_Popup":
				OpenWith.viewMenuPlaceholder.hidden = false;
				
				var next = OpenWith.viewMenuPlaceholder.nextSibling;
				while (next && next.className.indexOf ('openwith') == 0) {
					if ("__MenuEdit_removeChild_orig" in this) {
						this.__MenuEdit_removeChild_orig (next);
					} else {
						this.removeChild (next);
					}
					next = OpenWith.viewMenuPlaceholder.nextSibling;
				}
				return;
			case "contentAreaContextMenu":
				OpenWith.contextMenuLinkPlaceholder.hidden = false;
				OpenWith.contextMenuPlaceholder.hidden = false;

				var next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
				while (next && next.className.indexOf ('openwith') == 0) {
					if ("__MenuEdit_removeChild_orig" in this) {
						this.__MenuEdit_removeChild_orig (next);
					} else {
						this.removeChild (next);
					}
					next = OpenWith.contextMenuLinkPlaceholder.nextSibling;
				}

				next = OpenWith.contextMenuPlaceholder.nextSibling;
				while (next && next.className.indexOf ('openwith') == 0) {
					if ("__MenuEdit_removeChild_orig" in this) {
						this.__MenuEdit_removeChild_orig (next);
					} else {
						this.removeChild (next);
					}
					next = OpenWith.contextMenuPlaceholder.nextSibling;
				}
				return;
			default: // tab menu doesn't have an id
				if (OpenWith.tabMenuPlaceholder) {
					OpenWith.tabMenuPlaceholder.hidden = false;

					var next = OpenWith.tabMenuPlaceholder.nextSibling;
					while (next && next.className.indexOf ('openwith') == 0) {
						if ("__MenuEdit_removeChild_orig" in this) {
							this.__MenuEdit_removeChild_orig (next);
						} else {
							this.removeChild (next);
						}
						next = OpenWith.tabMenuPlaceholder.nextSibling;
					}
				}
				return;
		}
	},

	runApp: function (filename, parameters) {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cu = Components.utils;

		try {
			var file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
			file.initWithPath (filename);
			if (!file.exists ()) {
				throw "File not found";
			}
			var fileToRun;
			if (/\.app$/.test (file.path)) {
				fileToRun = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
				fileToRun.initWithPath ("/usr/bin/open");
                var oldParameters = parameters;
				parameters = ["-a", file.path];
                for (var i = 0; i < oldParameters.length; i++) {
                    parameters.push (oldParameters [i]);
                }
			} else {
				fileToRun = file;
			}

			this.consoleService.logStringMessage ('OpenWith: opening\n\tCommand: ' + fileToRun.path + '\n\tParams: ' + parameters.join (' '));
			var nsIProcess = Cc ["@mozilla.org/process/util;1"].createInstance (Ci.nsIProcess);
			nsIProcess.init (fileToRun);
			nsIProcess.run (false, parameters, parameters.length);
		} catch (e) {
			Cu.reportError (e);
		}
	}
}

window.addEventListener ("load", OpenWith.onLoad, false);
