'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class TagExe
	constructor: (@Epic,@view_nm) ->
		@resetForNextRequest()
		@viewExe= @Epic.getView()
	resetForNextRequest: ->
		@forms_included= {}
		@fist_objects= {}
		@info_foreach= {} # [table-name|subtable-name]['table'&'row'&'size'&'count']=value
		@info_if_nms= {} # [if-name]=boolean (from <if_xxx name="if-name" ..>
		@info_varGet3= {} # for &obj/table/var; type variables
		@refresh_names= {} # For a page refresh when targeted model/table's change state async (populated by varGet3/foreach
	formatFromSpec: (spec, val) ->
		switch spec
			when 'count' then val?.length
			when 'ucFirst'
				str= (String str).toLowerCase()
				str.slice( 0, 1).toUpperCase()+ str.slice 1
			else
				if spec?.length
					# Default spec
					# if val is set, xlate spec to a string w/replaced spaces using first char
					# Ex. &Model/Table/flag#.Replace.with.this.string; (Don't use / or ; or # in the string though)
					if (typeof val== 'number' && val) || val?.length
						spec.substr(1).replace (new RegExp '['+ spec.substr(0,1)+ ']', 'g'), ' '
					else ''
				else val
	varGet3: (view_nm, tbl_nm, key, format_spec) ->
		@refresh_names[(@Epic.getInstanceNm view_nm)+':'+tbl_nm]= true
		@info_varGet3[view_nm]?= {}
		row= (@info_varGet3[view_nm][tbl_nm]?= ((@Epic.getInstance view_nm).getTable tbl_nm)[0])
		@formatFromSpec format_spec, row[key]
	varGet2: (table_ref, col_nm, format_spec, sub_nm) ->
		ans= @info_foreach[table_ref].row[col_nm]
		if sub_nm? then ans= ans[sub_nm]
		@formatFromSpec format_spec, ans
	loadFistDef: (flist_nm) -> @fist_objects[flist_nm]?= @Epic.getFistInstance flist_nm
	getFistForField: (fl_nm) ->
		for flist_nm, oFi of @fist_objects
			return oFi # TODO First entry for now
	Tag_TOP_TAG: (oPt) -> @viewExe.doAllParts oPt.parts
	Tag_page_part: (oPt) -> @viewExe.includePart @viewExe.handleIt oPt.attrs.part
	Tag_page: (oPt) -> @viewExe.includePage()
	Tag_defer: (oPt) -> #TODO OUTPUT CODE INTO SCRIPT TAG WITH FUNCTION WRAPPER TO CALL, FOR BETTER DEBUG
		name= 'anonymous'
		if 'name' of oPt.attrs then name= @viewExe.handleIt oPt.attrs.name
		code= @viewExe.doAllParts oPt.parts
		@viewExe.pushDefer name:name, code:code
		'' # This tag has no visible output

	# <e_if ... family of tags
	Tag_if_any:   (oPt) -> @ifAnyAll    oPt, true
	Tag_if_all:   (oPt) -> @ifAnyAll    oPt, false
	Tag_if:       (oPt) -> @ifAnyAll    oPt, true
	Tag_if_true:  (oPt) -> @ifTrueFalse oPt, true
	Tag_if_false: (oPt) -> @ifTrueFalse oPt, false

	ifTrueFalse: (oPt, is_if_true) ->
		nm= @viewExe.handleIt oPt.attrs.name
		found_true= @info_if_nms[nm] is true
		found_true= not found_true if not is_if_true
		out= if found_true then @viewExe.doAllParts oPt.parts else ''
	ifAnyAll: (oPt, is_if_any) ->
		out= ''
		fond_nm= false
		for nm, val of oPt.attrs
			val= @viewExe.handleIt val
			flip= false
			switch nm
				# Alternate method, 'val="&...;" eq="text"'
				when 'right' then right= val; continue
				when 'left', 'val', 'value' then left= val; continue
				when 'name' then found_nm= val; continue
				when 'eq', 'ne', 'lt', 'gt', 'ge', 'le', 'op', 'in', 'in_list'
					if nm isnt 'op' then right= val; op= nm else op= val
					use_op= op
					if op.substr(0,1) is '!' then flip= true; use_op= op.substr(1)
					switch use_op
						when 'eq' then found_true= left== right
						when 'ne' then found_true= left!= right
						when 'gt' then found_true= left>  right
						when 'ge' then found_true= left>= right
						when 'lt' then found_true= left<  right
						when 'le' then found_true= left<= right
					op= null
					break
				when 'not_empty', 'empty'
					flip= true if nm is 'not_empty'
					found_true= val.length is 0
					break
				when 'table_has_no_values', 'table_is_empty', 'table_is_not_empty', 'table_has_values'
					flip= true if nm is 'table_has_no_values' or nm is 'table_is_empty'
					found_true= @Epic.getViewTable(val).length isnt 0
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
					found_true= if (typeof val== 'number' && val) ||
						(typeof val== 'string' && val.length> 0 and not val.match(/^no|false|n|0$/i) )
						then true else false
					break
			found_true= not found_true if flip
			break if is_if_any and found_true
			break if not is_if_any and not found_true
		@info_if_nms[found_nm]= found_true if found_nm
		out= @viewExe.doAllParts oPt.parts if found_true
		out
	Tag_comment: (oPt) -> "\n<!--\n#{@viewExe.doAllParts oPt.parts}\n-->\n"

	Tag_foreach: (oPt) ->
		at_table= @viewExe.handleIt oPt.attrs.table
		[lh, rh]= at_table.split '/' # Left/right halfs
		# If left exists, it's nested as table/sub-table else assume model/table
		if lh of @info_foreach
			tbl= @info_foreach[lh].row[rh]
		else
			@refresh_names[(@Epic.getInstanceNm lh)+':'+rh]= true
			oMd= @Epic.getInstance lh
			tbl= oMd.getTable rh
		return '' if tbl.length is 0 # No rows means no output
		@info_foreach[rh]= {}
		break_rows_list= @calcBreak tbl.length, oPt
		out= ''
		limit= tbl.length
		limit= Number( @viewExe.handleIt oPt.attrs.limit)- 1 if 'limit' of oPt.attrs
		for row, count in tbl
			break if count> limit
			@info_foreach[rh].row= $.extend true, {}, row,
				_FIRST: count is 0, _LAST: count is tbl.length- 1,
				_SIZE:tbl.length, _COUNT:count, _BREAK: count+ 1 in break_rows_list
			out+= @viewExe.doAllParts oPt.parts
		@info_foreach[rh]= null
		out
	calcBreak: (sZ,oPt) -> # Using oPt, build list of row#s to break on
		p= oPt.attrs # shortcut
		break_rows_list= []
		for nm in [ 'break_min', 'break_fixed', 'break_at', 'break_even']
			p[nm]= if p[nm]? then @viewExe.handleIt p[nm] else 0
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
	Tag_dyno_form: (oPt) ->
		oPt.attrs.help?= ''
		oPt.attrs.show_required?= 1
		fm_nm= @viewExe.handleIt oPt.attrs.form
		oFi= @loadFistDef fm_nm # Set state for viewExe.doAllParts/doTag calls
		sh_req= false
		out= []
		hpfl= oFi.getHtmlPostedFieldsList fm_nm
		for fl_nm in hpfl
			fl= oFi.getFieldAttributes fl_nm
			req= ''
			if oPt.attrs.show_required is '1' and fl.required is '1'
				req= '<font color="red" size="-2">*</font>'
				sh_req= true
			help_html= ''
			if oPt.attrs.help is 'inline' and fl.help_text.length
				help_html= """<br><font size="-2">{#{fl.help_text}}</font>"""
			in_ct= @viewExe.run ['', [4], 'control', field: fl_nm, '', [1]]
			#out.push( '<td>'+req+fl.label+'</td><td>'+in_ct+help_html+'</td>');
			out.push """
				<div data-theme="b" data-role="fieldcontain">
				<label for="#{fl_nm}" class="ui-input-text">
				#{req}#{fl.label||fl_nm}</label>
				#{in_ct}#{help_html}
				</div>
				"""
		if sh_req then out.push '<div><font color="red" size="-1">* required</font></div>'
		[otr, ctr]= ['', '\n']
		otr+ out.join( ctr+ otr) + ctr
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
		oFi= @getFistForField fl_nm
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
				when 'action' then action=( @viewExe.handleIt val).trim()
				when 'value' then value=( @viewExe.handleIt val).trim()
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
		action= @viewExe.handleIt oPt.attrs.action
		link._a= action
		# Add any 'p:*' (inline parameters in HTML) to the HREF
		plain_attr= {}
		for own attr, val of oPt.attrs
			if (attr.substr 0, 2) is 'p:'
				link[attr.substr 2]= @viewExe.handleIt val
			else switch attr
				when 'href', 'title', 'onclick', 'action'
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
