/* globals chrome */
let browsersList = document.getElementById('browsers');
let browsersTemplate = browsersList.querySelector('template');

chrome.browserAction.getBadgeBackgroundColor({}, function(color) {
	chrome.browserAction.setBadgeText({text: ''});
	chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 0]});

	if (color[1] == 51) {
		document.getElementById('error').style.display = 'block';
	} else if (color[1] == 153) {
		document.getElementById('warning').style.display = 'block';
	}
});

let userIcons = new Map();
chrome.runtime.sendMessage({action: 'get_icons'}, function(result) {
	for (let l of result) {
		userIcons.set(l.id.toString(), l);
	}

	chrome.runtime.sendMessage({action: 'get_browsers'}, function(browsers) {
		for (let b of browsers) {
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

document.querySelector('.panel-section-footer-button').onclick = function() {
	let url = chrome.extension.getURL('options.html');
	chrome.tabs.query({url}, function(result) {
		if (result && result.length > 0) {
			let tab = result[0];
			chrome.tabs.update(tab.id, {active: true});
			chrome.windows.update(tab.windowId, {focused: true});
		} else {
			chrome.tabs.create({url});
		}
		window.close();
	});
};

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
