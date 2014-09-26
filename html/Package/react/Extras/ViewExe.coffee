'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO 
pad_a= 18
pad_b= 4
pad_c= 24
window.pad= (l,s)->
	s= String s
	r= l- s.length
	r= 0 if r< 0
	s+( new Array r+ 1).join ' '

# Interface: props: oE (mostly transparent)
# oE.has_root (true/false has one non-epic root)
# oE.cb (callback w/reason, and @ [looks for @props.oE,@state.oE])
# Here is when to call the callback, and why
#  getInitalState:       @props.oE.cb 'getInitialState',      @ (Returns info to put into @state.oE)
#  render:               @props.oE.cb 'render',               @ (Returns content that may/maynot need to be wrapped)
#  componentDidMount:    @props.oE.cb 'componentDidMount',    @ (To run defered logic)
#  componentWillUnmount: @props.oE.cb 'componentWillUnmount', @ (To clean up memory)
#  any:                  @props.oE.cb 'any-string',           @, {more:stuff} (Appends to audit, for debug)
# Note: Props not available to @ in getDefaultProps, fyi

window.PagePart= React.createClass
	displayName: 'Epic-PagePart:'
	getInitialState: -> oE: @props.oE.cb 'getInitialState', @
	getDefaultProps: -> onClick: @handleClick
	componentDidMount: ->
		@props.oE.cb 'componentDidMount', @ # Run defered logic
		# TODO HANDLE DEFER'S MARKED WITH E.G. when='DidMount,DidChange' (Default to DidMount)
		# TODO ANOTHER WAY TO CONNECT CLICKS TO THE WHOLE COMPONENT, PUT IT HERE?
		null
	componentDidUpdate: -> @props.oE.cb 'componentDidUpdate', @ # Needed to delete old refs
	componentWillUnmount: -> @props.oE.cb 'componentWillUnmount', @ # Needed to delete old refs
	handleClick: -> alert 'YEP, component can "see" that last click of yours.'
	render: ->
		content= @props.oE.cb 'render', @
		# Any part may have a dynamic wrapper, fyi
		# TODO MAYBE LET PROPS DECIDE HOW TO WRAP IT OR NOT, IF TR/TBODY ?
		if 'dynamic' of @props # Always render the container, even if content is null
			React.DOM[ @props.dynamic] @props, content
		else
			return null unless content
			if @props.oE.has_root
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
		#TODO PUT BACK AFTER DEBUGGING @context_handles= {} # Blow away context info on init since we rebuild all components from scratch
		if true # TODO REMOVE '?' ON @context_handles?= 
			@context_handles?= {} # Blow away context info on init since we rebuild all components from scratch
			@context ':init', {state:oE:handle} for handle of @context_handles
			@context_active= false
			@context_audit?= [] # TODO DEBUG, DO NOT BLOW AWAY ON INIT, IF ALREADY DEFINED
			@context_dirty= {} # Hash of component-handles to be updated using state # TODO IMPLENENT THIS IN INVALIDATE-TABLES
			@context_refs?= {} # key is component_handle+ sep(~)+model+/+table for every combo
	run: () ->
		if true # TODO
			@context_audit.push "#{pad pad_a+ pad_b, ':run'}#{handle}" for handle of @context_handles
		_log2 'START RUN', start= new Date().getTime()
		result= @T_page()
		_log2 'END RUN', new Date().getTime()- start
		result
	invalidateTables: (view_nm, tbl_nms) ->
		f= ':react:ViewExe.invalidateTables'
		_log2 f, view_nm, tbl_nms #, (if @Epic.inClick then 'IN'), @context_handles, @context_refs
		return 'not now' if @Epic.inClick isnt false or @page_name is false #TODO or @invalidateTablesTimer isnt false
		if true
			# TODO MAP view_nm TO instance-name
			for tbl in tbl_nms
				@context 'ref_dirty', view_nm, tbl
		# Defer processing dirty list, until models have a chance to mark as many as possible
		if @invalidateTablesTimer is false
			@invalidateTablesTimer= setTimeout =>
				@invalidateTablesTimer= false
				for key,val of @context_dirty when val is true # Could be marked true during this update
					comp= @context_handles[ key].that
					@context_audit.push "#{pad pad_a+ pad_b, ':IT in'}#{key}"
					comp.setState oE: ($.extend comp.state.oE, {tableRefCnt: comp.state.oE.tableRefCnt+ 1})
					@context_audit.push "#{pad pad_a+ pad_b, ':IT out'}#{key}"
				return
			, 33
			return 'started timer'
		return
	doDefer: -> null # TODO STILL NEEDED?
	context: (action, that, extra, more) => # Action: 'getViewState', 'getInitalState', 'render', 'anystring'- just audit
		f= ':react:ViewExe.context: '+action
		handle= if action is 'getInitialState' then @Epic.nextCounter() else that?.state?.oE?.handle
		sep= '~'
		if action not in ['ref_add', 'ref_dirty']
			@context_audit.push "#{pad pad_a, action}#{pad pad_b, handle ? 'H'}#{pad pad_c, that?.props?.oE?.view ? 'DN'} [#{that?._owner?.state?.oE?.handle ? 'O'}]"
		if action not in ['ref_add', 'ref_dirty'] and handle and @context_handles[ handle] #action isnt 'something'
			@context_handles[ handle]?.audit.push {action,that,extra,more}
		switch action
			when 'getViewState' # Return a snapshot of the current view state, for a component to restore later when rendering
				# TODO NEED TO BUILD A TRUE FOREACH LIST, NOT A CLONE THAT IS STATIC, AND WON'T HAVE UPDATED WITH INVALIDATE-TABLES
				info_foreach= $.extend true, {}, @info_foreach
				info_parts= $.extend {}, @info_parts[ @info_parts.length- 1]
				return {info_foreach, info_parts}
			when 'getInitialState' # Calling component wants an oject for state.oEcontext
				@context_handles[ handle]= {view:that.props.oE.view,that,audit:[]}
				return handle: handle, tableRefCnt: 1 # Updated by invalidateTables if we need to react to changes in this component
			when 'render'
				BLOWUP_CONTEXT_ACTIVE_NOT_FALSE() unless @context_active is false
				@context_active= handle
				@context_dirty[ handle]= false
				# Removing all refs for this component, now that it is going to re-render
				match= handle+ sep
				delete @context_refs[ key] for key of @context_refs when (key.slice 0, match.length) is match
				ref= @context_handles[ handle]
				ref.defer= [] # Start with no defers until it re-renders
				# Enter
				@info_parts.push that.props.oE.info_parts # These were sent as props to the component, as it's surounding content was evaluating
				# TODO FOR NOW JUST GOING TO CLONE INFO-FOREACH - REALLY NEED TO DO THE RESTORE CURRENT ROWS THING LIKE OLD LOGIC
				@info_foreach= $.extend true, {}, that.props.oE.info_foreach
				# TODO PUSH/POP MORE STATE INFO_* STUFF, LIKE INFO_NAMES?
				# Run
				content= @handleIt that.props.oE.content
				# Now leave
				@info_parts.pop() # Just to clear the memory
				@context_active= false

				# Return content to caller
				return content
			when 'ref_add' # Have a model/table reference for a component, remember the association (use current context)
				BLOWUP_CONTEXT_ACTIVE_IS_FALSE() if @context_active is false
				mt= that+ '/'+ extra # These params are really 'model' and 'table'
				@context_refs[ @context_active+ sep+ mt]= true
			when 'ref_dirty' # Which components have referenced this model/table
				mt= that+ '/'+ extra # These params are really 'model' and 'table'
				for key of @context_refs
					[key_comp, key_mt]= key.split sep
					@context_dirty[ key_comp]= true if key_mt is mt
			when 'componentDidMount', 'componentDidUpdate' # Component mounted, run defer logic
				for defer in @context_handles[ handle].defer
					_log2 f, handle, defer
					defer.func 'react', {that}, defer.attrs
			when 'componentWillUnmount' # Component un-mounted, remove any references
				delete @context_dirty[ handle]
				match= handle+ sep
				delete @context_refs[ key] for key of @context_refs when (key.slice 0, match.length) is match
				delete @context_handles[ handle]
		return
	handleIt: (content) =>
		f= ':react:ViewExe.handleIt'
		# Eliminating content if it's an array of just nulls or empty strings
		if typeof content is 'function'
			content= content()
			#_log2 f, 'content after function call', content
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
		f= ':react:ViewExe.T_page'
		name= @page_name
		if @frame_inx< @frames.length
			{content,can_componentize}= @loader.template name= @next_frame()
			view= 'tmpl/'+ name
		else
			{content,can_componentize}= @loader.page @page_name
			view= 'page/'+ name
		@context_audit.push 'T_page   +'+ view
		if true # TODO REACT-DYN TRYING TO MAKE THESE TOPLEVELS A COMPONENT, SO ALL CONTENT IS OWNED BY SOMEONE
			attrs?= {}
			attrs.oE= $.extend {view, cb: @context, has_root: can_componentize, content: content}, @context 'getViewState', view
			_log2 f, 'before PagePart', view, attrs
			result= PagePart attrs
			_log2 f, 'after PagePart', view, attrs, result
		else
			result= @handleIt content
		@context_audit.push 'T_page   -'+ view
		if result is undefined
			console.log 'BIG ISSUE IN TMPL/PAGE: '+ name, 'func is', content_func
			throw new Error 'Big Issue in Tmpl/Page '+ name
		return result
	T_page_part: ( attrs) ->
		f= 'react:viewexe.T_page_part:'
		view= attrs.part; # TODO consider attrs with p:
		@context_audit.push (pad pad_a+ pad_b, 'T_page_part')+ view
		{content,can_componentize,defer}= @loader.part view
		@info_parts.push @loadPartAttrs attrs
		#TODO REACT-DYN MOVING THIS LINE TO INSIDE COMPONENT, AND PASSING ATTRS TO COMPONENT: part_content= content attrs
		if can_componentize or attrs.dynamic or defer
			if defer and not can_componentize and not attrs.dynamic
				console.log "WARNING: DEFER logic has forced this page_part (#{view}) to be a component, and will add a DIV tag."
			attrs.oE= $.extend {view, cb: @context, has_root: can_componentize, content}, @context 'getViewState', view
			result= PagePart attrs
		else
			result= @handleIt content # Run directly with no context or component at this level
		@info_parts.pop()
		if result is undefined
			console.log 'BIG ISSUE IN PART: '+ name, 'func is', content
			throw new Error 'Big Issue in PART '+ name
		#_log2 f, 'result',( typeof result), result?.length #, result
		@context_audit.push ['T_page_p -'+ view, result]
		result
	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC ATTRS?
		f= 'react:viewexe.T_defer:'
		#_log2 f, attrs, content, f_content= @handleIt content
		#_log2 f, 'CONTENT BEING FUNCTIONIZED', f_content= @handleIt content
		f_content= @handleIt content
		BLOWUP_DEFER_MISSING_COMPONENT() if @context_active is false
		@context_handles[ @context_active].defer.push {attrs, func: new Function 'type', 'opts', 'attrs', f_content}
		null # No content to display for these
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
		@context 'ref_add', view_nm, tbl_nm
		row=( @Epic.getViewTable view_nm+ '/'+ tbl_nm)[ 0]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		r= @formatFromSpec row[ key], format_spec, custom_spec
		console.log 'G3:UNDEFINED', {view_nm, tbl_nm, key, format_spec, custom_spec}, row if r is undefined
		r
	v2: (table_ref, col_nm, format_spec, custom_spec, sub_nm) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec, sub_nm}
		ans= @info_foreach[table_ref].row[col_nm]
		#TODO FROM INFO_FOREACH.dyn: @context 'ref_add', dyn_m, dyn_t
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
	# TODO FIGURE OUT HOW TO ELIMINATE THAT ISSUE WITH React.DOM.tbody({}, React.DOM.tr({},..), NULL) with <Unknown>
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
