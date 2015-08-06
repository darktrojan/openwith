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
		let areaType = CustomizableUI.getAreaType(this.currentArea);
		let inPanel = areaType == CustomizableUI.TYPE_MENU_PANEL;
		let className = inPanel ? 'panel-combined-button' : 'toolbarbutton-1 toolbarbutton-combined';

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
		OpenWithCore.refreshUI(aDocument, [location], {});
		aDocument.defaultView.OpenWith.locations.push(location);

		function updateCombinedWidgetStyle(aArea) {
			let inPanel = aArea == CustomizableUI.AREA_PANEL;
			let className = inPanel ? 'panel-combined-button' : 'toolbarbutton-1 toolbarbutton-combined';
			for (let [, tbb] of Iterator(toolbaritem.querySelectorAll('toolbarbutton'))) {
				tbb.className = className;
			}
		}

		let listener = {
			onWidgetAdded: (aWidgetId, aArea, aPosition) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(aArea);
			},
			onWidgetRemoved: (aWidgetId, aPrevArea) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(null);
			},
			onWidgetMoved: (aWidgetId, aArea) => {
				if (aWidgetId == this.id)
					updateCombinedWidgetStyle(aArea);
			},
			onWidgetReset: function(aWidgetNode) {},
			onWidgetInstanceRemoved: function(aWidgetId, aDoc) {},
			onCustomizeStart: function(aWindow) {},
			onCustomizeEnd: function(aWindow) {},
			onWidgetDrag: function(aWidgetId, aArea) {}
		};
		CustomizableUI.addListener(listener);

		return toolbaritem;
	}
});
