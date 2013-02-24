const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://openwith/openwith.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
fp.init(this, document.title, Ci.nsIFilePicker.modeOpen);
fp.appendFilters(Ci.nsIFilePicker.filterApps);
if (Services.dirsvc.has('ProgF')) {
	fp.displayDirectory = Services.dirsvc.get('ProgF', Ci.nsIFile);
} else if (Services.dirsvc.has('LocApp')) {
	fp.displayDirectory = Services.dirsvc.get('LocApp', Ci.nsIFile);
} else {
	let appsDir = new FileUtils.File('/usr/share/applications');
	if (appsDir.exists())
		fp.displayDirectory = appsDir;
}

function $(id) {
	return document.getElementById(id);
}

let loadingDropDowns = false;
let changingPref = false;
function loadDropDowns() {
	if (changingPref) {
		return;
	}
	loadingDropDowns = true;

	if (Services.appinfo.name == 'Thunderbird') {
		$('openwith-viewmenu-row').collapsed = true;
		$('openwith-contextmenu-row').collapsed = true;
		$('openwith-tabmenu-row').collapsed = true;
		$('openwith-tabbar-row').collapsed = true;
		$('openwith-toolbar-row').collapsed = true;
	}

	$('openwith-viewmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('viewmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref('viewmenu.submenu') ? 2 : 0);

	$('openwith-contextmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('contextmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref('contextmenu.submenu') ? 2 : 0);

	$('openwith-contextmenulink-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('contextmenulink') ? 1 :
			(OpenWithCore.prefs.getBoolPref('contextmenulink.submenu') ? 2 : 0);

	$('openwith-tabmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('tabmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref('tabmenu.submenu') ? 2 : 0);

	if (Services.appinfo.name == 'Firefox' && parseFloat(Services.appinfo.version) >= 4) {
		$('openwith-tabbar-row').collapsed = true;
	} else {
		$('openwith-tabbar-group').disabled = !browserWindow || browserWindow.OpenWith.tabButtonContainer == null;
		$('openwith-tabbar-group').selectedIndex =
				OpenWithCore.prefs.getBoolPref('tabbar') ? 1 :
				(OpenWithCore.prefs.getBoolPref('tabbar.menu') ? 2 : 0);
	}

	$('openwith-toolbar-group').disabled = !browserWindow || browserWindow.OpenWith.toolbarButtonContainer == null;
	$('openwith-toolbar-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('toolbar') ? 0 : 1;

	if (Services.appinfo.name == 'Firefox' && parseFloat(Services.appinfo.version) >= 20) {
		$('openwith-toolbox-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('toolbox') ? 1 :
				(OpenWithCore.prefs.getBoolPref('toolbox.menu') ? 2 : 0);
	} else {
		$('openwith-toolbox-row').collapsed = true;
	}

	loadingDropDowns = false;
}

loadDropDowns();
Services.obs.addObserver({
	observe: function(subject, topic, data) {
		loadDropDowns();
	}
}, 'openWithLocationsChanged', false);

let list = $('list');
loadBrowserList();

function loadBrowserList() {
	while (list.itemCount) {
		list.removeItemAt(0);
	}

	for (let i = 0, iCount = OpenWithCore.list.length; i < iCount; i++) {
		let entry = OpenWithCore.list[i];
		let item = document.createElement('richlistitem');
		for (let a in entry) {
			switch (a) {
			case 'auto':
				item.setAttribute('auto', entry[a]);
				item.setAttribute('manual', !entry[a]);
				break;
			case 'hidden':
				item.setAttribute('browserHidden', entry[a]);
				break;
			case 'icon':
				let icon = entry[a];
				icon = icon.replace('?size=menu', '?size=dnd');
				icon = icon.replace(/16/g, '32');
				item.setAttribute(a, icon);
				break;
			case 'params':
				item.setAttribute(a, entry[a].join(' '));
				break;
			default:
				item.setAttribute(a, entry[a]);
				break;
			}
		}
		list.appendChild(item);
	}
}

function updatePrefs(pref1, pref2, index) {
	if (loadingDropDowns) {
		return;
	}
	changingPref = true;
	switch (index) {
	case 0:
		OpenWithCore.prefs.setBoolPref(pref1, false);
		OpenWithCore.prefs.setBoolPref(pref2, false);
		break;
	case 1:
		OpenWithCore.prefs.setBoolPref(pref1, true);
		OpenWithCore.prefs.setBoolPref(pref2, false);
		break;
	case 2:
		OpenWithCore.prefs.setBoolPref(pref1, false);
		OpenWithCore.prefs.setBoolPref(pref2, true);
		break;
	}
	changingPref = false;
}

function setHidden(item, hidden) {
	let keyName = item.getAttribute('keyName').toLowerCase();
	let pref = OpenWithCore.prefs.getCharPref('hide').toLowerCase();
	if (hidden) {
		pref += ' ' + keyName;
	} else {
		pref = pref.replace(new RegExp('\\b' + keyName + '\\b'), '');
	}
	OpenWithCore.prefs.setCharPref('hide', pref.trim().replace(/\s+/g, ' '));

	item.setAttribute('browserHidden', hidden);
	item.parentNode.focus();
}

function editCommand(item) {
	let command = item.getAttribute('command');
	let file = new FileUtils.File(command);
	fp.defaultString = file.leafName;
	fp.displayDirectory = file.parent;
	if (fp.show() == Ci.nsIFilePicker.returnOK) {
		item.setAttribute('command', fp.file.path);
		item.setAttribute('icon', OpenWithCore.findIconURL(fp.file, 32));
		saveItemToPrefs(item);
	}
}

function changeAttribute(item, attrName) {
	let original = item.getAttribute(attrName);
	let attr = { value: original };
	let text;
	switch (attrName) {
	case 'name':
		text = OpenWithCore.strings.GetStringFromName('namePromptText');
		break;
	case 'params':
		let file = new FileUtils.File(item.getAttribute('command'));
		text = OpenWithCore.strings.formatStringFromName('paramsPromptText', [file.leafName], 1);
		break;
	}
	if (Services.prompt.prompt(this, document.title, text, attr, null, {}) && attr.value != original) {
		item.setAttribute(attrName, attr.value);

		OpenWithCore.suppressLoadList = true;
		if (attrName == 'name') {
			let oldKeyName = item.getAttribute('keyName');
			let newKeyName = attr.value.replace(/\W+/g, '_');
			if (oldKeyName != newKeyName) {
				OpenWithCore.prefs.deleteBranch('manual.' + oldKeyName);
				item.setAttribute('keyName', newKeyName);
			}
			saveOrder();
		}
		saveItemToPrefs(item);
		OpenWithCore.suppressLoadList = false;
		OpenWithCore.loadList(true);
	}
}

function saveItemToPrefs(item, saveIcon) {
	let name = item.getAttribute('name');
	let keyName = item.getAttribute('keyName');
	let command = item.getAttribute('command');
	let params = item.getAttribute('params');

	OpenWithCore.prefs.setCharPref('manual.' + keyName, '"' + command + '"' + (params ? ' ' + params : ''));
	if (name != keyName) {
		OpenWithCore.prefs.setCharPref('manual.' + keyName + '.name', name);
	}
	if (saveIcon) {
		let icon = item.getAttribute('icon');
		icon = icon.replace(/32/g, '16');
		icon = icon.replace('?size=dnd', '?size=menu');
		OpenWithCore.prefs.setCharPref('manual.' + keyName + '.icon', icon);
	}
}

function addNewItem() {
	if (fp.show() == Ci.nsIFilePicker.returnOK) {
		let name, command, icon;
		let params = [];
		let saveIcon = false;

		if (/\.desktop$/.test(fp.file.leafName)) {
			var istream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
			istream.init(fp.file, 0x01, 0444, 0);
			istream.QueryInterface(Components.interfaces.nsILineInputStream);

			var line = {};
			var notEOF;
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
						for (let i = 0; i < paths.length; i++) {
							file = new FileUtils.File(paths[i] + '/' + command);
							if (file.exists()) {
								command = file.path;
								break;
							}
						}
					}
					for (let i = 1; i < commandParts.length; i++) {
						params.push(commandParts[i]);
					}

					if (!icon) {
						icon = OpenWithCore.findIconURL(file, 32);
					}
				}
				if (!name && /^Name=/.test(line.value)) {
					name = line.value.substring(5);
				}
				if (/^Icon=/.test(line.value)) {
					if (line.value[5] == '/') {
						icon = 'file://' + line.value.substring(5);
					} else {
						icon = 'moz-icon://stock/' + line.value.substring(5) + '?size=dnd';
					}
				}
			} while (notEOF);
			name = name || fp.file.leafName.replace(/\.desktop$/i, '');
			istream.close();
			saveIcon = true;
		} else {
			name = fp.file.leafName.replace(/\.(app|exe)$/i, '');
			command = fp.file.path;
			icon = OpenWithCore.findIconURL(fp.file, 32);
		}

		let item = document.createElement('richlistitem');
		item.setAttribute('auto', false);
		item.setAttribute('manual', true);
		item.setAttribute('keyName', name.replace(/\W+/g, '_'));
		item.setAttribute('name', name);
		item.setAttribute('command', command);
		item.setAttribute('params', params.join(' '));
		item.setAttribute('icon', icon);
		list.appendChild(item);
		list.selectItem(item);

		saveItemToPrefs(item, saveIcon);
	}
}

