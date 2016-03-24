/* globals Cc, Ci, NetUtil, OpenWithCore, OS, Services, XPCOMUtils */
XPCOMUtils.defineLazyModuleGetter(this, 'NetUtil', 'resource://gre/modules/NetUtil.jsm');

var threadManager = Cc['@mozilla.org/thread-manager;1'].getService();
var server = Cc['@mozilla.org/network/server-socket;1'].createInstance(Ci.nsIServerSocket);
var socketFile = Services.dirsvc.get('ProfD', Ci.nsIFile);
socketFile.append('openwith-socket');
try {
	server.initWithFilename(socketFile, 0777, -1);
} catch (ex) {
	server.init(-1, true, -1);
	OS.File.writeAtomic(socketFile.path, new TextEncoder().encode(server.port.toString(10)));
}
server.asyncListen({
	onSocketAccepted: function(socket, transport) {
		let input = transport.openInputStream(0, 0, 0);
		input.asyncWait(function(stream) {
			let message = NetUtil.readInputStreamToString(stream, stream.available());
			let url = message.split(/\s/, 2)[0];
			if (url) {
				OpenWithCore.openURL(url, false);
			}
			input.close();
		}, 0, 0, threadManager.currentThread);
	},
	onStopListening: function() {
		socketFile.remove(true);
	}
});
