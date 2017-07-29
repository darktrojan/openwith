/* globals chrome */
let browsersList = document.getElementById('browsers');
browsersList.onclick = function(event) {
	let li = event.target;
	while (li != this && li.localName != 'li') {
		li = li.parentNode;
	}
	if (li == this) {
		return;
	}
	if (event.target.classList.contains('removeBrowser')) {
		let id = parseInt(li.dataset.id, 10);
		chrome.runtime.sendMessage({action: 'remove_browser', id}, function() {
			li.remove();
		});
		return;
	}
	let selected = this.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	li.classList.add('selected');

	if (event.target.classList.contains('editBrowser')) {
		detailsForm.browser_id.value = li.dataset.id;
		detailsForm.name.value = li.querySelector('.name').textContent;
		detailsForm.command.value = li.querySelector('.command').textContent;
		selected = logosList.querySelector('.selected');
		if (selected) {
			selected.classList.remove('selected');
		}
		for (let l of logosList.children) {
			if (l.dataset.name == li.dataset.icon) {
				l.classList.add('selected');
			}
		}
		document.documentElement.dataset.mode = 'editing';
	}
};

let browsersTemplate = browsersList.querySelector('template');

let fileInput = document.querySelector('input[type="file"]');
fileInput.onchange = function() {
	let fr = new FileReader();
	fr.readAsText(this.files[0]);
	fr.onload = function() {
		let data = read_desktop_file(this.result);
		data.icon = find_icon(data);

		detailsForm.browser_id.value = '';
		detailsForm.name.value = data.name;
		detailsForm.command.value = data.command;
		let selected = logosList.querySelector('.selected');
		if (selected) {
			selected.classList.remove('selected');
		}
		for (let l of logosList.children) {
			if (l.dataset.name == data.icon) {
				l.classList.add('selected');
			}
		}
	};
};

chrome.runtime.sendMessage({action: 'get_browsers'}, function(browsers) {
	for (let b of browsers) {
		add_browser(b);
	}
});

function add_browser(b) {
	let li = browsersTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.id = b.id;
	li.dataset.icon = b.icon;
	li.querySelector('img').src = 'icons/' + b.icon + '_64x64.png';
	li.querySelector('div.name').textContent = b.name;
	li.querySelector('div.command').textContent = Array.isArray(b.command) ? b.command.join(' ') : b.command;
	browsersList.appendChild(li);
}

function read_desktop_file(text) {
	let current_section = null;
	let name = null;
	let command = null;
	for (let line of text.split(/\r?\n/)) {
		if (line[0] == '[') {
			current_section = line.substring(1, line.length - 1);
		}
		if (current_section != 'Desktop Entry') {
			continue;
		}

		if (line.startsWith('Name=')) {
			name = line.substring(5).trim();
		}
		else if (line.startsWith('Exec=')) {
			command = line.substring(5).trim().replace(/%u/ig, '%s');
		}
	}

	return {name, command};
}

/* exported sort_alphabetically */
function sort_alphabetically() {
	chrome.runtime.sendMessage({
		action: 'order_browsers',
		order: Array.map(
			browsersList.querySelectorAll('li'), function(li) {
				return {
					li,
					id: parseInt(li.dataset.id, 10),
					name: li.querySelector('.name').textContent
				};
			}).sort(version_aware_sort).map(function(e) {
				browsersList.appendChild(e.li);
				return e.id;
			}
		)
	});
}

