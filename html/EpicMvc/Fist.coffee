'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Fist
	constructor: (@Epic, @grp_nm, flist_nm, @view_nm) ->
		oG= @Epic.getFistGroupCache()
		flist_nm= oG.getCanonicalFist grp_nm, flist_nm
		@fist_nm= flist_nm # Cannonical field-list list for this flist
		@oM= @Epic.getInstance view_nm
		@form_state= 'empty' # form-states: empty, posted, loaded, restored
		@fistDef= oG.getFistDef grp_nm, @fist_nm
		@fieldDef= oG.getFieldDefsForFist grp_nm, @fist_nm
		@cache_field_choice= [] # choices by field-name
		@fb= new window.EpicMvc.FistBack @Epic, @loadFieldDefs() # Fist back-end functions
		# Upload fields
		@upload_todo= []
		@upload_fl= {}
	getGroupNm: -> @grp_nm
	getFistNm: -> @fist_nm
	loadFieldDefs: ->
		@fieldDef?= @Epic.getFistGroupCache().getFieldDefsForFist @grp_nm, @fist_nm # Lazy load
	getFieldsDefs: -> @loadFieldDefs() # For models that xlate db_nm in load_table
	loadFieldChoices: (fl) -> # for pulldown choices
		final_obj= options:[], values:[]
		if not @cache_field_choice[fl]?
			@loadFieldDefs() # Lazy load
			ct= @fieldDef[fl].type.split ':'
			switch ct[1] # Assume ct[0] is pulldown else why call 'choices'?
				when 'custom' then final_obj= @oM.fistGetFieldChoices @, fl
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
	getHtmlFieldValue: (fl_nm) -> @loadData(); @fb.fb_HTML[fl_nm]
	getDbFieldValue: (fl_nm) -> @loadData(); @fb.fb_DB[fl_nm]
	getDbFieldValues: -> @loadData(); @fb.fb_DB
	getChoices: (fl_nm) -> @loadFieldChoices fl_nm; @cache_field_choice[fl_nm]
	# Posted values are comming to us, need to set values, and validate
	fieldLevelValidate: (data) -> @form_state= 'posted'; @fb.FistValidate data
	loadData: (data) -> #TODO SHOULD THIS BE IN Epic.fist_back?
		# form-states: empty, posted, loaded, restored
		if @form_state is 'empty'
			@oM.fistLoadData @ # Delegate to our 'model'
			@form_state= 'loaded' # Consider it loaded, no matter what
	setDbValuesFromModel: (data) -> @fb.SetDbValues data; @form_state= 'loaded'; return
	eventNewRequest: -> @clearValues(); @upload_todo= []; @uploaded_fl= {}; return
	clearValues: ->
		if @form_state isnt 'empty' then @fb.ClearValues(); @form_state= 'empty'
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

window.EpicMvc.Fist= Fist # Pubilc API
