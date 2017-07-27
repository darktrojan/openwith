/* globals chrome */
var browsers;
var max_id = 0;

function contextMenuClicked(info) {
	let browser_id = parseInt(info.menuItemId.substring(8), 10);
	let url = info.modifiers.includes('Ctrl') ? null : info.pageUrl;
	openBrowser(browser_id, url);
}

function contextMenuLinkClicked(info) {
	let browser_id = parseInt(info.menuItemId.substring(13), 10);
	let url = info.modifiers.includes('Ctrl') ? null : info.linkUrl;
	openBrowser(browser_id, url);
}

function openBrowser(browser_id, url) {
	for (let b of browsers) {
		if (b.id == browser_id) {
			let command = b.command.slice();
			let found = false;
			for (let i = 0; i < command.length; i++) {
				if (command[i] == '%s') {
					if (url) {
						command[i] = url;
					} else {
						command.splice(i, 1);
						i--;
					}
					found = true;
				}
			}
			if (url && !found) {
				command.push(url);
			}
			console.log(command);
			let port = chrome.runtime.connectNative('ping_pong');
			port.onMessage.addListener(e => console.log(e));
			port.onDisconnect.addListener(e => console.error(e, chrome.runtime.lastError));
			port.postMessage(command);
			return;
		}
	}
}

chrome.storage.local.get({'browsers': []}, result => {
	browsers = result.browsers;
	sortBrowsers();
	makeMenus();
});

function makeMenus() {
	chrome.contextMenus.removeAll();

	for (let b of browsers) {
		max_id = Math.max(max_id, b.id);
		chrome.contextMenus.create({
			id: 'browser_' + b.id,
			title: b.name,
			contexts: ['page'/*, 'tab'*/],
			documentUrlPatterns: ['<all_urls>', 'file:///*'],
			onclick: contextMenuClicked
		});
		chrome.contextMenus.create({
			id: 'browser_link_' + b.id,
			title: b.name,
			contexts: ['link'],
			documentUrlPatterns: ['<all_urls>', 'file:///*'],
			onclick: contextMenuLinkClicked
		});
	}
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	console.log(message);
	switch (message.action) {
	case 'open_browser':
		openBrowser(message.id, message.url);
		return;
	case 'get_browsers':
		sendResponse(browsers);
		return true;
	case 'add_browser':
		let {data} = message;
		data.id = ++max_id;
		browsers.push(message.data);
		chrome.storage.local.set({browsers}, function() {
			sendResponse(data.id);
		});
		return true;
	case 'remove_browser':
		let removed = false;
		for (let i = 0; i < browsers.length; i++) {
			let b = browsers[i];
			if (b.id == message.id) {
				browsers.splice(i, 1);
				removed = true;
				break;
			}
		}
		chrome.storage.local.set({browsers}, function() {
			sendResponse(removed);
		});
		return true;
	case 'order_browsers':
		for (let b of browsers) {
			b.order = message.order.indexOf(b.id);
		}
		sortBrowsers();
		chrome.storage.local.set({browsers}, function() {
			makeMenus();
			sendResponse(true);
		});
		return true;
	}
});

function sortBrowsers() {
	browsers.sort(function(a, b) {
		if (isNaN(a.order)) {
			return isNaN(b.order) ? 0 : 1;
		}
		return isNaN(b.order) ? -1 : a.order - b.order;
	});
}
