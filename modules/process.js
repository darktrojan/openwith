/* globals Components, Services, sendAsyncMessage */
const { interfaces: Ci, manager: Cm, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');

try {
	if (Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_CONTENT) {
		let componentRegistrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
		let scope = Object.create(null);
		scope.callback = function(match) {
			try {
				sendAsyncMessage('OpenWith:OpenURI', { keyName: match[1], uri: match[4] });
			} catch (ex) {
				Cu.reportError(ex);
			}
		};

		let uri = Services.io.newURI('resource://openwith/', null, null);
		let handler = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
		let resolved = handler.resolveURI(uri);

		Services.scriptloader.loadSubScript(resolved.replace(/\/modules\/$/, '/components/openwith-protocol.js'), scope);
		componentRegistrar.registerFactory(
			scope.OpenWithProtocol.prototype.classID,
			'',
			scope.OpenWithProtocol.prototype.contractID,
			scope.NSGetFactory(scope.OpenWithProtocol.prototype.classID)
		);
	}
} catch (ex) {
	Cu.reportError(ex);
}
