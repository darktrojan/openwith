/* globals browser */
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
		browser.runtime.sendMessage({action: 'remove_browser', id}).then(function() {
			li.remove();
		});
		return;
	}
	let selected = this.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	li.classList.add('selected');

	document.forms.details.name.value = li.querySelector('.name').textContent;
	document.forms.details.command.value = li.querySelector('.command').textContent;
	selected = logosList.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	for (let l of logosList.children) {
		if (l.dataset.name == li.dataset.icon) {
			l.classList.add('selected');
		}
	}
};

let browsersTemplate = browsersList.querySelector('template');

let fileInput = document.querySelector('input[type="file"]');
fileInput.onchange = function() {
	let fr = new FileReader();
	fr.readAsText(this.files[0]);
	fr.onload = function() {
		let data = read_desktop_file(this.result);
		browser.runtime.sendMessage({action: 'add_browser', data}).then(function(id) {
			data.id = id;
			add_browser(data);
		});
	};
};

browser.runtime.sendMessage({action: 'get_browsers'}).then(function(browsers) {
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
	let icon = null;
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
			command = line.substring(5).trim().replace(/%u/ig, '%s').split(/\s+/);
		}
		else if (line.startsWith('Icon=')) {
			icon = line.substring(5).trim();
		}
	}

	return {name, command, icon};
}

function sort_alphabetically() {
	browser.runtime.sendMessage({
		action: 'order_browsers',
		order: Array.map(
			browsersList.querySelectorAll('li'), function(li) {
				return {
					li,
					id: parseInt(li.dataset.id, 10),
					name: li.querySelector('.name').textContent
				};
			}).sort(function(a, b) {
				return a.name < b.name ? -1 : 1;
			}).map(function(e) {
				browsersList.appendChild(e.li);
				return e.id;
			}
		)
	});
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
