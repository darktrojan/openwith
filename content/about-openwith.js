/* globals Components, Iterator, openDialog, -name */
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

/* globals FileUtils, Services, XPCOMUtils, OpenWithCore */
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://openwith/openwith.jsm');

/* globals clipboardHelper */
XPCOMUtils.defineLazyServiceGetter(this, 'clipboardHelper', '@mozilla.org/widget/clipboardhelper;1', 'nsIClipboardHelper');

let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
fp.init(this, document.title, Ci.nsIFilePicker.modeOpen);
fp.appendFilters(Ci.nsIFilePicker.filterApps);
fp.appendFilters(Ci.nsIFilePicker.filterAll);

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
let locationObserver = {
	observe: function() {
		if (changingPref) {
			return;
		}
		loadingDropDowns = true;

		let appname = Services.appinfo.name;
		document.documentElement.setAttribute('appname', appname);

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

		if (appname == 'Firefox' || appname == 'Pale Moon') {
			$('openwith-toolbox-group').selectedIndex =
				OpenWithCore.prefs.getBoolPref('toolbox') ? 1 :
					(OpenWithCore.prefs.getBoolPref('toolbox.menu') ? 2 : 0);
		} else {
			$('openwith-toolbox-row').collapsed = true;
			$('openwith-toolbarhelp').collapsed = true;
		}

		loadingDropDowns = false;
	},
	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
	])
};
locationObserver.observe();
Services.obs.addObserver(locationObserver, 'openWithLocationsChanged', true);

function CheckboxObserver(checkboxID, pref) {
	this.checkbox = $(checkboxID);
	this.pref = pref;
	this.observe();
	OpenWithCore.prefs.addObserver(this.pref, this, true);
}
CheckboxObserver.prototype = {
	enable: function() {
		OpenWithCore.prefs.setBoolPref(this.pref, this.checkbox.checked);
	},
	observe: function() {
		this.checkbox.checked = OpenWithCore.prefs.getBoolPref(this.pref);
	},
	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
	])
};
/* exported loggingObserver, dataCollectionObserver */
let loggingObserver = new CheckboxObserver('logging', 'log.enabled');
let dataCollectionObserver = new CheckboxObserver('datacollection', 'datacollection.optin');

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
				item.setAttribute(key, value);
				break;
			case 'keyInfo':
				if (value !== null) {
					item.setAttribute(key, value);
					item.setAttribute('keyInfoHuman', getHumanKeyInfo(value));
				}
				break;
			default:
				if (value !== null) {
					item.setAttribute(key, value);
				}
				break;
			}
		}
		list.appendChild(item);
	}
}

function getHumanKeyInfo(value) {
	value = value.replace('VK_', '');
	value = value.replace('accel', Services.appinfo.OS == 'Darwin' ?
			OpenWithCore.strings.GetStringFromName('cmdkey') :
			OpenWithCore.strings.GetStringFromName('ctrlkey'));
	value = value.replace('shift', OpenWithCore.strings.GetStringFromName('shiftkey'));
	value = value.replace('alt', OpenWithCore.strings.GetStringFromName('altkey'));
	return value;
}

/* exported updatePrefs */
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

/* exported setHidden */
function setHidden(item, hidden) {
	let prefName = 'auto.' + item.getAttribute('keyName') + '.hidden';
	if (hidden) {
		OpenWithCore.prefs.setBoolPref(prefName, true);
	} else {
		OpenWithCore.prefs.clearUserPref(prefName);
	}

	item.isHidden = hidden;
	item.parentNode.focus();
}

/* exported editCommand */
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

/* exported changeAttribute */
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
	case 'accessKey':
		text = OpenWithCore.strings.GetStringFromName('accessKeyPromptText');
		break;
	}
	if (Services.prompt.prompt(this, document.title, text, attr, null, {}) && attr.value != original) {
		let oldName = item.getAttribute('name');
		let oldKeyName = item.getAttribute('keyName');
		if (oldKeyName.toLowerCase() == oldName.replace(/\W+/g, '_').toLowerCase()) {
			OpenWithCore.suppressLoadList = true;
			let newKeyName = generateRandomKeyName();
			if (OpenWithCore.prefs.getPrefType('manual.' + oldKeyName + '.icon') == Services.prefs.PREF_STRING) {
				OpenWithCore.prefs.setCharPref(
					'manual.' + newKeyName + '.icon',
					OpenWithCore.prefs.getCharPref('manual.' + oldKeyName + '.icon')
				);
			}
			OpenWithCore.prefs.deleteBranch('manual.' + oldKeyName);
			item.setAttribute('keyName', newKeyName);
		}

		if (attrName == 'accessKey' && !attr.value) {
			item.removeAttribute(attrName);
		} else {
			item.setAttribute(attrName, attr.value);
		}
		if (attrName == 'name' && item.getAttribute('auto') == 'true') {
			// Avoid saving everything
			let keyName = item.getAttribute('keyName');
			OpenWithCore.prefs.setCharPref('auto.' + keyName + '.name', attr.value);
		} else {
			saveItemToPrefs(item);
		}
	}
}

