const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var instantApply = document.getElementsByTagName ('preference').item (0).instantApply;
var strings = document.getElementById ('openwith-strings');

var prefWindow = document.documentElement;
var manualList = document.getElementById ('openwith-manualentry-pane.list');
var renameButton = document.getElementById ('openwith-manualentry-pane.rename-button');
var editButton = document.getElementById ('openwith-manualentry-pane.editcommand-button');
var removeButton = document.getElementById ('openwith-manualentry-pane.remove-button');

var prefs = Cc ["@mozilla.org/preferences-service;1"].getService (Ci.nsIPrefService).getBranch ("extensions.openwith.");

var fp = Cc ["@mozilla.org/filepicker;1"].createInstance (Ci.nsIFilePicker);
fp.init (window, strings.getString ('selectFile'), Ci.nsIFilePicker.modeOpen);
fp.appendFilters (Ci.nsIFilePicker.filterApps);

try {
	fp.displayDirectory = Cc ["@mozilla.org/file/directory_service;1"].getService (Ci.nsIProperties).get ("ProgF", Ci.nsIFile);
} catch (e) {
}

var ioService = Cc ["@mozilla.org/network/io-service;1"].getService (Ci.nsIIOService);

var hidePref = prefs.getCharPref ("hide").trim ().toLowerCase ();
var hidden = hidePref.split (/\s/);

/*

manualList.addEventListener ('keypress', function (event) {
	var item = manualList.selectedItem;
	if (item) {
		switch (event.keyCode) {
			case 46:
				removeItem (item);
				break;
			case 113:
				beginRename (item);
				break;
		}
	}
}, false);

manualList.addEventListener ('dblclick', function (event) {
	addNewItem ();
}, false);

manualList.addEventListener ('select', validate, false);
*/
prefWindow.onload = function () {
	prefWindow.showPane (document.getElementById (prefWindow.getAttribute ('lastSelected')));
	prefWindow.onload = null;
	
	var wm = Cc ["@mozilla.org/appshell/window-mediator;1"].getService (Ci.nsIWindowMediator);
	var browserWindow = wm.getMostRecentWindow ("navigator:browser");
	document.getElementById ('openwith-tabbar').disabled = browserWindow.OpenWith.tabButtonContainer == null;
	
	initList ();
}

function initList () {
	if (false && Cc ["@mozilla.org/windows-registry-key;1"]) {
		var registryKey = Cc ["@mozilla.org/windows-registry-key;1"].createInstance (Ci.nsIWindowsRegKey);
		registryKey.open (this.registryKey.ROOT_KEY_LOCAL_MACHINE, "SOFTWARE\\Clients\\StartMenuInternet", Ci.nsIWindowsRegKey.ACCESS_READ);
		for (var i = 0; i < this.registryKey.childCount; i++) {
			try {
				var keyName = this.registryKey.getChildName (i);
				var subkey1 = this.registryKey.openChild (keyName, Ci.nsIWindowsRegKey.ACCESS_READ);
				var name = subkey1.readStringValue (null);
				subkey1.close ();
				var subkey2 = this.registryKey.openChild (keyName + '\\shell\\open\\command', Ci.nsIWindowsRegKey.ACCESS_READ);
				var command = subkey2.readStringValue (null);
				subkey2.close ();
				
				command = command.replace (/%(\w+)%/g, function (m) {
					return OpenWith.env.get (m.substring (1, m.length - 1));
				});
				keyName = keyName.replace (' ', '_').toLowerCase ();
				
				addItem ({
					keyName: keyName,
					name: name,
					command: command,
					icon: getIcon ('auto.' + keyName, command),
					browserHidden: hidden.indexOf (keyName) >= 0,
					autodetect: true
				});
			} catch (e) {
				Cu.reportError (e);
			}
		}
	}
	
	var manual = prefs.getChildList ("manual.", {});
	manual.sort ();
	for (var i = 0; i < manual.length; i++) {
		var keyName = manual [i];
		if (/\.icon$/.test (keyName)) {
			continue;
		}
		var name = keyName.substring (7).replace ('_', ' ');
		var command = prefs.getCharPref (keyName);

		addItem ({
			keyName: i,
			name: name,
			command: command,
			icon: getIcon ('manual.' + keyName, command)
		});
	}
}

