/* globals chrome, compare_versions, get_version_warn, ERROR_COLOUR, WARNING_COLOUR */
var browsers, icons, menu_contexts;
var max_browser_id = 0;
var max_icon_id = 0;

chrome.commands.onCommand.addListener(function(command) {
	chrome.tabs.query({currentWindow: true, active: true}, tabs => {
		let browser = browsers.find(b => b.shortcut == command);
		if (browser) {
			open_browser(browser.id, tabs[0].url);
		}
	});
});


/**
 * Takes onClickData, returns what you'd probably expect the URL to be, based on what you clicked
 * e.g. frameUrl if the context was 'frame', pageUrl if the context was 'page', etc..
 * 
 * @param {menus.OnClickData} info an instance of menus.OnClickData describing the element that was clicked on passed down from the listener for menus.onClicked 
 * @returns {string} what you'd probably expect the URL to be, based on what you clicked
 */
function get_target_url(info) {

	//if no match is found, this string should alert the user that something's gone very wrong
	let url = "somethingwentwronginopenwith";
	
	//is the target a link?
	if (info.linkUrl){
		url = info.linkUrl;
	}//is the target an img, audio, or video element?
	else if (info.srcUrl) {
		url= info.srcUrl;
	}//is the element an iframe?
	else if (info.frameUrl) {
		url = info.frameUrl;
	}//is there a URL selected?
	else if (info.selectionText && info.selectionText.match("^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$")) {
		url = info.selectionText;
	}//if there's nothing else, return the page URL
	else {
		url = info.pageUrl;
	}

	return url;

}


/**
 * Callback function for menus.onClicked
 * 
 * @param {menus.OnClickData} info an instance of menus.OnClickData describing the element that was clicked on
 */
function context_menu_clicked(info) {
	let browser_id = parseInt(info.menuItemId.substring(8), 10);

	console.error(info.menuItemId);
	console.error(JSON.stringify(info));
	//extract target URL using the helper function
	let url = get_target_url(info);

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
	'icons': [],
	'menu_contexts': null
}, result => {
	browsers = result.browsers;
	icons = result.icons;
	menu_contexts = result.menu_contexts;
	sort_browsers();
	make_menus();
	max_icon_id = icons.reduce(function(previous, item) {
		return Math.max(previous, item.id);
	}, 0);
});

function make_menus() {
	chrome.contextMenus.removeAll();
	if (menu_contexts === null) {
		menu_contexts = ['page', 'link', 'image', 'video', 'audio', 'frame', 'selection'];
		if (navigator.userAgent.includes('Firefox')) {
			menu_contexts.push('tab');
		}
	}

	if (menu_contexts.length === 0) {
		return;
	}

	for (let b of browsers) {
		max_browser_id = Math.max(max_browser_id, b.id);
		if (b.hidden) {
			continue;
		}
		let item = {
			id: 'browser_' + b.id,
			title: b.name,
			contexts: menu_contexts,
			documentUrlPatterns: ['<all_urls>', 'file:///*'],
			onclick: context_menu_clicked
		};
		if (navigator.userAgent.includes('Firefox')) {
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

chrome.storage.onChanged.addListener(changes => {
	if ('menu_contexts' in changes) {
		menu_contexts = changes.menu_contexts.newValue;
		make_menus();
	}
});

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
		if (data.shortcut) {
			let existing = browsers.find(b => b.shortcut == data.shortcut);
			if (existing) {
				delete existing.shortcut;
			}
		}

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
			if (data.shortcut) {
				if (browser.shortcut != data.shortcut) {
					let existing = browsers.find(b => b.shortcut == data.shortcut);
					if (existing) {
						delete existing.shortcut;
					}
					browser.shortcut = data.shortcut;
				}
			} else {
				delete browser.shortcut;
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
		if (previousVersion != currentVersion) { // This is an upgrade or downgrade.
			let newPrefs = {'version': currentVersion};
			if (previousVersion != -1 &&
					compare_versions(currentVersion, previousVersion) > 0 &&
					(currentVersion.includes('b') || parseFloat(currentVersion, 10) != parseFloat(previousVersion, 10))) {
				newPrefs.versionLastUpdate = new Date().toJSON();
			}
			chrome.storage.local.set(newPrefs);
		}

		get_version_warn().then(function(version_warn) {
			function error_listener() {
				if (previousVersion == -1) { // This is a new install.
					chrome.browserAction.setPopup({popup: 'installed.html'});
					return;
				}
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
