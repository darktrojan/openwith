/* globals chrome, compare_versions, compare_object_versions, get_version_warn, get_string, get_strings */
let testResult = document.getElementById('result');
let testResultIcon = document.getElementById('resulticon');
let testResultText = document.getElementById('resulttext');
let browsersList = document.getElementById('browsers');
let dragged, draggedNext;
let userIcons = new Map();
// NB: this list isn't quite in order.
let icons = [
	'brave',
	'chrome',
	'chrome-beta',
	'chrome-dev',
	'chrome-canary',
	'chromium',
	'edge_12-18',
	'edge',
	'edge-beta',
	'edge-dev',
	'edge-canary',
	'firefox_1.5-3',
	'firefox_3.5-22',
	'firefox_23-56',
	'firefox_57-70',
	'firefox',
	'firefox-beta',
	'firefox-developer-edition',
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
	'waterfox',
	'yandex'
];
let iconsList = document.getElementById('icons');
let detailsForm = document.forms.details;
let userIconsForm = document.forms.userIcons;
let userIconsList = userIconsForm.querySelector('ul');

document.getElementById('install').onclick = function(event) {
	let {target} = event;
	if (target instanceof HTMLAnchorElement && target.getAttribute('href').startsWith('native/')) {
		let {href} = target;
		chrome.downloads.download({
			url: href,
			filename: href.substring(href.lastIndexOf('/') + 1),
			saveAs: true
		});
		return false;
	}
};

document.getElementById('test').onclick = function() {
	function error_listener() {
		testResult.style.display = 'flex';
		testResultIcon.src = 'images/status_error.svg';
		testResultText.textContent = get_string('test_error');
	}

	let port = chrome.runtime.connectNative('open_with');
	port.onDisconnect.addListener(error_listener);
	port.onMessage.addListener(function(message) {
		if (message) {
			testResult.style.display = 'flex';
			testResultText.textContent = get_string('test_success', message.version, message.file.replace(/[\/\\]/g, '$&\u200b'));
			get_version_warn().then(function(version_warn) {
				if (compare_versions(message.version, version_warn) < 0) {
					testResultIcon.src = 'images/status_warning.svg';
					testResultText.textContent += '\n' + get_string('test_warning');
				} else {
					testResultIcon.src = 'images/status_ok.svg';
					chrome.browserAction.setBadgeText({text: ''});
					chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 0]});
				}
			});
			chrome.browserAction.setPopup({popup: 'action.html'});
		} else {
			error_listener();
		}
		port.onDisconnect.removeListener(error_listener);
		port.disconnect();
	});
	port.postMessage('ping');
};

document.getElementById('look').onclick = function() {
	find_new_browsers();
};

document.getElementById('addbrowser').onclick = function() {
	document.documentElement.dataset.mode = 'adding';
	detailsForm.name.select();
};

document.getElementById('sort').onclick = function() {
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
		})
	});
};

document.getElementById('menu_contexts').onchange = function() {
	let contexts = [];
	for (let checkbox of this.querySelectorAll('input[type="checkbox"]')) {
		if (checkbox.checked) {
			contexts.push(checkbox.name);
		}
	}
	chrome.storage.local.set({menu_contexts: contexts});
};

document.querySelector('button[data-message="donate_button"]').onclick = function() {
	chrome.tabs.create({url: 'https://darktrojan.github.io/donate.html?openwith'});
};

