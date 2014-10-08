'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class View$Base extends E.ModelJS
	constructor: (view_nm, options) ->
		super view_nm, options
		frames= E.appGetSetting 'frames'
		@frames=( frames[ix] for ix in (nm for nm of frames).sort())
		@frames.push 'NOT-SET' # Placeholder for layout
		@invalidateTablesTimer= false
		@did_run= false
		@in_run= false
		window.oE= @ # Used by parser for e.g. oE.kids/v2/v3/weed
		@defer_it_cnt= 0
		@start= false #A global timestamp for run:
	nest_up: (who,what) ->
		f= 'nest_up:'+ who+ ':'+ what
		#_log2 f, @defer_it_cnt
		if @defer_it_cnt is 0
			BLOWUP() if @in_run
			@in_run= true
			_log2 'START RUN', @frames, @start= new Date().getTime()
			@defer_it= new m.Deferred()
		@defer_it_cnt++
	nest_dn: (who,what) ->
		f= 'nest_dn:'+ who+ ':'+ what
		#_log2 f, @defer_it_cnt
		@defer_it_cnt-- if @defer_it_cnt > 0
		if @defer_it_cnt is 0
			_log2 'END RUN', @defer_content, new Date().getTime()- @start
			@in_run= false
			#_log2 f, 'RESOLVE', @defer_content
			@defer_it.resolve @defer_content
	run: ->
		f= 'run'
		[flow, track, step]= E.App().getStepPath()
		layout= E.appGetSetting 'layout', flow, track, step
		@page_name=( E.appGetS flow, track, step).page ? step
		@did_run= true
		@frames[ @frames.length- 1]= layout
		@frame_inx= 0 # Start on the outer most @frames
		@resetInfo()
		@nest_up f, 'before-kids'
		@defer_content= @kids [['page',{}]]
		#_log2 f, 'after @kids, @defer_content=', @defer_content
		@nest_dn f, 'after-kids'
		@defer_it.promise
	resetInfo: () ->
		# Info for one render loop
		@info_foreach= {} # [table-name|subtable-name]['table'&'row'&'size'&'count']=value
		@info_parts= [{}] # Push p:attrs with each part, then pop; (top level is row w/o attrs)
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..>
		@info_defer= [[]] # Stack arrays of defers as we render parts
	saveInfo: () ->
		f= 'saveInfo'
		dyn= {}; row_num= {}
		( dyn[ nm]= rec.dyn; row_num[ nm]= rec.row._COUNT) for nm,rec of @info_foreach
		saved_info= E.merge {}, info_foreach: {dyn,row_num}, info_parts: @info_parts
		_log2 f, saved_info
		saved_info
	restoreInfo: (saved_info) ->
		f= 'restoreInfo'
		_log2 f, 'saved_info', saved_info
		@resetInfo()
		for nm,rec of saved_info.info_foreach.dyn
			#_log2 f, 'info_foreach nm=', nm, rec
			[dyn_m, dyn_t, dyn_list_orig]= rec
			dyn_list= []
			oM= E[ dyn_m]()
			for t_set in dyn_list_orig
				_log2 f, nm, 't_set', t_set
				[rh, rh_alias]= t_set
				dyn_list.push t_set
				if rh_alias not of @info_foreach
					_log2 f, nm, 'rh_alias', rh_alias
					if dyn_list.length is 1 # Get table from model, else nested
						tbl= oM.getTable rh
					else
						tbl= prev_row[ rh]
					row_num= saved_info.info_foreach.row_num[ rh_alias]
					row= E.merge {}, tbl[ row_num]
					@info_foreach[ rh_alias]= dyn: [dyn_m, dyn_t, dyn_list], row: row
					prev_row= row
				else prev_row= @info_foreach[ rh_alias].row

			info_parts= E.merge [], saved_info.info_parts # TODO SEE IF MERGE WORKS FOR THIS ARRAY SOURCE
			_log2 f, 'info_parts', @info_parts
	next_frame: () -> @frames[ @frame_inx++]
	getTable: (nm) ->
		f= 'Base:M/View.getTable:'+ nm
		#_log2 f, @info_parts if nm is 'Part'
		switch nm
			when 'Control', 'Form' then @fist_table[nm]
			when 'If' then [@info_if_nms]
			when 'Part' then @info_parts.slice -1
			when 'Field'
				row= {}
				for field in @fist_table.Control
					row[field.name]= [field]
				_log2 f, row
				[row]
			else []
	invalidateTables: (view_nm, tbl_nms) ->
		return unless @did_run
		f= 'Base:M/View.invalidateTables'
		#_log2 f, view_nm, tbl_nms #, (if E.inClick then 'IN')
		m.startComputation()
		m.endComputation()
		return
	# Wraper for page/part content which needs special treatment (dyanmic='div', epic:defer's, etc.)
	wrap: (view, attrs, content, defer, has_root)->
		inside= defer: defer
		attrs.config= (el, isInit, context) =>
			f= 'Base:M/View..config:'+ view
			for defer in inside.defer
				_log2 f, defer
				@doDefer defer, el
		attrs[ 'data-part']= view
		if 'dynamic' of attrs # Always render the container, even if content is null
			tag: attrs.dynamic, attrs: attrs, children: content
		else
			return '' unless content
			if has_root
				content
			else
				tag: 'div', attrs: attrs, children: content
	doDefer: (defer_obj, el) =>
		if 'A' is E.type_oau defer_obj.defer
			_log2 'WARNING', 'Got an array for defer', defer_obj.defer
			return 'WAS-ARRAY'
		return defer_obj.func el, defer_obj.attrs if defer_obj.func
		defer_obj.defer.then (f_content) =>
			defer_obj.func= new Function 'el', 'attrs', f_content
			@doDefer defer_obj, el
			return
	handleIt: (content) =>
		f= 'handleIt'
		#_log2 f, 'top',( typeof content) #, content
		content= content() if typeof content is 'function'
		#_log2 f, 'bottom',( typeof content), content
		content
	formatFromSpec: (val, spec, custom_spec) ->
		switch spec
			when undefined then val # No spec
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
				if spec[0] is '?' # Ex. &Model/Tbl/val#?true?false;
					[left,right]= spec.slice(1).split '?'
					(if val then left else right ? '')
						.replace( (new RegExp '[%]', 'g'), val)
				else val # COULD CALL WARNING SINCE NOTHING MATCHED
	v3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		row=( E[ view_nm] tbl_nm)[ 0]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		@formatFromSpec row[ key], format_spec, custom_spec
	v2: (table_ref, col_nm, format_spec, custom_spec, sub_nm) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec, sub_nm}
		ans= @info_foreach[table_ref].row[col_nm]
		if sub_nm? then ans= ans[sub_nm]
		@formatFromSpec ans, format_spec, custom_spec
	# When attrs may have leading dash for special treatment
	weed: (attrs) ->
		f= 'weed'
		clean_attrs= {}
		for nm,val of attrs
			if nm[ 0] isnt '-'
				clean_attrs[ nm]= val
			else
				clean_attrs[ nm.slice 1]= val if val
		_log2 f, clean_attrs
		clean_attrs
	kids: (kids) ->
		f= 'kids'
		#_log2 f, 'top', kids.length
		# Build a new array, with either a copy if 'object' or 'text', else array is T_ funcs w/deferreds
		out= []
		for kid,ix in kids
			if 'A' is E.type_oau kid # Arrays are the parser's indication of an epic tag
				out.push ['TBD',kid[ 0],kid[ 1]] # Place holder in 'out' for later population
				ans= @['T_'+ kid[ 0]] kid[ 1], kid[ 2]
				if ans?.then # A deferred object, eh?
					@nest_up f, ''
					do (ix) => ans.then (result) =>
						#_log2 f, 'THEN', result
						out[ ix]= result; @nest_dn f, ''
				else
					out[ ix]= ans
			else out.push kid
		out # Must return an array, so we can fill it's slots later
	# TODO REWRITE HAVE PARSER DO THIS: EPIC TAGS GET attr.p={}, NON EPIC: p:x => data-p-x=""
	loadPartAttrs: (attrs) ->
		f= 'Base:M/View.loadPartAttrs'
		result= {}
		for attr,val of attrs
			continue if 'p_' isnt attr.slice 0, 2
			result[ attr.slice 2]= val
		result
	T_page: ( attrs) =>
		f= 'T_page'
		#_log2 f, attrs
		if @frame_inx< @frames.length
			d_load= E.oLoader.d_layout name= @next_frame()
			view= (if @frame_inx< @frames.length then 'frame' else 'layout')+ '/'+ name
		else
			d_load= E.oLoader.d_page name= @page_name
			view= 'page/'+ name
		@piece_handle view, (attrs ? {}), d_load

	T_part: ( attrs) ->
		view= attrs.part
		f= 'T_part:'+ view
		d_load= E.oLoader.d_part view
		@piece_handle view, attrs, d_load, true

	# This step, may be happen in a .then, or immeadiate
	piece_handle: (view, attrs, obj, is_part) ->
		f= 'piece_handle'
		#_log2 f, view, obj
		return @D_piece view, attrs, obj, is_part if obj?.then # Was a thenable
		_log2 f, view #, obj
		{content,can_componentize}= obj
		@info_parts.push @loadPartAttrs attrs
		@info_defer.push []
		content= @handleIt content
		defer= @info_defer.pop()
		if can_componentize or attrs.dynamic or defer.length or not is_part
			if defer.length and not can_componentize and not attrs.dynamic
				_log2 "WARNING: DEFER logic in (#{view}); wrapping DIV tag."
			result= @wrap view, attrs, content, defer, can_componentize
		else
			result= content
		result
	D_piece: (view, attrs, d_load, is_part) ->
		f= 'D_piece'
		@nest_up f, view
		saved_info= @saveInfo()
		d_result= d_load.then (obj) =>
			_log2 f, 'THEN', obj
			BLOWUP() if obj?.then # THIS WOULD CAUSE A LOOP BACK TO  US
			@restoreInfo saved_info
			result= @piece_handle view, attrs, obj, is_part
			@nest_dn f, view
			return result
		d_result

	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC ATTRS?
		f= 'Base:M/View.T_defer:'
		# TODO NEW-ASYNC FIGURE OUT WHAT HANDLE-IT WILL DO HERE, AND WHAT TO DO ABOUT IT
		#@info_defer[ @info_defer.length- 1].push {attrs, defer: @handleIt content}
		f_content= @handleIt content
		@info_defer[ @info_defer.length- 1].push {attrs, func: new Function 'el', 'attrs', f_content}
		'' # No content to display for these
	T_if_true: ( attrs, content) -> if @info_if_nms[ attrs.name] then @handleIt content() else ''
	T_if_false: ( attrs, content) -> if @info_if_nms[ attrs.name] then '' else @handleIt content
	T_if: ( attrs, content) => # TODO
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
			oM= E[ lh]()
			tbl= oM.getTable rh
			[dyn_m, dyn_t, dyn_list]= [ lh, rh, []]

		return [tbl, rh, lh, rh, oM] if tbl.length is 0 # No rows, so no need to store info nor reference alias

		rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
		rh_alias= alias if alias
		dyn_list.push [rh, rh_alias]
		@info_foreach[rh_alias]= dyn: [dyn_m, dyn_t, dyn_list]

		[tbl, rh_alias, lh, rh, oM]

	T_foreach: (attrs, content_f) ->
		f= 'T_foreach'
		_log2 f, attrs
		[tbl, rh_alias]= @_accessModelTable attrs.table, attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		result= []
		limit= if 'limit' of attrs then Number( attrs.limit)- 1  else tbl.length
		for row,count in tbl
			row= tbl[ count]
			@info_foreach[rh_alias].row= row
			@info_foreach[rh_alias].count= count
			result.push @handleIt content_f
		delete @info_foreach[rh_alias]
		return result

	T_fist: (attrs) -> # part="" fist="" (opt)field=""
		part= attrs.part ? 'fist_default'
		row= attrs.row ? false
		fm_nm= attrs.form
		oFi= E.fist fm_nm
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
		map= E['issues$'+ E.appGetSetting E.App().path(), 'group']
		for fl_nm in hpfl
			continue if one_field_nm isnt false and one_field_nm isnt fl_nm
			orig= oFi.getFieldAttributes fl_nm
			fl= E.merge { tip: '', fistnm: fm_nm, focus: '' }, orig
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
			fl.id= 'U'+ E.nextCounter()
			fl.type= (fl.type.split ':')[0]
			fl.width?= ''
			fl.size?= ''
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
	xT_mithril: (attrs) -> # TODO M WAS T_react - NEED TO DO A COMPONENT MITHRIL STYLE
		E.Extra.components?= {}
		E.Extra.components[ attrs.func]( attrs)
	xT_show_me: (attrs, content) ->
		f= 'Base:M/View.T_showme'
		_log2 '======== attrs   ======', f, attrs
		_log2 '======== content ======', f, content
		ans= @handleIt content
		_log2 '======== handleIt =====', f, ans
		ans

E.Model.View$Base= View$Base # Public API
