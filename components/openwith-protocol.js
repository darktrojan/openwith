/* globals Components, Services, XPCOMUtils, OpenWithCore */
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'OpenWithCore', 'resource://openwith/openwith.jsm');

function OpenWithProtocol() {
}

OpenWithProtocol.prototype = {
	scheme: 'openwith',
	protocolFlags: Ci.nsIProtocolHandler.URI_NORELATIVE |
		Ci.nsIProtocolHandler.URI_NOAUTH |
		Ci.nsIProtocolHandler.URI_FETCHABLE_BY_ANYONE |
		// Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD |
		Ci.nsIProtocolHandler.URI_DOES_NOT_RETURN_DATA,
		// Ci.nsIProtocolHandler.URI_OPENING_EXECUTES_SCRIPT,

	newURI: function(aSpec) {
		var uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
		uri.spec = aSpec;
		return uri;
	},

	newChannel: function(aURI) {
		return new OpenWithChannel(aURI);
	},
	classDescription: 'Open With Protocol Handler',
	contractID: '@mozilla.org/network/protocol;1?name=openwith',
	classID: Components.ID('{a4b89ac1-74f9-42f5-9fb7-80315cbbb94c}'),
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([OpenWithProtocol]);

function OpenWithChannel(aURI) {
	this.originalURI = aURI;
	this.URI = aURI;
}

OpenWithChannel.prototype = {
	originalURI: null,
	URI: null,
	owner: null,
	notificationCallbacks: null,
	securityInfo: null,
	contentType: null,
	contentCharset: null,
	contentLength: 0,
	contentDisposition: Ci.nsIChannel.DISPOSITION_INLINE,
	contentDispositionFilename: null,
	contentDispositionHeader: null,
	loadInfo: null,

	open: function() {
		throw Cr.NS_ERROR_NOT_IMPLEMENTED;
	},

	open2: function() {
		throw Cr.NS_ERROR_NOT_IMPLEMENTED;
	},

	asyncOpen: function(aListener, aContext) {
		let match = /^openwith:((auto|manual)\.([\w\.-]+)):(.*)$/.exec(this.URI.spec);
		if (match) {
			OpenWithCore.doCommandWithListItem(match[1], match[4]);
		}
		aListener.onStopRequest(this, aContext, Cr.NS_OK);
	},

	asyncOpen2: function(aListener) {
		this.asyncOpen(aListener, null);
	},

	QueryInterface: XPCOMUtils.generateQI([Ci.nsIChannel])
};
