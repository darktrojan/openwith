/* globals browser */
let browsersList = document.getElementById('browsers');
let browsersTemplate = browsersList.querySelector('template');

browser.runtime.sendMessage({action: 'get_browsers'}).then(function(browsers) {
	for (let b of browsers) {
		add_browser(b);
	}
});

browsersList.onclick = function(event) {
	let target = event.target;
	while (target && target.localName != 'li') {
		target = target.parentNode;
	}
	browser.tabs.query({active:true, currentWindow:true}).then(function(tabs) {
		browser.runtime.sendMessage({action: 'open_browser', id: target.dataset.id, url: tabs[0].url});
		window.close();
	});
};

function add_browser(b) {
	let li = browsersTemplate.content.firstElementChild.cloneNode(true);
	li.dataset.id = b.id;
	li.querySelector('img').src = 'icons/' + b.icon + '_16x16.png';
	li.querySelector('div.name').textContent = b.name;
	browsersList.appendChild(li);
}
