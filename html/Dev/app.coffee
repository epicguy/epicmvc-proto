warn= (str,o) -> console.warn "WARNING", str, o ? ''
err=  (str,o) -> console.error "ERROR", str, o ? ''; throw new Error "ERROR: "+ str

window.EpicMvc.app$Dev=
	OPTIONS:
		# option.c1 inAction # if inAction isnt false
		c1: (inAction) -> warn "IN CLICK" if inAction isnt false

		# option.a1 view_name, aModels #if view_name not of aModels
		a1: (view_name, aModels) ->
			return if view_name of aModels
			err "Could not find model (#{view_name}) in namespace E.Model", aModels

		# option.a2 view_name, aModels, attribute #if attribute not of aModels[ view_name]
		a2: (view_name, aModels, attribute) ->
			return if attribute of aModels[ view_name]
			err "Could not find model (#{view_name}) in namespace E.Model", aModels

		# option.m1 view, model #if not E.Model[ model.class]?
		m1: (view, model) ->
			return if model.class of E.Model
			err "Processing view (#{view}), model-class (#{model.class}) not in namespace E.Model", model

		# WARNING: "No app. entry for action_token (#{action_token}) on path (#{original_path})"
		# option.ca1 action_token, original_path, action_node #if not action_node?
		ca1: (action_token, original_path, action_node) ->
			return if action_node?
			warn "No app. entry for action_token (#{action_token}) on path (#{original_path})"

		# WARNING: "Action (#{action_token}) request data is missing param #{nm}"
		# option.ca2 action_token, original_path, nms, data, action_node
		ca2: (action_token, original_path, nms, data, action_node)->
			for nm in nms when nm not of data
				warn "Missing param (#{nm}) for action (#{action_token}), Path: #{original_path}", {data,action_node}

		# option.ca3 action_token, original_path, action_node, aMacros #if not aMacros[action_node.do]
		ca3: (action_token, original_path, action_node, aMacros) ->
			return if action_node.do of aMacros
			err "Missing (#{action_node.do}) from MACROS; Action: (#{action_token}), Path: (#{original_path})"

		# option.ca4 action_token, original_path, action_node, what if not action_node.fist of E.fistDef
		ca4: (action_token, original_path, action_node, what) ->
			return if action_node[ what] of E.fistDef
			err "Unknown Fist for '#{what}:' #{action_node[ what]}); Action: (#{action_token}), Path: (#{original_path})", {action_node}

	SETTINGS:
		frames: MMM_Dev: 'bdevl'
	MODELS:
		Devl:     class: "Devl$Dev",       inst: "iDev_Devl"
		View:     class: "View$Dev",       inst: "iDev_View"
	ACTIONS:
		dbg_toggle:         do: 'Devl.toggle', pass: 'what'
		dbg_refresh:        do: 'Devl.clear_cache'
		dbg_open_model:     do: 'Devl.open_model', pass: 'name'
		dbg_open_table:     do: 'Devl.open_table', pass: 'name'
		dbg_open_subtable:  do: 'Devl.open_subtable', pass: 'name'
		dbg_close_subtable: do: 'Devl.close_subtable'
		dbg_table_left:     do: 'Devl.table_left'
		dbg_table_right:    do: 'Devl.table_right'
		dbg_table_col_set:  do: 'Devl.table_col_set', pass: 'col'
		dbg_table_by_row:   do: 'Devl.table_row_set'

