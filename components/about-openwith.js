const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

function OpenWithAboutHandler() {
}

OpenWithAboutHandler.prototype = {
	newChannel: function(aURI) {
		if (!aURI.spec == 'about:openwith')
			return;

		var channel = Services.io.newChannel('chrome://openwith/content/about-openwith.xul', null, null);
		channel.originalURI = aURI;
		return channel;
	},
	getURIFlags: function(aURI) {
		return Ci.nsIAboutModule.ALLOW_SCRIPT;
	},
	classDescription: 'About OpenWith Page',
	classID: Components.ID('97ce549f-5ec6-460e-ad11-55a7bd190185'),
	contractID: '@mozilla.org/network/protocol/about;1?what=openwith',
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule])
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([OpenWithAboutHandler]);
