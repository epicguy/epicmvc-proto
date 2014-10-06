dataAction= (type, data_action, data_params) ->
	f= 'Base:E/dataAction:on[data-action]'+ type
	E.option.activity? type
	action_specs= data_action.split ','
	for one_spec in action_specs
		[spec_type, spec_action]= one_spec.split ':'
		(spec_action= spec_type; spec_type= 'click') if not spec_action
		if spec_type is type # The event-type (click/dblclick/etc.) matches the user's specification
			do( spec_action) -> setTimeout (-> E.click spec_action, data_params), 5
		break

E.Extra.dataAction$Base= dataAction
###
$(document).on("click change dblclick", "[data-action]", function(event_obj) {
//console.log( 'event', event_obj, this, $(this).val());
event_obj.preventDefault(); // Added to keep LOGIN FORM from posting, causing fresh instance to start up
handle_data_action( event_obj.type, $(this).attr( 'data-action'), $(this).attr( 'data-params'), $(this).val());
return false; // TODO CONSIDER MAKING SURE WE WANTED TO STOP, OR DO MORE TO ENSURE WE STOP DOING MORE THAN THIS
});
###