function modifyContextMenu (event) {
	var item = manualList.currentItem;
	if (!item) {
		return false;
	}
	var autodetect = item.getAttribute ('autodetect') == 'true';
	var browserHidden = item.getAttribute ('browserHidden') == 'true';
	document.getElementById ('openwith-manualentry-menu-hide').hidden = !autodetect || browserHidden;
	document.getElementById ('openwith-manualentry-menu-show').hidden = !autodetect || !browserHidden;
	document.getElementById ('openwith-manualentry-menu-rename').hidden = autodetect;
	document.getElementById ('openwith-manualentry-menu-edit').hidden = autodetect;
	document.getElementById ('openwith-manualentry-menu-remove').hidden = autodetect;
	if (autodetect) {
		document.getElementById ('openwith-manualentry-menu-hide')
			.setAttribute ('label', 'Hide ' + manualList.currentItem.getAttribute ('name'));
		document.getElementById ('openwith-manualentry-menu-show')
			.setAttribute ('label', 'Show ' + manualList.currentItem.getAttribute ('name'));
	} else {
		document.getElementById ('openwith-manualentry-menu-remove')
			.setAttribute ('label', 'Remove ' + manualList.currentItem.getAttribute ('name'));
	}
}

function addItem (attributes) {
	var item = document.createElement ('richlistitem');
	for (var a in attributes) {
		item.setAttribute (a, attributes [a]);
	}
	manualList.appendChild (item);

	return item;
}

function hideItem () {
	var item = manualList.currentItem;
	item.setAttribute ('browserHidden', 'true');
	if (hidden.indexOf (item.getAttribute ('keyName')) < 0) {
		hidden.push (item.getAttribute ('keyName'));
	}
	if (instantApply) {
		prefs.setCharPref ("hide", hidden.join (' '));
	}
}

function showItem () {
	var item = manualList.currentItem;
	item.setAttribute ('browserHidden', 'false');
	if (hidden.indexOf (item.getAttribute ('keyName')) >= 0) {
		hidden.splice (hidden.indexOf (item.getAttribute ('keyName')), 1);
	}
	if (instantApply) {
		prefs.setCharPref ("hide", hidden.join (' '));
	}
}

function renameItem () {
	var item = manualList.currentItem;
}

function getCommand (command) {
	if (command [0] == '/') {
		command = command.replace (/\s.*$/, '');
	} else {
		command = command.replace (/^"/, '').replace (/".*$/, '');
	}
	return command;
}

function getIcon (fullKeyName, command) {
	command = getCommand (command);
	var icon;
	try {
		icon = this.prefs.getCharPref (fullKeyName + ".icon");
	} catch (e) {
		var file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
		try {
			file.initWithPath (command);
			icon = 'moz-icon:' + this.ioService.newFileURI (file).spec + '?size=menu';
		} catch (f) {
			Cu.reportError (e);
		}
	}
	return icon;
}

