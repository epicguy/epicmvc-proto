(function ($) {
	"use strict";

	//hooks for drag and drop events, like $.event.keyHooks and $.event.mouseHooks, but for drag and drop
	var dndHooks = {
		//importing to the event object all the properties like in a regular mouse event,
		//also importing the dataTransfer property
		props: $.event.mouseHooks.props.concat('dataTransfer'),

		//since no new filtering to the imported props is needed, we only need the same filtering as in normal
		//mouse events
		filter: $.event.mouseHooks.filter
	};

	//make the drag and drop events like every other event, this is almost the same as the end of /src/event.js
	$.each(['dragstart', 'dragenter', 'dragover', 'dragleave', 'drag', 'drop', 'dragend'], function (i, name) {
		$.fn[name] = function (data, fn) {
			if (!fn) {
				fn = data;
				data = null;
			}
			return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
		};

		if ($.attrFn) {
			$.attrFn[name] = true;
		}

		$.event.fixHooks[name] = dndHooks;
	});

}(jQuery));

