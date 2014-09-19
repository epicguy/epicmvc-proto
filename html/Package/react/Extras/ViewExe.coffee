'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.


# Interface: oE, oEhandle,  oEcontent (use oE.handleIt), oEroot (true/false has one non-epic root)
window.PagePart= React.createClass
	getInitialState: -> tableRefCnt: 1 # Updated by invalidateTables if we need to react to changes in this component
	getDefaultProps: -> onClick: @handleClick
	componentWillMount: ->
		console.log @props.oEhandle, 'componentWillMount'
		@props.oE.context 'set_from_component', @props.oEhandle, @
	#componentDidMount: -> # TODO HANDLE DEFER'S MARKED WITH E.G. when='DidMount,DidChange' (Default to DidMount)
	componentDidMount: ->  # TODO ANOTHER WAY TO CONNECT CLICKS TO THE WHOLE COMPONENT, PUT IT HERE?
	handleClick: -> alert 'YEP, component can "see" that last click of yours.'
	displayName: 'Epic-PagePart:'
	render: ->
		content= @props.oE.handleIt @props.oEcontent, @props.oEhandle
		# Any part may have a dynamic wrapper, fyi
		if 'dynamic' of @props # Always render the container, even if content is null # TODO MAYBE LET PROPS DECIDE, OR NOT IF TR/TBODY ?
			React.DOM[ @props.dynamic] @props, content
		else
			return null unless content
			if @props.oEroot
				content
			else
				React.DOM.div @props, content
	
