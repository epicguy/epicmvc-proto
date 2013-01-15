'use strict'

# Enhance with error checking/reporting for Devl mode
class TagExe extends window.EpicMvc.Model.TagExe$Base
	varGet3: (view_nm, tbl_nm, col_nm, format_spec) ->
		val= super view_nm, tbl_nm, col_nm, format_spec
		if val is undefined
			#window.alert "Unknown column-name (#{col_nm}) for view-name/table-name (#{view_nm}/#{tbl_nm})."
			val= "#{tbl_nm}/#{col_nm}" # Give back a visual of what is in the HTML
		val
	varGet2: (tbl_nm, col_nm, format_spec, sub_nm) ->
		val= super tbl_nm, col_nm, format_spec, sub_nm
		if val is undefined
			#window.alert "Unknown column-name (#{col_nm}) for table-name (#{tbl_nm})."
			val= "#{tbl_nm}/#{col_nm}" # Give back a visual of what is in the HTML
		val
	Tag_foreach: (oPt) ->
		try
			super oPt
		catch e
			'&lt;epic:foreach table="'+ oPt.attrs.table+ '"&gt; - '+ e.message

window.EpicMvc.Model.TagExe$BaseDevl= TagExe # Public API