function removeItem(item) {
	list.removeItemAt(list.getIndexOfItem(item));

	let keyName = item.getAttribute('keyName');
	if (OpenWithCore.prefs.prefHasUserValue('order')) {
		let order = JSON.parse(OpenWithCore.prefs.getCharPref('order'));
		let index = order.indexOf('m/' + keyName);
		if (index >= 0) {
			order.splice(index, 1);
			OpenWithCore.prefs.setCharPref('order', JSON.stringify(order));
		}
	}

	OpenWithCore.prefs.deleteBranch('manual.' + keyName);
	OpenWithCore.loadList(true); // grrr, bug 343600
}

function moveUp(button) {
	let item = document.getBindingParent(button);
	let previous = item.previousSibling;
	if (previous) {
		item.parentNode.insertBefore(item, previous);
	}
	saveOrder();
}

function moveDown(button) {
	let item = document.getBindingParent(button);
	let next = item.nextSibling;
	if (next) {
		item.parentNode.insertBefore(next, item);
	}
	saveOrder();
}

function saveOrder() {
	let order = [];
	for (var i = 0; i < list.itemCount; i++) {
		let item = list.getItemAtIndex(i);
		let auto = item.getAttribute('auto') == 'true';
		order.push((auto ? 'a/' : 'm/') + item.getAttribute('keyName'));
	}
	OpenWithCore.prefs.setCharPref('order', JSON.stringify(order));
	OpenWithCore.loadList(true);
}

function restoreOrder() {
	if (OpenWithCore.prefs.prefHasUserValue('order')) {
		OpenWithCore.prefs.clearUserPref('order');
		OpenWithCore.loadList(true);
		loadBrowserList();
	}
}