/* exported editKeyInfo */
function editKeyInfo(item) {
	let current = item.getAttribute('keyInfo');
	let existingKeys = ['VK_F7'];
	for (let k of getTopWindow().document.getElementsByTagName('key')) {
		let key = (k.getAttribute('key') || k.getAttribute('keycode')).toUpperCase();
		let modifiers = k.getAttribute('modifiers') || [];

		if (!Array.isArray(modifiers)) {
			modifiers = modifiers.split(',');
		}
		modifiers.push(key);
		existingKeys.push(modifiers.join('+'));
	}

	let returnValues = Object.create(null);
	if (current) {
		returnValues.previous = current.split('+');
		let index = existingKeys.indexOf(current);
		if (index >= 0) {
			existingKeys.splice(index, 1);
		}
	}
	returnValues.promptText =
			OpenWithCore.strings.formatStringFromName('keyinfoPromptText', [item.getAttribute('name')], 1);
	returnValues.existingKeys = existingKeys;
	openDialog('chrome://openwith/content/keyinfo.xul', 'keyinfo', 'centerscreen,modal', returnValues);
	if (returnValues.removeKeyInfo === true) {
		item.removeAttribute('keyInfo');
		item.removeAttribute('keyInfoHuman');
	} else if (Array.isArray(returnValues.keyInfo)) {
		let value = returnValues.keyInfo.join('+');
		item.setAttribute('keyInfo', value);
		item.setAttribute('keyInfoHuman', getHumanKeyInfo(value));
	}
	saveItemToPrefs(item);
}

function getTopWindow() {
	return window.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIWebNavigation)
		.QueryInterface(Ci.nsIDocShellTreeItem)
		.rootTreeItem
		.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIDOMWindow)
		.wrappedJSObject;
}

function saveItemToPrefs(item, saveIcon) {
	let name = item.getAttribute('name');
	let keyName = item.getAttribute('keyName');
	let command = item.getAttribute('command');
	let params = item.getAttribute('params');
	let type = item.getAttribute('auto') == 'true' ? 'auto' : 'manual';

	OpenWithCore.suppressLoadList = true;

	for (let k of ['accessKey', 'keyInfo']) {
		let k_lc = k.toLowerCase();
		let v = item.getAttribute(k);
		if (v) {
			OpenWithCore.prefs.setCharPref(type + '.' + keyName + '.' + k_lc, v);
		} else {
			OpenWithCore.prefs.clearUserPref(type + '.' + keyName + '.' + k_lc);
		}
	}

	if (type == 'manual') {
		OpenWithCore.prefs.setCharPref('manual.' + keyName, '"' + command + '"' + (params ? ' ' + params : ''));
		OpenWithCore.prefs.setCharPref('manual.' + keyName + '.name', name);

		if (saveIcon) {
			let icon = item.getAttribute('icon');
			icon = icon.replace(/32/g, '16');
			icon = icon.replace('?size=dnd', '?size=menu');
			OpenWithCore.prefs.setCharPref('manual.' + keyName + '.icon', icon);
		}
	}

	OpenWithCore.suppressLoadList = false;
	saveOrder(); // Calls OpenWithCore.loadList()
}

function generateRandomKeyName() {
	let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

	let keyName = '';
	for (let i = 0; i < 8; i++) {
		keyName += chars[Math.floor(Math.random() * chars.length)];
	}

	return keyName;
}

/* exported addNewItem */
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
			program.keyName = generateRandomKeyName();
			program.manual = true;
			program.params = program.params;
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
			item.setAttribute('keyName', generateRandomKeyName());
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

/* exported removeItem */
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

/* exported restoreOrder */
function restoreOrder() {
	if (OpenWithCore.prefs.prefHasUserValue('order')) {
		OpenWithCore.prefs.clearUserPref('order');
		OpenWithCore.loadList(true);
		loadBrowserList();
	}
}

