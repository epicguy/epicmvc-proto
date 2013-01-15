'use strict'

# Epic.ModelJS is an abstract for models implented all in JS
class ModelJS
	constructor: (@Epic,@view_nm) -> @Table= {}
	getTable: (tbl_nm) ->
		@loadTableIf tbl_nm
		@Table[tbl_nm]
	loadTableIf: (tbl_nm) ->
		@loadTable tbl_nm if not (tbl_nm of @Table)

window.EpicMvc.ModelJS= ModelJS # Public API
