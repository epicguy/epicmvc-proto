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
				#TODO CHROME BUG NOT SHOWING POPUP window.alert "#{prefix} error (#{type}):\n\n#{msg}"
	invalidateTables: (view_nm, tbl_list) ->
		E.Devl().tableChange view_nm, tbl_list
		super view_nm, tbl_list
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
			return @_Err 'tag', oPt, e
		try
			inside= ''
			return @_Div 'tag', oPt, inside, super oPt if @Opts().form is true
			return """<div class="dbg-part-box" title="#{oPt.attrs.part ? 'fist_default'}.part.html (#{oPt.attrs.form})">.</div>#{super oPt}""" if @Opts().file is true
			super oPt
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in form-part', oPt.attrs.part ? 'fist_default', e, e.stack
			@_Error 'form_part',( @_TagText oPt, true), e
			@_Err 'tag', oPt, e

	T_part: (attrs) ->
		try
			return super attrs if @Opts().file isnt true or @in_defer
			return [
				m( 'div.dbg-part-box', {title: "Part/#{attrs.part}.html"}, '.')
				#{tag:'div', attrs:{className:"dbg-part-box", title:"Part/#{attrs.part}.html"}, children:'.'}
				super attrs
			]
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in page-part', oPt.attrs.part, e, e.stack
			return """<pre>&lt;epic:page_part part="Part/#{attrs.part}"&gt;<br>#{e}<br>#{e.stack}</pre>"""

	T_page: (attrs) ->
		try
			return super attrs if @Opts().file isnt true
			nest= @frames.length- @frame_inx
			letter= switch nest
				when 0 then 'P'; when 1 then 'L'; else 'F'
			type= {P:'Page',L:'Layout',F:'Frame'}[ letter]
			page= switch nest
				when 0 then @page_name; else @frames[ @frame_inx]
			return [
				{tag:'div', attrs: {className:"dbg-part-box", title:"#{type}/#{page}.html"}, children: letter}
				super attrs # TODO BREAKS IN EpicMvc-One SINCE @kids EXPECTS A PROMISE AS RETURN VALUE
			]
		catch e
			_log2 '##### Error in ', type, page, e, e.stack
			@_Error 'page',( @_TagText {attrs}, true), e
			@_Err 'page', {attrs}, e
			#return """<pre>&lt;epic:page page:#{@bd_page}&gt;<br>#{e}<br>#{e.stack}</pre>"""

	xv3: (view_nm, tbl_nm, col_nm, format_spec, custom_spec, give_error) ->
		try
			val= super view_nm, tbl_nm, col_nm, format_spec, custom_spec
			t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
			t_custom_spec= if custom_spec then '#'+ custom_spec else ''
			if val is undefined then throw new Error "Column/spec does not exist (#{view_nm}/#{tbl_nm}/#{col_nm}#{t_format_spec}#{t_custom_spec})."
		catch e
			throw e if @Epic.isSecurityError e or give_error
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
			@_Err 'tag', oPt, e
	xT_foreach: (oPt) ->
		try
			# Pre-check attributes
			at_table= @viewExe.handleIt oPt.attrs.table
			[lh, rh]= at_table.split '/' # Left/right halfs
			# If left exists, it's nested as table/sub-table else assume model/table
			if lh of @info_foreach
				throw new Error "Sub-table missing: (#{rh}) in foreach table='#{lh}/#{rh}' (dyn:#{@info_foreach[lh].dyn.join ','}" if rh not of @info_foreach[lh].row
				tbl= @info_foreach[lh].row[rh]
			else
				oMd= @Epic.getInstance lh
				tbl= oMd.getTable rh
			#return '' if tbl.length is 0 # No rows means no output
			#rh_alias= rh # User may alias the tbl name, for e.g. reusable include-parts
			#rh_alias= @viewExe.handleIt oPt.attrs.alias if 'alias' of oPt.attrs

			return super oPt if @Opts().tag isnt true or @in_defer

			if tbl?.length
				inside= 'len:'+tbl.length
				cols=( nm for nm of tbl[0 ])
				inside+= "<span title=\"#{cols.join ', '}\">Cols:#{cols.length}<span>"
			else inside='empty'

			@_Div 'tag', oPt, inside, super oPt
		catch e
			throw e if @Epic.isSecurityError e
			@_Err 'tag', oPt, e
	xT_explain: (oPt) ->
		JSON.stringify @Epic.getViewTable oPt.attrs.table

	_TagText: (oPt,asError) ->
		tag= @viewExe.current[ oPt.parts+ 1]
		attrs= []
		for key,val of oPt.attrs
			if typeof val is 'object'
				list= val; val= ''
				for item in list
					text= false
					ans= ''
					if item[0] is 'varGet3'
						[view_nm, tbl_nm, col_nm, format_spec, custom_spec]= item[1]
						t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
						t_custom_spec= if custom_spec then '#'+ custom_spec else ''
						text= '&'+ view_nm+ '/'+ tbl_nm+ '/'+ col_nm+ t_format_spec+ t_custom_spec+ ';'
						if not asError then ans=
							try
								@varGet3 view_nm, tbl_nm, col_nm, format_spec, custom_spec, true
							catch e
								e.message
					if item[0] is 'varGet2'
						[tbl_nm, col_nm, format_spec, custom_spec, sub_nm]= item[1]
						t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
						t_custom_spec= if custom_spec then '#'+ custom_spec else ''
						text= '&'+ tbl_nm+ '/'+ col_nm+ t_format_spec+ t_custom_spec+ ';'
						if not asError then ans=
							try
								@varGet2 tbl_nm, col_nm, format_spec, custom_spec, sub_nm, true
							catch e
								e.message
					val+= if text is false then item else """<span title="#{ans}">#{text}</span>"""
			attrs.push "#{key}=\"#{val}\""
		klass= " class=\"#{klass}\"" if klass
		"""
&lt;epic:#{tag} #{attrs.join ' '}&gt;
"""
	_Div:( type, oPt, inside, after) ->
		after?= ''
		"""<div class="dbg-#{type}-box">#{@_TagText oPt}#{inside}</div>#{after}"""
	_Err:( type, oPt, e) ->
		_log2 '### _Err type/oPt/e', type, oPt, e: e, m: e.message, s: e.stack
		stack= if @Opts().stack then "<pre>\n#{e.stack}</pre>" else ''
		title= (e.stack.split '\n')[1]
		"""
<div class="dbg-#{type}-error-box">
#{@_TagText oPt, true}<br><span class="dbg-#{type}-error-msg" title="#{title}">#{e.message}</span>
</div>#{stack}
"""

E.Model.View$BaseDevl= View # Public API
