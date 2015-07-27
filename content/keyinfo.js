let returnValues = window.arguments[0];
let accelkey;
let accelkey_ctrl = document.getElementById('accelkey_ctrl');
let accelkey_cmd = document.getElementById('accelkey_cmd');
let shiftkey = document.getElementById('shiftkey');
let altkey = document.getElementById('altkey');
let keycode = document.getElementById('keycode');
let nomodifier = document.getElementById('nomodifier');
let comboinuse = document.getElementById('comboinuse');

Components.utils.import('resource://gre/modules/AppConstants.jsm');
if (AppConstants.MOZ_WIDGET_TOOLKIT == 'cocoa') {
	accelkey = accelkey_cmd;
	accelkey_ctrl.hidden = true;
} else {
	accelkey = accelkey_ctrl;
	accelkey_cmd.hidden = true;
}

for (let c = 65; c <= 90; c++) {
	addItem(String.fromCharCode(c));
}
for (let c = 1; c <= 9; c++) {
	addItem(c);
}
addItem(0);
for (let c = 1; c <= 12; c++) {
	addItem('F' + c, 'VK_F' + c);
}

if (returnValues.previous.length > 0 && returnValues.previous[0] != '') {
	keycode.value = returnValues.previous.pop();
	for (let k of [accelkey, shiftkey, altkey]) {
		k.checked = returnValues.previous.indexOf(k.getAttribute('value')) >= 0;
	}
}

function addItem(label, value = label) {
	let item = document.createElement('menuitem');
	item.setAttribute('label', label);
	item.setAttribute('value', value);
	keycode.firstElementChild.appendChild(item);
}

function getValue() {
	let keys = [];
	for (let k of [accelkey, shiftkey, altkey]) {
		if (k.checked) {
			keys.push(k.getAttribute('value'));
		}
	}
	keys.push(keycode.value);
	return keys;
}

function checkValue() {
	let value = getValue();
	if (value.length < 2) {
		nomodifier.hidden = false;
		comboinuse.hidden = true;
	} else {
		nomodifier.hidden = true;
		comboinuse.hidden = returnValues.existingKeys.indexOf(value.join('+')) < 0;
	}
	sizeToContent();
}

function dialogAccept() {
	returnValues.keyInfo = getValue();
}
