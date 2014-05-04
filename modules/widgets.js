Components.utils.import('resource://app/modules/CustomizableUI.jsm');

let label = OpenWithCore.strings.GetStringFromName('openWithDropDownTooltip');

CustomizableUI.createWidget({
	id: 'openwith-widget',
	label: label,
	tooltiptext: label,
	type: 'view',
	viewId: 'PanelUI-openwith',
	removable: true,
	defaultArea: CustomizableUI.AREA_PANEL,
	onCreated: function() {},
	onViewShowing: function() {},
	onViewHiding: function() {}
});
