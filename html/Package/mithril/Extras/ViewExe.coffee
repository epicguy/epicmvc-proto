'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# Gloable replacement for 'm' command, when attrs may have leading dash for special treatment
window.m2= (tag,attrs,content) ->
	f= 'mithril::m2'
	clean_attrs= {}
	for nm,val of attrs
		if nm[ 0] isnt '-'
			clean_attrs[ nm]= val
		else
			clean_attrs[ nm.slice 1]= val if val
	_log2 f, clean_attrs
	m tag, clean_attrs, content

class ViewExe
	constructor: (@Epic, @view_nm) ->
		frames= @Epic.oAppConf.getFrames()
		@frames=( frames[ix] for ix in (nm for nm of frames).sort())
		@frames.push -> 'NOT-SET' # Placeholder for @template
		@invalidateTablesTimer= false
		@did_init= false
	init: ( @template, @page_name) ->
		@did_init= true
		@frames[ @frames.length- 1]= template
		@frame_inx= 0 # Start on the outer most @frames
		# State for one render loop
		@info_foreach= {}
		@info_parts= [{}] # Push p:attrs with each part, then pop; (top level is row w/o attrs)
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..>
		@info_defer= [[]] # Stack arrays of defers as we render parts
	run: () ->
		_log2 'START RUN', start= new Date().getTime()
		result= @T_page()
		_log2 'END RUN', new Date().getTime()- start
		result
	next_frame: () -> @frames[ @frame_inx++]
	getTable: (nm) ->
		f= 'mithril:viewexe.getTable:'+ nm
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
	invalidateTables: (view_nm, tbl_nms) ->
		return unless @did_init
		f= ':mithril:ViewExe.invalidateTables'
		_log2 f, view_nm, tbl_nms #, (if @Epic.inClick then 'IN')
		# TODO REWRITE HAVE CLICK DO THIS SAME START/END
		m.startComputation()
		m.endComputation()
		return
	# Wraper for page/part content which needs special treatment (dyanmic='div', epic:defer's, etc.)
	wrap: (view, attrs, content, defer, has_root)->
		inside= defer: defer
		attrs.config= (el, isInit, context) ->
			f= ':methril:ViewExe:wrap.config:'+ view
			for defer in inside.defer
				_log2 f, defer
				defer.func el, defer.attrs
		attr[ 'data-part']= view
		if 'dynamic' of attrs # Always render the container, even if content is null
			m attrs.dynamic, attrs, content
		else
			return m() unless content
			if has_root
				content
			else
				m 'div', attrs, content
	handleIt: (content) =>
		f= ':mithril:ViewExe.handleIt'
		# Eliminating content if it's an array of just nulls or empty strings
		if typeof content is 'function'
			content= content()
			#_log2 f, 'content after function call', content
		# TODO REWRITE TRYING EMPTY STRING RATHER THAN NULL SINCE M CONVERTS TO THIS ANYHOW
		return '' unless content
		return content unless $.isArray content
		result=( entry for entry in content when entry)
		return switch result.length
			when 0 then ''; when 1 then result[ 0]; else result
	formatFromSpec: (val, spec, custom_spec) ->
		switch spec
			when '' then (if custom_spec then (window.EpicMvc.custom_filter? val, custom_spec) else val)
			when 'count' then val?.length
			when 'bool' then (if val then true else false)
			when 'bytes' then window.bytesToSize Number val
			when 'uriencode' then encodeURIComponent val
			when 'esc' then window.EpicMvc.escape_html val
			# Allows an item to be put inside single quotes
			when 'quo' then ((val.replace /\\/g, '\\\\').replace /'/g, '\\\'').replace /"/g, '\\"'
			when '1' then (String val)[0]
			when 'lc' then (String val).toLowerCase()
			when 'ucFirst'
				str= (String str).toLowerCase()
				str.slice( 0, 1).toUpperCase()+ str.slice 1
			else
				if spec?.length> 3 and spec[0] is '?' # Ex. &Model/Tbl/val#?true?false;
					[left,right]= spec.slice(1).split '?'
					(if val then left else right)
						.replace( (new RegExp '[%]', 'g'), val)
				else if spec?.length
					# Default spec
					# if val is set, xlate spec to a string w/replaced spaces using first char
					# Ex. &Model/Table/flag#.Replace.with.this.string; (Don't use / or ; or # in the string though)
					if val
						spec.replace( (new RegExp '[%]', 'g'), val)
					else ''
				else val
	v3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		row=( @Epic.getViewTable view_nm+ '/'+ tbl_nm)[ 0]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		@formatFromSpec row[ key], format_spec, custom_spec
	v2: (table_ref, col_nm, format_spec, custom_spec, sub_nm) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec, sub_nm}
		ans= @info_foreach[table_ref].row[col_nm]
		if sub_nm? then ans= ans[sub_nm]
		@formatFromSpec ans, format_spec, custom_spec
	# TODO REWRITE HAVE PARSER DO THIS: EPIC TAGS GET attr.p={}, NON EPIC: p:x => data-p-x=""
	loadPartAttrs: (attrs) ->
		f= ':tag.loadPartAttrs'
		result= {}
		for attr,val of attrs
			continue if 'p_' isnt attr.slice 0, 2
			result[ attr.slice 2]= val
		result
	T_page: ( attrs) =>
		f= ':mithril:ViewExe.T_page'
		name= @page_name
		if @frame_inx< @frames.length
			{content,can_componentize}= @Epic.loader.template name= @next_frame()
			view= 'tmpl/'+ name
		else
			{content,can_componentize}= @Epic.loader.page @page_name
			view= 'page/'+ name
		attrs?= {}
		_log2 f, 'before wrap', view, attrs
		@info_defer.push []
		content= @handleIt content
		defer= @info_defer.pop()
		result= @wrap view, attrs, content, defer, can_componentize
		_log2 f, 'after wrap', view, attrs, result
		if result is undefined
			console.log 'BIG ISSUE IN TMPL/PAGE: '+ name, 'func is', content_func
			throw new Error 'Big Issue in Tmpl/Page '+ name
		return result
	T_part: ( attrs) ->
		f= 'mithril:viewexe.T_part:'
		view= attrs.part; # TODO consider attrs with p:
		{content,can_componentize,defer}= @Epic.loader.part view
		@info_parts.push @loadPartAttrs attrs
		if can_componentize or attrs.dynamic or defer
			if defer and not can_componentize and not attrs.dynamic
				console.log "WARNING: DEFER logic has forced this part (#{view}) to be a component, and will add a DIV tag."
			@info_defer.push []
			result= @handleIt content
			defer= @info_defer.pop()
			result= @wrap view, attrs, result, defer, can_componentize
		else
			result= @handleIt content # Run directly with no context or component at this level
		@info_parts.pop()
		if result is undefined
			console.log 'BIG ISSUE IN PART: '+ name, 'func is', content
			throw new Error 'Big Issue in PART '+ name
		#_log2 f, 'result',( typeof result), result?.length #, result
		result
	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC ATTRS?
		f= 'mithril:viewexe.T_defer:'
		f_content= @handleIt content
		@info_defer[ @info_defer.length- 1].push {attrs, func: new Function 'el', 'attrs', f_content}
		'' # No content to display for these
	T_if_true: ( attrs, content) -> if @info_if_nms[ attrs.name] then @handleIt content() else ''
	T_if_false: ( attrs, content) -> if @info_if_nms[ attrs.name] then '' else @handleIt content
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
			is_true= if attrs.set then true else false
		else if 'not_set' of attrs
			is_true= if attrs.not_set then false else true
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
		else ''
	_accessModelTable: (at_table, alias) ->
		[lh, rh]= at_table.split '/' # Left/right halfs
		if lh of @info_foreach # Nested table reference
			tbl= @info_foreach[lh].row[rh]
			[dyn_m, dyn_t, dyn_list]= @info_foreach[ lh].dyn
		else
			oM= @Epic.getInstance lh
			tbl= oM.getTable rh
			[dyn_m, dyn_t, dyn_list]= [ lh, rh, []]

		return [tbl, rh, lh, rh, oM] if tbl.length is 0 # No rows, so no need to store state nor reference alias

		rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
		rh_alias= alias if alias
		dyn_list.push [rh, rh_alias]
		@info_foreach[rh_alias]= dyn: [dyn_m, dyn_t, dyn_list]

		[tbl, rh_alias, lh, rh, oM]

	T_foreach: (attrs, content_f) ->
		f= 'mithril:viewexe.T_foreach'
		#console.log f, attrs
		[tbl, rh_alias]= @_accessModelTable attrs.table, attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		result= []
		limit= if 'limit' of attrs Number( attrs.limit)- 1  else tbl.length
		for row, count in tbl
			break if count> limit
			@info_foreach[rh_alias].row= row
			@info_foreach[rh_alias].count= count
			result.push @handleIt content_f
		delete @info_foreach[rh_alias]
		return switch result.length
			when 0 then ''; when 1 then result[ 0]; else result

	T_fist: (attrs) -> # part="" fist="" (opt)field=""
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
			fl.width?= '' # TODO M USED IN FIST_DEFULT FOR SIZE, WHICH CANNOT BE 0
			fl.size?= '' # TODO M SIZE CANNOT BE 0
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
		@T_part {part}
	T_mithril: (attrs) -> # TODO M WAS T_react - NEED TO DO A COMPONENT MITHRIL STYLE
		EpicMvc.Extras.components?= {}
		EpicMvc.Extras.components[ attrs.func]( attrs)
	T_show_me: (attrs, content) ->
		f= ':tag(viewexe).T_showme'
		_log2 '======== attrs   ======', f, attrs
		_log2 '======== content ======', f, content
		ans= @handleIt content
		_log2 '======== handleIt =====', f, ans
		ans

window.EpicMvc.Extras.ViewExe$Base= ViewExe # Public API
