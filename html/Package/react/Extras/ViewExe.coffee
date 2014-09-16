'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# new window.EpicMvc.ViewExe @, @loader, @content_watch # Uses AppConf in constructor
# @oView.init template, page
# @oView.run()
# @oView.doDefer()
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

	# TODO FIGURE OUT WHAT MIGHT BE NEEDED HERE WITH THESE FUNCTIONS THAT OTHERS CALL (invalidateTables, doDefer)
	invalidateTables: ->
		return if @Epic.inClick isnt false or @page_name is false or @invalidateTablesTimer isnt false
		@invalidateTablesTimer= setTimeout =>
			@invalidateTablesTimer= false
			@Epic.renderSecure() # TODO REACT HOW BEST TO GET A RE-RENDER BASED ON MODEL'S STATE CHANGES
		, 0
	doDefer: ->

	init: ( @template, @page) ->
		@page_name= page
		@frames[ @frames.length- 1]= template
		@frame_inx= 0
		# State for one render loop
		@info_foreach= {}
		@info_parts= [{}] # Push p:attrs with each part, then pop; (top level is row w/o attrs)
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..> # TODO REACT ADD TO T_if LOGIC
	run: () ->
		_log2 'START RUN', start= new Date().getTime()
		result= @T_page()
		_log2 'END RUN', new Date().getTime()- start
		result
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
			content_func= @loader.template name= @next_frame()
		else
			content_func= @loader.page @page_name
		result= content_func attrs
		if result is undefined
			console.log 'BIG ISSUE IN TMPL/PAGE: '+ name, 'func is', content_func
			throw new Error 'Big Issue in Tmpl/Page '+ name
		return result
	T_page_part: ( attrs) ->
		name= attrs.part; # TODO consider attrs with p:
		part= @loader.part name
		@info_parts.push @loadPartAttrs attrs
		result= part attrs
		@info_parts.pop()
		if result is undefined
			console.log 'BIG ISSUE IN PART: '+ name, 'func is', part
			throw new Error 'Big Issue in PART '+ name
		return result
	T_if_true: ( attrs, content) -> # TODO
		return content() if @info_if_nms[ attrs.name]
		null
	T_if_false: ( attrs, content) -> # TODO
		return content() unless @info_if_nms[ attrs.name]
		null
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
			is_true= true if attrs.set.length
		else if 'not_set' of attrs
			is_true= true unless attrs.not_set.length
		else if 'table_is_not_empty' of attrs
			val= attrs.table_is_not_empty
			[lh, rh]= val.split '/' # Left/right halfs
			# If left exists, it's nested as table/sub-table else assume model/table
			[tbl]= @_accessModelTable val, false
			is_true= true if tbl.length
		else issue= true
		console.log 'ISSUE T_if', attrs if issue
		@info_if_nms[ attrs.name]= is_true if 'name' of attrs
		return if is_true and content then content() else null
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

		return [tbl, rh, lh, rh, oM] if tbl.length is 0 # No rows, so no need to store state nor reference alias

		rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
		rh_alias= alias if alias
		dyn_list.push [rh, rh_alias]
		@info_foreach[rh_alias]= dyn: [dyn_m, dyn_t, dyn_list]

		[tbl, rh_alias, lh, rh, oM]

	T_foreach: (attrs, content_f) ->
		f= 'react:viewexe.T_foreach'
		console.log f, attrs
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
			out.push content_f()
		delete @info_foreach[rh_alias]
		out

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

window.EpicMvc.Extras.ViewExe$react= ViewExe # Public API