browsersList.onclick = function(event) {
	let li = event.target;
	while (li != this && li.localName != 'li') {
		li = li.parentNode;
	}
	if (li == this) {
		return;
	}
	let {classList} = event.target;
	if (classList.contains('removeBrowser')) {
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

	if (classList.contains('editBrowser')) {
		detailsForm.browser_id.value = li.dataset.id;
		detailsForm.name.value = li.querySelector('.name').textContent;
		detailsForm.command.value = li.querySelector('.command').textContent;
		detailsForm.shortcut.value = li.dataset.shortcut;
		select_icon(li.dataset.icon);
		document.documentElement.dataset.mode = 'editing';
		detailsForm.name.select();
	} else if (classList.contains('hideBrowser')) {
		chrome.runtime.sendMessage({action: 'hide_browser', id: li.dataset.id, hidden: true}, function() {
			li.classList.add('hiddenBrowser');
		});
	} else if (classList.contains('showBrowser')) {
		chrome.runtime.sendMessage({action: 'hide_browser', id: li.dataset.id, hidden: false}, function() {
			li.classList.remove('hiddenBrowser');
		});
	} else if (classList.contains('duplicateBrowser')) {
		let data = {
			name: get_string('browserList_duplicate_newName', li.querySelector('.name').textContent),
			command: li.querySelector('.command').textContent,
			icon: li.dataset.icon
		};
		chrome.runtime.sendMessage({action: 'add_browser', data}, function(id) {
			data.id = id;
			put_browser(data);
			select_browser(id);
		});
	}
};
browsersList.ondragstart = function(event) {
	let {target} = event;
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
	let {target} = event;
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
browsersList.ondrop = function() {
	dragged = draggedNext = null;
};
browsersList.ondragend = function() {
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

document.getElementById('bg').onclick = function() {
	if (document.documentElement.dataset.oldmode) {
		userIconsForm.reset();
	} else {
		detailsForm.reset();
	}
};

document.documentElement.onkeypress = function(event) {
	if (event.key == 'Escape') {
		if (document.documentElement.dataset.oldmode) {
			userIconsForm.reset();
		} else {
			detailsForm.reset();
		}
	}
};

detailsForm.userIconsButton.onclick = function() {
	[...userIconsList.querySelectorAll('li')].forEach(li => {
		li.querySelector('button').disabled = [...browsersList.children].some(b => {
			return b.dataset.icon == li.dataset.name;
		});
	});

	document.documentElement.dataset.oldmode = document.documentElement.dataset.mode;
	document.documentElement.dataset.mode = 'icons';
};
detailsForm.onsubmit = function() {
	let data = {
		name: this.name.value,
		command: this.command.value
	};
	if (this.shortcut.value) {
		data.shortcut = this.shortcut.value;
	}
	let selected = iconsList.querySelector('.selected');
	if (selected) {
		data.icon = selected.dataset.name;
	}

	if (this.browser_id.value) {
		data.id = parseInt(this.browser_id.value, 10);
		chrome.runtime.sendMessage({action: 'update_browser', data}, function() {
			put_browser(data);
		});
	} else {
		chrome.runtime.sendMessage({action: 'add_browser', data}, function(id) {
			data.id = id;
			put_browser(data);
			select_browser(id);
		});
	}

	this.reset();
	return false;
};
detailsForm.onreset = function() {
	detailsForm.browser_id.value = '';
	select_icon();
	delete document.documentElement.dataset.mode;
};

document.querySelector('input[type="file"][name="desktopFile"]').onchange = function() {
	let fr = new FileReader();
	fr.readAsText(this.files[0]);
	fr.onload = function() {
		let data = read_desktop_file(this.result);
		data.icon = find_icon(data);

		detailsForm.browser_id.value = '';
		detailsForm.name.value = data.name;
		detailsForm.command.value = data.command;
		select_icon(data.icon);
	};
};

iconsList.onclick = function(event) {
	let target = event.target;
	while (target != this && target.localName != 'li') {
		target = target.parentNode;
	}
	if (target == this) {
		select_icon();
		return;
	}
	if (target.classList.contains('selected') && event.ctrlKey) {
		select_icon();
		return;
	}
	select_icon(target.dataset.name);
};
iconsList.onkeypress = function(event) {
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

userIconsForm.querySelector('ul').onclick = function(event) {
	let li = event.target;
	while (li != this && li.localName != 'li') {
		li = li.parentNode;
	}
	if (li == this) {
		return;
	}
	if (event.target.classList.contains('removeIcon')) {
		let id = parseInt(li.dataset.name.substring(10), 10);
		chrome.runtime.sendMessage({action: 'remove_icon', id}, function() {
			userIcons.delete(li.dataset.name.substring(10));
			put_icon(li.dataset.name);
		});
		return;
	}
};
userIconsForm.onreset = function() {
	document.documentElement.dataset.mode = document.documentElement.dataset.oldmode;
	delete document.documentElement.dataset.oldmode;
};

document.querySelector('input[type="file"][name="userIcon"]').onchange = function() {
	let img = document.createElement('img');
	img.onload = function() {
		let previous = this;
		for (let canvas of [...document.querySelectorAll('canvas')]) {
			let context = canvas.getContext('2d');
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, canvas.width, canvas.height);
			canvas.toBlob(finish);

			previous = canvas;
		}
	};
	img.src = URL.createObjectURL(this.files[0]);

	let container = new Map();
	function finish(blob) {
		let fr = new FileReader();
		fr.onload = function() {
			let result = document.createElement('img');
			result.onload = function() {
				container.set(result.width, result);
				if (container.has(64) && container.has(32) && container.has(16)) {
					let data = {
						'16': container.get(16).src,
						'32': container.get(32).src,
						'64': container.get(64).src
					};
					chrome.runtime.sendMessage({action: 'add_icon', data}, function(id) {
						data.id = id;
						userIcons.set(id.toString(), data);
						put_icon('user_icon_' + id);
					});
				}
			};
			result.src = fr.result;
		};
		fr.readAsDataURL(blob);
	}
};

get_strings();
chrome.commands.getAll(function(commands) {
	for (let c of commands) {
		if (['open_1', 'open_2', 'open_3'].includes(c.name)) {
			detailsForm.shortcut.querySelector('[value="' + c.name + '"]').textContent = c.shortcut;
		}
	}
});

chrome.runtime.getPlatformInfo(function(platformInfo) {
	document.querySelectorAll('.linux, .mac, .win').forEach(e => e.hidden = !e.matches('.' + platformInfo.os));
	document.getElementById('install').hidden = false;
});

chrome.storage.local.get({menu_contexts: null}, function({menu_contexts}) {
	if (menu_contexts === null) {
		menu_contexts = ['page', 'link', 'image'];
		if (navigator.userAgent.includes('Firefox')) {
			menu_contexts.push('tab');
		}
	}

	for (let checkbox of document.querySelectorAll('#menu_contexts input[type="checkbox"]')) {
		checkbox.checked = menu_contexts.includes(checkbox.name);
	}
});

chrome.runtime.sendMessage({action: 'get_icons'}, function(result) {
	for (let l of result) {
		userIcons.set(l.id.toString(), l);
	}

	chrome.runtime.sendMessage({action: 'get_browsers'}, function(browsers) {
		browsers.forEach(put_browser);
	});

	icons.forEach(put_icon);
	for (let k of userIcons.keys()) {
		put_icon('user_icon_' + k);
	}
});

function put_browser(data) {
	let browsersTemplate = browsersList.querySelector('template');
	let li = browsersList.querySelector('li[data-id="' + data.id + '"]');
	if (!li) {
		li = browsersTemplate.content.firstElementChild.cloneNode(true);
		li.dataset.id = data.id;
		get_strings(li);
		browsersList.appendChild(li);
	}
	if (data.hidden) {
		li.classList.add('hiddenBrowser');
	} else {
		li.classList.remove('hiddenBrowser');
	}
	if (data.shortcut) {
		li.dataset.shortcut = data.shortcut;
	} else {
		delete li.dataset.shortcut;
	}
	if (data.icon) {
		li.dataset.icon = data.icon;
		if (data.icon.startsWith('user_icon_')) {
			li.querySelector('img').src = userIcons.get(data.icon.substring(10))['64'];
		} else {
			li.querySelector('img').src = 'icons/' + data.icon + '_64x64.png';
		}
		li.querySelector('img').style.visibility = null;
	} else {
		li.querySelector('img').style.visibility = 'hidden';
	}
	li.querySelector('div.name').textContent = data.name;
	li.querySelector('div.command').textContent = data.command;
	return li;
}

function select_browser(id) {
	let selected = browsersList.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	let li = browsersList.querySelector('[data-id="' + id + '"]');
	if (li) {
		li.classList.add('selected');
		li.scrollIntoView();
	}
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
		} else if (line.startsWith('Exec=')) {
			command = line.substring(5).trim().replace(/%u/ig, '%s');
		}
	}

	return {name, command};
}

function put_icon(name) {
	let iconsTemplate = iconsList.querySelector('template');
	let li = iconsList.querySelector('li[data-name="' + name + '"]');
	let userIconsTemplate = userIconsList.querySelector('template');
	let userLi = userIconsList.querySelector('li[data-name="' + name + '"]');

	if (name.startsWith('user_icon_') && !userIcons.has(name.substring(10))) {
		li.remove();
		userLi.remove();
		return;
	}

	if (!li) {
		li = iconsTemplate.content.firstElementChild.cloneNode(true);
		li.dataset.name = name;
		iconsList.appendChild(li);
	}
	if (name.startsWith('user_icon_')) {
		if (!userLi) {
			userLi = userIconsTemplate.content.firstElementChild.cloneNode(true);
			userLi.dataset.name = name;
			get_strings(userLi);
			userIconsList.appendChild(userLi);
		}
		li.querySelector('img').src = userLi.querySelector('img').src = userIcons.get(name.substring(10))['32'];
	} else {
		li.querySelector('img').src = 'icons/' + name + '_32x32.png';
		li.title = get_string('icon_' + name.replace(/\W/g, '_'));
	}
}

function select_icon(name) {
	let selected = iconsList.querySelector('.selected');
	if (selected) {
		selected.classList.remove('selected');
	}
	for (let l of iconsList.querySelectorAll('li')) {
		if (l.dataset.name == name) {
			l.classList.add('selected');
		}
	}
}

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
		if (matches('beta')) {
			return 'chrome-beta';
		}
		if (matches('dev')) {
			return 'chrome-dev';
		}
		if (matches('canary')) {
			return 'chrome-canary';
		}
		return 'chrome';
	}
	if (matches('explorer.exe') && matches('microsoft-edge')) {
		return 'edge_12-18';
	}
	if (matches('firefox')) {
		if (matches('beta')) {
			return 'firefox-beta';
		}
		if (matches('nightly')) {
			return 'firefox-nightly';
		}
		return 'firefox';
	}
	if (matches('iexplore.exe') || matches(/\b(ms)?ie\d*\b/)) {
		if (matches(/(explorer|ie) ?6/)) {
			return 'internet-explorer_6';
		}
		if (matches(/(explorer|ie) ?[78]/)) {
			return 'internet-explorer_7-8';
		}
		return 'internet-explorer_9-11';
	}
	if (matches('opera')) {
		if (matches('beta')) {
			return 'opera-beta';
		}
		if (matches('dev')) {
			return 'opera-developer';
		}
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
				put_browser(data);
			});
		}
		port.disconnect();
	});
	port.postMessage('find');
}
