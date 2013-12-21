Components.utils.import('resource://gre/modules/devtools/gcli.jsm');

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
	description: OpenWithCore.strings.GetStringFromName('gcli.command.description'),
	params: [{
		name: 'browser',
        description: OpenWithCore.strings.GetStringFromName('gcli.params.browser.description'),
		type: 'openwith-browsers'
	}, {
		name: 'nourl',
		description: OpenWithCore.strings.GetStringFromName('gcli.params.nourl.description'),
		type: 'boolean'
	}],
	exec: function(args, context) {
		let params = args.browser.params.slice();
		if (!args.nourl) {
			params.push(context.environment.window.location.href);
		}
        OpenWithCore.doCommandInternal(args.browser.command, params);
	}
});
