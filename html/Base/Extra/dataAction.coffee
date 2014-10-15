dataAction= (type, data_action, data_params) ->
	f= 'Base:E/dataAction:on[data-action]'+ type
	E.option.activity? type
	action_specs= data_action.split ','
	for one_spec in action_specs
		[spec_type, spec_action]= one_spec.split ':'
		(spec_action= spec_type; spec_type= 'click') if not spec_action
		#_log2 f, 'check', spec_type, type, if spec_type is type then 'YES' else 'NO'
		if spec_type is type # The event-type (click/dblclick/etc.) matches the user's specification
			do( spec_action) -> setTimeout (-> E.click spec_action, data_params), 5
			break

E.Extra.dataAction$Base= dataAction