function version_aware_sort(a, b) {
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
	let aParts = split_apart(a.name);
	let bParts = split_apart(b.name);
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

// NB: this list isn't quite in order.
let logos = [
	'chrome',
	'chrome-beta',
	'chrome-dev',
	'chrome-canary',
	'chromium',
	'edge',
	'firefox_1.5-3',
	'firefox_3.5-22',
	'firefox',
	'firefox-beta',
	'firefox-nightly',
	'internet-explorer_6',
	'internet-explorer_7-8',
	'internet-explorer_9-11',
	'opera',
	'opera-beta',
	'opera-developer',
	'pale-moon',
	'safari',
	'seamonkey',
	'vivaldi',
	'waterfox'
];
let logosList = document.getElementById('logos');
let logosTemplate = logosList.querySelector('template');
for (let l of logos) {
	let li = logosTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.name = l;
	li.querySelector('img').src = 'icons/' + l + '_32x32.png';
	li.title = l.replace(/\b-?([a-z])/g, m => m.replace('-', ' ').toUpperCase()).replace('_', ' ');
	logosList.appendChild(li);
}

logosList.onclick = function(event) {
	let target = event.target;
	while (target != this && target.localName != 'li') {
		target = target.parentNode;
	}
	if (target == this) {
		return;
	}

	let selected = this.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	target.classList.add('selected');
};

let formBackground = document.getElementById('bg');
formBackground.onclick = function() {
	detailsForm.reset();
};

document.documentElement.onkeypress = function(event) {
	if (event.key == "Escape") {
		detailsForm.reset();
	}
};

let detailsForm = document.forms.details;
detailsForm.onsubmit = function() {
	let data = {
		name: this.name.value,
		command: this.command.value
	};
	let selected = logosList.querySelector('.selected');
	if (selected) {
		data.icon = selected.dataset.name;
	}

	for (let li of browsersList.children) {
		if (li.dataset.id == this.browser_id.value) {
			if (data.icon) {
				li.dataset.icon = data.icon;
				li.querySelector('img').src = 'icons/' + data.icon + '_64x64.png';
			}
			li.querySelector('div.name').textContent = data.name;
			li.querySelector('div.command').textContent = data.command;

			chrome.runtime.sendMessage({
				action: 'update_browser',
				data: {
					id: li.dataset.id,
					icon: li.dataset.icon,
					name: this.name.value,
					command: this.command.value
				}
			});
			this.reset();
			return false;
		}
	}

	chrome.runtime.sendMessage({action: 'add_browser', data}, id => {
		data.id = id;
		add_browser(data);
		this.reset();
	});

	return false;
};
detailsForm.onreset = function() {
	let selected = logosList.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	delete document.documentElement.dataset.mode;
};

function find_icon(data) {
	let {name, command} = data;
	name = name.toLowerCase();
	command = command.toLowerCase();

	function matches(str) {
		if (typeof str == 'object') {
			return str.test(name) || str.test(command);
		}
		return name.includes(str) || command.includes(str);
	}

	if (matches('chrome')) {
		if (matches('beta')) return 'chrome-beta';
		if (matches('dev')) return 'chrome-dev';
		if (matches('canary')) return 'chrome-canary';
		return 'chrome';
	}
	if (matches('firefox')) {
		if (matches('beta')) return 'firefox-beta';
		if (matches('nightly')) return 'firefox-nightly';
		return 'firefox';
	}
	if (matches('iexplore.exe') || matches(/\b(ms)?ie\d*\b/)) {
		if (matches(/(explorer|ie) ?6/)) return 'internet-explorer_6';
		if (matches(/(explorer|ie) ?[78]/)) return 'internet-explorer_7-8';
		return 'internet-explorer_9-11';
	}
	if (matches('opera')) {
		if (matches('beta')) return 'opera-beta';
		if (matches('dev')) return 'opera-developer';
		return 'opera';
	}
	for (let str of ['chromium', 'edge', 'pale-moon', 'safari', 'seamonkey', 'vivaldi', 'waterfox']) {
		if (matches(str)) {
			return str;
		}
	}
	return null;
}

function find_new_browsers() {
	chrome.runtime.sendNativeMessage('ping_pong', 'find', function(results) {
		for (let data of results.sort(version_aware_sort)) {
			data.command = data.command.replace(/%u/ig, '%s');

			if ([...browsersList.querySelectorAll('li')].find(function(li) {
				return li.querySelector('.command').textContent == data.command;
			})) {
				continue;
			}

			data.icon = find_icon(data);
			chrome.runtime.sendMessage({action: 'add_browser', data}, id => {
				data.id = id;
				add_browser(data);
			});
		}
	});
}
