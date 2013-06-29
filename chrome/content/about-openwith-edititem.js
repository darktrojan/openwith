const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

var filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(
		Ci.nsIFilePicker
);
filePicker.init(this, document.title, Ci.nsIFilePicker.modeOpen);
filePicker.appendFilters(Ci.nsIFilePicker.filterApps);

var appsDir;
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

var cs = controls = {
	nameTextbox : $('name-textbox'),
	commandTextbox : $('command-textbox'),
	paramsTextbox : $('params-textbox'),

	linkMatchRadiogroup : $('link-match-radiogroup'),
	
	anyRadio : $('any-radio'),

	substringRadio : $('contains-radio'),
	substringTextbox : $('substring-textbox'),

	regexpRadio : $('regexp-radio'),
	regexpTextbox : $('regexp-textbox'),
};

var attributeTexboxMap = {
	'name' : cs.nameTextbox,
	'command' : cs.commandTextbox,
	'params' : cs.paramsTextbox,
};

function loadControls(item) {
	for (let attr in attributeTexboxMap) {
		attributeTexboxMap[attr].value = item.getAttribute(attr);
	}

	if (item.hasAttribute('matchLinkSubstring')) {
		cs.linkMatchRadiogroup.selectedItem = cs.substringRadio;
		cs.substringTextbox.value = item.getAttribute('matchLinkSubstring');
	} else if (item.hasAttribute('matchLinkRegexp')) {
		cs.linkMatchRadiogroup.selectedItem = cs.regexpRadio;
		cs.regexpTextbox.value = item.getAttribute('matchLinkRegexp');
	} else {
		cs.linkMatchRadiogroup.selectedItem = cs.anyRadio;
	}
}

function writeControls(item) {
	for (let attr in attributeTexboxMap) {
		item.setAttribute(attr, attributeTexboxMap[attr].value);
	}

	['matchLinkSubstring', 'matchLinkRegexp'].forEach(function (attr) {
		item.removeAttribute(attr);
	});
	if (cs.substringRadio.selected) {
		item.setAttribute('matchLinkSubstring', cs.substringTextbox.value);
	} else if (cs.regexpRadio.selected) {
		item.setAttribute('matchLinkRegexp', cs.regexpTextbox.value);
	}
}

function pickFileIntoTextbox(textbox) {
	let filename = textbox.value;
	let file
	try {
		file = new FileUtils.File(filename);
		filePicker.defaultString = file.leafName;
		filePicker.displayDirectory = file.parent;
	} catch (e) {
		// FIXME should catch only Ci.nsILocalFile.NS_ERROR_FILE_UNRECOGNIZED_PATH
		filePicker.displayDirectory = appsDir;
	}
	if (filePicker.show() == Ci.nsIFilePicker.returnOK) {
		textbox.value = filePicker.file.path;
	}
}

var item = window.arguments[0];
var onAcceptedCallback = window.arguments[1];

loadControls(item);

function onDialogAccept() {
	writeControls(item);
	onAcceptedCallback();
	return true;
}

function onDialogCancel() {
	return true;
}
