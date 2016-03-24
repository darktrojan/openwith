/* exported EXPORTED_SYMBOLS, OpenWithDataCollector */
var EXPORTED_SYMBOLS = ['OpenWithDataCollector'];

/* globals Components, Services, XPCOMUtils */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

/* globals OpenWithCore, OS, Preferences */
XPCOMUtils.defineLazyModuleGetter(this, 'OpenWithCore', 'resource://openwith/openwith.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'OS', 'resource://gre/modules/osfile.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Preferences', 'resource://gre/modules/Preferences.jsm');

/* globals idleService, uuidGenerator */
XPCOMUtils.defineLazyServiceGetter(this, 'idleService', '@mozilla.org/widget/idleservice;1', 'nsIIdleService');
XPCOMUtils.defineLazyServiceGetter(this, 'uuidGenerator', '@mozilla.org/uuid-generator;1', 'nsIUUIDGenerator');

var prefs = Services.prefs.getBranch('extensions.openwith.datacollection.');

var OpenWithDataCollector = {
	get activeFrom() {
		return Date.UTC(2016, 0, 1);
	},
	get activeUntil() {
		return Date.UTC(2016, 4, 1);
	},
	get active() {
		return prefs.getBoolPref('optin') && Date.now() < this.activeUntil;
	},
	get shouldReport() {
		return !prefs.prefHasUserValue('lastreport') ||
			prefs.getIntPref('lastreport') * 1000 < this.activeFrom;
	},
	incrementCount: function(key) {
		actionReporter.incrementCount(key);
	}
};
XPCOMUtils.defineLazyGetter(OpenWithDataCollector, 'clientID', function() {
	if (prefs.prefHasUserValue('clientID')) {
		return prefs.getCharPref('clientID');
	}
	let id = uuidGenerator.generateUUID().toString().substr(1, 8);
	prefs.setCharPref('clientID', id);
	return id;
});

var actionReporter = {
	collectionURL: 'https://www.darktrojan.net/data-collection/experiment5.php',
	counterData: null,
	samplePeriod: 604800000, // A week
	counters: ['browserOpened', 'aboutOpenWithOpened'],
	resetData: function(start = Date.now()) {
		this.counterData = Object.create(null);
		this.counterData.start = start;
		this.counterData.end = this.counterData.start + this.samplePeriod;
		for (let c of this.counters) {
			this.counterData[c] = 0;
		}
		this.writeDataToPref();
	},
	readDataFromPref: function() {
		try {
			this.counterData = JSON.parse(atob(prefs.getCharPref('counterdata')));
		} catch (ex) {
			this.resetData();
		}
	},
	incrementCount: function(key) {
		if (this.counters.indexOf(key) < 0) {
			throw new Error('Attempt to increment a non-active counter');
		}
		if (!!this.counterData) {
			this.maybePublishData();
			this.counterData[key]++;
			this.writeDataToPref();
		}
	},
	writeDataToPref: function() {
		prefs.setCharPref('counterdata', btoa(JSON.stringify(this.counterData)));
	},
	maybePublishData: function() {
		if (this.counterData.end < Date.now()) {
			// This sampling period has ended. Send to server.
			this.publishData();
			if (this.counterData.end + this.samplePeriod < Date.now()) {
				this.resetData();
			} else {
				// Start a new sampling period immediately after the last one.
				this.resetData(this.counterData.end);
			}
		}
	},
	publishData: function() {
		if (!OpenWithDataCollector.active) {
			return;
		}

		let data = new Services.appShell.hiddenDOMWindow.FormData();
		data.set('clientID', OpenWithDataCollector.clientID);
		data.set('start', Math.floor(this.counterData.start / 1000));
		data.set('end', Math.floor(this.counterData.end / 1000));
		for (let c of this.counters) {
			data.set(c, this.counterData[c]);
		}

		Services.tm.currentThread.dispatch(() => {
			// This might happen during the load of openwith.jsm, and besides,
			// there's no hurry. Do it at the end of the event loop.
			OpenWithCore.log('Submitting Open With usage data');
			Services.appShell.hiddenDOMWindow.fetch(this.collectionURL, {
				method: 'POST',
				body: data
			});
		}, Components.interfaces.nsIThread.DISPATCH_NORMAL);
	}
};

var prefReporter = {
	collectionURL: 'https://www.darktrojan.net/data-collection/experiment3.php',
	timeout: 60,
	initReport: function() {
		idleService.addIdleObserver(this, this.timeout);
	},
	report: function() {
		if (!OpenWithDataCollector.active || !OpenWithDataCollector.shouldReport) {
			return;
		}

		OpenWithCore.log('Submitting Open With usage data');
		Services.appShell.hiddenDOMWindow.fetch(this.collectionURL, {
			method: 'POST',
			body: this.gatherData()
		});
		prefs.setIntPref('lastreport', Math.floor(Date.now() / 1000));
	},
	gatherData: function() {
		let data = new Services.appShell.hiddenDOMWindow.FormData();
		data.set('clientID', OpenWithDataCollector.clientID);

		let activeBrowsers = OpenWithCore.list.filter(b => !b.hidden);
		for (let b of activeBrowsers) {
			data.append('activeBrowsers[]', OS.Path.basename(b.command));
		}

		let prefs = [
			'contextmenu',
			'contextmenu.submenu',
			'contextmenulink',
			'contextmenulink.submenu',
			'placescontext',
			'placescontext.submenu',
			'tabbar',
			'tabbar.menu',
			'tabmenu',
			'tabmenu.submenu',
			'toolbar',
			'toolbar.menu',
			'toolbox',
			'toolbox.menu',
			'viewmenu',
			'viewmenu.submenu'
		];
		for (let p of prefs) {
			data.set(
				'pref' + p.replace(/(^|\.)([a-z])/g, (...m) => m[2].toUpperCase()),
				Preferences.get('extensions.openwith.' + p)
			);
		}

		data.set('appName', Services.appinfo.name);
		data.set('appVersion', parseInt(Services.appinfo.version, 10));
		data.set('appOS', Services.appinfo.OS);
		let chromeRegistry = Components.classes['@mozilla.org/chrome/chrome-registry;1']
			.getService(Components.interfaces.nsIXULChromeRegistry);
		data.set('appLocale', chromeRegistry.getSelectedLocale('browser'));

		return data;
	},
	observe: function(service, state) {
		if (state != 'idle') {
			return;
		}
		idleService.removeIdleObserver(this, this.timeout);
		this.report();
	}
};

if (OpenWithDataCollector.active) {
	actionReporter.readDataFromPref();
	actionReporter.maybePublishData();

	if (OpenWithDataCollector.shouldReport) {
		prefReporter.initReport();
	}
}
