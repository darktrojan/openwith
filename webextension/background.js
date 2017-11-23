/* globals chrome, compare_versions, get_version_warn, ERROR_COLOUR, WARNING_COLOUR */
var browsers, icons;
var max_browser_id = 0;
var max_icon_id = 0;
var currentTab;

function getTabs(tabs) {
    currentTab = tabs[0];
}

function onError(err){
    console.error(err);
}

browser.commands.onCommand.addListener(function(command) {
    if (command == "run-default") {
        browser.tabs.query({currentWindow: true, active: true}).then(getTabs, onError);
        open_browser("1", currentTab.url); 
    }
});

function context_menu_clicked(info) {
	let browser_id = parseInt(info.menuItemId.substring(8), 10);
	let url = info.linkUrl ? info.linkUrl : info.pageUrl;
	if ('modifiers' in info && info.modifiers.includes('Ctrl')) {
		url = null;
	}
	open_browser(browser_id, url);
}

function open_browser(browser_id, url) {
	function split_args(argString) {
		let args = [];

		let temp = '';
		let inQuotes = false;
		for (let c of argString) {
			if (c == '"') {
				if (temp.endsWith('\\')) {
					temp = temp.substring(0, temp.length - 1) + c;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (c == ' ' && !inQuotes) {
				args.push(temp);
				temp = '';
			} else {
				temp += c;
			}
		}

		if (temp.length > 0) {
			args.push(temp);
		}

		return args;
	}

	let browser = browsers.find(b => b.id == browser_id);
	let command = split_args(browser.command);
	let found = false;
	for (let i = 0; i < command.length; i++) {
		if (command[i].includes('%s')) {
			command[i] = command[i].replace('%s', url ? url : '');
			found = true;
		}
	}
	if (url && !found) {
		command.push(url);
	}

	function error_listener(error) {
		console.error(error, chrome.runtime.lastError);
	}
	let port = chrome.runtime.connectNative('open_with');
	port.onDisconnect.addListener(error_listener);
	port.onMessage.addListener(function() {
		port.onDisconnect.removeListener(error_listener);
		port.disconnect();
	});
	port.postMessage(command);
}

chrome.storage.local.get({
	'browsers': [],
	'icons': []
}, result => {
	browsers = result.browsers;
	icons = result.icons;
	sort_browsers();
	make_menus();
	max_icon_id = icons.reduce(function(previous, item) {
		return Math.max(previous, item.id);
	}, 0);
});

function make_menus() {
	chrome.contextMenus.removeAll();
	let contexts = ['page', 'link'];
	if (navigator.userAgent.includes('Firefox')) {
		contexts.push('tab');
	}

	for (let b of browsers) {
		max_browser_id = Math.max(max_browser_id, b.id);
		if (b.hidden) {
			continue;
		}
		let item = {
			id: 'browser_' + b.id,
			title: b.name,
			contexts,
			documentUrlPatterns: ['<all_urls>', 'file:///*'],
			onclick: context_menu_clicked
		};
		if (navigator.userAgent.includes('Firefox') && !navigator.userAgent.includes('Firefox/55')) {
			if (b.icon && b.icon.startsWith('user_icon_')) {
				let icon = icons.find(i => i.id == parseInt(b.icon.substring(10)));
				item.icons = {
					16: icon['16'],
					32: icon['32']
				};
			} else if (b.icon) {
				item.icons = {
					16: 'icons/' + b.icon + '_16x16.png',
					32: 'icons/' + b.icon + '_32x32.png'
				};
			}
		}
		chrome.contextMenus.create(item);
	}
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	let {data} = message;
	let browser;
	switch (message.action) {
	case 'open_browser':
		open_browser(message.id, message.url);
		return;
	case 'get_browsers':
		sendResponse(browsers);
		return true;
	case 'add_browser':
		data.id = ++max_browser_id;
		browsers.push(data);
		chrome.storage.local.set({browsers}, function() {
			make_menus();
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
			make_menus();
			sendResponse(removed);
		});
		return true;
	case 'update_browser':
		// Update the existing object to keep any stray stuff.
		browser = browsers.find(b => b.id == data.id);
		if (browser) {
			browser.name = data.name;
			browser.command = data.command;
			if (data.icon) {
				browser.icon = data.icon;
			} else {
				delete browser.icon;
			}
			chrome.storage.local.set({browsers}, function() {
				make_menus();
				sendResponse(true);
			});
		}
		return true;
	case 'hide_browser':
		// Update the existing object to keep any stray stuff.
		browser = browsers.find(b => b.id == message.id);
		if (browser) {
			if (message.hidden) {
				browser.hidden = true;
			} else {
				delete browser.hidden;
			}
			chrome.storage.local.set({browsers}, function() {
				make_menus();
				sendResponse(true);
			});
		}
		return true;
	case 'order_browsers':
		for (let b of browsers) {
			b.order = message.order.indexOf(b.id);
		}
		sort_browsers();
		chrome.storage.local.set({browsers}, function() {
			make_menus();
			sendResponse(true);
		});
		return true;
	case 'get_icons':
		sendResponse(icons);
		return true;
	case 'add_icon':
		data.id = ++max_icon_id;
		icons.push(data);
		chrome.storage.local.set({icons}, function() {
			sendResponse(data.id);
		});
		return true;
	case 'remove_icon':
		for (let i = 0; i < icons.length; i++) {
			let b = icons[i];
			if (b.id == message.id) {
				icons.splice(i, 1);
				break;
			}
		}
		chrome.storage.local.set({icons}, function() {
			sendResponse();
		});
		return true;
	}
});

function sort_browsers() {
	browsers.sort(function(a, b) {
		if (isNaN(a.order)) {
			return isNaN(b.order) ? 0 : 1;
		}
		return isNaN(b.order) ? -1 : a.order - b.order;
	});
}

chrome.storage.local.get({'version': -1}, function({version: previousVersion}) {
	chrome.management.getSelf(function({version: currentVersion}) {
		if (previousVersion == -1) { // This is a new install.
			chrome.storage.local.set({'version': currentVersion});
			chrome.browserAction.setPopup({popup: 'installed.html'});
			return;
		} else if (previousVersion != currentVersion) { // This is an upgrade or downgrade.
			let newPrefs = {'version': currentVersion};
			if (compare_versions(currentVersion, previousVersion) > 0 &&
					(currentVersion.includes('b') || parseFloat(currentVersion, 10) != parseFloat(previousVersion, 10))) {
				newPrefs.versionLastUpdate = new Date();
			}
			chrome.storage.local.set(newPrefs);
		}

		get_version_warn().then(function(version_warn) {
			function error_listener() {
				chrome.browserAction.setBadgeText({text: '!'});
				chrome.browserAction.setBadgeBackgroundColor({color: ERROR_COLOUR});
			}

			let port = chrome.runtime.connectNative('open_with');
			port.onDisconnect.addListener(error_listener);
			port.onMessage.addListener(function(message) {
				if (message) {
					if (compare_versions(message.version, version_warn) < 0) {
						chrome.browserAction.setBadgeText({text: '!'});
						chrome.browserAction.setBadgeBackgroundColor({color: WARNING_COLOUR});
					}
				} else {
					error_listener();
				}
				port.onDisconnect.removeListener(error_listener);
				port.disconnect();
			});
			port.postMessage('ping');
		});
	});
});
