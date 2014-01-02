'use strict'
# TODO DON'T RENDER DEBUG IF RENDERING INSIDE EPIC:DEFER

class TagExe extends window.EpicMvc.Model.TagExe$Base
	resetForNextRequest: (state) ->
		super state
		@bd_template= @viewExe.template
		@bd_page= @viewExe.page
		@errors_cache= _COUNT: 0
		@in_defer= false
	Opts: -> (@Epic.getViewTable 'Devl/Opts')[0]
	_Error: (type,key,e) ->
			@errors_cache[type]?= {}
			if (not (key of @errors_cache[type]))
				@errors_cache[type][key]= e
				@errors_cache._COUNT++
				if @errors_cache._COUNT< 5
					msg= (("#{key}\n\n#{e.message}"
						.replace /&lt;/g, '<')
						.replace /&gt;/g, '>')
						.replace /&amp;/g, '&'
					prefix= if type is 'varGet2' or type is 'varGet3'
						'Variable reference'
					else 'Tag'
					window.alert "#{prefix} error (#{type}):\n\n#{msg}"
	Tag_defer: (oPt) ->
		@in_defer= true; out= super oPt; @in_defer= false; out
	Tag_debug: (oPt) ->
		save= @Opts
		@Opts= -> {} #TODO file: false, tag: false, tag2: false, form: false # Simulate no debug display
		out= @viewExe.doAllParts oPt.parts
		@Opts= save
		out
	getTable:( nm) ->
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
	Tag_form_part: (oPt) ->
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

	Tag_page_part: (oPt) ->
		try
			return super oPt if @Opts().file isnt true or @in_defer
			return """<div class="dbg-part-box" title="#{oPt.attrs.part}.part.html">.</div>#{super oPt}"""
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in page-part', oPt.attrs.part, e, e.stack
			return """<pre>&lt;epic:page_part part="#{oPt.attrs.part}"&gt;<br>#{e}<br>#{e.stack}</pre>"""

	Tag_page: (oPt) ->
		try
			# TODO THESE CHECKS MUST BE DONE IN VIEW-EXE'S LOGIC, BEFORE CALLING RUN > DO-ALL-PARTS
			throw new Error "Missing view page or template '" if @viewExe.current is false
			throw new Error "Possibly too many page tags" if not @viewExe.current is undefined
			return super oPt if @Opts().file isnt true
			return """
<div class="dbg-part-box" title="#{@bd_template}.tmpl.html">T</div>
<div class="dbg-part-box" title="#{@bd_page}.page.html">P</div>
#{super oPt}
			"""
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in page', @bd_page, e, e.stack
			@_Error 'page',( @_TagText oPt, true), e
			@_Err 'page', oPt, e
			#return """<pre>&lt;epic:page page:#{@bd_page}&gt;<br>#{e}<br>#{e.stack}</pre>"""

	varGet3: (view_nm, tbl_nm, col_nm, format_spec, custom_spec, give_error) ->
		try
			val= super view_nm, tbl_nm, col_nm, format_spec, custom_spec
			if val is undefined then throw new Error 'undefined'
		catch e
			throw e if @Epic.isSecurityError e or give_error
			t_format_spec= if format_spec or custom_spec then '#'+ format_spec else ''
			t_custom_spec= if custom_spec then '#'+ custom_spec else ''
			key= '&amp;'+ view_nm+ '/'+ tbl_nm+ '/'+ col_nm+ t_format_spec+ t_custom_spec+ ';'
			_log2 '##### Error in varGet3 key=', key, e
			@_Error 'varGet3', key, e
			throw e
		val
	varGet2: (tbl_nm, col_nm, format_spec, custom_spec, sub_nm, give_error) ->
		try
			val= super tbl_nm, col_nm, format_spec, custom_spec, sub_nm
		catch e
			throw e if @Epic.isSecurityError e or give_error
			_log2 '##### varGet2', "&#{tbl_nm}/#{col_nm};", e, e.stack
			val= "&amp;#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			@_Error 'varGet2',( @_TagText oPt, true), e
			val= "&amp;#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		val
	Tag_if: (oPt) ->
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
	Tag_foreach: (oPt) ->
		try
			# Pre-check attributes
			at_table= @viewExe.handleIt oPt.attrs.table
			[lh, rh]= at_table.split '/' # Left/right halfs
			# If left exists, it's nested as table/sub-table else assume model/table
			if lh of @info_foreach
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
	Tag_form_action: (oPt) ->
		# TODO ERROR WHEN action not in lookahead-click
		try
			# Pre-check attributes
			throw new Error "Missing 'action' attribute" if not ('action' of oPt.attrs)
			if not ('title' of oPt.attrs)
				action= @viewExe.handleIt oPt.attrs.action
				oPt.attrs.title= action # TODO CONSIDER CLONING oPt
			# Standard thing w/o 'show' tag
			return super oPt if @Opts().tag isnt true
			# 'Show' tag
			inside= ''
			@_Div 'tag', oPt, inside, super oPt
		catch e
			throw e if @Epic.isSecurityError e
			@_Error 'form_action',( @_TagText oPt, true), e
			@_Err 'tag', oPt, e
	Tag_link_action: (oPt) ->
		try
			# Pre-check attributes
			throw new Error "Missing 'action' attribute" if not ('action' of oPt.attrs)
			if not ('title' of oPt.attrs)
				action= @viewExe.handleIt oPt.attrs.action
				oPt.attrs.title= action # TODO CONSIDER CLONING oPt
			# Standard thing w/o 'show' tag
			return super oPt if @Opts().tag isnt true
			# 'Show' tag
			inside= ''
			@_Div 'tag', oPt, inside, super oPt
		catch e
			throw e if @Epic.isSecurityError e
			@_Error 'link_action',( @_TagText oPt, true), e
			@_Err 'tag', oPt, e
	Tag_explain: (oPt) ->
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
		stack= if @Opts().stack then "<pre>\n#{e.stack}</pre>" else ''
		title= (e.stack.split '\n')[1]
		"""
<div class="dbg-#{type}-error-box">
#{@_TagText oPt, true}<span title="#{title}">- #{e.message}</span>
</div>#{stack}
"""

window.EpicMvc.Model.TagExe$BaseDevl= TagExe # Public API
