/* globals Components, Services, sendAsyncMessage */
Components.utils.import('resource://gre/modules/Services.jsm');

try {
	if (Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_CONTENT) {
		let componentRegistrar = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		let scope = Object.create(null);
		scope.flob = function(match) {
			try {
				sendAsyncMessage('OpenWith:DoStuff', { keyName: match[1], uri: match[4] });
			} catch(ex) {
				Components.utils.reportError(ex);
			}
		};
		sendAsyncMessage('OpenWith:DoStuff', { keyName: 'lol', uri: 'nope' });

		Services.scriptloader.loadSubScript('file:///home/geoff/firefoxprofiles/sjua7g0g.test/extensions/openwith@darktrojan.net/components/openwith-protocol.js', scope);
		componentRegistrar.registerFactory(
			scope.OpenWithProtocol.prototype.classID,
			'',
			scope.OpenWithProtocol.prototype.contractID,
			scope.NSGetFactory(scope.OpenWithProtocol.prototype.classID)
		);
	}
} catch (ex) {
	Components.utils.reportError(ex);
}
