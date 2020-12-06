/* globals chrome */
/* exported get_version_warn, compare_versions, compare_object_versions, get_string, get_strings,
   ERROR_COLOUR, WARNING_COLOUR, is_same_colour */
var _version_warn = null;
async function get_version_warn() {
	if (!!_version_warn) {
		return _version_warn;
	}

	if ('browser' in this && 'runtime' in this.browser && 'getBrowserInfo' in this.browser.runtime) {
		browserInfo = await browser.runtime.getBrowserInfo();
		if (browserInfo.name == 'Thunderbird') {
			return '7.2.3';
		}
	}

	return '7.0.1';

	// return new Promise(function(resolve) {
	// 	chrome.runtime.getPlatformInfo(function(platformInfo) {
	// 		_version_warn = platformInfo.os == 'win' ? '7.0.1' : '7.0b10';
	// 		resolve(_version_warn);
	// 	});
	// });
}

function compare_versions(a, b) {
	function split_apart(name) {
		var parts = [];
		var lastIsDigit = false;
		var part = '';
		for (let c of name.toString()) {
			let currentIsDigit = c >= '0' && c <= '9';
			if (c == '.' || lastIsDigit != currentIsDigit) {
				if (part) {
					parts.push(lastIsDigit ? parseInt(part, 10) : part);
				}
				part = c == '.' ? '' : c;
			} else {
				part += c;
			}
			lastIsDigit = currentIsDigit;
		}
		if (part) {
			parts.push(lastIsDigit ? parseInt(part, 10) : part);
		}
		return parts;
	}
	function compare_parts(x, y) {
		let xType = typeof x;
		let yType = typeof y;

		switch (xType) {
		case yType:
			return x == y ? 0 : (x < y ? -1 : 1);
		case 'string':
			return -1;
		case 'undefined':
			return yType == 'number' ? (y === 0 ? 0 : -1) : 1;
		case 'number':
			return x === 0 && yType == 'undefined' ? 0 : 1;
		}
	}
	let aParts = split_apart(a);
	let bParts = split_apart(b);
	for (let i = 0; i <= aParts.length || i <= bParts.length; i++) {
		let comparison = compare_parts(aParts[i], bParts[i]);
		if (comparison !== 0) {
			return comparison;
		}
	}
	return 0;
}

function compare_object_versions(a, b) {
	return compare_versions(a.name, b.name);
}

function get_string(name, ...substitutions) {
	let value = chrome.i18n.getMessage(name, substitutions);
	if (!value) {
		console.error('No string: ' + name);
	}
	return value;
}

function get_strings(element = document) {
	element.querySelectorAll('[data-message]').forEach(n => {
		n.textContent = get_string(n.dataset.message);
	});
	element.querySelectorAll('[data-href]').forEach(n => {
		n.href = get_string(n.dataset.href);
	});
	element.querySelectorAll('[data-label]').forEach(n => {
		n.parentNode.insertBefore(document.createTextNode(get_string(n.dataset.label)), n.nextSibling);
	});
}

var ERROR_COLOUR = [232, 39, 39, 255];
var WARNING_COLOUR = [254, 200, 47, 255];

function is_same_colour(a, b) {
	for (let i = 0; i < 4; i++) {
		if (a[i] != b[i]) {
			return false;
		}
	}
	return true;
}
