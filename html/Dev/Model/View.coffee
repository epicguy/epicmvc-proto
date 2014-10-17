'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
# TODO DON'T RENDER DEBUG IF RENDERING INSIDE EPIC:DEFER

class View extends E.Model.View$Base
	run: ->
		@errors_cache= _COUNT: 0
		@in_defer= false
		super()
	Opts: -> E.Devl('Opts')[0]
	_Error: (type,key,e) ->
		@errors_cache[type]?= {}
		if (not (key of @errors_cache[type]))
			@errors_cache[type][key]= e
			@errors_cache._COUNT++
			if @errors_cache._COUNT< 5
				_log2 '### _Error type/key/e', type, key, e
				msg= (("#{key}\n\n#{e.message}"
					.replace /&lt;/g, '<')
					.replace /&gt;/g, '>')
					.replace /&amp;/g, '&'
				prefix= if type is 'varGet2' or type is 'varGet3' then 'Variable reference' else 'Tag'
				#alert "#{prefix} error (#{type}):\n\n#{msg}" #TODO CHROME BUG NOT SHOWING POPUP
				_log2 "ERROR", "#{prefix} error (#{type}):\n\n#{msg}" #TODO CHROME BUG NOT SHOWING POPUP
	invalidateTables: (view_nm, tbl_list, deleted_tbl_nms) ->
		E.Devl().tableChange view_nm, tbl_list, deleted_tbl_nms if deleted_tbl_nms.length
		super view_nm, tbl_list, deleted_tbl_nms
	xT_defer: (oPt) ->
		@in_defer= true; out= super oPt; @in_defer= false; out
	xT_debug: (oPt) ->
		save= @Opts
		@Opts= -> {} #TODO file: false, tag: false, tag2: false, form: false # Simulate no debug display
		out= @viewExe.doAllParts oPt.parts
		@Opts= save
		out
	xgetTable:( nm) ->
		return super nm if @Opts().form isnt true
		switch nm
			when 'Control', 'Form'
				if @fist_table.Debug isnt true
					for row in @fist_table.Control
						row.label+= """
<span class="dbg-tag-box" title="#{row.name}(#{row.type})">#</span>
"""
					@fist_table.Debug= true
		super nm
	_accessModelTable: (at_table, alias) ->
		[lh, rh]= at_table.split '/'
		if lh of @info_foreach
			row= @info_foreach[ lh].row
			if rh not of row
				_log2 'ERROR', err= "No such sub-table (#{rh}) in (#{lh}) row=", row
				throw new Error err
		else if lh not of E
			_log2 'ERROR', err= "No such Model (#{lh}) for model/table (#{lh}/#{rh})"
			throw new Error err
		return super at_table, alias
	xT_fist: (oPt) ->
		try
			throw Error "Missing 'form' attribute" if not oPt.attrs.form
			g= @Epic.getGroupNm()
			c= @Epic.getFistGroupCache().getCanonicalFist g, oPt.attrs.form
			v= @Epic.oAppConf.getFistView g, c
			throw Error "app.conf requires MODELS: ... forms=\"...,#{c}\"" if not v
			throw Error "Your model (#{v}) must have a method fistLoadData" if not ('fistLoadData' of @Epic.getInstance v)
		catch e
			_log2 '##### Error in form-part', oPt.attrs.part ? 'fist_default', e, e.stack
			@_Error 'form',( @_TagText oPt, true), e
			return @_Err 'tag', 'fist', attrs, e
		try
			inside= ''
			return @_Div 'tag', oPt, inside, super oPt if @Opts().form is true
			return """<div class="dbg-part-box" title="#{oPt.attrs.part ? 'fist_default'}.part.html (#{oPt.attrs.form})">.</div>#{super oPt}""" if @Opts().file is true
			super oPt
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in form-part', oPt.attrs.part ? 'fist_default', e, e.stack
			@_Error 'form_part',( @_TagText oPt, true), e
			@_Err 'tag', 'fist', attrs, e

	T_part: (attrs) ->
		try
			return super attrs if @Opts().file isnt true
			return [
				m( 'div.dbg-part-box', {title: "Part/#{attrs.part}.html"}, '.')
				#{tag:'div', attrs:{className:"dbg-part-box", title:"Part/#{attrs.part}.html"}, children:'.'}
				super attrs
			]
		catch e
			_log2 '##### Error in page-part', attrs.part, e
			return m 'pre',{},["<e-part part=\"Part/#{attrs.part}\">",(m 'br'), e, (m 'br'), e.stack]

	getLetTypPag: () ->
			nest= @frames.length- @frame_inx
			letter= switch nest
				when 0 then 'P'; when 1 then 'L'; else 'F'
			type= {P:'Page',L:'Layout',F:'Frame'}[ letter]
			page= switch nest
				when 0 then @page_name; else @frames[ @frame_inx]
			[letter,type,page]
	T_page: (attrs) ->
		try
			return super attrs if @Opts().file isnt true
			[letter,type,page]= @getLetTypPag()
			return [
				{tag:'div', attrs: {className:"dbg-part-box", title:"#{type}/#{page}.html"}, children: letter}
				super attrs # TODO BREAKS IN EpicMvc-One SINCE @kids EXPECTS A PROMISE AS RETURN VALUE
			]
		catch e
			#_log2 '##### Error in ', type, page, e, e.stack
			_log2 '##### Error in T_page', attrs, e
			@_Error 'page',( @_TagText {tag:'page',attrs}, true), e
			@_Err 'page', 'page', attrs, e
			#return """<pre>&lt;epic:page page:#{@bd_page}&gt;<br>#{e}<br>#{e.stack}</pre>"""

	v3: (view_nm, tbl_nm, col_nm, format_spec, custom_spec, give_error) ->
		try
			val= super view_nm, tbl_nm, col_nm, format_spec, custom_spec
			t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
			t_custom_spec= if custom_spec then '#'+ custom_spec else ''
			if val is undefined then throw new Error "Column/spec does not exist (#{view_nm}/#{tbl_nm}/#{col_nm}#{t_format_spec}#{t_custom_spec})."
		catch e
			t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
			t_custom_spec= if custom_spec then '#'+ custom_spec else ''
			key= '&amp;'+ view_nm+ '/'+ tbl_nm+ '/'+ col_nm+ t_format_spec+ t_custom_spec+ ';'
			_log2 '##### Error in varGet3 key=', key, e
			@_Error 'varGet3', key, e
			throw e
		#"<span title='&amp;#{view_nm}/#{tbl_nm}/#{col_nm}#{t_format_spec}#{t_custom_spec};'>#{val}</span>"
		val
	xv2: (tbl_nm, col_nm, format_spec, custom_spec, sub_nm, give_error) ->
		try
			val= super tbl_nm, col_nm, format_spec, custom_spec, sub_nm
		catch e
			throw e if @Epic.isSecurityError e or give_error
			_log2 '##### varGet2', "&#{tbl_nm}/#{col_nm};", e, e.stack
			val= "&amp;#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
			t_custom_spec= if custom_spec then '#'+ custom_spec else ''
			key= '&amp;'+ tbl_nm+ '/'+ col_nm+ t_format_spec+ t_custom_spec+ ';' # TODO sub_nm?
			_log2 '##### Error in varGet2 key=', key, 'undefined'
			@_Error 'varGet2', key, message: 'is undefined', stack: "\n"
			val= "&amp;#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		#"<span title='&amp;#{tbl_nm}/#{col_nm}#{t_format_spec}#{t_custom_spec};'>#{val}</span>"
		val
	xT_if: (oPt) ->
		try
			# Pre-check attributes
			# Standard thing w/o 'show' tag
			# TODO FIGURE OUT HOW TO DEBUG THESE; THERE ARE WAY TOO MANY TO SHOW
			return super oPt if @Opts().tag2 isnt true or @in_defer
			# 'Show' tag
			inside= ''
			@_Div 'tag', oPt, inside, super oPt
		catch e
			throw e if @Epic.isSecurityError e
			@_Error 'if',( @_TagText oPt, true), e
			@_Err 'tag', 'if', attrs, e
	T_foreach: (attrs,children) ->
		try
			# Pre-check attributes
			at_table= attrs.table
			[lh, rh]= at_table.split '/' # Left/right halfs
			# If left exists, it's nested as table/sub-table else assume model/table
			if lh of @info_foreach
				throw new Error "Sub-table missing: (#{rh}) in foreach table='#{lh}/#{rh}' (dyn:#{@info_foreach[lh].dyn.join ','}" if rh not of @info_foreach[lh].row
				tbl= @info_foreach[lh].row[rh]
			else
				oMd= E[ lh]()
				tbl= oMd.getTable rh
			if @Opts().tag isnt true or @in_defer
				result= super attrs, children
				return result

			if tbl?.length
				inside= 'len:'+tbl.length
				cols=( nm for nm of tbl[0 ])
				inside+= "<span title=\"#{cols.join ', '}\">Cols:#{cols.length}<span>"
			else inside='empty'
			TODO() # NEED HTML TO BE VIRUTAL OBJECT, NOT ACTUAL <TAG> STUFF

			@_Div 'tag', attrs, inside, super attrs, children
		catch e
			@_Err 'tag', 'foreach', attrs, e
	xT_explain: (oPt) ->
		JSON.stringify @Epic.getViewTable oPt.attrs.table

	_TagText: (tag, attrs,asError) ->
		[letter,type,page]= @getLetTypPag()
		attrs_array= []
		for key,val of attrs
			attrs_array.push "#{key}=\"#{val}\""
		"<e-#{tag} #{attrs_array.join ' '}>"
	_Div:( type, attrs, inside, after) ->
		after?= ''
		"""<div class="dbg-#{type}-box">#{@_TagText attrs}#{inside}</div>#{after}"""
	_Err:( type, tag, attrs, e) ->
		_log2 '### _Err type/tag/attrs/e', type, tag, attrs, e: e, m: e.message, s: e.stack
		stack= if @Opts().stack then "<pre>\n#{e.stack}</pre>" else ''
		title= (e.stack.split '\n')[1]
		tag: 'div'
		attrs: {className:"dbg-#{type}-error-box"}
		children: [
			(@_TagText tag, attrs, true), (m 'br'), (m 'dir', {className:"dbg-#{type}-error-msg", title:title}, e.message), stack
		]

E.Model.View$Dev= View # Public API
