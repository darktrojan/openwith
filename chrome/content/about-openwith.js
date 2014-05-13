const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://openwith/openwith.jsm');

let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
fp.init(this, document.title, Ci.nsIFilePicker.modeOpen);
fp.appendFilters(Ci.nsIFilePicker.filterApps);

let appsDir = null;
if (Services.dirsvc.has('ProgF')) {
	appsDir = Services.dirsvc.get('ProgF', Ci.nsIFile);
} else if (Services.dirsvc.has('LocApp')) {
	appsDir = Services.dirsvc.get('LocApp', Ci.nsIFile);
} else {
	appsDir = new FileUtils.File('/usr/share/applications');
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

	let appname = Services.appinfo.name;
	let appversion = parseFloat(Services.appinfo.version);

	if (appname == 'Thunderbird') {
		$('openwith-viewmenu-row').collapsed = true;
		$('openwith-contextmenu-row').collapsed = true;
		$('openwith-placescontext-row').collapsed = true;
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

	$('openwith-placescontext-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('placescontext') ? 1 :
			(OpenWithCore.prefs.getBoolPref('placescontext.submenu') ? 2 : 0);

	$('openwith-tabmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('tabmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref('tabmenu.submenu') ? 2 : 0);

	if (browserWindow && browserWindow.OpenWith.tabButtonContainer) {
		$('openwith-tabbar-group').selectedIndex =
				OpenWithCore.prefs.getBoolPref('tabbar') ? 1 :
				(OpenWithCore.prefs.getBoolPref('tabbar.menu') ? 2 : 0);
	} else {
		$('openwith-tabbar-row').collapsed = true;
	}

	if (browserWindow && browserWindow.OpenWith.toolbarButtonContainer) {
		$('openwith-toolbar-group').selectedIndex =
				OpenWithCore.prefs.getBoolPref('toolbar') ? 0 : 1;
	} else {
		$('openwith-toolbar-row').collapsed = true;
	}

	if (appname == 'Firefox' && appversion >= 20) {
		$('openwith-toolbox-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref('toolbox') ? 1 :
				(OpenWithCore.prefs.getBoolPref('toolbox.menu') ? 2 : 0);
	} else {
		$('openwith-toolbox-row').collapsed = true;
	}

	if (appname != 'Firefox' || appversion < 29) {
		$('openwith-toolbarhelp').collapsed = true;
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

	for (let entry of OpenWithCore.list) {
		let item = document.createElement('richlistitem');
		for (let [key, value] of Iterator(entry)) {
			switch (key) {
			case 'auto':
				item.setAttribute('auto', value);
				item.setAttribute('manual', !value);
				break;
			case 'hidden':
				item.setAttribute('browserHidden', value);
				break;
			case 'icon':
				let icon = value;
				icon = icon.replace('?size=menu', '?size=dnd');
				icon = icon.replace(/16/g, '32');
				item.setAttribute(key, icon);
				break;
			case 'params':
				item.setAttribute(key, value.join(' '));
				break;
			default:
				item.setAttribute(key, value);
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
	let keyName = item.getAttribute('keyName');
	let hidePref = OpenWithCore.prefs.getCharPref('hide').toLowerCase().split(/\s+/);
	if (hidePref.length == 1 && hidePref[0] == '') {
		hidePref = [];
	}
	let index = hidePref.indexOf(keyName);

	if (hidden && index < 0) {
		hidePref.push(keyName);
	} else if (!hidden && index >= 0) {
		hidePref.splice(index, 1);
	}
	OpenWithCore.prefs.setCharPref('hide', hidePref.join(' '));

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
	if (appsDir && appsDir.exists()) {
		fp.displayDirectory = appsDir;
	}

	if (fp.show() == Ci.nsIFilePicker.returnOK) {
		appsDir = fp.file.parent;
		let item = document.createElement('richlistitem');

		if (/\.desktop$/.test(fp.file.leafName)) {
			let program = OpenWithCore.readDesktopFile(fp.file, []);
			delete program.hidden;
			program.auto = false;
			program.icon = program.icon.replace('?size=menu', '?size=dnd');
			program.icon = program.icon.replace(/16/g, '32');
			program.keyName = program.keyName.replace(/\.desktop$/, '');
			program.manual = true;
			program.params = program.params.join(' ');
			for (let [name, value] of Iterator(program)) {
				item.setAttribute(name, value);
			}
			saveItemToPrefs(item, true);
		} else {
			let name = fp.file.leafName.replace(/\.(app|exe)$/i, '');
			let command = fp.file.path;
			let icon = OpenWithCore.findIconURL(fp.file, 32);

			item.setAttribute('auto', false);
			item.setAttribute('manual', true);
			item.setAttribute('keyName', name.replace(/\W+/g, '_'));
			item.setAttribute('name', name);
			item.setAttribute('command', command);
			item.setAttribute('params', '');
			item.setAttribute('icon', icon);

			saveItemToPrefs(item, false);
		}

		list.appendChild(item);
		list.selectItem(item);
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
	for (let i = 0; i < list.itemCount; i++) {
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