# new window.EpicMvc.ViewExe @, @loader, @content_watch # Uses AppConf in constructor
class ViewExe
	constructor: (@Epic, @loader, @content_watch) ->
		frames= @Epic.oAppConf.getFrames()
		@frames=( frames[ix] for ix in (nm for nm of frames).sort())
		@frames.push -> 'NOT-SET'
		@frame_inx= 0
		@page_name= false
		window.oE= @ # Global namespace to come back here when react runs epic tags. <oE.T_page/>
		window.oR= React.DOM # Global namespace shortcut for React DOM nodes. <oR.div>
		@EpicMvcApp= React.createClass render: @T_page
		@invalidateTablesTimer= false
	init: ( @template, @page) ->
		@page_name= page
		@frames[ @frames.length- 1]= template
		@frame_inx= 0
		# State for one render loop
		@info_foreach= {}
		@info_parts= [{}] # Push p:attrs with each part, then pop; (top level is row w/o attrs)
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..> # TODO REACT ADD TO T_if LOGIC
		# State managers
		@context_handles= {} # Blow away context info on init since we rebuild all components from scratch
		@context_stack= [] # Last entry is active component, if empty, then we're not in a component context
		@context_refs= {} # key is component_handle+ sep(~)+model+/+table for every combo
		@context_invalidate_warning= {} # Only warn once for this component
	run: () ->
		_log2 'START RUN', start= new Date().getTime()
		result= @T_page()
		_log2 'END RUN', new Date().getTime()- start
		result
	invalidateTables: (view_nm, tbl_nms) ->
		f= ':react:ViewExe.invalidateTables'
		# Note: Sometimes we are called after construction, but before init
		return 'no components' unless @context_refs
		_log2 f, view_nm, tbl_nms #, (if @Epic.inClick then 'IN'), @context_handles, @context_refs
		return 'in click' if @Epic.inClick
		if true
			# TODO MAP view_nm TO instance-name
			results= {}
			handles= {} # Hash to get unique list
			for tbl in tbl_nms
				keys= @context 'ref_find', view_nm, tbl
				results[ tbl]= keys
				handles[ key]= true for key in keys
			# TODO FIGURE OUT WHY SOME COMPONENTS CANNOT DO THE STATE THING
			for key of handles
				comp= @context_handles[ key].component
				if not comp.state
					if key not of @context_invalidate_warning
						@context_invalidate_warning[ key]= true
						console.log 'oE.WARNING: Component could not render self, using owner', {key, comp, _owner: comp._owner}
					handles[ comp._owner.props.oEhandle]= true
					delete handles[ key]
				else
					if key of @context_invalidate_warning
						console.log 'oE.INTERESING: Component could not render self previously, but seems to be now', {key, comp, _owner: comp._owner}
			for key of handles
				comp= @context_handles[ key].component
				if comp.state?.tableRefCnt?
					tableRefCnt= comp.state.tableRefCnt+ 1
				else
					tableRefCnt= 9000
					if key not of @context_invalidate_warning
						@context_invalidate_warning[ key]= true
						console.log 'oE.WARNING: Component does not have state', {key, comp, _owner: comp._owner}
					continue # TODO FIGURE OUT WHY YOU CANNOT SET STATE ANYMORE - ALSO NOTE: _OWNER IS NULL FOR patient_tbl_allX
				comp.setState {tableRefCnt}
		else
			# TODO REMOVE THIS OLDER NON-DYNAMIC LOGIC WHEN WE'RE HAPPY WITH THE ABOVE LOGIC
			return 'not now' if @Epic.inClick isnt false or @page_name is false or @invalidateTablesTimer isnt false
			@invalidateTablesTimer= setTimeout =>
				@invalidateTablesTimer= false
				@Epic.renderSecure() # TODO REACT HOW BEST TO GET A RE-RENDER BASED ON MODEL'S STATE CHANGES
			, 0
			results= 'started timer'
		results
	doDefer: -> null # TODO STILL NEEDED?
	context: (direction, component_handle, component) -> # Direction: 'new', 'set', 'enter', 'leave'
		#f= ':render:ViewExe.context ('+ direction+ ')'+ '('+( if typeof component_handle is 'string' then component_handle else typeof component_handle)+ ')'
		#_log2 f, (if typeof component is 'string' then component else if component then 'oEhandle:'+ component?.props.oEhandle else 'no3'), @context_handles[ component_handle] ? 'no_handle', if @context_stack.length then @context_stack[ @context_handles.length- 1] else 'zero'
		sep= '~'
		switch direction
			when 'new' # For 'new' the component_handle is the view-name, which we use to prefix the unique handle
				new_handle= component_handle+ @Epic.nextCounter()
				# TODO NEED TO BUILD A TRUE FOREACH LIST, NOT A CLONE THAT IS STATIC, AND WON'T HAVE UPDATED WITH INVALIDATE-TABLES
				info_foreach= $.extend true, {}, @info_foreach
				info_parts= $.extend {}, @info_parts[ @info_parts.length- 1]
				@context_handles[ new_handle]= {component: false, info_foreach, info_parts}
				return new_handle # Caller is asking for this handle
			when 'set', 'set_from_component' # For 'set', 'component' is the component's actual instance reference
				@context_handles[ component_handle].component= component
			when 'enter'
				# TODO CONSIDER REMOVING ALL REFS FOR THIS COMPONENT, NOW THAT IT IS GOING TO RE-RENDER?
				@context_stack.push component_handle
				ref= @context_handles[ component_handle]
				@info_parts.push ref.info_parts
				# TODO FOR NOW JUST GOING TO SWAP INFO-FOREACH TILL I FIGURE OUT WHAT TO DO HERE
				ref.save_fe= $.extend true, {}, @info_foreach
				@info_foreach= $.extend true, {}, ref.info_foreach
				# TODO PUSH/POP MORE STATE INFO_* STUFF
			when 'leave'
				was= @context_stack.pop()
				BROKEN_VIEWEXE_CONTEXT_STACK_POP was, component_handle if was isnt component_handle
				@info_parts.pop()
				ref= @context_handles[ component_handle]
				@info_foreach= ref.save_fe
				delete ref.save_fe
			when 'ref_add' # Have a model/table reference for a component, remember the association (use current context)
				return if @context_stack.length is 0 # No components active
				handle= @context_stack[ @context_stack.length- 1]
				mt= component_handle+ '/'+ component # These params are really 'model' and 'table'
				@context_refs[ handle+ sep+ mt]= true
			when 'ref_find' # Which components have referenced this model/table (caller wants component objects, not my handles)
				mt= component_handle+ '/'+ component # These params are really 'model' and 'table'
				keys= []
				for key of @context_refs
					[key_comp, key_mt]= key.split sep
					#keys.push @context_handles[ key_comp].component if key_mt is mt
					keys.push key_comp if key_mt is mt
				return keys
			when 'remove' # Component un-mounted, remove any references
				delete @context_handles[ component_handle]
				match= context_handle+ sep
				len= match.length
				keys= key for key of @context_refs when key.slice 0, len is match
				delete @context_refs[ key] for key of keys
			else BROKEN_SWITCH__VIEWEXE_CONTEXT__DIRECTION direction
		null # TODO
	handleIt: (content, component_handle) =>
		# Eliminating content if it's an array of just nulls or empty strings
		if typeof content is 'function'
			@context 'enter', component_handle if component_handle
			content= content()
			@context 'leave', component_handle if component_handle
		return null unless content
		# TODO CONSIDER EMPTY STRING HERE?
		return content unless $.isArray content
		result= []
		for entry in content
			result.push entry if entry? and ((typeof entry) isnt 'string' or entry.length)
		return switch result.length
			when 0 then null; when 1 then result[ 0]; else result

	loadPartAttrs: (attrs) ->
		f= ':tag.loadPartAttrs'
		result= {}
		for attr,val of attrs
			continue if 'p_' isnt attr.slice 0, 2
			result[ attr.slice 2]= val
		result
	next_frame: () -> @frames[ @frame_inx++]
	T_page: ( attrs) =>
		name= @page_name
		if @frame_inx< @frames.length
			{content}= @loader.template name= @next_frame()
		else
			{content}= @loader.page @page_name
		result= @handleIt content
		if result is undefined
			console.log 'BIG ISSUE IN TMPL/PAGE: '+ name, 'func is', content_func
			throw new Error 'Big Issue in Tmpl/Page '+ name
		return result
	T_page_part: ( attrs) ->
		f= 'react:viewexe.T_page_part:'
		view= attrs.part; # TODO consider attrs with p:
		{content,can_componentize}= @loader.part view
		@info_parts.push @loadPartAttrs attrs
		#TODO REACT-DYN MOVING THIS LINE TO INSIDE COMPONENT, AND PASSING ATTRS TO COMPONENT: part_content= content attrs
		defer= false # TODO DETECT DEFER LOGIC BASED ON RUNNING part_content JUST NOW, ABOVE (DID IT CALL T_DEFER?)
		if can_componentize or attrs.dynamic or defer
			#TODO CONSIDER GENRATING A WARNING FOR THIS 'view' WHEN WE HAVE TO FORCE COMPONENTIZING (WILL ADD A DIV TAG)
			oEhandle= @context 'new', view
			#TODO REACT-DYN result= PagePart {oE: @, oEhandle, oEroot: can_componentize, part_content}
			$.extend attrs, {oE: @, oEhandle, oEroot: can_componentize, oEcontent: content}
			result= PagePart attrs
			@context 'set', oEhandle, result # For two-way binding; we can now change this fellow's state on invalidateTables he's interested in
		else
			result= @handleIt content # Run directly with no context or component at this level
		@info_parts.pop()
		if result is undefined
			console.log 'BIG ISSUE IN PART: '+ name, 'func is', content
			throw new Error 'Big Issue in PART '+ name
		#_log2 f, 'result',( typeof result), result?.length #, result
		result
	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC
		f= 'react:viewexe.T_defer:'
		_log2 f, attrs
		null # No content for these
	T_if_true: ( attrs, content) -> # TODO
		return content() if @info_if_nms[ attrs.name]
		null
	T_if_false: ( attrs, content) -> # TODO
		return @handleIt content unless @info_if_nms[ attrs.name]
		null
	truthy: (val) ->
		if switch typeof val
			when 'string' then val?.length and val.toLowerCase() not in ['n','no']
			when 'boolean' then val is true
			else val
		then true
		else false
	T_if: ( attrs, content) -> # TODO
		#console.log 'T_if', attrs, content?.length
		issue= false
		is_true= false
		if 'val' of attrs
			if 'eq' of attrs
				is_true= true if attrs.val is attrs.eq
			else if 'ne' of attrs
				is_true= true if attrs.val isnt attrs.ne
			else if 'in_list' of attrs
				is_true= true if attrs.val in attrs.in_list.split ','
			else issue= true
		else if 'set' of attrs
			is_true= @truthy attrs.set
		else if 'not_set' of attrs
			is_true= not @truthy attrs.not_set
		else if 'table_is_not_empty' of attrs
			val= attrs.table_is_not_empty
			[lh, rh]= val.split '/' # Left/right halfs
			# If left exists, it's nested as table/sub-table else assume model/table
			[tbl]= @_accessModelTable val, false
			is_true= true if tbl.length
		else issue= true
		console.log 'ISSUE T_if', attrs if issue
		@info_if_nms[ attrs.name]= is_true if 'name' of attrs
		return if is_true and content
			@handleIt content
		else null
	getTable: (nm) ->
		f= 'react:viewexe.getTable:'+ nm
		#@Epic.log2 f, @info_parts if nm is 'Part'
		switch nm
			when 'Control', 'Form' then @fist_table[nm]
			when 'If' then [@info_if_nms]
			when 'Part' then @info_parts.slice -1
			when 'Field'
				row= {}
				for field in @fist_table.Control
					row[field.name]= [field]
				@Epic.log2 f, row
				[row]
			else []
	_accessModelTable: (at_table, alias) ->
		[lh, rh]= at_table.split '/' # Left/right halfs
		if lh of @info_foreach # Nested table reference
			tbl= @info_foreach[lh].row[rh]
			[dyn_m, dyn_t, dyn_list]= @info_foreach[ lh].dyn
		else
			oM= @Epic.getInstance lh
			tbl= oM.getTable rh
			[dyn_m, dyn_t, dyn_list]= [ lh, rh, []]

		@context 'ref_add', dyn_m, dyn_t

		return [tbl, rh, lh, rh, oM] if tbl.length is 0 # No rows, so no need to store state nor reference alias

		rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
		rh_alias= alias if alias
		dyn_list.push [rh, rh_alias]
		@info_foreach[rh_alias]= dyn: [dyn_m, dyn_t, dyn_list]

		[tbl, rh_alias, lh, rh, oM]

	T_foreach: (attrs, content_f) ->
		f= 'react:viewexe.T_foreach'
		#console.log f, attrs
		[tbl, rh_alias]= @_accessModelTable attrs.table, attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		break_rows_list= [] # TODO REACT @calcBreak tbl.length, oPt
		#@Epic.log2 f, 'break_rows_list', break_rows_list
		out= []
		limit= tbl.length
		limit= Number( attrs.limit)- 1 if 'limit' of attrs
		for row, count in tbl
			break if count> limit
			@info_foreach[rh_alias].row= $.extend true, {}, row,
				_FIRST: (if count is 0 then 'F' else ''), _LAST: (if count is tbl.length- 1 then 'L' else ''),
				_SIZE:tbl.length, _COUNT:count, _BREAK: (if count+ 1 in break_rows_list then 'B' else '')
			out.push @handleIt content_f
		delete @info_foreach[rh_alias]
		return null unless out.length # Empty array causes issues if in table/tbody outside tr/td
		@handleIt out # Handle it can also collapse arrays of results, not just a function

	# TODO MORE STUFF FROM THE OLD TAGEXE - NEED TO FIGURE OUT HOW TO LET PKGS 

	formatFromSpec: (val, spec, custom_spec) ->
		switch spec
			when '' then (if custom_spec then (window.EpicMvc.custom_filter? val, custom_spec) else val)
			when 'count' then val?.length
			when 'bool' then (if (val is true or (typeof val== 'number' && val)) or val?.length then true else false)
			when 'bytes' then window.bytesToSize Number val
			when 'uriencode' then encodeURIComponent val
			when 'esc' then window.EpicMvc.escape_html val
			when 'quo' then ((val.replace /\\/g, '\\\\').replace /'/g, '\\\'').replace /"/g, '\\"'  # Allows an item to be put into single quotes
			when '1' then (String val)[0]
			when 'lc' then (String val).toLowerCase()
			when 'ucFirst'
				str= (String str).toLowerCase()
				str.slice( 0, 1).toUpperCase()+ str.slice 1
			else
				if spec?.length> 4 and spec[0] is '?' # Ex. &Model/Tbl/val#?.true?false;
					[left,right]= spec.substr(2).split '?'
					(if (val is true or (typeof val== 'number' && val)) or val?.length then left else right)
						.replace( (new RegExp '['+ spec[1]+ ']', 'g'), ' ')
						.replace( (new RegExp '[%]', 'g'), val)
				else if spec?.length
					# Default spec
					# if val is set, xlate spec to a string w/replaced spaces using first char
					# Ex. &Model/Table/flag#.Replace.with.this.string; (Don't use / or ; or # in the string though)
					if (val is true or (typeof val== 'number' && val)) or val?.length
						spec.substr(1)
							.replace( (new RegExp '['+ spec.substr(0,1)+ ']', 'g'), ' ')
							.replace( (new RegExp '[%]', 'g'), val)
					else ''
				else val
	v3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		row=( @Epic.getViewTable view_nm+ '/'+ tbl_nm)[ 0]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		r= @formatFromSpec row[ key], format_spec, custom_spec
		console.log 'G3:UNDEFINED', {view_nm, tbl_nm, key, format_spec, custom_spec}, row if r is undefined
		r
	v2: (table_ref, col_nm, format_spec, custom_spec, sub_nm) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec, sub_nm}
		ans= @info_foreach[table_ref].row[col_nm]
		if sub_nm? then ans= ans[sub_nm]
		r= @formatFromSpec ans, format_spec, custom_spec
		console.log 'G2:UNDEFINED', {table_ref, col_nm, format_spec, custom_spec, sub_nm}, info_foreach: @info_foreach if r is undefined
		r
	T_form_part: (attrs) -> # part="" form="" (opt)field=""
		part= attrs.part ? 'fist_default'
		row= attrs.row ? false
		fm_nm= attrs.form
		oFi= @Epic.getFistInstance fm_nm
		# Optional fields
		one_field_nm= if attrs.field? then attrs.field else false
		help= attrs.help ? ''
		show_req= if 'show_req' of attrs then attrs.show_req else 'yes'
		any_req= false
		is_first= true
		out= []
		hpfl=( nm for nm of oFi.getHtmlFieldValues())
		issues= oFi.getFieldIssues()
		focus_nm= oFi.getFocus()
		map= window.EpicMvc['issues$'+ @Epic.appConf().getGroupNm()]
		for fl_nm in hpfl
			continue if one_field_nm isnt false and one_field_nm isnt fl_nm
			orig= oFi.getFieldAttributes fl_nm
			fl= $.extend { tip: '', fistnm: fm_nm, focus: '' }, orig
			fl.focus= 'yes' if fl_nm is focus_nm
			fl.is_first= if is_first is true then 'yes' else ''
			is_first= false
			fl.yes_val = if fl.type is 'yesno' then String (fl.cdata ? '1') else 'not_used'
			fl.req= if fl.req is true then 'yes' else ''
			any_req= true if fl.req is true
			fl.name= fl_nm
			fl.default?= ''; fl.default= String fl.default
			value_fl_nm= if row then fl_nm + '__' + row else fl_nm
			fl.value= (oFi.getHtmlFieldValue value_fl_nm) ? fl.default
			fl.selected= if fl.type is 'yesno' and fl.value is fl.yes_val then 'yes' else ''
			fl.id= 'U'+ @Epic.nextCounter()
			fl.type= (fl.type.split ':')[0]
			fl.width?= ''
			if fl.type is 'radio' or fl.type is 'pulldown'
				choices= oFi.getChoices fl_nm
				rows= []
				for ix in [0...choices.options.length]
					s= if choices.values[ix] is (String fl.value) then 'yes' else ''
					rows.push option: choices.options[ix], value: choices.values[ix], selected: s
				fl.Choice= rows
			fl.issue= if issues[value_fl_nm] then issues[value_fl_nm].asTable( map)[0].issue else ''
			out.push fl
		@fist_table= Form: [show_req: show_req, any_req: any_req, help: help], Control: out
		@T_page_part {part} #TODO REACT @viewExe.includePart part, false # TODO DYNAMICINFO?
	T_react: (attrs) ->
		EpicMvc.Extras.components?= {}
		EpicMvc.Extras.components[ attrs.func]( attrs)
	T_show_me: (attrs, content) ->
		f= ':tag(viewexe).T_showme'
		_log2 '======== attrs   ======', f, attrs
		_log2 '======== content ======', f, content
		ans= content()
		_log2 '======== content() ====', f, ans
		ans2= @handleIt content
		_log2 '======== handleIt =====', f, ans2
		ans2

window.EpicMvc.Extras.ViewExe$react= ViewExe # Public API
