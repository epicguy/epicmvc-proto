'use strict'

# Epic.ModelJS is an abstract for models implented all in JS
class ModelJS
	constructor: (@Epic,@view_nm,ss) ->
		@_ModelJS= ss: ss || false
		@restoreState false
	getTable: (tbl_nm) ->
		@loadTableIf tbl_nm
		@Table[tbl_nm]
	loadTableIf: (tbl_nm) ->
		@loadTable tbl_nm if not (tbl_nm of @Table)
	restoreState: (copy_of_state) ->
		delete @[key] for key of @_ModelJS.ss if @_ModelJS.ss?
		$.extend true, @, @_ModelJS.ss if @_ModelJS.ss?
		$.extend true, @, copy_of_state if copy_of_state
		@Table= {}
	saveState: -> # A simple method, use: super Epic, view, a: 'default_a', b: 'default_b'
		ss= @_ModelJS.ss # Shortcut
		return false unless ss
		st= {}
		st[nm]= @[nm] for nm of ss when @[nm] isnt ss[nm]
		return false if $.isEmptyObject st
		$.extend true, {}, st # clone and return
	invalidateTables: (tbl_nms,not_tbl_names) -> # Use true for all
		f= ':ModelJs.invalidateTables'
		#@Epic.log2 f, tbl_nms, not_tbl_names
		not_tbl_names?= []
		tbl_nms= (nm for nm of @Table when not (nm in not_tbl_names)) if tbl_nms is true
		delete @Table[nm] for nm in tbl_nms
		@Epic.oView.invalidateTables @view_nm, tbl_nms

window.EpicMvc.ModelJS= ModelJS # Public API
