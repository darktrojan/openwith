/* globals browser */
let browsersList = document.getElementById('browsers');
browsersList.onclick = function(event) {
	if (event.target.classList.contains('removeBrowser')) {
		let li = event.target.parentNode.parentNode.parentNode;
		let id = parseInt(li.dataset.id, 10);
		browser.runtime.sendMessage({action: 'remove_browser', id}).then(function() {
			li.remove();
		});
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
