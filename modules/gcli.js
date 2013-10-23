Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/devtools/gcli.jsm');
Components.utils.import('resource://openwith/openwith.jsm');

gcli.addType({
	name: 'openwith-browsers',
	parent: 'selection',
	cacheable: true,
	constructor: function() {
		Services.obs.addObserver(this, 'openWithListChanged', false);
	},
	observe: function(subject, topic, data) {
		this.clearCache();
	},
	lookup: function() {
		return OpenWithCore.list.map(function(aItem) {
			return { name: aItem.keyName, value: aItem };
		});
	}
});
gcli.addCommand({
	name: 'openwith',
	params: [{
		name: 'browser',
        description: 'Select a browser to open',
		type: 'openwith-browsers'
	}],
	exec: function(args, context) {
		let params = args.browser.params.slice();
		params.push(context.environment.window.location.href);
        OpenWithCore.doCommandInternal(args.browser.command, params);
	}
});
