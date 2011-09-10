const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import ('resource://openwith/openwith.jsm');
Cu.import ('resource://gre/modules/Services.jsm');

let browserWindow = Services.wm.getMostRecentWindow ("navigator:browser");

let fp = Cc ["@mozilla.org/filepicker;1"].createInstance (Ci.nsIFilePicker);
fp.init (this, document.title, Ci.nsIFilePicker.modeOpen);
fp.appendFilters (Ci.nsIFilePicker.filterApps);
if (Services.dirsvc.has ("ProgF"))
	fp.displayDirectory = Services.dirsvc.get ("ProgF", Ci.nsIFile);
else if (Services.dirsvc.has ("LocApp"))
	fp.displayDirectory = Services.dirsvc.get ("LocApp", Ci.nsIFile);

function $(id) {
	return document.getElementById (id);
}

let loadingDropDowns = false;
let changingPref = false;
function loadDropDowns () {
	if (changingPref) {
		return;
	}
	loadingDropDowns = true;
	$('openwith-viewmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref ('viewmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref ('viewmenu.submenu') ? 2 : 0);

	$('openwith-contextmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref ('contextmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref ('contextmenu.submenu') ? 2 : 0);

	$('openwith-contextmenulink-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref ('contextmenulink') ? 1 :
			(OpenWithCore.prefs.getBoolPref ('contextmenulink.submenu') ? 2 : 0);

	$('openwith-tabmenu-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref ('tabmenu') ? 1 :
			(OpenWithCore.prefs.getBoolPref ('tabmenu.submenu') ? 2 : 0);

	if (Services.appinfo.name == 'Firefox' && parseFloat (Services.appinfo.version) >= 4) {
		$('openwith-tabbar-row').collapsed = true;
	} else {
		$('openwith-tabbar-group').disabled = browserWindow.OpenWith.tabButtonContainer == null;
		$('openwith-tabbar-group').selectedIndex =
				OpenWithCore.prefs.getBoolPref ('tabbar') ? 1 :
				(OpenWithCore.prefs.getBoolPref ('tabbar.menu') ? 2 : 0);
	}

	$('openwith-toolbar-group').disabled = browserWindow.OpenWith.toolbarButtonContainer == null;
	$('openwith-toolbar-group').selectedIndex =
			OpenWithCore.prefs.getBoolPref ('toolbar') ? 0 : 1;
	loadingDropDowns = false;
}

loadDropDowns ();
Services.obs.addObserver ({
	observe: function (subject, topic, data) {
		loadDropDowns ();
	}
}, 'openWithLocationsChanged', false);

let list = $('list');
loadBrowserList ();

function loadBrowserList () {
	while (list.itemCount) {
		list.removeItemAt (0);
	}

	for (let i = 0, iCount = OpenWithCore.list.length; i < iCount; i++) {
		let entry = OpenWithCore.list [i];
		let item = document.createElement ('richlistitem');
		for (let a in entry) {
			switch (a) {
			case 'auto':
				item.setAttribute ('auto', entry [a]);
				item.setAttribute ('manual', !entry [a]);
				break;
			case 'hidden':
				item.setAttribute ('browserHidden', entry [a]);
				break;
			case 'icon':
				item.setAttribute (a, entry [a].replace (/16/g, '32'));
				break;
			case 'params':
				item.setAttribute (a, entry [a].join (' '));
				break;
			default:
				item.setAttribute (a, entry [a]);
				break;
			}
		}
		list.appendChild (item);
	}
}

function updatePrefs (pref1, pref2, index) {
	if (loadingDropDowns) {
		return;
	}
	changingPref = true;
	switch (index) {
	case 0:
		OpenWithCore.prefs.setBoolPref (pref1, false);
		OpenWithCore.prefs.setBoolPref (pref2, false);
		break;
	case 1:
		OpenWithCore.prefs.setBoolPref (pref1, true);
		OpenWithCore.prefs.setBoolPref (pref2, false);
		break;
	case 2:
		OpenWithCore.prefs.setBoolPref (pref1, false);
		OpenWithCore.prefs.setBoolPref (pref2, true);
		break;
	}
	changingPref = false;
}

function setHidden (item, hidden) {
	let keyName = item.getAttribute ('keyName').toLowerCase ();
	let pref = OpenWithCore.prefs.getCharPref ('hide').toLowerCase ();
	if (hidden) {
		pref += ' ' + keyName
	} else {
		pref = pref.replace (new RegExp ('\\b' + keyName + '\\b'), '');
	}
	OpenWithCore.prefs.setCharPref ('hide', pref.trim ().replace (/\s+/g, ' '));

	item.setAttribute ('browserHidden', hidden);
	item.parentNode.focus ();
}

function editCommand (item) {
	let command = item.getAttribute ('command');
	let file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
	file.initWithPath (command);
	fp.defaultString = file.leafName;
	fp.displayDirectory = file.parent;
	if (fp.show () == Ci.nsIFilePicker.returnOK) {
		item.setAttribute ('command', fp.file.path);
		item.setAttribute ('icon', OpenWithCore.findIconURL (fp.file, 32));
		saveItemToPrefs (item);
	}
}

function changeAttribute (item, attrName) {
	let original = item.getAttribute (attrName);
	let attr = { value: original };
	let text;
	switch (attrName) {
	case 'name':
		text = OpenWithCore.strings.GetStringFromName ('namePromptText');
		break;
	case 'params':
		let file = Cc ['@mozilla.org/file/local;1'].createInstance (Ci.nsILocalFile);
		file.initWithPath (item.getAttribute ('command'));
		text = OpenWithCore.strings.formatStringFromName ('paramsPromptText', [file.leafName], 1);
		break;
	}
	if (Services.prompt.prompt (this, document.title, text, attr, null, {}) && attr.value != original) {
		item.setAttribute (attrName, attr.value);

		OpenWithCore.suppressLoadList = true;
		if (attrName == 'name') {
			let oldKeyName = item.getAttribute ('keyName');
			let newKeyName = attr.value.replace (/\W+/g, '_');
			if (oldKeyName != newKeyName) {
				OpenWithCore.prefs.deleteBranch ('manual.' + oldKeyName);
				item.setAttribute ('keyName', newKeyName);
			}
			saveOrder ();
		}
		saveItemToPrefs (item);
		OpenWithCore.suppressLoadList = false;
		OpenWithCore.loadList (true);
	}
}

function saveItemToPrefs (item) {
	let name = item.getAttribute ('name');
	let keyName = item.getAttribute ('keyName');
	let command = item.getAttribute ('command');
	let params = item.getAttribute ('params');

	OpenWithCore.prefs.setCharPref ('manual.' + keyName, '"' + command + '"' + (params ? ' ' + params : ''));
	if (name != keyName) {
		OpenWithCore.prefs.setCharPref ('manual.' + keyName + '.name', name);
	}
}

function addNewItem () {
	if (fp.show () == Ci.nsIFilePicker.returnOK) {
		let name = fp.file.leafName.replace (/\.(app|exe)$/i, '');

		let item = document.createElement ('richlistitem');
		item.setAttribute ('auto', false);
		item.setAttribute ('manual', true);
		item.setAttribute ('keyName', name.replace (/\W+/g, '_'));
		item.setAttribute ('name', name);
		item.setAttribute ('command', fp.file.path);
		item.setAttribute ('params', '');
		item.setAttribute ('icon', OpenWithCore.findIconURL (fp.file, 32));
		list.appendChild (item);
		list.selectItem (item);

		saveItemToPrefs (item);
	}
}

function removeItem (item) {
	list.removeItemAt (list.getIndexOfItem (item));

	let keyName = item.getAttribute ('keyName')
	if (OpenWithCore.prefs.prefHasUserValue ('order')) {
		let order = JSON.parse (OpenWithCore.prefs.getCharPref ('order'));
		let index = order.indexOf ('m/' + keyName);
		if (index >= 0) {
			order.splice (index, 1);
			OpenWithCore.prefs.setCharPref ('order', JSON.stringify (order));
		}
	}

	OpenWithCore.prefs.deleteBranch ('manual.' + keyName);
	OpenWithCore.loadList (true); // grrr, bug 343600
}

function moveUp (button) {
	let item = document.getBindingParent (button);
	let previous = item.previousSibling;
	if (previous) {
		item.parentNode.insertBefore (item, previous);
	}
	saveOrder ();
}

function moveDown (button) {
	let item = document.getBindingParent (button);
	let next = item.nextSibling;
	if (next) {
		item.parentNode.insertBefore (next, item);
	}
	saveOrder ();
}

function saveOrder () {
	let order = [];
	for (var i = 0; i < list.itemCount; i++) {
		let item = list.getItemAtIndex (i);
		let auto = item.getAttribute ('auto') == 'true';
		order.push ((auto ? 'a/' : 'm/') + item.getAttribute ('keyName'));
	}
	OpenWithCore.prefs.setCharPref ('order', JSON.stringify (order));
	OpenWithCore.loadList (true);
}

function restoreOrder () {
	if (OpenWithCore.prefs.prefHasUserValue ('order')) {
		OpenWithCore.prefs.clearUserPref ('order');
		OpenWithCore.loadList (true);
		loadBrowserList ();
	}
}
