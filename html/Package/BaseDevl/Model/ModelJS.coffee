'use strict'

# Enhance core EpicMVC.ModelJS with error checking/reporting for Devl mode
CoreModelJS= window.EpicMvc.ModelJS
class ModelJS extends CoreModelJS
	action: (act,parms) ->
		window.alert "Unknown action (#{act}) for model-name (#{@view_nm})."
		return
	loadTable: (tbl_nm) ->
		return if tbl_nm of @Table
		window.alert "Model #{@view_nm}.loadTable needs (#{tbl_nm})"
		@Table[tbl_nm]= [{}] # Set as an empty table
	fistLoadData: (oFist) ->
		window.alert "Model (#{@view_nm}).fistLoadData() needs (#{oFist.getFistNm()})"
		return
	fistGetFieldChoices: (oFist,field) ->
		window.alert "Model (#{@view_nm}).fistGetFieldChoices() needs (#{oFist.getFistNm()}:#{field})"
		return

window.EpicMvc.ModelJS= ModelJS # Public API (replace with ours)
