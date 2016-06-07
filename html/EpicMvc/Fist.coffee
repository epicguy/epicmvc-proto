'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Fist
	constructor: (@Epic, @grp_nm, flist_nm, @view_nm) ->
		oG= @Epic.getFistGroupCache()
		flist_nm= oG.getCanonicalFist grp_nm, flist_nm
		@fist_nm= flist_nm # Cannonical field-list list for this flist
		@oM= @Epic.getInstance @view_nm
		@form_state= 'empty' # form-states: empty, posted, loaded, restored
		@fistDef= oG.getFistDef grp_nm, @fist_nm
		#@fieldDef= oG.getFieldDefsForFist grp_nm, @fist_nm
		@cache_field_choice= [] # choices by field-name
		#FB @fb= new window.EpicMvc.FistBack @Epic, @loadFieldDefs() # Fist back-end functions
		@filt= window.EpicMvc.FistFilt # Static class of filters
		@Fb_ClearValues()
		# Upload fields
		@upload_todo= []
		@upload_fl= {}
		@eventLastPath= @Epic.getPageflowPath()
	getGroupNm: -> @grp_nm
	getFistNm: -> @fist_nm
	loadFieldDefs: ->
		@fieldDef?= @Epic.getFistGroupCache().getFieldDefsForFist @grp_nm, @fist_nm # Lazy load
	getFieldsDefs: -> @loadFieldDefs() # For models that xlate db_nm in load_table
	loadFieldChoices: (fl) -> # for pulldown choices
		final_obj= options:[], values:[]
		if true # Avoid cache for now, so model an refresh via REST or whatever: not @cache_field_choice[fl]?
			@loadFieldDefs() # Lazy load
			ct= @fieldDef[fl].type.split ':'
			switch ct[1] # Assume ct[0] is pulldown else why call 'choices'?
				when 'custom' then final_obj= @oM.fistGetFieldChoices @, fl
				when 'array'
					for rec in @fieldDef[fl].cdata
						if typeof rec is 'object'
						then final_obj.options.push String rec[1]; final_obj.values.push String rec[0]
						else final_obj.options.push String rec; final_obj.values.push String rec
				when 'json_like'
					json= @fieldDef[fl].cdata.replace( /'/g, '"').replace /"""/g, "'"
					json= $.parseJSON json
					for k, v of json
						final_obj.options.push k; final_obj.values.push v
				when 'use_word_list'
					split= @fieldDef[fl].cdata.split ':'
					if split.length is 2 then [wist_grp, wist_nm]= split
					else if split[0]? then wist_grp= @grp_nm; wist_nm= split[0]
					else wist_grp= @grp_nm; wist_nm= fl
					wist= @Epic.getViewTable 'Wist/'+ wist_nm
					for k, v of wist
						final_obj.options.push v.text; final_obj.valules.push v.word
			@cache_field_choice[fl]= final_obj
		return
	getHtmlPostedFieldsList: (flist_nm) -> # flist_nm optional for sub-lists
		fistDef= @fistDef
		if flist_nm? and flist_nm isnt @fist_nm
			fistDef= @Epic.getFistGroupCache().getFistDef @grp_nm, flist_nm
		fistDef # List of fields that make up fist TODO WEED OUT NON-HTML FIELDS PER PSUEDO
	getFieldAttributes: (fl_nm) -> @loadFieldDefs(); @fieldDef[fl_nm]
	getHtmlFieldValue: (fl_nm) -> @loadData(); @fb_HTML[fl_nm]
	getDbFieldValue: (fl_nm) -> @loadData(); @fb_DB[fl_nm]
	getDbFieldValues: -> @loadData(); @fb_DB
	getFieldIssues: -> @fb_issues
	getChoices: (fl_nm) -> @loadFieldChoices fl_nm; @cache_field_choice[fl_nm]
	# Posted values are comming to us, need to set values, and validate
	fieldLevelValidate: (data,flist_nm) -> @form_state= 'posted'; @Fb_FistValidate data, flist_nm ? @fist_nm
	loadData: (data) -> #TODO SHOULD THIS BE IN Epic.fist_back?
		# form-states: empty, posted, loaded, restored
		if @form_state is 'empty'
			@oM.fistLoadData @ # Delegate to our 'model'
			@form_state= 'loaded' # Consider it loaded, no matter what
	setFromDbValues: (data) -> @Fb_SetHtmlValuesFromDb data; @form_state= 'loaded'; return
	eventNewRequest: ->
		path= @Epic.getPageflowPath()
		if @eventLastPath isnt path
 			@clearValues(); @upload_todo= []; @uploaded_fl= {}
			@eventLastPath= path
 		return
	clearValues: ->
		if @form_state isnt 'empty' then @Fb_ClearValues(); @form_state= 'empty'
		return
	getUploadedMsg: (fl, val) -> @oM.fistGetUploadedMsg @, fl, val
	haveUpload: (fl, from_id, to_id, btn_id, msg_id, now) ->
		details= fl:fl, from_id:from_id, to_id:to_id, btn_id: btn_id, msg_id:msg_id
		if now isnt true then @upload_todo.push details; return
		# details.uploader= new qq.FileUploaderBasic(
		uploader= new qq.FileUploaderBasic $.extend
			element:document.getElementById from_id
			button: document.getElementById btn_id
			debug: true
			multiple: false
			allowedExtensions: [ 'jpg', 'jpeg' ] # Restrict to jpeg to scale in PHP logic
			onComplete: (id,fileName,responseJSON) => @uploadComplete fl,id,fileName,responseJSON
			@oM.fistGetUploadOptions @, fl, from_id, to_id
		@upload_fl[fl]= details
		return
	uploadComplete: (fl, the_id, fileName, responseJSON) ->
		form_value= @oM.fistHandleUploadResponse @, fl, responseJSON
		if form_value is false # Error from server
			$( '#'+ @upload_fl[fl].msg_id).text ' File failed to load, try again?'
		else
			$( '#'+ @upload_fl[fl].msg_id)
				.text ' '+ @oM.fistGetUploadedMsg( @, fl, form_value)+ '  uploaded.'
			$( '#'+ @upload_fl[fl].to_id).val form_value
		return
	eventInitializePage: ->
		@haveUpload v.fl,v.from_id,v.to_id,v.btn_id,v.msg_id,true for v in @upload_todo
		return

	# Backend data processing functions (default behaviour)

	# Support USER's objects doing validations from 'action' methods
	# USERs should consider using 'field_level_validate' from main Epic.Fist class
	# Example fieldDef:
	#   ValidateFunc: load_nm="GroupField" db_nm:"validate" description:""
	#   type:"pulldown:use_word_list" cdata:""
	#   label:"Validate Func" width:"1" max_len:"" req:"1" default_value:""
	#   req_text:"" issue_text:"" help_text:"Use any if you ..."
	#   h2h:"trim_spaces"
	#   validate:"choice" validate_expr: 1
	#   h2d:"zero_is_blank" h2d_expr:"" d2h:"blank_is_zero" d2h_expr:""

	Fb_SetHtmlValuesFromDb: (data) -> # Not from Html post, calls Db2Html
		#@Epic.log2 'SetDbValues data:', data
		dbnms= @Fb_DbNames() # Load up the local list
		##@Epic.log2 'SetDbValues DbNames:', @Fb_DbNames()
		#@fb_DB[k]= v for k,v of data # Clone
		@fb_DB[k]= data[k] for k in dbnms when k of data # Clone
		@Fb_Db2Html()
		#@Epic.log2 'SetDbValues fb_HTML:', @fb_HTML
	Fb_ClearValues: () ->
		#@Epic.log2 'FistBack.ClearValues'
		@fb_DB= {} # Hash
		@fb_HTML= {} # Hash
		@fb_issues= {} # Hash by HTML nm, if any
	Fb_FistValidate: (data,flist_nm) -> # Data is from an html post (not a hash of db names)
		# Logic to validate a posted form of data:
		#  (a) perform Html to Html filters on raw posted data (will change user's view)
		#  (b) Validate the HTML side values, using filters
		#  (c) return any issue found (or, continue next steps)
		#  (d) Move Html data to DB, using filters (possible psuedo prefix)

		@Fb_Html2Html data, flist_nm
		issues = new window.EpicMvc.Issue @Epic
		issues.call @Fb_Check flist_nm
		if issues.count() is 0
			#@Fb_Db2Html(); #TODO IS THIS GOOD/NEEDED TO PUT BACK FROM DB?
			@Fb_Html2Db flist_nm
		issues

	# Below are all 'internanl' functions

	Fb_DbNames: (flist_nm) -> # list of fields at DB level (no psuedo fields)
		if flist_nm? and flist_nm isnt @fist_nm # A sub-fist request
			return (@fieldDef[nm].db_nm for nm in @getHtmlPostedFieldsList flist_nm)
		if not @fb_DB_names?
			@loadFieldDefs() # Lazy load
			@dbNm2HtmlNm= {}
			@dbNm2HtmlNm[rec.db_nm]= nm for nm,rec of @fieldDef
			@fb_DB_names?=( db_nm for db_nm of @dbNm2HtmlNm)
		@fb_DB_names

	Fb_Make: (main_issue, field, token_data) ->
		f= 'Fist.Fb_Make:'+ field
		return false if token_data is true
		@issue_inline?= @Epic.appConf().getShowIssues() is 'inline'
		@Epic.log2 f, field, token_data, inline: @issue_inline
		if @issue_inline
			@fb_issues[field]= window.EpicMvc.Issue.Make @Epic, @view_nm, token_data[0], token_data[1]
			main_issue.add 'FORM_ERRORS', [@fistName] if main_issue.count() is 0
		else
			main_issue.add token_data[0], token_data[1]
		return true

	Fb_Html2Html: (p,flist_nm) ->
		f= 'Fist.Fb_Html2Html'
		@loadFieldDefs() # Lazy load
		for nm in @getHtmlPostedFieldsList flist_nm
			value= p[ nm]
			value= @filt.H2H_prefilter nm, @fieldDef[ nm].h2h, value if 'H2H_prefilter' of @filt # Custom, optional
			@fb_HTML[ nm]= @filt.H2H_generic nm, @fieldDef[ nm].h2h, value
		return

	Fb_Check: (flist_nm) ->
		f= 'Fist.Fb_Check:'+flist_nm
		#@Epic.log2 f, @Fb_DbNames flist_nm
		issue = new window.EpicMvc.Issue @Epic
		for db_nm in @Fb_DbNames flist_nm
			nm= @dbNm2HtmlNm[ db_nm]
			field = @fieldDef[ nm]
			# If psuedo, validate sub fields first, then main field's value if no errors
			if field.type isnt 'psuedo'
				@Fb_Make issue, nm, @Fb_Validate nm, @fb_HTML[ nm]
			else
				issue_count= 0
				for p_nm in field.cdata
					issue_cnt+= 1 if @Fb_Make issue, nm, @Fb_Validate p_nm, @fb_HTML[ nm+ '-'+ p_nm]
				if issue_cnt is 0
					BROKEN('_DB[] not populated yet; send array like h2d gets?'); issue.call @Fb_Validate nm, @fb_DB[ db_nm]
		issue
	Fb_Validate: (fieldName, value) ->
		f= 'Fist.Fb_Validate:'+ fieldName
		#@Epic.log2 f, value
		@loadFieldDefs() # Lazy load
		field= @fieldDef[ fieldName]
		if (not value?) or value.length is 0
			#@Epic.log2 f, 'req', field.req
			if field.req is true # Value is empty, but required
				return if field.req_text #Value empty, not 'ok'
				then ['FIELD_EMPTY_TEXT', [fieldName, field.label, field.req_text]] #Value empty, not 'ok'
				else ['FIELD_EMPTY', [fieldName, field.label]] #Value empty, not 'ok'
			return true # Value is empty, and this is 'ok'

		if field.max_len> 0 and value.length> field.max_len
			#@Epic.log2 f, 'max_len,v.len', field.max_len, value.length
			return ['FIELD_OVER_MAX', [fieldName, field.label, field.max_len]]

		#@Epic.log2 f, 'validate,expr', field.validate, field.validate_expr
		if not @filt['CHECK_' + field.validate] fieldName, field.validate_expr, value, @
			#return ['FIELD_ISSUE', [fieldName, field.issue_text ]]
			return if field.issue_text
			then ['FIELD_ISSUE_TEXT', [fieldName, field.label, field.issue_text]]
			else ['FIELD_ISSUE', [fieldName, field.label]]
		return true # Value passes filter check

	Fb_Html2Db: (flist_nm) ->
		f= 'Fist.Fb_Html2Db'
		@loadFieldDefs() # Lazy load
		for nm in @getHtmlPostedFieldsList flist_nm
			field= @fieldDef[nm]
			psuedo_prefix = ""
			# Psuedo fields need data pulled from other fields
			if field.type isnt 'psuedo' then value= @fb_HTML[ nm]
			else
				psuedo_prefix= '_psuedo'
				# Multiple fields in one, make a list; filter will combine them
				value=( @fb_HTML[nm + '-' + p_nm] for p_nm in field.cdata)
			#@Epic.log2 f, 'H2D_', nm, field.db_nm, value
			@fb_DB[ field.db_nm]= @filt['H2D_' + field.h2d + psuedo_prefix] nm, field.h2d_expr, value
		#@Epic.log2 f, 'fb_DB', @fb_DB
		return

	Fb_Db2Html: () ->
		for db_nm in @Fb_DbNames()
			nm= @dbNm2HtmlNm[db_nm]
			field= @fieldDef[ nm]
			psuedo_fl= if field?.type is 'psuedo' then true else false
			# Not all fields are populated, TagExe display the default value in that case
			if not (db_nm of @fb_DB)
				if not psuedo_fl then delete @fb_HTML[ nm]
				else delete @fb_HTML[ subfield] for subfield in field.cdata
				continue
			# Pull from DB, then put in various places in Html (if psuedo)
			value = @fb_DB[ db_nm]
			psuedo_prefix = ""
			# Psuedo fields need data pulled other fields
			if not psuedo_fl then @fb_HTML[ nm]= @filt['D2H_'+ field.d2h] db_nm+'%'+nm, field.d2h_expr, value
			else
				# filter will know what to do, and then move a 'list' to the right place
				switch field.cdata.length
					when 0 then throw 'Requires cdata with psuedo: '+ db_nm+'%'+nm
					when 1 then BROKEN()
					else
						# Multiple fields in one, make a list; filter will combine them
						list= @filt['D2H_' + field.d2h + '_psuedo'] db_nm+'%'+nm, field.d2h_expr, value
						@fb_HTML[ nm+ '-'+ p_nm]= list[ i] for p_nm, i in field.cdata

window.EpicMvc.Fist= Fist # Pubilc API