function doAccept () {
	prefWindow.setAttribute ('lastSelected', prefWindow.currentPane.id);

	if (instantApply) {
		return;
	}

//	prefs.deleteBranch ("manual.");
//	for (var i = 0; i < manualList.itemCount; i++) {
//		saveItem (manualList.getItemAtIndex (i));
//	}
	prefs.setCharPref ("hide", hidden.join (' '));
//	prefs.setBoolPref ("beep", true);
//	prefs.clearUserPref ("beep");
}
/*
function validate () {
	renameButton.disabled = editButton.disabled = removeButton.disabled = manualList.selectedCount == 0;
}

function addNewItem () {
	if (fp.show () == Ci.nsIFilePicker.returnOK) {
		var item = addItem (fp.file.leafName.replace (/\.(app|exe)$/, ''), fp.file.path);
		manualList.selectItem (item);
		manualList.ensureElementIsVisible (item);

		beginRename (item);
	}
}

function renameSelectedItem () {
	var item = manualList.selectedItem;
	if (item) {
		beginRename (item);
	}
}

function beginRename (item) {
	var subitem = item.firstChild;
	var label = subitem.lastChild;
	var oldValue = label.getAttribute ('value');

	var textbox = document.createElement ('textbox');
	textbox.setAttribute ('value', label.value);
	subitem.removeChild (label);
	subitem.appendChild (textbox);

	textbox.selectionStart = 0;
	textbox.focus ();
	textbox.onblur = function () {
		endRename (this, oldValue);
	};
	textbox.onkeypress = function (event) {
		switch (event.keyCode) {
			case 13:
				endRename (this, oldValue);
				manualList.focus ();
				event.preventDefault ();
				break;
			case 27:
				cancelRename (this, oldValue);
				manualList.focus ();
				event.preventDefault ();
				break;
			case 46:
				event.stopPropagation ();
				break;
		}
	};
}

function cancelRename (textbox, oldValue) {
	var subitem = textbox.parentNode;
	var item = subitem.parentNode;

	var label = document.createElement ('label');
	label.setAttribute ('value', oldValue);
	subitem.removeChild (textbox);
	subitem.appendChild (label);
}

function endRename (textbox, oldValue) {
	var subitem = textbox.parentNode;
	var item = subitem.parentNode;
	var newValue = textbox.value;
	
	if (newValue == '') {
		cancelRename (textbox, oldValue);
		return;
	}

	var label = document.createElement ('label');
	label.setAttribute ('value', newValue);
	subitem.removeChild (textbox);
	subitem.appendChild (label);

	if (instantApply) {
		if (oldValue) {
			prefs.deleteBranch ("manual." + oldValue.replace (" ", "_"));
		}
		saveItem (item);
	}
}

function editSelectedItem () {
	var item = manualList.selectedItem;
	if (item) {
		beginEdit (item);
	}
}

function beginEdit (item) {
	var subitem = item.lastChild;
	var label = subitem.firstChild;
	var oldValue = label.getAttribute ('value');

	var textbox = document.createElement ('textbox');
	textbox.setAttribute ('value', label.value);
	textbox.setAttribute ('align', 'center');
	textbox.setAttribute ('flex', '1');
	subitem.removeChild (label);
	subitem.insertBefore (textbox, subitem.firstChild);

	textbox.selectionStart = 0;
	textbox.focus ();
	textbox.onblur = function () {
		endEdit (this, oldValue);
	};
	textbox.onkeypress = function (event) {
		switch (event.keyCode) {
			case 13:
				endEdit (this, oldValue);
				manualList.focus ();
				event.preventDefault ();
				break;
			case 27:
				cancelEdit (this, oldValue);
				manualList.focus ();
				event.preventDefault ();
				break;
			case 46:
				event.stopPropagation ();
				break;
		}
	};
}

function cancelEdit (textbox, oldValue) {
	var subitem = textbox.parentNode;
	var item = subitem.parentNode;

	var label = document.createElement ('label');
	label.setAttribute ('value', oldValue);
	label.setAttribute ('crop', 'start');
	label.setAttribute ('flex', 1);
	label.setAttribute ('align', 'center');
	subitem.removeChild (textbox);
	subitem.insertBefore (label, subitem.firstChild);
}

function endEdit (textbox, oldValue) {
	var subitem = textbox.parentNode;
	var item = subitem.parentNode;
	var newValue = textbox.value;
	
	if (newValue == '') {
		cancelEdit (textbox, oldValue);
		return;
	}

	var label = document.createElement ('label');
	label.setAttribute ('value', newValue);
	label.setAttribute ('crop', 'start');
	label.setAttribute ('flex', 1);
	label.setAttribute ('align', 'center');
	subitem.removeChild (textbox);
	subitem.insertBefore (label, subitem.firstChild);

	var image = item.firstChild.firstChild;
	image.setAttribute ('src', getIcon (item.firstChild.lastChild.value, newValue));

	if (instantApply) {
		saveItem (item);
	}
}

function removeSelectedItem () {
	var item = manualList.selectedItem;
	if (item) {
		removeItem (item);
	}
}

function removeItem (item) {
	manualList.removeChild (item);
	manualList.selectedIndex = -1;
	validate ();
	if (instantApply) {
		var name = item.firstChild.lastChild.getAttribute ('value').replace (" ", "_");
		prefs.deleteBranch ("manual." + name);
		prefs.setBoolPref ("beep", true);
		prefs.clearUserPref ("beep");
	}
}

function doBrowse (button) {
	var path = getCommand (button.previousSibling.value);
	if (path) {
		var file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
		try {
			file.initWithPath (path);
			fp.displayDirectory = file.parent;
			fp.defaultString = file.leafName;
		} catch (e) {
			Components.utils.reportError (e);
		}
	}

	if (fp.show () == Ci.nsIFilePicker.returnOK) {
		var subitem = button.parentNode;
		var item = subitem.parentNode;

		subitem.firstChild.value = fp.file.path;
		item.firstChild.firstChild.setAttribute ("src", "moz-icon:" + ioService.newFileURI (fp.file).spec + "?size=menu");

		if (instantApply) {
			saveItem (item);
		}
	}
}

function saveItem (item) {
	var name = item.firstChild.lastChild.value.replace (" ", "_");
	var value = item.lastChild.firstChild.value;

	prefs.setCharPref ("manual." + name, value);
}

*/
