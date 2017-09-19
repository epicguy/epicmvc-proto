'use strict'
# Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

tell_Tab= (type, event_obj, target, data_action) ->
	if type in ['click', 'enter'] or type is 'keyup' and event_obj.keyCode is 27
		E.Tab().event 'Tab', type, 'Drop', '_CLEARED', {} unless /event:Tab:Drop:/.test data_action

E.app$Base=
	OPTIONS:
		render: 'RenderStrategy$Base'
		dataAction: 'dataAction$Base'
		event: tell_Tab
	MODELS:
		App:  class: "App$Base",  inst: "iBaseApp"
		View: class: "View$Base", inst: "iBaseView"
		Fist: class: "Fist$Base", inst: "iBaseFist"
		Tab:  class: "Tab$Base",  inst: "iBaseTab"
		Wist: class: "Wist$Base", inst: "iBaseWist"

