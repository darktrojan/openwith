const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import ('resource://openwith/openwith.jsm');

var instantApply = document.getElementsByTagName ('preference').item (0).instantApply;
var strings = document.getElementById ('openwith-strings');

var prefWindow = document.documentElement;
var manualList = document.getElementById ('openwith-manualentry-pane.list');
var renameButton = document.getElementById ('openwith-manualentry-pane.rename-button');
var editButton = document.getElementById ('openwith-manualentry-pane.editcommand-button');
var removeButton = document.getElementById ('openwith-manualentry-pane.remove-button');

var fp = Cc ["@mozilla.org/filepicker;1"].createInstance (Ci.nsIFilePicker);
fp.init (window, strings.getString ('selectFile'), Ci.nsIFilePicker.modeOpen);
fp.appendFilters (Ci.nsIFilePicker.filterApps);

try {
	fp.displayDirectory = Cc ["@mozilla.org/file/directory_service;1"].getService (Ci.nsIProperties).get ("ProgF", Ci.nsIFile);
} catch (e) {
}

var ioService = Cc ["@mozilla.org/network/io-service;1"].getService (Ci.nsIIOService);

var manual = OpenWithCore.prefs.getChildList ("manual.", {});
manual.sort ();
for (var i = 0; i < manual.length; i++) {
	var name = manual [i];
	if (/\.icon$/.test (name)) {
		continue;
	}
	var value = name.substring (7).replace ('_', ' ');
	var command = OpenWithCore.prefs.getCharPref (name);

	addItem (value, command);
}

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

function $(id) {
	return document.getElementById (id);
}

prefWindow.onload = function () {
	prefWindow.showPane (document.getElementById (prefWindow.getAttribute ('lastSelected')));
	prefWindow.onload = null;
	
	var wm = Cc ["@mozilla.org/appshell/window-mediator;1"].getService (Ci.nsIWindowMediator);
	var browserWindow = wm.getMostRecentWindow ("navigator:browser");
	document.getElementById ('openwith-tabmenu-group').disabled = browserWindow.OpenWith.tabMenuPlaceholder == null;
	document.getElementById ('openwith-tabbar-group').disabled = browserWindow.OpenWith.tabButtonContainer == null;
	
	if ($('openwith-viewmenu-pref').value) {
		$('openwith-viewmenu-group').selectedIndex = 1;
	} else if ($('openwith-viewmenu-submenu-pref').value) {
		$('openwith-viewmenu-group').selectedIndex = 2;
	} else {
		$('openwith-viewmenu-group').selectedIndex = 0;
	}

	if ($('openwith-contextmenu-pref').value) {
		$('openwith-contextmenu-group').selectedIndex = 1;
	} else if ($('openwith-contextmenu-submenu-pref').value) {
		$('openwith-contextmenu-group').selectedIndex = 2;
	} else {
		$('openwith-contextmenu-group').selectedIndex = 0;
	}

	if ($('openwith-contextmenulink-pref').value) {
		$('openwith-contextmenulink-group').selectedIndex = 1;
	} else if ($('openwith-contextmenulink-submenu-pref').value) {
		$('openwith-contextmenulink-group').selectedIndex = 2;
	} else {
		$('openwith-contextmenulink-group').selectedIndex = 0;
	}

	if ($('openwith-tabmenu-pref').value) {
		$('openwith-tabmenu-group').selectedIndex = 1;
	} else if ($('openwith-tabmenu-submenu-pref').value) {
		$('openwith-tabmenu-group').selectedIndex = 2;
	} else {
		$('openwith-tabmenu-group').selectedIndex = 0;
	}

	if ($('openwith-tabbar-pref').value) {
		$('openwith-tabbar-group').selectedIndex = 1;
	} else if ($('openwith-tabbar-menu-pref').value) {
		$('openwith-tabbar-group').selectedIndex = 2;
	} else {
		$('openwith-tabbar-group').selectedIndex = 0;
	}
}

