/* globals chrome */
let browsersList = document.getElementById('browsers');
let browsersTemplate = browsersList.querySelector('template');

chrome.runtime.sendMessage({action: 'get_browsers'}, function(browsers) {
	for (let b of browsers) {
		add_browser(b);
	}
});

browsersList.onclick = function(event) {
	let target = event.target;
	while (target && target.localName != 'li') {
		target = target.parentNode;
	}
	chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
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
	chrome.tabs.query({ url }, function(result) {
		if (result && result.length > 0) {
			let tab = result[0];
			chrome.tabs.update(tab.id, { active: true });
			chrome.windows.update(tab.windowId, { focused: true });
		} else {
			chrome.tabs.create({ url });
		}
		window.close();
	});
};

function add_browser(b) {
	let li = browsersTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.id = b.id;
	li.querySelector('img').src = 'logos/' + b.icon + '_16x16.png';
	li.querySelector('div.name').textContent = b.name;
	browsersList.appendChild(li);
}
