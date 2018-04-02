/* globals APP_SHUTDOWN, Components, Services */
/* exported install, uninstall, startup, shutdown */
Components.utils.import('resource://gre/modules/Services.jsm');

var defaultPrefs = {
	'extensions.openwith.contextmenulink': false,
	'extensions.openwith.contextmenulink.submenu': false,
	'extensions.openwith.log.enabled': false
};
var aboutPage = {};

function install() {
}
function uninstall() {
}
function startup(params) {
	let defaultBranch = Services.prefs.getDefaultBranch('');
	for (let [k, v] of Object.entries(defaultPrefs)) {
		switch (typeof v) {
		case 'boolean':
			defaultBranch.setBoolPref(k, v);
			break;
		case 'number':
			defaultBranch.setIntPref(k, v);
			break;
		case 'string':
			defaultBranch.setCharPref(k, v);
			break;
		}
	}

	Services.scriptloader.loadSubScript(params.resourceURI.spec + 'components/about-openwith.js', aboutPage);
	let registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	registrar.registerFactory(
		aboutPage.OpenWithAboutHandler.prototype.classID,
		'',
		aboutPage.OpenWithAboutHandler.prototype.contractID,
		aboutPage.NSGetFactory(aboutPage.OpenWithAboutHandler.prototype.classID)
	);

	windowObserver.init();
}
function shutdown(params, reason) {
	if (reason == APP_SHUTDOWN) {
		return;
	}

	let registrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
	registrar.unregisterFactory(
		aboutPage.OpenWithAboutHandler.prototype.classID,
		aboutPage.NSGetFactory(aboutPage.OpenWithAboutHandler.prototype.classID)
	);

	windowObserver.destroy();

	Components.utils.unload('chrome://openwith/content/openwith.jsm');
}

var windowObserver = {
	init: function() {
		this.enumerate('mail:3pane', this.paint);
		this.enumerate('mail:messageWindow', this.paint);
		Services.ww.registerNotification(this);
	},
	destroy: function() {
		this.enumerate('mail:3pane', this.unpaint);
		this.enumerate('mail:messageWindow', this.unpaint);
		Services.ww.unregisterNotification(this);
	},
	enumerate: function(windowType, callback) {
		let windowEnum = Services.wm.getEnumerator(windowType);
		while (windowEnum.hasMoreElements()) {
			callback.call(this, windowEnum.getNext());
		}
	},
	observe: function(subject) {
		subject.addEventListener('load', function() {
			windowObserver.paint(subject);
		}, false);
	},
	paint: function(win) {
		let script;
		switch (win.location.href) {
		case 'chrome://messenger/content/messenger.xul':
		case 'chrome://messenger/content/messageWindow.xul':
			script = 'chrome://openwith/content/openwith-mail.js';
			break;
		default:
			return;
		}
		Services.scriptloader.loadSubScript(script, win);
	},
	unpaint: function(win) {
		switch (win.location.href) {
		case 'chrome://messenger/content/messenger.xul':
		case 'chrome://messenger/content/messageWindow.xul':
			win.OpenWith.destroy();
			break;
		}
	}
};
