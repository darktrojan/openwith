/* globals chrome, get_strings */
get_strings();

document.querySelector('button').onclick = function() {
	chrome.runtime.openOptionsPage(function() {
		window.close();
	});
};