function updatePrefs (id, index) {
	var pref1, pref2;
	switch (id) {
	case 'openwith-viewmenu-group':
		pref1 = $('openwith-viewmenu-pref');
		pref2 = $('openwith-viewmenu-submenu-pref');
		break;
	case 'openwith-contextmenu-group':
		pref1 = $('openwith-contextmenu-pref');
		pref2 = $('openwith-contextmenu-submenu-pref');
		break;
	case 'openwith-contextmenulink-group':
		pref1 = $('openwith-contextmenulink-pref');
		pref2 = $('openwith-contextmenulink-submenu-pref');
		break;
	case 'openwith-tabmenu-group':
		pref1 = $('openwith-tabmenu-pref');
		pref2 = $('openwith-tabmenu-submenu-pref');
		break;
	case 'openwith-tabbar-group':
		pref1 = $('openwith-tabbar-pref');
		pref2 = $('openwith-tabbar-menu-pref');
		break;
	}
	switch (index) {
	case 0:
		pref1.value = false;
		pref2.value = false;
		break;
	case 1:
		pref1.value = true;
		pref2.value = false;
		break;
	case 2:
		pref1.value = false;
		pref2.value = true;
		break;
	}
}

function validate () {
	renameButton.disabled = editButton.disabled = removeButton.disabled = manualList.selectedCount == 0;
}

function addNewItem () {
	if (fp.show () == Ci.nsIFilePicker.returnOK) {
		var item = addItem (fp.file.leafName.replace (/\.(app|exe)$/, ''), fp.file.path);
		manualList.selectItem (item);

		beginRename (item);
	}
}

function addItem (value, command) {
	var item = document.createElement ('richlistitem');
	item.setAttribute ('align', 'center');
	manualList.appendChild (item);

	var subitem1 = document.createElement ('hbox');
	subitem1.setAttribute ('align', 'center');
	item.appendChild (subitem1);

	var image = document.createElement ('image');
	image.setAttribute ('src', getIcon (value, command));
	subitem1.appendChild (image);

	var label1 = document.createElement ('label');
	label1.setAttribute ('value', value);
	label1.setAttribute ('crop', 'end');
	label1.setAttribute ('align', 'center');
	subitem1.appendChild (label1);

	var subitem2 = document.createElement ('hbox');
	subitem2.setAttribute ('flex', 1);
	subitem2.setAttribute ('align', 'center');
	item.appendChild (subitem2);

	var label2 = document.createElement ('label');
	label2.setAttribute ('crop', 'start');
	label2.setAttribute ('value', command);
	label2.setAttribute ('flex', 1);
	label2.setAttribute ('align', 'center');
	subitem2.appendChild (label2);

	var button = document.createElement ('button');
	button.setAttribute ('label', strings.getString ('browseButtonLabel'));
	button.setAttribute ('oncommand', 'doBrowse (this);');
	subitem2.appendChild (button);

	// must do this after laying out item
	subitem1.setAttribute ('style', 'width: 15em;');

	return item;
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
			OpenWithCore.prefs.deleteBranch ("manual." + oldValue.replace (" ", "_"));
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
		OpenWithCore.prefs.deleteBranch ("manual." + name);
		OpenWithCore.loadList (true);
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

function doAccept () {
	prefWindow.setAttribute ('lastSelected', prefWindow.currentPane.id);

	if (instantApply) {
		return;
	}

	OpenWithCore.suppressLoadList = true;
	OpenWithCore.prefs.deleteBranch ("manual.");
	for (var i = 0; i < manualList.itemCount; i++) {
		saveItem (manualList.getItemAtIndex (i));
	}
	OpenWithCore.suppressLoadList = false;
	
	OpenWithCore.loadList (true);
}

function saveItem (item) {
	var name = item.firstChild.lastChild.value.replace (" ", "_");
	var value = item.lastChild.firstChild.value;

	OpenWithCore.prefs.setCharPref ("manual." + name, value);
}

function getCommand (command) {
	if (command [0] == '/') {
		command = command.replace (/\s.*$/, '');
	} else {
		command = command.replace (/^"/, '').replace (/".*$/, '');
	}
	return command;
}

function getIcon (name, command) {
	command = getCommand (command);
	var icon;
	try {
		icon = OpenWithCore.prefs.getCharPref ("manual." + name.replace (' ', '_') + ".icon");
	} catch (e) {
		var file = Cc ["@mozilla.org/file/local;1"].createInstance (Ci.nsILocalFile);
		try {
			file.initWithPath (command);
			icon = 'moz-icon:' + this.ioService.newFileURI (file).spec + '?size=menu';
		} catch (f) {
			Components.utils.reportError (e);
		}
	}
	return icon;
}
