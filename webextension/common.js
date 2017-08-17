/* exported compare_versions, compare_object_versions */
function compare_versions(a, b) {
	function split_apart(name) {
		var parts = [];
		var lastIsDigit = false;
		var part = '';
		for (let c of name) {
			let currentIsDigit = c >= '0' && c <= '9';
			if (lastIsDigit != currentIsDigit) {
				if (part) parts.push(lastIsDigit ? parseInt(part, 10) : part);
				part = c;
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
	let aParts = split_apart(a);
	let bParts = split_apart(b);
	let i;
	for (i = 0; i < aParts.length && i < bParts.length; i++) {
		if (aParts[i] < bParts[i]) {
			return -1;
		} else if (aParts[i] > bParts[i]) {
			return 1;
		}
	}
	if (aParts.length == bParts.length) {
		return 0;
	}
	return i == aParts.length ? -1 : 1;
}

function compare_object_versions(a, b) {
	return compare_versions(a.name, b.name);
}
