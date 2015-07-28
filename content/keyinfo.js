/* globals AppConstants, sizeToContent */
/* exported dialogRemove, dialogAccept */
Components.utils.import('resource://gre/modules/Services.jsm');

let returnValues = window.arguments[0];
let accelkey;
let accelkey_ctrl = document.getElementById('accelkey_ctrl');
let accelkey_cmd = document.getElementById('accelkey_cmd');
let altkey = document.getElementById('altkey');
let shiftkey = document.getElementById('shiftkey');
let keycode = document.getElementById('keycode');
let nomodifier = document.getElementById('nomodifier');
let comboinuse = document.getElementById('comboinuse');
let acceptButton = document.documentElement.getButton('accept');

if (Services.appinfo.OS == 'Darwin') {
	accelkey = accelkey_cmd;
	accelkey_ctrl.hidden = true;
} else {
	accelkey = accelkey_ctrl;
	accelkey_cmd.hidden = true;
}

document.getElementById('promptText').value = returnValues.promptText;

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

if (!!returnValues.previous && returnValues.previous.length > 0 && returnValues.previous[0] != '') {
	keycode.value = returnValues.previous.pop();
	for (let k of [accelkey, altkey, shiftkey]) {
		k.checked = returnValues.previous.indexOf(k.getAttribute('value')) >= 0;
	}
} else {
	document.documentElement.getButton('extra1').hidden = true;
	keycode.value = 'A';
}

checkValue();

function addItem(label, value = label) {
	let item = document.createElement('menuitem');
	item.setAttribute('label', label);
	item.setAttribute('value', value);
	keycode.firstElementChild.appendChild(item);
}

function getValue() {
	let keys = [];
	for (let k of [accelkey, altkey, shiftkey]) {
		if (k.checked && !k.disabled) {
			keys.push(k.getAttribute('value'));
		}
	}
	keys.push(keycode.value);
	return keys;
}

function checkValue() {
	shiftkey.disabled = keycode.value >= '0' && keycode.value <= '9';

	let value = getValue();
	if (value.length < 2 && !keycode.value.startsWith('VK_')) {
		nomodifier.hidden = false;
		comboinuse.hidden = true;
		acceptButton.disabled = true;
	} else {
		nomodifier.hidden = true;
		comboinuse.hidden = returnValues.existingKeys.indexOf(value.join('+')) < 0;
		acceptButton.disabled = false;
	}
	sizeToContent();
}

function dialogRemove() {
	returnValues.removeKeyInfo = true;
	document.documentElement.acceptDialog();
}

function dialogAccept() {
	returnValues.keyInfo = getValue();
}
