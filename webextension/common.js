/* globals chrome */
/* exported get_version_warn, compare_versions, compare_object_versions, get_string, get_strings,
   ERROR_COLOUR, WARNING_COLOUR, is_same_colour */
var _version_warn = null;
function get_version_warn() {
	if (!!_version_warn) {
		return Promise.resolve(_version_warn);
	}
	return new Promise(function(resolve) {
		chrome.runtime.getPlatformInfo(function(platformInfo) {
			_version_warn = platformInfo.os == 'mac' ? '7.0b5' : '7.0b4';
			resolve(_version_warn);
		});
	});
}

function compare_versions(a, b) {
	function split_apart(name) {
		var parts = [];
		var lastIsDigit = false;
		var part = '';
		for (let c of name) {
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
			return yType == 'number' ? -1 : 1;
		case 'number':
			return 1;
		}
	}
	let aParts = split_apart(a);
	let bParts = split_apart(b);
	for (let i = 0; i <= aParts.length && i <= bParts.length; i++) {
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
