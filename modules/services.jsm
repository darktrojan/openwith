var EXPORTED_SYMBOLS = ['Services'];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

try {
	Cu.import ('resource://gre/modules/Services.jsm'); // 1.9.3
} catch (e) {
	Cu.import ('resource://gre/modules/XPCOMUtils.jsm'); // 1.9.2

	var Services = {};
	XPCOMUtils.defineLazyServiceGetter (Services, 'io',
		'@mozilla.org/network/io-service;1', 'nsIIOService2');
	XPCOMUtils.defineLazyServiceGetter (Services, 'obs',
		'@mozilla.org/observer-service;1', 'nsIObserverService');
	XPCOMUtils.defineLazyServiceGetter (Services, 'console',
		'@mozilla.org/consoleservice;1', 'nsIConsoleService');
	XPCOMUtils.defineLazyServiceGetter (Services, 'strings',
		'@mozilla.org/intl/stringbundle;1', 'nsIStringBundleService');
	XPCOMUtils.defineLazyGetter (Services, 'prefs', function () {
		return Cc ['@mozilla.org/preferences-service;1']
			.getService (Ci.nsIPrefService).QueryInterface (Ci.nsIPrefBranch2);
	});
	XPCOMUtils.defineLazyGetter (Services, 'dirsvc', function () {
		return Cc ['@mozilla.org/file/directory_service;1']
			.getService (Ci.nsIDirectoryService).QueryInterface (Ci.nsIProperties);
	});
	XPCOMUtils.defineLazyServiceGetter (Services, 'prompt',
		'@mozilla.org/embedcomp/prompt-service;1', 'nsIPromptService');
	XPCOMUtils.defineLazyServiceGetter (Services, 'wm',
		'@mozilla.org/appshell/window-mediator;1', 'nsIWindowMediator');
	XPCOMUtils.defineLazyGetter (Services, 'appinfo', function () {
		return Cc ['@mozilla.org/xre/app-info;1']
			.getService (Ci.nsIXULAppInfo).QueryInterface (Ci.nsIXULRuntime);
	});
}
