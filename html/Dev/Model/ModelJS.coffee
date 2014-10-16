'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# Enhance core EpicMvc.ModelJS with error checking/reporting for Devl mode
CoreModelJS= E.ModelJS
class ModelJS extends CoreModelJS
	action: (ctx,act,parms) ->
		throw new Error "Model (#{@view_nm}).action() didn't know action (#{act})"
	loadTable: (tbl_nm) ->
		return if tbl_nm of @Table
		throw new Error "Model (#{@view_nm}).loadTable() didn't know table-name (#{tbl_nm})"
	fistValidate: (ctx,fistNm,row) ->
		throw new Error "Model (#{@view_nm}).fistValidate() didn't know fist (#{fistNm})"
	fistGetValues: (fistNm,row) ->
		throw new Error "Model (#{@view_nm}).fistGetValues() didn't know fist (#{fistNm})"
	fistGetChoices: (fistNm,fieldNm,row) ->
		throw new Error "Model (#{@view_nm}).fistGetChoices() did't know fist:field (#{fistNm}:#{fieldNm})"

E.ModelJS= ModelJS # Public API (replace with ours)
