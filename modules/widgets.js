/* globals Components, CustomizableUI, OpenWithCore, Iterator */
Components.utils.import('resource:///modules/CustomizableUI.jsm');

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

CustomizableUI.createWidget({
	id: 'openwith-widewidget',
	type: 'custom',
	onBuild: function(aDocument) {
		let toolbaritem = aDocument.createElement('toolbaritem');
		toolbaritem.id = 'openwith-widewidget';
		toolbaritem.className = 'chromeclass-toolbar-additional toolbaritem-combined-buttons panel-wide-item';
		toolbaritem.setAttribute('removable', 'true');
		toolbaritem.setAttribute('title', label);

		OpenWithCore.loadList(false);
		let location = {
			factory: OpenWithCore.createToolbarButton,
			suffix: '_widewidget',
			container: toolbaritem
		};
		OpenWithCore.refreshUI(aDocument, [location], { keyTargetType: OpenWithCore.TARGET_STANDARD });
		aDocument.defaultView.OpenWith.locations.push(location);

		function updateCombinedWidgetStyle(aArea) {
			let inPanel = aArea == CustomizableUI.AREA_PANEL;
			let className = inPanel ? 'panel-combined-button' : 'toolbarbutton-1 toolbarbutton-combined';
			for (let [, tbb] of Iterator(toolbaritem.querySelectorAll('toolbarbutton'))) {
				tbb.className = className;
			}
		}

		let listener = {
			onWidgetAdded: (aWidgetId, aArea) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(aArea);
			},
			onWidgetRemoved: (aWidgetId) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(null);
			},
			onWidgetMoved: (aWidgetId, aArea) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(aArea);
			},
			onWidgetReset: function() {},
			onWidgetInstanceRemoved: function() {},
			onCustomizeStart: function() {},
			onCustomizeEnd: function() {},
			onWidgetDrag: function() {}
		};
		CustomizableUI.addListener(listener);

		return toolbaritem;
	}
});
