/* exported VERSION_WARN, compare_versions, compare_object_versions */
var VERSION_WARN = '7.0b4';

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
