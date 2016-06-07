'use strict'

# Enhance with error checking/reporting for Devl mode
class TagExe extends window.EpicMvc.Model.TagExe$Base
	resetForNextRequest: (state) ->
		super state
		@bd_template= @viewExe.template
		@bd_page= @viewExe.page
		@errors_cache= get3: {}
	Opts: -> (@Epic.getViewTable 'Devl/Opts')[0]
	Tag_form_part: (oPt) ->
		try
			throw Error 'Missing form=""' if not oPt.attrs.form
			g= @Epic.getGroupNm()
			c= @Epic.getFistGroupCache().getCanonicalFist g, oPt.attrs.form
			v= @Epic.oAppConf.getFistView g, c
			throw Error "app.conf requires MODELS: ... forms=\"...,#{c}\"" if not v
			throw Error "Your model (#{v}) must have a method fistLoadData" if not ('fistLoadData' of @Epic.getInstance v)
		catch e
			_log2 '##### Error in form-part', oPt.attrs.part ? 'fist_default', e, e.stack
			return """<pre>&lt;epic:form_part form="#{oPt.attrs.form}" part="#{oPt.attrs.part ? 'fist_default'}&gt;<br>#{e}</pre>"""
		try
			return super oPt if @Opts().file is false
			return """<div class="dbg-part-box" title="#{oPt.attrs.part ? 'fist_default'}.part.html (#{oPt.attrs.form})">.</div>#{super oPt}"""
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in form-part', oPt.attrs.part ? 'fist_default', e, e.stack
			return """<pre>&lt;epic:form_part form="#{oPt.attrs.form}" part="#{oPt.attrs.part ? 'fist_default'}&gt;<br>#{e}<br>#{e.stack}</pre>"""

	Tag_page_part: (oPt) ->
		try
			return super oPt if @Opts().file is false
			return """<div class="dbg-part-box" title="#{oPt.attrs.part}.part.html">.</div>#{super oPt}"""
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in page-part', oPt.attrs.part, e, e.stack
			return """<pre>&lt;epic:page_part part="#{oPt.attrs.part}"&gt;<br>#{e}<br>#{e.stack}</pre>"""

	Tag_page: (oPt) ->
		try
			return super oPt if @Opts().file is false
			return """
<div class="dbg-part-box" title="#{@bd_template}.tmpl.html">T</div>
<div class="dbg-part-box" title="#{@bd_page}.page.html">P</div>
#{super oPt}
			"""
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in page', @bd_page, e, e.stack
			return """<pre>&lt;epic:page page:#{@bd_page}&gt;<br>#{e}<br>#{e.stack}</pre>"""

	varGet3: (view_nm, tbl_nm, col_nm, format_spec, custom_spec) ->
		try
			val= super view_nm, tbl_nm, col_nm, format_spec, custom_spec
		catch e
			throw e if @Epic.isSecurityError e
			_log2 '##### Error in varGet3', "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};", e, e.stack
			val= "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			#window.alert "Unknown column-name (#{col_nm}) for view-name/table-name (#{view_nm}/#{tbl_nm})."
			val= "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		val
	varGet2: (tbl_nm, col_nm, format_spec, custom_spec, sub_nm) ->
		try
			val= super tbl_nm, col_nm, format_spec, custom_spec, sub_nm
		catch e
			_log2 '##### varGet2', "&#{tbl_nm}/#{col_nm};", e, e.stack
			throw e if @Epic.isSecurityError e
			val= "&amp;#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			spec= if format_spec and format_spec.length> 0 then '#'+ format_spec else if custom_spec and custom_spec.length> 0 then '##'+ custom_spec else ''
			key= "Undefined: &#{tbl_nm}/#{col_nm}#{spec};"
			if not (key of @errors_cache.get3)
				window.alert "Undefined: &#{tbl_nm}/#{col_nm}#{spec};"
				@errors_cache.get3[key]= true
			val= "&amp;#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		val
	Tag_foreach: (oPt) ->
		# TODO VALIDATE TABLE= VALUE AS VALID TABLE REFERENCE, ELSE GIVE NICE MEANINGFUL ALERT MESSAGE
		try
			super oPt
		catch e
			throw e if @Epic.isSecurityError e
			'&lt;epic:foreach table="'+ oPt.attrs.table+ '"&gt; - '+ e.message + '<pre>\n'+ e.stack+ '</pre>'
	Tag_explain: (oPt) ->
		JSON.stringify @Epic.getViewTable oPt.attrs.table

window.EpicMvc.Model.TagExe$BaseDevl= TagExe # Public API
