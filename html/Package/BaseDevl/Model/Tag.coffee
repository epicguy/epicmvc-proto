'use strict'

# Enhance with error checking/reporting for Devl mode
class TagExe extends window.EpicMvc.Model.TagExe$Base
	resetForNextRequest: (state) ->
		super state
		@bd_template= @viewExe.template
		@bd_page= @viewExe.page
		#@Epic.log1 "T:#{@bd_template}, P:#{@bd_page}"
	Tag_page_part: (oPt) ->
		#_log2 'page_part', oPt
		#"<table><caption>PART:#{oPt.attrs.part}</caption><tr><td>#{super oPt}</td></tr></table>"
		"""<span class="dbg-part-box" title="#{oPt.attrs.part}.part.html">.</span>#{super oPt}"""
		#"""<span class="dbg-part-box" title="PART:#{oPt.attrs.part}">#{super oPt}</span>"""
		#_log2 oPt; 'Tag_page_part, '+( JSON.stringify oPt) + '<br />'
	Tag_page: (oPt) ->
		"""
<span class="dbg-part-box" title="#{@bd_template}.tmpl.html">T</span>
<span class="dbg-part-box" title="#{@bd_page}.page.html">P</span>
#{super oPt}
		"""
		#"<table><caption>#{'THE PAGE'}</caption><tr><td>#{super oPt}</td></tr></table>"
		#_log2 oPt; 'Tag_page: '+( JSON.stringify oPt) + '<br />'
	varGet3: (view_nm, tbl_nm, col_nm, format_spec) ->
		try
			val= super view_nm, tbl_nm, col_nm, format_spec
		catch e
			throw e if @Epic.isSecurityError e
			val= "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			#window.alert "Unknown column-name (#{col_nm}) for view-name/table-name (#{view_nm}/#{tbl_nm})."
			val= "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		val
	varGet2: (tbl_nm, col_nm, format_spec, sub_nm) ->
		try
			val= super tbl_nm, col_nm, format_spec, sub_nm
		catch e
			throw e if @Epic.isSecurityError e
			val= "&amp;#{view_nm}/#{tbl_nm}/#{col_nm};[#{e.message}] <pre>#{e.stack}</pre>" # Give back a visual of what is in the HTML
		if val is undefined
			#window.alert "Unknown column-name (#{col_nm}) for table-name (#{tbl_nm})."
			val= "&amp;#{tbl_nm}/#{col_nm};" # Give back a visual of what is in the HTML
		val
	Tag_foreach: (oPt) ->
		# TODO VALIDATE TABLE= VALUE AS VALID TABLE REFERENCE, ELSE GIVE NICE MEANINGFUL ALERT MESSAGE
		try
			super oPt
		catch e
			throw e if @Epic.isSecurityError e
			'&lt;epic:foreach table="'+ oPt.attrs.table+ '"&gt; - '+ e.message + '<pre>\n'+ e.stack+ '</pre>'

window.EpicMvc.Model.TagExe$BaseDevl= TagExe # Public API
