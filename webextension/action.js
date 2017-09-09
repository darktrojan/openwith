/* globals chrome, get_string, get_strings, is_same_colour, ERROR_COLOUR, WARNING_COLOUR */
let errorMessage = document.getElementById('error');
let warningMessage = document.getElementById('warning');
let updateMessage = document.getElementById('update');
let browsersList = document.getElementById('browsers');
let browsersTemplate = browsersList.querySelector('template');

get_strings();

chrome.browserAction.getBadgeBackgroundColor({}, function(colour) {
	chrome.browserAction.setBadgeText({text: ''});
	chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 0]});

	if (is_same_colour(colour, ERROR_COLOUR)) {
		errorMessage.style.display = 'block';
	} else if (is_same_colour(colour, WARNING_COLOUR)) {
		warningMessage.style.display = 'block';
	} else {
		chrome.management.getSelf(function({version: currentVersion}) {
			let now = new Date();

			chrome.storage.local.get({
				version: 0,
				versionLastUpdate: new Date(0),
				versionLastAck: new Date(0)
			}, function(prefs) {
				if (typeof prefs.versionLastUpdate == 'string') {
					prefs.versionLastUpdate = new Date(prefs.versionLastUpdate);
				}
				if (typeof prefs.versionLastAck == 'string') {
					prefs.versionLastAck = new Date(prefs.versionLastAck);
				}
				if (now - prefs.versionLastUpdate < 43200000 && now - prefs.versionLastAck > 604800000) {
					updateMessage.textContent = get_string('update_message', currentVersion);
					updateMessage.style.display = 'block';
				}
				chrome.storage.local.set(prefs);
			});
		});
	}
});

let userIcons = new Map();
chrome.runtime.sendMessage({action: 'get_icons'}, function(result) {
	for (let l of result) {
		userIcons.set(l.id.toString(), l);
	}

	chrome.runtime.sendMessage({action: 'get_browsers'}, function(browsers) {
		if (browsers.length === 0) {
			document.getElementById('nobrowsers').style.display = 'block';
		}
		for (let b of browsers) {
			if (b.hidden) {
				continue;
			}
			add_browser(b);
		}
	});
});

browsersList.onclick = function(event) {
	let target = event.target;
	while (target && target.localName != 'li') {
		target = target.parentNode;
	}
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.runtime.sendMessage({
			action: 'open_browser',
			id: target.dataset.id,
			url: event.ctrlKey ? null : tabs[0].url
		});
		window.close();
	});
};

errorMessage.onclick = warningMessage.onclick = updateMessage.onclick = function() {
	chrome.storage.local.set({versionLastAck: new Date()});
	open_options_tab();
};
document.querySelector('.panel-section-footer-button').onclick = open_options_tab;

function open_options_tab() {
	chrome.runtime.openOptionsPage(function() {
		window.close();
	});
}

function add_browser(b) {
	let li = browsersTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.id = b.id;
	if (b.icon.startsWith('user_icon_')) {
		li.querySelector('img').src = userIcons.get(b.icon.substring(10))['16'];
	} else {
		li.querySelector('img').src = 'icons/' + b.icon + '_16x16.png';
	}
	li.querySelector('div.name').textContent = b.name;
	browsersList.appendChild(li);
}
