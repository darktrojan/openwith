this.EXPORTED_SYMBOLS = ['OpenWithCore'];

const ID = 'openwith@darktrojan.net';

const REAL_OPTIONS_URL = 'about:openwith';
const MAIL_TYPE = 'mail:3pane';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { XPCOMUtils } = ChromeUtils.import('resource://gre/modules/XPCOMUtils.jsm');
const { FileUtils } = ChromeUtils.import('resource://gre/modules/FileUtils.jsm');

/* globals AddonManager, Preferences, idleService */
ChromeUtils.defineModuleGetter(this, 'AddonManager', 'resource://gre/modules/AddonManager.jsm');
ChromeUtils.defineModuleGetter(this, 'Preferences', 'resource://gre/modules/Preferences.jsm');
XPCOMUtils.defineLazyServiceGetter(this, 'idleService',
	'@mozilla.org/widget/idleservice;1', 'nsIIdleService');

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
	TARGET_PLACES: 6,

	list: [],
	map: new Map(),
	suppressLoadList: false,
	loadList: function(forceReload) {
		if (this.list.length && !forceReload) {
			return;
		}

		let unsorted = [];
		if (WINDOWS) {
			if (!registryKey) {
				registryKey = Cc['@mozilla.org/windows-registry-key;1'].createInstance(Ci.nsIWindowsRegKey);
				registryKey.open(Ci.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE,
					'SOFTWARE\\Clients\\StartMenuInternet', Ci.nsIWindowsRegKey.ACCESS_READ);
				env = Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);
			}

			for (let i = 0, iCount = registryKey.childCount; i < iCount; i++) {
				try {
					let name = registryKey.getChildName(i);
					let subkey1 = registryKey.openChild(name, Ci.nsIWindowsRegKey.ACCESS_READ);
					let value = subkey1.readStringValue(null);
					subkey1.close();
					let subkey2 = registryKey.openChild(name + '\\shell\\open\\command', Ci.nsIWindowsRegKey.ACCESS_READ);
					let command = subkey2.readStringValue(null);
					subkey2.close();

					let params = command.indexOf('"') >= 0 ? command.replace(/^"[^"]+"\s*/, '') : '';
					command = command.replace(/^"/, '').replace(/".*$/, '');
					command = command.replace(/%(\w+)%/g, function(m) { // jshint ignore: line
						return env.get(m.substring(1, m.length - 1));
					});

					let file = new FileUtils.File(command);
					let keyName = name.replace(/[^\w.-]/g, '_').toLowerCase();

					unsorted.push({
						auto: true,
						keyName: keyName,
						name: value,
						command: command,
						params: params,
						icon: this.findIconURL(file, 16)
					});
				} catch (e) {
					Cu.reportError(e);
				}
			}

			let edgeDir = Services.dirsvc.get('WinD', Ci.nsIFile);
			edgeDir.append('SystemApps');
			edgeDir.append('Microsoft.MicrosoftEdge_8wekyb3d8bbwe');
			let edgeFile = edgeDir.clone();
			edgeFile.append('MicrosoftEdge.exe');
			if (edgeFile.exists()) {
				let commandFile = Services.dirsvc.get('WinD', Ci.nsIFile);
				commandFile.append('explorer.exe');
				let iconFile = edgeDir.clone();
				iconFile.append('Assets');
				iconFile.append('MicrosoftEdgeSquare44x44.targetsize-16_altform-unplated.png');
				let iconURL = Services.io.newFileURI(iconFile);
				unsorted.push({
					auto: true,
					keyName: 'msedge',
					name: 'Microsoft Edge',
					command: commandFile.path,
					params: '"microsoft-edge:%s "',
					icon: iconURL.spec
				});
			}
		} else if (OS_X) {
			if (!locAppDir) {
				locAppDir = Services.dirsvc.get('LocApp', Ci.nsIFile);
			}

			let apps = ['Camino', 'Google Chrome', 'Chromium', 'Firefox', 'Flock', 'Opera', 'Safari', 'SeaMonkey'];
			for (let name of apps) {
				let appFile = locAppDir.clone();
				appFile.append(name + '.app');
				if (appFile.exists()) {
					let keyName = name.replace(/[^\w.-]/g, '_').toLowerCase();
					unsorted.push({
						auto: true,
						keyName: keyName,
						name: name,
						command: appFile.path,
						params: '',
						icon: this.findIconURL(appFile, 16)
					});
				}
			}
		} else {
			for (let app of ['google-chrome', 'chromium-browser', 'firefox', 'opera', 'seamonkey']) {
				let desktopFile = FileUtils.getFile('Home', ['.local', 'share', 'applications', app + '.desktop'], true);
				if (desktopFile.exists()) {
					unsorted.push(this.readDesktopFile(desktopFile));
					continue;
				}
				desktopFile = new FileUtils.File('/usr/local/share/applications/' + app + '.desktop');
				if (desktopFile.exists()) {
					unsorted.push(this.readDesktopFile(desktopFile));
					continue;
				}
				desktopFile = new FileUtils.File('/usr/share/applications/' + app + '.desktop');
				if (desktopFile.exists()) {
					unsorted.push(this.readDesktopFile(desktopFile));
					continue;
				}
			}
		}

		for (let item of unsorted) {
			let branch = Services.prefs.getBranch(this.prefs.root + 'auto.' + item.keyName);
			if (branch.getPrefType('.icon') == Ci.nsIPrefBranch.PREF_STRING) {
				item.icon = Preferences.get(branch.root + '.icon');
			}
			if (branch.getPrefType('.name') == Ci.nsIPrefBranch.PREF_STRING) {
				item.name = Preferences.get(branch.root + '.name');
			}
			item.hidden =
				branch.getPrefType('.hidden') == Ci.nsIPrefBranch.PREF_BOOL &&
				branch.getBoolPref('.hidden');
		}

		let manual = this.prefs.getChildList('manual.', {});
		manual.sort();
		for (let name of manual) {
			if (/\.(accesskey|icon|name|usefilepath)$/.test(name)) {
				continue;
			}
			let value;
			if (this.prefs.getPrefType(name + '.name') == Ci.nsIPrefBranch.PREF_STRING) {
				value = this.prefs.getCharPref(name + '.name');
			} else {
				value = name.substring(7).replace(/_/g, ' ');
			}
			let command = this.prefs.getCharPref(name);
			let params = command.indexOf('"') >= 0 ? command.replace(/^"[^"]+"\s*/, '') : '';
			command = command.replace(/^"/, '').replace(/".*$/, '');
			let icon;
			if (this.prefs.getPrefType(name + '.icon') == Ci.nsIPrefBranch.PREF_STRING) {
				icon = this.prefs.getCharPref(name + '.icon');
			} else {
				let file = new FileUtils.File(command);
				icon = this.findIconURL(file, 16);
			}

			unsorted.push({
				auto: false,
				// Do not normalize or old entries will be stranded
				keyName: name.substring(7),
				name: value,
				command: command,
				params: params,
				icon: icon,
				hidden: false,
				useFilePath: this.prefs.getPrefType(name + '.usefilepath') == Ci.nsIPrefBranch.PREF_BOOL &&
						this.prefs.getBoolPref(name + '.usefilepath')
			});
		}

		for (let item of unsorted) {
			for (let k of ['accessKey']) {
				let t = item.auto ? 'auto.' : 'manual.';
				let k_lc = k.toLowerCase();
				if (this.prefs.getPrefType(t + item.keyName + '.' + k_lc) == Ci.nsIPrefBranch.PREF_STRING) {
					item[k] = this.prefs.getCharPref(t + item.keyName + '.' + k_lc);
				}
			}
		}

		this.list = [];
		this.map = new Map();
		if (this.prefs.prefHasUserValue('order')) {
			let order = JSON.parse(this.prefs.getCharPref('order'));
			for (let orderItem of order) {
				let auto = orderItem[0] == 'a';
				let keyName = orderItem.substring(2);
				for (let j = 0; j < unsorted.length; j++) {
					let item = unsorted[j];
					if (item.auto == auto && item.keyName == keyName) {
						this.list.push(item);
						this.map.set((item.auto ? 'auto.' : 'manual.') + item.keyName, item);
						unsorted.splice(j, 1);
						break;
					}
				}
			}
		}
		for (let item of unsorted.sort(function(a, b) {
			if (a.name > b.name) return 1;
			if (a.name < b.name) return -1;
			return 0;
		})) {
			this.list.push(item);
			this.map.set((item.auto ? 'auto.' : 'manual.') + item.keyName, item);
		}

		this.log('OpenWith: reloading lists');
		for (let item of this.list) {
			this.log(
				item.name + (item.hidden ? ' (hidden)' : '') + ':\n' +
				'\tCommand: ' + item.command + '\n' +
				'\tParams: ' + item.params + '\n' +
				'\tIcon URL: ' + item.icon
			);
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
			for (let relPath of [
				'browser/chrome/icons/default/default' + size + '.png',
				'chrome/icons/default/default' + size + '.png',
				'product_logo_' + size + '.png'
			]) {
				let relTest = file.parent;
				relTest.appendRelativePath(relPath);
				if (relTest.exists()) {
					return Services.io.newFileURI(relTest).spec;
				}
			}
			for (let absPath of [
				'/usr/share/icons/default.kde4/' + size + 'x' + size + '/apps/' + file.leafName + '.png',
				'/usr/share/icons/hicolor/' + size + 'x' + size + '/apps/' + file.leafName + '.png'
			]) {
				let absTest = new FileUtils.File(absPath);
				if (absTest.exists()) {
					return Services.io.newFileURI(absTest).spec;
				}
			}
		} catch (e) {
			// Ignore
		}
		return 'chrome://openwith/content/openwith' + size + '.png';
	},
	observe: function(subject, topic, data) {
		if (this.suppressLoadList) {
			return;
		}
		if (['auto', 'manual'].some(s => data.startsWith(s))) {
			this.loadList(true);
			return;
		}
		if (['contextmenu', 'placescontext', 'tab', 'tool', 'view'].some(s => data.startsWith(s))) {
			Services.obs.notifyObservers(null, 'openWithLocationsChanged', data);
		}
	},
	refreshUI: function(document, locations) {
		for (let location of locations) {
			if (typeof location.empty == 'function') {
				location.empty.apply(location);
			} else if (Array.isArray(location.container)) {
				location.container.length = 0;
			} else { // DOM element
				while (location.container.lastChild) {
					location.container.lastChild.remove();
				}
			}

			if (typeof location.suffix != 'string') {
				location.suffix = '_' + location.prefName.replace(/\W/, '');
			}
			if (typeof location.factory != 'function') {
				location.factory = OpenWithCore.createMenuItem;
			}
			if (typeof location.submenu != 'boolean') {
				location.submenu = /\.submenu$/.test(location.prefName);
			}
			if (typeof location.menu != 'boolean') {
				location.menu = /\.menu$/.test(location.prefName);
			}
		}

		let keyset = document.getElementById('openwith-keyset');
		if (keyset === null) {
			keyset = document.createXULElement('keyset');
			keyset.id = 'openwith-keyset';
		}
		while (keyset.lastChild) {
			keyset.lastChild.remove();
		}

		for (let item of this.list) {
			if (item.hidden) {
				continue;
			}

			let keyName = item.keyName;
			let label = this.strings.formatStringFromName('openWithLabel', [item.name], 1);
			let linkLabel = this.strings.formatStringFromName('openLinkWithLabel', [item.name], 1);

			for (let location of locations) {
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
					if (Array.isArray(location.container)) {
						location.container.push(menuItem);
					} else {
						location.container.appendChild(menuItem);
					}
				}
			}
		}

		for (let location of locations) {
			let item;
			if (location.submenu || location.menu) {
				item = document.createXULElement('menuitem');
				item.setAttribute('class', 'openwith menuitem-iconic');
			} else if (location.targetType == OpenWithCore.TARGET_PANEL_UI) {
				item = document.createXULElement('toolbarbutton');
				item.className = 'subviewbutton';
			} else {
				continue;
			}

			let separator = document.createXULElement('menuseparator');
			separator.setAttribute('class', 'openwith');

			item.setAttribute('label', OpenWithCore.strings.GetStringFromName('buttonLabel'));
			item.addEventListener('command', () => {
				this.openOptionsTab();
			});
			if (Array.isArray(location.container)) {
				location.container.push(separator);
				location.container.push(item);
			} else {
				location.container.appendChild(separator);
				location.container.appendChild(item);
			}
		}

		document.documentElement.appendChild(keyset);
	},
	addItemToElement: function(element, item) {
		element.setAttribute('openwith-command', item.command);
		element.setAttribute('openwith-params', item.params);
		if ('useFilePath' in item && item.useFilePath) {
			element.setAttribute('openwith-usefilepath', 'true');
		}
	},
	createMenuItem: function(document, item, label, targetType = OpenWithCore.TARGET_STANDARD) {
		let menuItem = document.createXULElement('menuitem');
		menuItem.setAttribute('class', 'openwith menuitem-iconic menuitem-with-favicon');
		menuItem.setAttribute('image', item.icon);
		menuItem.setAttribute('label', label);
		if (item.accessKey) {
			menuItem.setAttribute('accesskey', item.accessKey);
		}
		switch (targetType) {
		case OpenWithCore.TARGET_STANDARD:
			menuItem.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.gBrowser.selectedBrowser.currentURI);
			});
			break;
		case OpenWithCore.TARGET_LINK:
			menuItem.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.gContextMenu.linkURI || win.gContextMenu.linkURL());
			});
			break;
		case OpenWithCore.TARGET_TAB:
			menuItem.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.gBrowser.mContextTab.linkedBrowser.currentURI);
			});
			break;
		case OpenWithCore.TARGET_DEVTOOLS:
			menuItem.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.OpenWith.toolbox.target.url);
			});
			break;
		case OpenWithCore.TARGET_PLACES:
			menuItem.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.PlacesUIUtils.getViewForNode(win.document.popupNode).selectedNode.uri);
			});
			break;
		}
		OpenWithCore.addItemToElement(menuItem, item);
		return menuItem;
	},
	createToolbarButton: function(document, item, tooltip, targetType = OpenWithCore.TARGET_STANDARD) {
		let toolbarButton = document.createXULElement('toolbarbutton');
		if (targetType == OpenWithCore.TARGET_PANEL_UI) {
			toolbarButton.setAttribute('label', tooltip);
		} else {
			toolbarButton.setAttribute('tooltiptext', tooltip);
		}
		toolbarButton.setAttribute('image', item.icon);
		OpenWithCore.addItemToElement(toolbarButton, item);
		if (targetType == OpenWithCore.TARGET_DEVTOOLS) {
			toolbarButton.className = 'command-button';
			toolbarButton.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.OpenWith.toolbox.target.url);
			});
		} else {
			toolbarButton.className = targetType == OpenWithCore.TARGET_PANEL_UI ? 'subviewbutton' : 'toolbarbutton-1';
			toolbarButton.addEventListener('command', function(event) {
				let win = event.target.ownerDocument.defaultView;
				OpenWithCore.doCommand(event, win.gBrowser.selectedBrowser.currentURI);
			});
		}
		return toolbarButton;
	},
	splitArgs: function(argString) {
		let args = [];

		let temp = '';
		let inQuotes = false;
		for (let c of argString) {
			if (c == '"') {
				if (temp.endsWith('\\')) {
					temp = temp.substring(0, temp.length - 1) + c;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (c == ' ' && !inQuotes) {
				args.push(temp);
				temp = '';
			} else {
				temp += c;
			}
		}

		if (temp.length > 0) {
			args.push(temp);
		}

		return args;
	},
	doCommand: function(event, uri) {
		let uriParam = null;
		if (!event.ctrlKey || event.target.localName == 'key') {
			if (!(uri instanceof Ci.nsIURI)) {
				uri = Services.io.newURI(uri, null, null);
			}
			if (uri.schemeIs('file') && event.target.hasAttribute('openwith-usefilepath')) {
				uriParam = uri.QueryInterface(Ci.nsIFileURL).file.path;
			} else {
				uriParam = uri.spec;
				let match = /^openwith:((auto|manual)\.([\w.-]+)):(.*)$/.exec(uriParam);
				if (match) {
					uriParam = match[4];
				}
			}
		}

		let command = event.target.getAttribute('openwith-command');
		let paramsAttr = event.target.getAttribute('openwith-params');
		let params = !paramsAttr ? [] : this.splitArgs(paramsAttr);
		let appendURIParam = !!uriParam;
		for (var i = 0; i < params.length; i++) {
			if (params[i].indexOf('%s') >= 0) {
				if (uriParam) {
					params[i] = params[i].replace('%s', uriParam);
					appendURIParam = false;
				} else {
					params.splice(i, 1);
					i--;
				}
			}
		}
		if (appendURIParam) {
			params.push(uriParam);
		}

		this.doCommandInternal(command, params, uriParam);
	},
	doCommandWithListItem: function(keyName, uri) {
		let item = OpenWithCore.map.get(keyName);
		let params = !item.params ? [] : this.splitArgs(item.params);
		let appendURIParam = true;
		for (var i = 0; i < params.length; i++) {
			if (params[i].indexOf('%s') >= 0) {
				params[i] = params[i].replace('%s', uri);
				appendURIParam = false;
			}
		}
		if (appendURIParam) {
			params.push(uri);
		}
		this.doCommandInternal(item.command, params, uri);
	},
	doCommandInternal: function(command, params) {
		if (Services.appinfo.processType != Services.appinfo.PROCESS_TYPE_DEFAULT) {
			throw new Error('OpenWithCore.doCommandInternal called from child process');
		}

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

			this.log('OpenWith: opening\n\tCommand: ' + fileToRun.path + '\n\tParams: ' + params.join(' '));
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
		function parseVersion(version) {
			let match = /^\d+(\.\d+)?/.exec(version);
			return match ? parseFloat(match[0], 10) : 0;
		}

		let appname = Services.appinfo.name;

		if (this.prefs.getPrefType('version') == Ci.nsIPrefBranch.PREF_STRING) {
			oldVersion = parseVersion(this.prefs.getCharPref('version'));
		}

		// Set initial value to this app's name
		if (oldVersion === 0) {
			let keyName = appname.toLowerCase();
			if (WINDOWS) {
				keyName += '.exe';
			} else if (!OS_X) {
				keyName += '.desktop';
			}
			this.prefs.setBoolPref('auto.' + keyName + '.hidden', true);
		}

		// Normalize hidden items
		if (this.prefs.prefHasUserValue('hide')) {
			let hidePref = this.prefs.getCharPref('hide').toLowerCase().split(/\s+/);
			for (let keyName of hidePref) if (keyName !== '') {
				this.prefs.setBoolPref('auto.' + keyName + '.hidden', true);
			}
			this.prefs.clearUserPref('hide');
		}

		AddonManager.getAddonByID(ID).then(addon => {
			currentVersion = parseVersion(addon.version);
			this.prefs.setCharPref('version', addon.version);
			this.showNotifications(addon);
		});
	},
	openOptionsTab: function() {
		let recentWindow = Services.wm.getMostRecentWindow(MAIL_TYPE);
		recentWindow.openContentTab(REAL_OPTIONS_URL);
	},
	openChangelog: function() {
		let version = this.prefs.getCharPref('version');
		this.openURL('https://addons.thunderbird.net/addon/open-with/versions/' + version);
	},
	openDonatePage: function() {
		this.openURL('https://darktrojan.github.io/donate.html?openwith');
	},
	openURL: function(url) {
		let recentWindow = Services.wm.getMostRecentWindow(MAIL_TYPE);
		recentWindow.openLinkExternally(url);
	},
	showNotifications: function() {
		let label, value, buttons;
		let shouldRemind = true;

		if (this.prefs.getPrefType('donationreminder') == Ci.nsIPrefBranch.PREF_INT) {
			let lastReminder = this.prefs.getIntPref('donationreminder') * 1000;
			shouldRemind = Date.now() - lastReminder > 604800000;
		}

		if (this.list.length === 0) {
			label = this.strings.GetStringFromName('noBrowsersSetUp');
			value = 'openwith-nobrowsers';
			buttons = [{
				label: this.strings.GetStringFromName('buttonLabel'),
				popup: null,
				callback: this.openOptionsTab
			}];
		} else if (oldVersion === 0) {
			label = this.strings.GetStringFromName('installed');
			value = 'openwith-installed';
			buttons = [{
				label: this.strings.GetStringFromName('buttonLabel'),
				popup: null,
				callback: this.openOptionsTab
			}, {
				label: this.strings.GetStringFromName('donateButtonLabel'),
				popup: null,
				callback: this.openDonatePage.bind(this)
			}];
		} else if (shouldRemind && Services.vc.compare(oldVersion, currentVersion) < 0) {
			label = this.strings.formatStringFromName('versionChanged', [currentVersion], 1);
			value = 'openwith-donate';
			buttons = [{
				label: this.strings.GetStringFromName('changeLogLabel'),
				callback: this.openChangelog.bind(this)
			}, {
				label: this.strings.GetStringFromName('donateButtonLabel'),
				popup: null,
				callback: this.openDonatePage.bind(this)
			}];
		} else {
			return;
		}

		function callback() {
			let recentWindow = Services.wm.getMostRecentWindow(MAIL_TYPE);
			let notifyBox = recentWindow.specialTabs.msgNotificationBar;
			notifyBox.appendNotification(label, value, 'chrome://openwith/content/openwith16.png', notifyBox.PRIORITY_INFO_LOW, buttons);
		}

		if (value == 'openwith-donate') {
			idleService.addIdleObserver({
				observe: function(service, state) {
					if (state != 'idle') {
						return;
					}

					idleService.removeIdleObserver(this, 8);
					callback();
					OpenWithCore.prefs.setIntPref('donationreminder', Date.now() / 1000);
				}
			}, 8);
		} else {
			// Tied to this to avoid GC
			this.timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
			this.timer.initWithCallback(callback, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
		}
	},
	readDesktopFile: function(aFile) {
		let istream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
		istream.init(aFile, 0x01, 0o444, 0);
		istream.QueryInterface(Ci.nsILineInputStream);

		let line = {};
		let notEOF;
		let name, command, icon;
		let params = [];
		do {
			notEOF = istream.readLine(line);
			if (!command && /^Exec=/.test(line.value)) {
				let commandParts = line.value.substring(5).replace(/\s+%U/i, '').split(/\s+/);
				command = commandParts[0];
				let file;
				if (command[0] == '/') {
					file = new FileUtils.File(command);
				} else {
					let env = Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);
					let paths = env.get('PATH').split(':');
					for (let path of paths) {
						file = new FileUtils.File(path + '/' + command);
						if (file.exists()) {
							command = file.path;
							break;
						}
					}
				}
				for (let part of commandParts.slice(1)) {
					params.push(part);
				}

				if (!icon) {
					icon = this.findIconURL(file, 16);
				}
			}
			if (!name && /^Name=/.test(line.value)) {
				name = line.value.substring(5);
			}
			if (/^Icon=/.test(line.value)) {
				if (line.value[5] == '/') {
					icon = 'file://' + line.value.substring(5);
				} else {
					icon = 'moz-icon://stock/' + line.value.substring(5) + '?size=menu';
				}
			}
		} while (notEOF);
		name = name || aFile.leafName.replace(/\.desktop$/i, '');
		istream.close();

		let keyName = aFile.leafName.replace(/[^\w.-]/g, '_').toLowerCase();

		return {
			auto: true,
			keyName: keyName,
			name: name,
			command: command,
			params: params.join(' '),
			icon: icon
		};
	},
	log: function(message) {
		if (this.prefs.getBoolPref('log.enabled')) {
			if ('infoFlag' in Ci.nsIScriptError) {
				let frame = Components.stack.caller;
				let filename = frame.filename ? frame.filename.split(' -> ').pop() : null;
				let scriptError = Cc['@mozilla.org/scripterror;1'].createInstance(Ci.nsIScriptError);
				scriptError.init(
					message, filename, null, frame.lineNumber, frame.columnNumber,
					Ci.nsIScriptError.infoFlag, 'component javascript'
				);
				Services.console.logMessage(scriptError);
			} else {
				Services.console.logStringMessage(message);
			}
			dump(message + '\n');
		}
	}
};
XPCOMUtils.defineLazyGetter(OpenWithCore, 'prefs', function() {
	let branch = Services.prefs.getBranch('extensions.openwith.');
	branch.addObserver('', OpenWithCore, false);
	return {
		root: branch.root,
		getBoolPref: branch.getBoolPref,
		setBoolPref: branch.setBoolPref,
		getIntPref: branch.getIntPref,
		setIntPref: branch.setIntPref,
		getCharPref: function(name) { return Preferences.get(this.root + name); },
		setCharPref: function(name, value) { Preferences.set(this.root + name, value); },
		getPrefType: branch.getPrefType,
		getChildList: branch.getChildList,
		prefHasUserValue: branch.prefHasUserValue,
		clearUserPref: branch.clearUserPref,
		addObserver: branch.addObserver,
		deleteBranch: branch.deleteBranch
	};
});
XPCOMUtils.defineLazyGetter(OpenWithCore, 'strings', function() {
	return Services.strings.createBundle('chrome://openwith/locale/openwith.properties');
});

OpenWithCore.versionUpdate();
