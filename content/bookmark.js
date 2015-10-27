/* globals Components, PlacesUtils, PlacesUIUtils, Services, OpenWithCore */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://openwith/openwith.jsm');

let acceptButton = document.documentElement.getButton('accept');
acceptButton.disabled = true;

let url = document.getElementById('url');
let browser = document.getElementById('browser');
let folder = document.getElementById('folder');

url.oninput = folder.onselect = function() {
	acceptButton.disabled = !url.value || !folder.view._selection.count;
};

for (let entry of OpenWithCore.list) {
	if (!entry.hidden) {
		let menuitem = document.createElement('menuitem');
		menuitem.setAttribute('label', entry.name);
		menuitem.setAttribute('image', entry.icon);
		menuitem.setAttribute('value', (entry.auto ? 'auto.' : 'manual.') + entry.keyName);
		browser.menupopup.appendChild(menuitem);
	}
}
browser.selectedIndex = 0;

window.onload = function() {
	folder.place = 'place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder=' +
		PlacesUIUtils.allBookmarksFolderId;
};

/* exported dialogAccept */
function dialogAccept() {
	let view = folder.view;
	let selection = view._selection;
	if (url.value && selection.count) {
		let original = Services.io.newURI(url.value, null, null);
		let title = PlacesUtils.history.getPageTitle(original);
		let uri = Services.io.newURI('openwith:' + browser.value + ':' + url.value, null, null);
		console.log(view._rows[selection.currentIndex].itemId, uri.spec, -1, title);
		// let nbs = Cc['@mozilla.org/browser/nav-bookmarks-service;1'].getService(Ci.nsINavBookmarksService)
		// nbs.insertBookmark(view._rows[selection.currentIndex].itemId, uri.spec, -1, title);
	}
	return false;
}
