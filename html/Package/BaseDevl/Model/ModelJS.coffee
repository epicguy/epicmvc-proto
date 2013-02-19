'use strict'

# Enhance core EpicMVC.ModelJS with error checking/reporting for Devl mode
CoreModelJS= window.EpicMvc.ModelJS
class ModelJS extends CoreModelJS
	action: (act,parms) ->
		window.alert "Unknown action (#{act}) for model-name (#{@view_nm})."
		return
	loadTable: (tbl_nm) ->
		return if tbl_nm of @Table
		window.alert "Unknown table-name (#{tbl_nm}) for model-name (#{@view_nm})."
		@Table[tbl_nm]= [{}] # Set as an empty table
	fistLoadData: (oFist) ->
		window.alert "Unknown fist (#{oFist.getFistNm()}) for model-name (#{@view_nm})."
		return

window.EpicMvc.ModelJS= ModelJS # Public API (replace with ours)
