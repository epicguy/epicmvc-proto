# Return true to preventDefault
dataAction= (type, data_action, data_params) ->
	f= 'Base:E/dataAction:on[data-e-action]'+ type
	E.option.activity? type
	action_specs= data_action.split ','
	do_action= true
	prevent= false
	for one_spec in action_specs
		[spec_type, spec_action, group, item, interesting]= one_spec.split ':'
		(spec_action= spec_type; spec_type= 'click') if not spec_action
		_log2 f, 'check', spec_type, type, if spec_type is type then 'YES' else 'NO'
		if spec_type is 'event' # Any event will get passed to caller
			E.event spec_action, type, group, item, interesting, data_params
		if do_action and spec_type is type # The event-type (click/dblclick/etc.) matches user's spec
			prevent= true if spec_type in ['click', 'rclick'] # TODO
			do_action= false
			#TODO TYPE EVENTS ARE BEHIND do( spec_action) -> setTimeout (-> E.action spec_action, data_params), 0
			E.action spec_action, data_params
			#TODO WITHOUT SETTIMEOUT, MAY NEED TO HANDLE EVENT'S BEFORE ACTIONS, EH?
	return prevent

E.Extra.dataAction$Base= dataAction

E.event= (name, type, group, item, interesting, params) ->
	if interesting isnt 'all'
		event_names= interesting.split '-'
		return if type not in event_names
	# Find recipient
	if name is 'Fist'
		name= E.fistDef[ group].event ? name
	# TODO HANDLE OTHER 'name'S LIKE TAB OR SCROLL
	E[ name]().event name, type, group, item, params