/* exported duplicateItem */
function duplicateItem(srcItem) {
	let name = OpenWithCore.strings.formatStringFromName('duplicatedBrowserNewName', [srcItem.getAttribute('name')], 1);
	let item = document.createElement('richlistitem');
	item.setAttribute('auto', 'false');
	item.setAttribute('manual', 'true');
	item.setAttribute('name', name);
	item.setAttribute('keyName', generateRandomKeyName());
	item.setAttribute('command', srcItem.getAttribute('command'));
	item.setAttribute('params', srcItem.getAttribute('params'));
	item.setAttribute('icon', srcItem.getAttribute('icon'));
	list.insertBefore(item, srcItem.nextSibling);
	saveItemToPrefs(item, true);
	saveOrder();
}

/* exported contextShowing */
function contextShowing(context) {
	$('context-name').label = document.popupNode.getAttribute('name');
	let auto = document.popupNode.getAttribute('auto') == 'true';
	for (let item of context.querySelectorAll('.noauto')) {
		item.hidden = auto;
	}
	for (let item of context.querySelectorAll('.nomanual')) {
		item.hidden = !auto;
	}
}

/* exported copyKeyName */
function copyKeyName(item) {
	let auto = document.popupNode.getAttribute('auto') == 'true';
	clipboardHelper.copyString((auto ? 'auto.' : 'manual.') + item.getAttribute('keyName'));
}

let itemToMove, itemToPlaceBefore;
let dummy = document.createElement('richlistitem');
dummy.id = 'dummy';
dummy.className = 'placebefore';
function cleanUpDrag() {
	dummy.remove();
	let oldPlaceBefore = document.querySelector('.placebefore');
	if (oldPlaceBefore) {
		oldPlaceBefore.classList.remove('placebefore');
	}
}

/* exported dragStart */
function dragStart(event) {
	itemToMove = event.target;
	let editButton = document.getAnonymousElementByAttribute(itemToMove, 'class', 'edit');
	if (editButton.open) {
		event.preventDefault();
		return;
	}

	event.dataTransfer.setData('openwith/drag', 'true');
	event.dataTransfer.setDragImage(itemToMove, 16, 16);
	event.dataTransfer.effectAllowed = 'move';

	itemToMove.removeAttribute('current');
	itemToMove.removeAttribute('selected');
}
list.addEventListener('dragover', function(event) {
	if (!event.dataTransfer.getData('openwith/drag')) {
		return;
	}

	event.preventDefault();
	cleanUpDrag();

	let indexOfItem = list.getIndexOfItem(itemToMove);
	itemToPlaceBefore = null;
	for (let i = 0; i <= indexOfItem; i++) {
		let item = list.getItemAtIndex(i);
		let rect = item.getBoundingClientRect();
		if (event.clientY < (rect.top + rect.height / 2)) {
			itemToPlaceBefore = item;
			break;
		}
	}
	if (!itemToPlaceBefore) {
		for (let i = list.itemCount - 1; i >= indexOfItem; i--) {
			let item = list.getItemAtIndex(i);
			let rect = item.getBoundingClientRect();
			if (event.clientY > (rect.top + rect.height / 2)) {
				itemToPlaceBefore = item.nextElementSibling;
				break;
			}
		}
	}

	if (!itemToPlaceBefore) {
		list.appendChild(dummy);
	} else if (itemToMove != itemToPlaceBefore && itemToMove != itemToPlaceBefore.previousSibling) {
		itemToPlaceBefore.classList.add('placebefore');
	}
});
list.addEventListener('dragexit', function(event) {
	if (event.target == list && !!event.dataTransfer.getData('openwith/drag')) {
		cleanUpDrag();
		event.dataTransfer.dropEffect = 'none';
	}
});
list.addEventListener('drop', function(event) {
	if (!!event.dataTransfer.getData('openwith/drag')) {
		event.preventDefault();
	}
});
list.addEventListener('dragend', function(event) {
	cleanUpDrag();
	if (!!event.dataTransfer.getData('openwith/drag') && event.dataTransfer.dropEffect == 'move' && itemToMove != itemToPlaceBefore) {
		list.insertBefore(itemToMove, itemToPlaceBefore);
		// Re-set the selected item to reselect it
		list.selectedIndex = -1;
		list.selectedItem = itemToMove;
		saveOrder();
	}
	itemToMove = itemToPlaceBefore = null;
});

/* globals OpenWithDataCollector */
Cu.import('resource://openwith/dataCollection.jsm');
OpenWithDataCollector.incrementCount('aboutOpenWithOpened');
