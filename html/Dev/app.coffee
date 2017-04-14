warn= (str,o) -> console.warn "WARNING", str, o ? ''
err=  (str,o) -> console.error "ERROR", str, o ? ''; throw new Error "ERROR: "+ str

window.EpicMvc.app$Dev=
	OPTIONS:
		warn: warn
		err: err
		# option.c1 inAction # if inAction isnt false
		c1: (inAction) -> warn "IN CLICK" if inAction isnt false

		# option.a1 view_name, aModels #if view_name not of aModels
		a1: (view_name, aModels) ->
			return if view_name of aModels
			err "Could not find model (#{view_name}) in namespace E.Model", aModels
			return

		# option.a2 view_name, aModels, attribute #if attribute not of aModels[ view_name]
		a2: (view_name, aModels, attribute) ->
			return if attribute of aModels[ view_name]
			err "Could not find model (#{view_name}) in namespace E.Model", aModels
			return

		# option.ap1 path, flow, t, s #Conirm path has 2 slashes, and path exists
		ap1: (path, flow, t, s) ->
			err "App 'path' (#{path}) must have exactly two slashes" if (path.replace /[^\/]+/g, '').length isnt 2
			# flow must be set at this point, and be valid; t and s may be blank so there must be .start values
			if not flow or flow not of E.aFlows
				err "App 'path' (#{path}) did not result in a valid 'flow' (#{flow}).", {path,flow,t,s}
			if not t then t= E.appStartT flow
			if not t or t not of E.aFlows[ flow].TRACKS
				err "App 'path' (#{path}) did not result in a valid 'track' (#{t}).", {path,flow,t,s}
			if not s then s= E.appStartS flow, t
			if not s or s not of E.aFlows[ flow].TRACKS[ t].STEPS
				err "App 'path' (#{path}) did not result in a valid 'step' (#{s}).", {path,flow,t,s}
			return

		# option.m1 view, model #if not E.Model[ model.class]?
		m1: (view, model) ->
			return if model.class of E.Model
			err "Processing view (#{view}), model-class (#{model.class}) not in namespace E.Model", model
			return


		m2: (view_nm, act, parms) ->
			err "Model (#{view_nm}).action() didn't know action (#{act})"
			return
		m3: (view_nm, tbl_nm) ->
			err "Model (#{view_nm}).loadTable() didn't know table-name (#{tbl_nm})"
			return
		m4: (view_nm, fistNm, row) ->
			err "Model (#{view_nm}).fistValidate() didn't know FIST (#{fistNm})"
			return
		m5: (view_nm, fistNm, row) ->
			err "Model (#{view_nm}).fistGetValues() didn't know FIST (#{fistNm})"
			return
		m6: (view_nm, fistNm, fieldNm, row) ->
			err "Model (#{view_nm}).fistGetChoices() did't know FIST-FIELD (#{fistNm}-#{fieldNm})"
			return
		m7: (view_nm, options) ->
			err "Model (" + view_nm + ").route() needs to be implemented."
			return

		# WARNING: "No app. entry for action_token (#{action_token}) on path (#{original_path})"
		# option.ca1 action_token, original_path, action_node #if not action_node?
		ca1: (action_token, original_path, action_node) ->
			return if action_node?
			warn "No app. entry for action_token (#{action_token}) on path (#{original_path})"
			return

		# WARNING: "Action (#{action_token}) request data is missing param #{nm}"
		# option.ca2 action_token, original_path, nms, data, action_node
		ca2: (action_token, original_path, nms, data, action_node)->
			for nm in nms when nm not of data
				warn "Missing param (#{nm}) for action (#{action_token}), Path: #{original_path}", {data,action_node}
			return

		# option.ca3 action_token, original_path, action_node, aMacros #if not aMacros[action_node.do]
		ca3: (action_token, original_path, action_node, aMacros) ->
			return if action_node.do of aMacros
			err "Missing (#{action_node.do}) from MACROS; Action: (#{action_token}), Path: (#{original_path})"
			return

		# option.ca4 action_token, original_path, action_node, what if not action_node.fist of E.fistDef
		ca4: (action_token, original_path, action_node, what) ->
			return if action_node[ what] of E.fistDef
			err "Unknown Fist for '#{what}:' #{action_node[ what]}); Action: (#{action_token}), Path: (#{original_path})", {action_node}
			return

		# E.option.fi1 fist # Guard e.g. E[ E.appFist fistNm]()
		fi1: (fist)->
			fistNm= fist.nm
			model= E.appFist fistNm
			if not model?
				err "FIST is missing: app.js requires MODELS: <model-name>: fists:[...,'#{fistNm}']", {fist}
			if not fist.sp.FIELDS
				err "FIELDS attribute missing from FIST definition"
			for fieldNm in fist.sp.FIELDS
				err "No such FIELD (#{fieldNm}) found for FIST (#{fistNm})", {fist} unless fieldNm of E.fieldDef
			return

		# E.option.fi2 field # Verify h2h, d2h, h2d, validate exist in namespace
		# field contains 'type','db_nm'
		# unfamiliar type 'radio:','pulldown:','text','textarea','password','hidden','yesno'
		fi2: (field, fist)->
			str= "in FIELD (#{field.fieldNm}) for FIST (#{field.fistNm})"
			for attr in ['h2h','d2h','h2d','validate'] when attr of field
				type= if attr is 'validate' then 'VAL' else attr.toUpperCase()
				filtList= if attr is 'h2h' then field[ attr] else [ field[ attr]]
				for filtNm in filtList when filtNm and (filt= 'fist'+ type+ '$'+ filtNm) not of E
					err "Missing Fist Filter (E.#{filt}) #{str}", {field}
			err "'type' attribute missing #{str}" unless 'type' of field
			err "'db_nm' attribute missing #{str}" unless 'db_nm' of field
			familiar_types= [
				'radio','pulldown','text','textarea','password','hidden','yesno'
				'search','email','url','tel','number','range','color' # New HTML5 form field tags
				'date','month','week','datetime','datetime-local'
			]
			warn "Unfamiliar 'type' attribute #{str}" unless (field.type.split ':')[0] in familiar_types
			if field.confirm?
				err "Missing Confirm FIELD (#{field.confirm}) in FIST FIELDS #{str}" unless field.confirm in fist.sp.FIELDS
				err "No such Confirm FIELD (#{field.confirm}) found #{str}" unless field.confirm of E.fieldDef
			return

		# E.option.fi3 field, val # Warn if not val?
		fi3: (field, val)->
			return if val?
			warn "FIST field value is undefined in FIELD (#{field.fieldNm}) for FIST (#{field.fistNm})", {field}
			return
		# E.option.fi4 type, fist, field # No such 'type' for pulldown/radio list
		fi4: (type, fist, field) ->
			err "Unknown pulldown/radio option (#{type}) in FIELD #{field.fieldNm} for FIST #{field.fistNm}.", {field}
			return

		# E.option.v1 val, spec # Fell into default arm of View:variable-get-with-spec
		v1: (val, spec) ->
			err "Unknown variable specification/filter (##{spec}) Note: custom specs use ##"
			val ? '' # Return this, so caller gets the unparsed result
		v2: (val, custom_spec) ->
			return if typeof E.custom_filter is 'function'
			err "Unknown custom specification/filter (##" + custom_spec + "). Note: uses ## and requires function E.custom_spec"

		# E.option.w1 wistNm # Ensure wistNm in E.wistDef
		w1: (wistNm) ->
			return if wistNm of E.wistDef
			err "Unknown Wist (#{wistNm})."
			return
		# E.option.ex1 nm, attr # Test that E.ex$<nm> exists as a function (Mithril extension); User's attribute: data-ex-<nm>[-<p1>[-<p2>]]
		ex1: (nm,attr) ->
			return if 'ex$'+ nm of E
			err "Unknown Mithril extension function (E.ex$#{nm}) using attribute: #{attr}."
			return

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

