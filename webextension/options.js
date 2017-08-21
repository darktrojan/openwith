/* globals chrome, compare_versions, compare_object_versions, get_version_warn */
chrome.runtime.getPlatformInfo(function(platformInfo) {
	document.querySelectorAll('.linux, .mac, .win').forEach(e => e.hidden = !e.matches('.' + platformInfo.os));
	document.getElementById('install').hidden = false;
});

let testButton = document.querySelector('#install > button');
let testResult = document.getElementById('result');
let testResultIcon = document.getElementById('resulticon');
let testResultText = document.getElementById('resulttext');
testButton.onclick = function() {
	function error_listener() {
		testResult.style.display = 'flex';
		testResultIcon.src = 'status_error.svg';
		testResultText.textContent = 'Something went wrong. There might be more information in the Browser Console.';
	}

	let port = chrome.runtime.connectNative('open_with');
	port.onDisconnect.addListener(error_listener);
	port.onMessage.addListener(function(message) {
		if (message) {
			testResult.style.display = 'flex';
			testResultIcon.src = 'status_ok.svg';
			testResultText.textContent = `Found version ${message.version} at ${message.file}.`;
			get_version_warn().then(function(version_warn) {
				if (compare_versions(message.version, version_warn) < 0) {
					testResultIcon.src = 'status_warning.svg';
					testResultText.textContent += '\nA newer version is available and you should replace it.';
				}
			});
		} else {
			error_listener();
		}
		port.onDisconnect.removeListener(error_listener);
		port.disconnect();
	});
	port.postMessage('ping');
};

let findBrowsersButton = document.querySelectorAll('#addbrowser > button')[0];
findBrowsersButton.onclick = function() {
	find_new_browsers();
};

let addBrowserButton = document.querySelectorAll('#addbrowser > button')[1];
addBrowserButton.onclick = function() {
	document.documentElement.dataset.mode = 'adding';
	detailsForm.name.select();
};

let sortListButton = document.querySelectorAll('#addbrowser > button')[2];
sortListButton.onclick = function() {
	sort_alphabetically();
};

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
	li.scrollIntoView();

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
		detailsForm.name.select();
	}
};
let dragged, draggedNext;
browsersList.ondragstart = function(event) {
	let { target } = event;
	while (target != this && target.localName != 'li') {
		target = target.parentNode;
	}
	if (target == this) {
		return;
	}

	dragged = target;
	draggedNext = target.nextElementSibling;

	event.dataTransfer.setData('openwith/drag', target.dataset.id);
	event.dataTransfer.effectAllowed = 'move';
};
browsersList.ondragenter = browsersList.ondragover = function(event) {
	let { target } = event;
	while (target != this && target.localName != 'li') {
		target = target.parentNode;
	}
	if (target == this) {
		return;
	}

	switch (target.compareDocumentPosition(dragged)) {
	case Node.DOCUMENT_POSITION_FOLLOWING:
		browsersList.insertBefore(dragged, target);
		break;
	case Node.DOCUMENT_POSITION_PRECEDING:
		browsersList.insertBefore(dragged, target.nextElementSibling);
		break;
	}

	event.preventDefault();
};
browsersList.ondrop = function(event) {
	dragged = draggedNext = null;
};
browsersList.ondragend = function(event) {
	if (dragged) { // ondrop didn't happen
		browsersList.insertBefore(dragged, draggedNext);
		dragged = draggedNext = null;
		return;
	}
	chrome.runtime.sendMessage({
		action: 'order_browsers',
		order: [...browsersList.querySelectorAll('li')].map(li => parseInt(li.dataset.id, 10))
	});
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
	if (b.icon) {
		li.dataset.icon = b.icon;
		li.querySelector('img').src = 'logos/' + b.icon + '_64x64.png';
	} else {
		li.querySelector('img').style.visibility = 'hidden';
	}
	li.querySelector('div.name').textContent = b.name;
	li.querySelector('div.command').textContent = Array.isArray(b.command) ? b.command.join(' ') : b.command;
	browsersList.appendChild(li);
	return li;
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

function sort_alphabetically() {
	chrome.runtime.sendMessage({
		action: 'order_browsers',
		order: [...browsersList.querySelectorAll('li')].map(function(li) {
				return {
					li,
					id: parseInt(li.dataset.id, 10),
					name: li.querySelector('.name').textContent
				};
			}).sort(compare_object_versions).map(function(e) {
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
	'srware-iron',
	'vivaldi',
	'waterfox'
];
let logosList = document.getElementById('logos');
let logosTemplate = logosList.querySelector('template');
for (let l of logos) {
	let li = logosTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.name = l;
	li.querySelector('img').src = 'logos/' + l + '_32x32.png';
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
logosList.onkeypress = function(event) {
	let selected = this.querySelector('.selected');
	if (!selected) {
		if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
			this.querySelector('li').classList.add('selected');
		}
		return;
	}
	let rowLength = Math.floor(this.getBoundingClientRect().width / this.lastElementChild.getBoundingClientRect().width);
	let items = [...this.querySelectorAll('li')];
	let index = items.indexOf(selected);

	switch (event.key) {
	case 'ArrowUp':
		if (index - rowLength >= 0) {
			selected.classList.remove('selected');
			items[index - rowLength].classList.add('selected');
		}
		event.preventDefault();
		break;
	case 'ArrowLeft':
		if (selected.previousElementSibling) {
			selected.classList.remove('selected');
			selected.previousElementSibling.classList.add('selected');
		}
		event.preventDefault();
		break;
	case 'ArrowRight':
		if (selected.nextElementSibling) {
			selected.classList.remove('selected');
			selected.nextElementSibling.classList.add('selected');
		}
		event.preventDefault();
		break;
	case 'ArrowDown':
		if (index + rowLength < items.length) {
			selected.classList.remove('selected');
			items[index + rowLength].classList.add('selected');
		}
		event.preventDefault();
		break;
	case 'Enter':
		event.preventDefault();
		detailsForm.onsubmit();
		break;
	}
};

let formBackground = document.getElementById('bg');
formBackground.onclick = function() {
	detailsForm.reset();
};

document.documentElement.onkeypress = function(event) {
	if (event.key == 'Escape') {
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
				li.querySelector('img').src = 'logos/' + data.icon + '_64x64.png';
			}
			li.querySelector('img').style.visibility = data.icon ? null : 'hidden';
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
		let li = add_browser(data);
		let selected = browsersList.querySelector('.selected');
		if (selected) {
			selected.classList.remove('selected');
		}
		li.classList.add('selected');
		li.scrollIntoView();
		this.reset();
	});

	return false;
};
detailsForm.onreset = function() {
	detailsForm.browser_id.value = '';
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

	if (matches(/\biron\b/)) {
		return 'srware-iron';
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
	let port = chrome.runtime.connectNative('open_with');
	port.onMessage.addListener(function(results) {
		for (let data of results.sort(compare_object_versions)) {
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
		port.disconnect();
	});
	port.postMessage('find');
}

function pointless_sha1_function() {
	fetch('open_with.py')
		.then(r => r.arrayBuffer())
		.then(ab => crypto.subtle.digest('sha-1', ab))
		.then(sha => new Promise(resolve => {
			let fr = new FileReader();
			fr.onload = () => resolve(fr.result);
			fr.readAsBinaryString(new Blob([sha]));
		}))
		.then(bs => Array.map(bs, a => a.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
		.then(console.log.bind(console));
}
