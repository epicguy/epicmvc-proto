'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
class TagExe
	constructor: (@Epic,@view_nm) ->
		@viewExe= @Epic.getView()
		@resetForNextRequest()
	resetForNextRequest: (state) ->
		f= 'Base::TagExe.resetForNextRequest:state?'+ if state then 'T' else 'F'
		@forms_included= {}
		@fist_objects= {}
		@info_foreach= {} # [table-name|subtable-name]['table'&'row'&'size'&'count']=value
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..>
		@info_varGet3= {} # for &obj/table/var; type variables
		@info_parts= [] # Push p:attrs with each part, then pop; getTable uses last pushed
		@Epic.log2 f, 'state', state
		if state
			for nm,rec of state.info_foreach.dyn
				@Epic.log2 f, 'info_foreach nm=', nm, rec
				[dyn_m, dyn_t, dyn_list_orig]= rec
				dyn_list= []
				oM= @Epic.getInstance dyn_m
				for t_set in dyn_list_orig
					@Epic.log2 f, nm, 't_set', t_set
					[rh, rh_alias]= t_set
					dyn_list.push t_set
					if rh_alias not of @info_foreach
						@Epic.log2 f, nm, 'rh_alias', rh_alias
						# TODO CONSIDER TABLES THAT HOW HAVE NO ROWS OR LESS THAN ROW_NUM
						# TODO FULLY NESTED DYNAMIC PARTS THAT REBUILD FROM THE PARENT REFERENCE WILL HELP WITH THE ABOVE ISSUE
						if dyn_list.length is 1 # Get table from model, else nested
							tbl= oM.getTable rh
						else
							tbl= prev_row[ rh]
						row_num= state.info_foreach.row_num[ rh_alias]
						row= $.extend true, {}, tbl[ row_num] # TODO DOES NOT HAVE TAG_FOREACH'S _COUNT, _FIRST, ETC.
						@info_foreach[ rh_alias]= dyn: [dyn_m, dyn_t, dyn_list], row: row
						prev_row= row
					else prev_row= @info_foreach[ rh_alias].row

			info_parts= $.extend true, {}, state.info_parts
			@info_parts= info_parts.stuff # Added 'stuff' for an array vs. an object
			@Epic.log2 f, 'info_parts', @info_parts
	formatFromSpec: (val, spec, custom_spec) ->
		switch spec
			when '' then window.EpicMvc.custom_filter? val, custom_spec
			when 'count' then val?.length
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
						.replace (new RegExp '['+ spec[1]+ ']', 'g'), ' '
						.replace (new RegExp '[%]', 'g'), val
				else if spec?.length
					# Default spec
					# if val is set, xlate spec to a string w/replaced spaces using first char
					# Ex. &Model/Table/flag#.Replace.with.this.string; (Don't use / or ; or # in the string though)
					if (val is true or (typeof val== 'number' && val)) or val?.length
						spec.substr(1)
							.replace (new RegExp '['+ spec.substr(0,1)+ ']', 'g'), ' '
							.replace (new RegExp '[%]', 'g'), val
					else ''
				else val
	varGet3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		@viewExe.haveTableRefrence view_nm, tbl_nm
		@info_varGet3[view_nm]?= @Epic.getInstance view_nm
		row= (@info_varGet3[view_nm].getTable tbl_nm)[0]
		@formatFromSpec row[key], format_spec, custom_spec
	varGet2: (table_ref, col_nm, format_spec, custom_spec, sub_nm) ->
		ans= @info_foreach[table_ref].row[col_nm]
		if sub_nm? then ans= ans[sub_nm]
		@formatFromSpec ans, format_spec, custom_spec

	loadFistDef: (flist_nm) -> @fist_objects[flist_nm]?= @Epic.getFistInstance flist_nm
	checkForDynamic: (oPt) -> # dynamic="div" delay="2"
		tag= if 'dynamic' of oPt.attrs then @viewExe.handleIt oPt.attrs.dynamic else ''
		return ['', '', false] if tag.length is 0
		delay= 1
		id= 'epic-dynopart-'+ @Epic.nextCounter()
		plain_attrs= []
		for attr,val of oPt.attrs
			switch attr
				when 'part', 'dynamic' then continue
				when 'delay' then delay= @viewExe.handleIt val
				when 'id' then id= @viewExe.handleIt val
				else plain_attrs.push "#{attr}=\"#{@viewExe.handleIt val}\""
		# TODO SNAPSHOT MORE STUFF?
		dyn= {}; row_num= {}
		( dyn[ nm]= rec.dyn; row_num[ nm]= rec.row._COUNT) for nm,rec of @info_foreach
		state= $.extend true, {},
			info_foreach: {dyn,row_num}
			info_parts: stuff: @info_parts
		return [ "<#{tag} id=\"#{id}\" #{plain_attrs.join ' '}>", "</#{tag}>",
			id: id, delay: delay* 1000, state: state]
	loadPartAttrs: (oPt) ->
		f= ':tag.loadPartAttrs'
		result= {}
		for attr,val of oPt.attrs
			[p,a]= attr.split ':'
			continue if p isnt 'p'
			result[a]= @viewExe.handleIt val
			#@Epic.log2 f, a, result[a]
		result
	Tag_page_part: (oPt) ->
		f= ':tag.page-part:'+ oPt.attrs.part
		@info_parts.push @loadPartAttrs oPt
		[before, after, dynamicInfo]= @checkForDynamic oPt
		#@Epic.log2 f, dynamicInfo
		out= before+ (@viewExe.includePart (@viewExe.handleIt oPt.attrs.part), dynamicInfo)+ after
		@info_parts.pop()
		out
	Tag_page: (oPt) -> @viewExe.includePage()
	getTable: (nm) ->
		f= ':TagExe.getTable:'+ nm
		#@Epic.log2 f, @info_parts if nm is 'Part'
		switch nm
			when 'Control', 'Form' then @fist_table[nm]
			when 'If' then [@info_if_nms]
			when 'Part' then @info_parts.slice -1
			when 'Field'
				row= {}
				for field in @fist_table.Control
					row[field.name]= [field]
				[row]
			else []
	Tag_form_part: (oPt) -> # part="" form="" (opt)field=""
		part= @viewExe.handleIt oPt.attrs.part ? 'fist_default'
		row= @viewExe.handleIt oPt.attrs.row ? false
		fm_nm= @viewExe.handleIt oPt.attrs.form
		oFi= @loadFistDef fm_nm # Set state for viewExe.doAllParts/doTag calls
		# Optional fields
		one_field_nm= if oPt.attrs.field? then @viewExe.handleIt oPt.attrs.field else false
		help= @viewExe.handleIt oPt.attrs.help ? ''
		show_req= if 'show_req' of oPt.attrs then @viewExe.handleIt oPt.attrs.show_req else 'yes'
		any_req= false
		is_first= true
		out= []
		hpfl= oFi.getHtmlPostedFieldsList fm_nm
		issues= oFi.getFieldIssues()
		map= window.EpicMvc['issues$'+ @Epic.appConf().getGroupNm()]
		for fl_nm in hpfl
			continue if one_field_nm isnt false and one_field_nm isnt fl_nm
			orig= oFi.getFieldAttributes fl_nm
			fl= $.extend {}, orig
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
			#fl.one= if fl.type is 'radio' then oPt.attrs.value else false
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
		@viewExe.includePart part, false # TODO DYNAMICINFO?

	Tag_defer: (oPt) -> #TODO OUTPUT CODE INTO SCRIPT TAG WITH FUNCTION WRAPPER TO CALL, FOR BETTER DEBUG
		name= 'anonymous'
		if 'name' of oPt.attrs then name= @viewExe.handleIt oPt.attrs.name
		code= @viewExe.doAllParts oPt.parts
		@viewExe.pushDefer name:name, code:code
		'' # This tag has no visible output

	# <epic:if ... family of tags
	Tag_if_any:   (oPt) -> @ifAnyAll    oPt, true
	Tag_if_all:   (oPt) -> @ifAnyAll    oPt, false
	Tag_if:       (oPt) -> @ifAnyAll    oPt, true
	Tag_if_true:  (oPt) -> @ifTrueFalse oPt, true
	Tag_if_false: (oPt) -> @ifTrueFalse oPt, false

	ifTrueFalse: (oPt, is_if_true) ->
		f= ':TagExe.ifTrueFalse'
		nm= @viewExe.handleIt oPt.attrs.name
		#@Epic.log2 f, oPt.attrs.name, nm, @info_if_nms[nm]
		found_true= @info_if_nms[nm] is is_if_true
		out= if found_true then @viewExe.doAllParts oPt.parts else ''
	ifAnyAll: (oPt, is_if_any) ->
		f= ':TagExe.ifAnyAll'
		#@Epic.log2 f, oPt.attrs
		out= ''
		found_nm= false
		for nm, val of oPt.attrs
			val= @viewExe.handleIt val
			flip= false
			switch nm
				# Alternate method, 'val="&...;" eq="text"'
				when 'right' then right= val; continue
				when 'left', 'val', 'value' then left= val; continue
				when 'name' then found_nm= val; continue
				when 'eq', 'ne', 'lt', 'gt', 'ge', 'le', 'op'
					if nm isnt 'op' then right= val; op= nm else op= val
					use_op= op
					if op.substr(0,1) is '!' then flip= true; use_op= op.substr(1)
					switch use_op
						when 'eq' then found_true= left== right
						when 'ne' then found_true= left!= right
						# These comparisons are always numeric
						when 'gt' then found_true= (Number left)>  (Number right)
						when 'ge' then found_true= (Number left)>= (Number right)
						when 'lt' then found_true= (Number left)<  (Number right)
						when 'le' then found_true= (Number left)<= (Number right)
					op= null
					break
				when 'not_empty', 'empty'
					flip= true if nm is 'not_empty'
					found_true= val.length is 0
					break
				when 'in_list', 'not_in_list'
					flip= true if nm is 'not_in_list'
					found_true= left in ( val.split ',')
					break
				when 'table_has_no_values', 'table_is_empty', 'table_is_not_empty', 'table_has_values'
					flip= true if nm is 'table_has_no_values' or nm is 'table_is_empty'
					[lh, rh]= val.split '/' # Left/right halfs
					# If left exists, it's nested as table/sub-table else assume model/table
					[tbl]= @_accessModelTable val, false
					found_true= tbl.length isnt 0
					break
				when 'if_true', 'if_false'
					flip= true if nm is 'if_true'
					found_true= @info_if_nms[val] is false
					break
				when 'true', 'false'
					flip= true if nm is 'true'
					found_true= val is false or val is 'false'
					break
				when 'not_set', 'set'
					flip= true if nm is 'not_set'
					found_true= if val is true or (typeof val is 'number' && val) or
						(typeof val is 'string' && val.length> 0 and not val.match(/^(no|false|n|0)$/i) )
						then true else false
					break
			found_true= not found_true if flip
			break if is_if_any and found_true
			break if not is_if_any and not found_true
		if found_nm isnt false
			#@Epic.log2 f, found_nm, found_true, oPt.attrs
			@info_if_nms[found_nm]= found_true
		out= @viewExe.doAllParts oPt.parts if found_true
		out

	# Make sure state contains orignal table reference, for dynmaic parts, etc. and create a 'build' list for dynamic restore-state
	_accessModelTable: (spec, alias, spec_was_handled) ->

		at_table= if spec_was_handled then spec else @viewExe.handleIt spec
		[lh, rh]= at_table.split '/' # Left/right halfs
		if lh of @info_foreach # Nested table reference
			tbl= @info_foreach[lh].row[rh]
			[dyn_m, dyn_t, dyn_list]= @info_foreach[ lh].dyn
		else
			oM= @Epic.getInstance lh
			tbl= oM.getTable rh
			[dyn_m, dyn_t, dyn_list]= [ lh, rh, []]

		@viewExe.haveTableRefrence dyn_m, dyn_t # Requires only base model/table

		return [tbl, rh, lh, rh, oM] if tbl.length is 0 # No rows, so no need to store state nor reference alias

		rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
		rh_alias= @viewExe.handleIt alias if alias
		dyn_list.push [rh, rh_alias]
		@info_foreach[rh_alias]= dyn: [dyn_m, dyn_t, dyn_list]

		[tbl, rh_alias, lh, rh, oM]

	Tag_comment: (oPt) -> "\n<!--\n#{@viewExe.doAllParts oPt.parts}\n-->\n"

	Tag_foreach: (oPt) ->
		f= ':TagExe.Tag_foreach'
		[tbl, rh_alias]= @_accessModelTable oPt.attrs.table, oPt.attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		break_rows_list= @calcBreak tbl.length, oPt
		#@Epic.log2 f, 'break_rows_list', break_rows_list
		out= ''
		limit= tbl.length
		limit= Number( @viewExe.handleIt oPt.attrs.limit)- 1 if 'limit' of oPt.attrs
		for row, count in tbl
			break if count> limit
			@info_foreach[rh_alias].row= $.extend true, {}, row,
				_FIRST: (if count is 0 then 'F' else ''), _LAST: (if count is tbl.length- 1 then 'L' else ''),
				_SIZE:tbl.length, _COUNT:count, _BREAK: (if count+ 1 in break_rows_list then 'B' else '')
			out+= @viewExe.doAllParts oPt.parts
		delete @info_foreach[rh_alias]
		out
	calcBreak: (sZ,oPt) -> # Using oPt, build list of row#s to break on
		p= oPt.attrs # shortcut
		break_rows_list= []
		for nm in [ 'break_min', 'break_fixed', 'break_at', 'break_even']
			p[nm]= if p[nm]? then (Number @viewExe.handleIt p[nm]) else 0
		check_for_breaks= if p.break_min and sZ< p.break_min then 0 else 1
		if check_for_breaks and p.break_fixed
			check_row= p.break_fixed
			while sZ> check_row
				break_rows_list.push check_row+ 1
				check_row+= p.break_fixed
			check_for_breaks= 0
		if check_for_breaks and p.break_at
			repeat_value= 0
			last_check_row= 0
			for check_row in p.break_at.split ','
				if not check_row.length
					# Special case, repeat until no more rows
					break if last_check_row<= 0 or repeat_value<= 0
					check_row= last_check_row+ repeat_value
					while sZ> check_row
						break_rows_list.push check_row+ 1
						check_row+= repeat_value
					break # No use checking anymore; foreach should end anyhow
				else
					break if check_row<= 0
					if sZ> check_row
						break_rows_list.push check_row+ 1
					else break
				# Capture values of rspecial 'repeat' case
				repeat_value= check_row- last_check_row
				last_check_row= check_row
			check_for_breaks= 0
		if check_for_breaks and p.break_even
			column_count= 1 # Determine this, then split rows evenly
			repeat_value= 0
			last_check_row= 0
			for check_row in p.break_even.split ','
				if not check_row.length
					# Special case, repeat until no more rows
					break if last_check_row<= 0 or repeat_value<= 0
					check_row= last_check_row+ repeat_value
					while sZ>= check_row
						column_count++
						check_row+= repeat_value
					break # No use checking anymore; foreach should end anyhow
				else
					break if check_row<= 0 # Count not good
					if sZ>= check_row then column_count++ else break
				# Capture values ofr special 'repeat' case
				repeat_value= check_row- last_check_row
				last_check_row= check_row
			# Now spread the rows based on column count (like break_fixed after division
			if column_count> 1
				break_fixed= Math.floor sZ/ column_count
				extra_rows= sZ- break_fixed* column_count
				check_row= break_fixed
				while sZ> check_row
					if extra_rows then check_row++; extra_rows--
					break_rows_list.push check_row+ 1
					check_row+= break_fixed
			check_for_breaks= 0
		break_rows_list
	Tag_dyno_form: (oPt) -> @Tag_form_part oPt
	Tag_form: (oPt) ->
		saw_method= false
		out_attrs= []
		for attr, val of oPt.attrs
			val= @viewExe.handleIt val
			add=  false
			switch attr
				when 'forms_used' then @forms_included= val.split ','
				when 'method' then saw_method= true
				when 'show_required', 'help' then
				else add= true
			if add then out_attrs.push """
				#{attr}="#{val}"
				"""
		if not saw_method then out_attrs.push 'METHOD="POST"'
		for fist_nm in @forms_included
			@loadFistDef fist_nm # Loads and caches
		@forms_included= ['A FORM TAG WITH NO NAME?'] if not @forms_included.length #TODO
		o= """
			<form #{out_attrs.join ' '}>

			"""
			#TODO <input type="hidden" name="_c" value="#{window.EpicMvc.escape_html @Epic.getContext()}">
		try
			o+= @viewExe.doAllParts oPt.parts
		finally
			@forms_included= @fist_objects= []
		o+= '</form>'
	Tag_control: (oPt) ->
		fl_nm= oPt.attrs.field
		fm_nm= @viewExe.handleIt oPt.attrs.form
		oFi= @loadFistDef fm_nm # Set state for viewExe.doAllParts/doTag calls
		fl_def= oFi.getFieldAttributes fl_nm
		value= oFi.getHtmlFieldValue fl_nm
		one= if fl_def.type.substr 0, 5 is 'radio' then oPt.attrs.value else null
		control_html= @Epic.renderer.doControl oFi, fl_nm, value, fl_def.type,
			fl_def.cdata, fl_def.width, fl_def.max_length, one
		control_html
	Tag_form_action: (oPt) ->
		link= {}
		if oPt.attrs.src?
			oPt.attrs.type?= 'image'
			oPt.attrs.border?= '0'
		out_attrs= []
		action= ''
		value= ''
		for own attr, val of oPt.attrs
			switch attr
				when 'action' then action= $.trim @viewExe.handleIt val
				when 'value' then value= $.trim @viewExe.handleIt val
				else
					if attr.match /^p_/
						link[attr.substr 2]= @viewExe.handleIt val
					else
						out_attrs.push """
							#{attr}="#{window.EpicMvc.escape_html @viewExe.handleIt val}"
							"""
		link._b= action # _b instead of _a because we are a 'button'
		click_index= @Epic.request().addLink link
		o= @Epic.renderer.form_action out_attrs, click_index, action, value
	Tag_link_action: (oPt) ->
		link= {}
		plain_attr= {}
		action= @viewExe.handleIt oPt.attrs.action
		link._a= action
		# Add any 'p:*' (inline parameters in HTML) to the HREF
		for own attr, val of oPt.attrs
			if (attr.substr 0, 2) is 'p:'
				link[attr.substr 2]= @viewExe.handleIt val
			else switch attr
				when 'href', 'onclick', 'action'
				else plain_attr[attr]= @viewExe.handleIt val
		text= ''
		text+= @viewExe.doAllParts oPt.parts
		id= ''
		attr_text= ''
		for own k,v of plain_attr
			attr_text+= " #{k}=\"#{window.EpicMvc.escape_html v}\""
		click_index= @Epic.request().addLink link
		o= @Epic.renderer.link_action click_index, id, attr_text, text

window.EpicMvc.Model.TagExe$Base= TagExe
