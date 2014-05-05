let EXPORTED_SYMBOLS = ['OpenWithCore'];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const ID = 'openwith@darktrojan.net';

const REAL_OPTIONS_URL = 'about:openwith';
const BROWSER_TYPE = 'navigator:browser';
const MAIL_TYPE = 'mail:3pane';

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

const WINDOWS = '@mozilla.org/windows-registry-key;1' in Cc;
const OS_X = !WINDOWS && 'nsILocalFileMac' in Ci;

let registryKey, env, locAppDir;
let currentVersion = 0;
let oldVersion = 0;

let OpenWithCore = {

	TARGET_STANDARD: 1,
	TARGET_LINK: 2,
	TARGET_TAB: 3,
	TARGET_DEVTOOLS: 4,
	TARGET_PANEL_UI: 5,

	list: [],
	suppressLoadList: false,
	loadList: function(forceReload) {
		if (this.list.length && !forceReload) {
			return;
		}

		this.list = [];
		if (WINDOWS) {
			if (!registryKey) {
				registryKey = Cc['@mozilla.org/windows-registry-key;1'].createInstance(Ci.nsIWindowsRegKey);
				registryKey.open(Ci.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE,
						'SOFTWARE\\Clients\\StartMenuInternet', Ci.nsIWindowsRegKey.ACCESS_READ);
				env = Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);
			}

			let hidePref = this.prefs.getCharPref('hide').toLowerCase();
			for (let i = 0, iCount = registryKey.childCount; i < iCount; i++) {
				try {
					let name = registryKey.getChildName(i);
					let subkey1 = registryKey.openChild(name, Ci.nsIWindowsRegKey.ACCESS_READ);
					let value = subkey1.readStringValue(null);
					subkey1.close();
					let subkey2 = registryKey.openChild(name + '\\shell\\open\\command', Ci.nsIWindowsRegKey.ACCESS_READ);
					let command = subkey2.readStringValue(null);
					subkey2.close();

					let params = command.indexOf('"') >= 0 ? command.replace(/^"[^"]+"\s*/, '').split(' ') : [];
					if (params.length > 0 && params[0] == '') {
						params.shift();
					}
					command = command.replace(/^"/, '').replace(/".*$/, '');
					command = command.replace(/%(\w+)%/g, function(m) {
						return env.get(m.substring(1, m.length - 1));
					});

					let file = new FileUtils.File(command);

					this.list.push({
						auto: true,
						keyName: name,
						name: value,
						command: command,
						params: params,
						icon: this.findIconURL(file, 16),
						hidden: new RegExp('\\b' + name + '\\b', 'i').test(hidePref)
					});
				} catch (e) {
					Cu.reportError(e);
				}
			}
		} else if (OS_X) {
			if (!locAppDir) {
				locAppDir = Services.dirsvc.get('LocApp', Ci.nsIFile);
			}

			let hidePref = this.prefs.getCharPref('hide').toLowerCase();
			let apps = ['Camino', 'Google Chrome', 'Firefox', 'Flock', 'Opera', 'Safari', 'SeaMonkey'];
			for (let i = 0, iCount = apps.length; i < iCount; i++) {
				let name = apps[i];
				let appFile = locAppDir.clone();
				appFile.append(name + '.app');
				if (appFile.exists()) {
					this.list.push({
						auto: true,
						keyName: name,
						name: name,
						command: appFile.path,
						params: [],
						icon: this.findIconURL(appFile, 16),
						hidden: new RegExp('\\b' + name + '\\b', 'i').test(hidePref)
					});
				}
			}
		}

		let manual = this.prefs.getChildList('manual.', {});
		manual.sort();
		for (let i = 0, iCount = manual.length; i < iCount; i++) {
			let name = manual[i];
			if (/\.(icon|name|usefilepath)$/.test(name)) {
				continue;
			}
			let value;
			if (this.prefs.getPrefType(name + '.name') == Ci.nsIPrefBranch.PREF_STRING) {
				value = this.prefs.getCharPref(name + '.name');
			} else {
				value = name.substring(7).replace(/_/g, ' ');
			}
			let command = this.prefs.getCharPref(name);
			let params = command.indexOf('"') >= 0 ? command.replace(/^"[^"]+"\s*/, '').split(' ') : [];
			if (params.length > 0 && params[0] == '') {
				params.shift();
			}
			command = command.replace(/^"/, '').replace(/".*$/, '');
			let icon;
			if (this.prefs.getPrefType(name + '.icon') == Ci.nsIPrefBranch.PREF_STRING) {
				 icon = this.prefs.getCharPref(name + '.icon');
			} else {
				let file = new FileUtils.File(command);
				icon = this.findIconURL(file, 16);
			}

			this.list.push({
				auto: false,
				keyName: name.substring(7),
				name: value,
				command: command,
				params: params,
				icon: icon,
				hidden: false,
				useFilePath: this.prefs.getPrefType(name + '.usefilepath') == Ci.nsIPrefBranch.PREF_BOOL
								&& this.prefs.getBoolPref(name + '.usefilepath')
			});
		}

		if (this.prefs.prefHasUserValue('order')) {
			let order = JSON.parse(this.prefs.getCharPref('order'));
			let newList = [];
			for (let i = 0; i < order.length; i++) {
				let auto = order[i][0] == 'a';
				let keyName = order[i].substring(2);
				for (let j = 0; j < this.list.length; j++) {
					let item = this.list[j];
					if (item.auto == auto && item.keyName == keyName) {
						newList.push(item);
						this.list.splice(j, 1);
						break;
					}
				}
			}
			for (let j = 0; j < this.list.length; j++) {
				let item = this.list[j];
				newList.push(item);
			}
			this.list = newList;
		}

		Services.console.logStringMessage('OpenWith: reloading lists');
		for (let i = 0, iCount = this.list.length; i < iCount; i++) {
			let item = this.list[i];
			Services.console.logStringMessage(item.name + ':\n\tCommand: ' +
					item.command + '\n\tParams: ' + item.params.join(' ') + '\n\tIcon URL: ' + item.icon);
		}

		Services.obs.notifyObservers(null, 'openWithListChanged', 'data');
	},
	findIconURL: function(file, size) {
		if (WINDOWS || OS_X) {
			return 'moz-icon:' + Services.io.newFileURI(file).spec + '?size=' + size;
		}
		try {
			if (file.isSymlink()) {
				let target = file.target;
				file = new FileUtils.File(target);
			}
			let relPaths = [
				'browser/chrome/icons/default/default' + size + '.png',
				'chrome/icons/default/default' + size + '.png',
				'product_logo_' + size + '.png'
			];
			for (let i = 0, iCount = relPaths.length; i < iCount; i++) {
				let relTest = file.parent;
				relTest.appendRelativePath(relPaths[i]);
				if (relTest.exists()) {
					return Services.io.newFileURI(relTest).spec;
				}
			}
			let absPaths = [
				'/usr/share/icons/default.kde4/' + size + 'x' + size + '/apps/' + file.leafName + '.png',
				'/usr/share/icons/hicolor/' + size + 'x' + size + '/apps/' + file.leafName + '.png'
			];
			for (let i = 0, iCount = absPaths.length; i < iCount; i++) {
				let absTest = new FileUtils.File(absPaths[i]);
				if (absTest.exists()) {
					return Services.io.newFileURI(absTest).spec;
				}
			}
		} catch (e) {
		}
		return 'chrome://openwith/content/openwith' + size + '.png';
	},
	observe: function(subject, topic, data) {
		if (this.suppressLoadList) {
			return;
		}
		if (/^manual/.test(data) || data == 'hide') {
			this.loadList(true);
			return;
		}
		switch (data) {
		case 'order':
		case 'version':
			break;
		default:
			Services.obs.notifyObservers(null, 'openWithLocationsChanged', 'data');
			break;
		}
	},
	refreshUI: function(document, locations) {
		for (let j = 0, jCount = locations.length; j < jCount; j++) {
			locations[j].empty();
		}

		for (let i = 0, iCount = this.list.length; i < iCount; i++) {
			let item = this.list[i];
			if (item.hidden) {
				continue;
			}

			let keyName = item.keyName;
			let label = this.strings.formatStringFromName('openWithLabel', [item.name], 1);
			let linkLabel = this.strings.formatStringFromName('openLinkWithLabel', [item.name], 1);

			for (let j = 0, jCount = locations.length; j < jCount; j++) {
				let location = locations[j];
				let labelToUse;

				if (location.submenu) {
					labelToUse = item.name;
				} else if (location.targetType == OpenWithCore.TARGET_LINK) {
					labelToUse = linkLabel;
				} else {
					labelToUse = label;
				}

				if (!location.prefName || this.prefs.getBoolPref(location.prefName)) {
					let menuItem = location.factory(document, item, labelToUse, location.targetType);
					menuItem.id = 'openwith_' + keyName + location.suffix;
					if (location.container.push) { //array
						location.container.push(menuItem);
					} else {
						location.container.appendChild(menuItem);
					}
				}
			}
		}
	},
	createMenuItem: function(document, item, label, targetType) {
		let command = item.command;
		let params = item.params;
		let icon = item.icon;
		let menuItem = document.createElement('menuitem');
		menuItem.setAttribute('class', 'openwith menuitem-iconic menuitem-with-favicon');
		menuItem.setAttribute('image', icon);
		menuItem.setAttribute('label', label);
		switch (targetType) {
		case OpenWithCore.TARGET_STANDARD:
			menuItem.setAttribute('oncommand',
				'OpenWithCore.doCommand(event, gBrowser.selectedBrowser.currentURI);');
			break;
		case OpenWithCore.TARGET_LINK:
			menuItem.setAttribute('oncommand',
				'OpenWithCore.doCommand(event, gContextMenu.linkURI || gContextMenu.linkURL());');
			break;
		case OpenWithCore.TARGET_TAB:
			menuItem.setAttribute('oncommand',
				'OpenWithCore.doCommand(event, gBrowser.mContextTab.linkedBrowser.currentURI);');
			break;
		case OpenWithCore.TARGET_DEVTOOLS:
			menuItem.setAttribute('oncommand',
				'OpenWithCore.doCommand(event, OpenWith.toolbox.target.url);');
			break;
		}
		menuItem.setAttribute('openwith-command', command);
		menuItem.setAttribute('openwith-params', params.join(' '));
		if ('useFilePath' in item && item.useFilePath) {
			menuItem.setAttribute('openwith-usefilepath', 'true');
		}
		return menuItem;
	},
	createToolbarButton: function(document, item, tooltip, targetType) {
		let command = item.command;
		let params = item.params;
		let icon = item.icon;
		let toolbarButton = document.createElement('toolbarbutton');
		if (targetType == OpenWithCore.TARGET_PANEL_UI) {
			toolbarButton.setAttribute('label', tooltip);
		} else {
			toolbarButton.setAttribute('tooltiptext', tooltip);
		}
		toolbarButton.setAttribute('image', icon);
		toolbarButton.setAttribute('openwith-command', command);
		toolbarButton.setAttribute('openwith-params', params.join(' '));
		if ('useFilePath' in item && item.useFilePath) {
			toolbarButton.setAttribute('openwith-usefilepath', 'true');
		}
		if (targetType == OpenWithCore.TARGET_DEVTOOLS) {
			toolbarButton.className = 'command-button';
			toolbarButton.setAttribute('oncommand',
					'OpenWithCore.doCommand(event, OpenWith.toolbox.target.url);');
		} else {
			toolbarButton.className = targetType == OpenWithCore.TARGET_PANEL_UI ? 'subviewbutton' : 'toolbarbutton-1';
			toolbarButton.setAttribute('oncommand',
					'OpenWithCore.doCommand(event, gBrowser.selectedBrowser.currentURI);');
		}
		return toolbarButton;
	},
	doCommand: function(event, uri) {
		if (!(uri instanceof Ci.nsIURI)) {
			uri = Services.io.newURI(uri, null, null);
		}
		let command = event.target.getAttribute('openwith-command');
		let paramsAttr = event.target.getAttribute('openwith-params');
		let params = paramsAttr == '' ? [] : paramsAttr.split(' ');
		if (!event.ctrlKey) {
			if (uri.schemeIs('file') && event.target.hasAttribute('openwith-usefilepath')) {
				params.push(uri.QueryInterface(Ci.nsIFileURL).file.path);
			} else {
				params.push(uri.spec);
			}
		}
		this.doCommandInternal(command, params);
	},
	doCommandInternal: function(command, params) {
		try {
			let file = new FileUtils.File(command);
			if (!file.exists()) {
				throw 'File not found';
			}
			let fileToRun;
			if (/\.app$/.test(file.path)) {
				fileToRun = new FileUtils.File('/usr/bin/open');
				params.splice(0, 0, '-a', file.path);
			} else {
				fileToRun = file;
			}

			Services.console.logStringMessage('OpenWith: opening\n\tCommand: ' + fileToRun.path + '\n\tParams: ' + params.join(' '));
			let process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
			process.init(fileToRun);
			if ('runw' in process) {
				process.runw(false, params, params.length);
			} else {
				process.run(false, params, params.length);
			}
		} catch (e) {
			Cu.reportError(e);
		}
	},
	versionUpdate: function() {
		if (this.prefs.getPrefType('version') == Ci.nsIPrefBranch.PREF_STRING) {
			oldVersion = this.prefs.getCharPref('version');
		}
		Cu.import('resource://gre/modules/AddonManager.jsm');
		AddonManager.getAddonByID(ID, (function(addon) {
			currentVersion = addon.version;
			this.prefs.setCharPref('version', currentVersion);

			let appname = Services.appinfo.name;
			let appversion = parseFloat(Services.appinfo.version);
			if (appname == 'Firefox' && appversion >= 4) {
				let shouldUpdateToolbar = false;
				if (this.prefs.prefHasUserValue('tabbar')) {
					let value = this.prefs.getBoolPref('tabbar');
					this.prefs.setBoolPref('toolbar', value);
					this.prefs.setBoolPref('toolbar.menu', !value);
					this.prefs.clearUserPref('tabbar');
					shouldUpdateToolbar = true;
				}
				if (this.prefs.prefHasUserValue('tabbar.menu')) {
					let value = this.prefs.getBoolPref('tabbar.menu');
					this.prefs.setBoolPref('toolbar.menu', value);
					this.prefs.setBoolPref('toolbar', !value);
					this.prefs.clearUserPref('tabbar.menu');
					shouldUpdateToolbar = true;
				}
				if (shouldUpdateToolbar) {
					try {
						Services.console.logStringMessage('OpenWith: updating prefs');
						let window = Services.wm.getMostRecentWindow(BROWSER_TYPE);
						let document = window.document;
						let tabsToolbar = document.getElementById('TabsToolbar');
						let currentSet;
						if (tabsToolbar.hasAttribute('currentset')) {
							currentSet = tabsToolbar.getAttribute('currentset').split(',');
						} else {
							currentSet = tabsToolbar.getAttribute('defaultset').split(',');
						}
						let index = currentSet.indexOf('alltabs-button');
						if (index == -1) {
							currentSet.push('openwith-toolbarbox');
						} else {
							currentSet.splice(index, 0, 'openwith-toolbarbox');
						}
						tabsToolbar.setAttribute('currentset', currentSet.join(','));
						tabsToolbar.currentSet = currentSet.join(',');
						document.persist('TabsToolbar', 'currentset');
						window.BrowserToolboxCustomizeDone(true);
					} catch (e) {
						Cu.reportError(e);
					}
				}
			}
			if (appname == 'Thunderbird' && parseFloat(oldVersion) < 5.3) {
				this.prefs.setBoolPref('contextmenulink.submenu', true);
				this.prefs.setCharPref('hide', '');
			}
			if (parseFloat(oldVersion) < 4.2) {
				if (WINDOWS && appname == 'SeaMonkey') {
					this.prefs.setCharPref('hide', 'seamonkey.exe');
				} else if (OS_X) {
					this.prefs.setCharPref('hide', appname);
				}
			}
			this.showNotifications();
		}).bind(this));
	},
	openOptionsTab: function() {
		let recentWindow = Services.wm.getMostRecentWindow(BROWSER_TYPE);
		if (recentWindow) {
			if ('switchToTabHavingURI' in recentWindow) {
				recentWindow.switchToTabHavingURI(REAL_OPTIONS_URL, true);
			} else {
				let found = false;
				let browserEnumerator = Services.wm.getEnumerator(BROWSER_TYPE);
				while (!found && browserEnumerator.hasMoreElements()) {
					let browserWin = browserEnumerator.getNext();
					let tabbrowser = browserWin.gBrowser;

					let numTabs = tabbrowser.browsers.length;
					for (let index = 0; index < numTabs; index++) {
						let currentBrowser = tabbrowser.getBrowserAtIndex(index);
						if (REAL_OPTIONS_URL == currentBrowser.currentURI.spec) {
							tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
							browserWin.focus();

							found = true;
							break;
						}
					}
				}

				if (!found) {
					recentWindow.gBrowser.selectedTab = recentWindow.gBrowser.addTab(REAL_OPTIONS_URL);
					recentWindow.focus();
				}
			}
		} else {
			recentWindow = Services.wm.getMostRecentWindow(MAIL_TYPE);
			// from extensions.js
			let features = 'chrome,titlebar,toolbar,centerscreen';
			try {
				let instantApply = Services.prefs.getBoolPref('browser.preferences.instantApply');
				features += instantApply ? ',dialog=no' : ',modal';
			} catch (e) {
				features += ',modal';
			}
			recentWindow.openDialog(REAL_OPTIONS_URL, null, features);
		}
	},
	showNotifications: function() {
		let recentWindow = Services.wm.getMostRecentWindow(BROWSER_TYPE);
		let notifyBox;
		if (recentWindow) {
			notifyBox = recentWindow.gBrowser.getNotificationBox();
		} else {
			recentWindow = Services.wm.getMostRecentWindow(MAIL_TYPE);
			notifyBox = recentWindow.document.getElementById('mail-notification-box');
		}

		recentWindow.setTimeout((function() {
			if (this.list.length == 0) {
				let label = this.strings.GetStringFromName('noBrowsersSetUp');
				let value = 'openwith-nobrowsers';
				let buttons = [{
					label: this.strings.GetStringFromName('buttonLabel'),
					accessKey: this.strings.GetStringFromName('buttonAccessKey'),
					popup: null,
					callback: this.openOptionsTab
				}];
				notifyBox.appendNotification(label, value,
						'chrome://openwith/content/openwith16.png', notifyBox.PRIORITY_INFO_LOW, buttons);
			} else {
				this.showDonateReminder(notifyBox, function(aNotificationBar, aButton) {
					let url = 'https://addons.mozilla.org/addon/11097/about';
					recentWindow.gBrowser.selectedTab = recentWindow.gBrowser.addTab(url);
				});
			}
		}).bind(this), 1000);
	},
	showDonateReminder: function(notifyBox, callback) {
		function parseVersion(aVersion) {
			let match = /^\d+(\.\d+)?/.exec(aVersion);
			return match ? match[0] : aVersion;
		}

		if (oldVersion == 0 || Services.vc.compare(parseVersion(oldVersion), parseVersion(currentVersion)) >= 0) {
			return;
		}

		let locale = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci.nsIXULChromeRegistry).getSelectedLocale('openwith');
		if (!/^en-/.test(locale)) {
			return;
		}

		let label = 'Open With has been updated to version ' + currentVersion + '. ' +
				'Please consider making a donation to the project.';
		let value = 'openwith-donate';
		let buttons = [{
			label: 'Donate',
			accessKey: 'D',
			popup: null,
			callback: callback
		}];
		this.prefs.setIntPref('donationreminder', Date.now() / 1000);
		notifyBox.appendNotification(label, value,
				'chrome://openwith/content/openwith16.png', notifyBox.PRIORITY_INFO_LOW, buttons);
	}
};
XPCOMUtils.defineLazyGetter(OpenWithCore, 'prefs', function() {
	let prefs = Services.prefs.getBranch('extensions.openwith.');
	prefs.addObserver('', OpenWithCore, false);
	return prefs;
});
XPCOMUtils.defineLazyGetter(OpenWithCore, 'strings', function() {
	return Services.strings.createBundle('chrome://openwith/locale/openwith.properties');
});

if (Services.appinfo.name == 'Firefox') {
	Services.scriptloader.loadSubScript('resource://openwith/gcli.js');
	if (Services.vc.compare(Services.appinfo.version, '29') > -1) {
		Services.scriptloader.loadSubScript('resource://openwith/widgets.js');
	}
}

OpenWithCore.versionUpdate();
