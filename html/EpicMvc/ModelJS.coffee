'use strict'

# Epic.ModelJS is an abstract for models implented all in JS
class ModelJS
	constructor: (@Epic,@view_nm) ->
		@restoreState false
	getTable: (tbl_nm) ->
		@loadTableIf tbl_nm
		@Table[tbl_nm]
	loadTableIf: (tbl_nm) ->
		@loadTable tbl_nm if not (tbl_nm of @Table)
	restoreState: (copy_of_state) ->
		@Epic.log2 ':restoreState+'+@view_nm, copy_of_state
		$.extend true, @, @ss if @ss?
		$.extend true, @, copy_of_state if copy_of_state
		@Table= {}
	saveState: -> # A simple method, use: @state_nms= [ 'a', 'b']
		return false unless @ss?
		st= {}
		st[nm]= @[nm] for nm of @ss when @[nm] isnt @ss[nm]
		$.extend true, {}, st # clone

window.EpicMvc.ModelJS= ModelJS # Public API
