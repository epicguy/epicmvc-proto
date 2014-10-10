'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
#
# TODO CHANGES AFFECTING OTHERS USE OF THE API
# A) TRY TO DEFINE A SMALL NAMESPACE, LIKE 'E' AND PUT ALMOST EVERYTHING UNDER THAT VS. EpicMvc
# B) LINK_ACTION/FORM_ACTION IS GONE
# C) VARGET3 NO LONGER TAKES A DOT IN # MAPING (I.E. &A/b#.checked; - REMOVE THE DOT)
# D) Pageflow IS NOW App
# E) Model classes go into E.Model
#
# TODO Define the new namespace I/F to the world: (under window.E)
# E( "model's-view-name") - equivilent to getInstance( "model's-view--name")
# E( "model", "action", {data} [, 'fist-name']) - replaces app.coffee's call: "model/action" ...
# E.merge (replacement for jQuery.extend, to avoid jquery dependancy)
#
#
# TODO LOGGING
#  - Would like to have all logging removed when minimizing stuff
#    - Might use _log and \tf= as a pattern to remove from source
#  - Would like to mark types of lines with possible detail level, which caller can then use to filter at will
#    - Like fm='issues' ff='make' _log fm, 2, ff, 'whatever', 'and', {stuff} (Module fm, level=2, function-name, messages)
#  - NOW USES GLOBAL _logX FUNCTIONS, USER MUST DEFINE IN E.G. index_dev.html (SHOULD BE REMOVE IN MIN VERSION)
#
# TODO FIST
#  - Need to use mithril component features to push FIST data back to FIST object
#    - I Removed 'Request' object, so no longer loading from a <form> tag
#  - Would like to put a 'validate' choice in CLICKS: for app.coffee, so Models don't have to
#
# TODO APP.COFFEE
# A) ROUTES
# B) USE FUNCTIONS NOW VS. call:
#
# TODO LOAD STRATEGY (IN BaseDevl)
# A) ALLOW INLINE SCRIPT TAG TO DEFINE A TEMPLATE, FOR EASIER SMALL DEMO EXAMPLES
# B) POSSIBLE MANIFEST FILE PULLED IN index_dev THAT LISTS USER'S MODELs,EXTRAs,ETC. THAT CAN LOAD/RELOAD AND FOR DEPLOY
#
# TODO DEPLOY
# A) Write a new version, which packages our stuff as a bower package
#  - Would like full single file modules and min versions w/o logging, One each of: EpicCore, Base, BaseDevl
#  - index.html would have to add each of these; they can be in bower_components, or right out of github?
# B) USING MANIFEST FILE TO BUILD USER'S DEPLOY PACKAGE; ALSO REMOVES LOGS, ETC.
#
# TODO JQUERY
# A) REMOVE DEPENCANCY ON EXTEND (MAKE AVAILABLE IN NAMESPACE FOR OTHERS?
# B) AJAX: USE MITHRIL m.request ?
# C) EVENTS: LOOK AT MITHRIL'S CODE TO SIMULATE SAME, OR EXPONSE HIS FOR USE IN OURS?
# D) FUTURES (NOT YET USING ANY, BUT NEED TO WITH ASYNC ACTIONS/GETTABLE) Use m.defer
#
# TODO PARSE
# A) HAVE P: ALLOWED AGAIN, AND MAP TO DATA-P-; ENSURE DATA-ACTION HANDLER READS IT FOR 'DATA'
#
# TODO EVENTS
# A) ADD THE LOGIC FOR DATA-ACTION TO OUR NAMESPACE THAT PEOPLE CAN USE AS LKE DEFAULT FUNCTION, AND MAYBE ADD A HOOK (INACTIVITY TIMER)
# B) HAVE TI HANDLE READING ATTRIBUTE FROM ELEMENT (LIKE VAL()) SO CALLER DOES NOT KNOW ABOUT THE DOM
# C) CONSIDER HOW TO INTERACT WITH MITHRIL WHEN USES DOES COMPONENT WITH E.G. ONCHANGE, ONCLICK, ETC.
# D) DO THIS WITHOUT JQUERY
#
# TODO HISTORY (IN RENDER STRATEGY)
# A) CONSIDER IF APP.COFFEE HAS A ROLE HERE
# B) DECIDE IF MODALS SHOULD GO INTO HISTORY, AND IF NOT, WHAT WILL BACK BUTTON DO JUST THEN (WHILE IN IT)
# C) DECIDE IF SAME STEP SHOULD AVOID PUSHING A NEW STATE (VS REPLACE-STATE IF NEEDED)
#
# TODO RENDER LOOP
# Review - has a lot of functions that all go together, from click to finish
#
# TODO MITHRIL
# A) Do sample component
# B) Integrate fists
# C) Use it's functions to avoid JQUERY dependancies
# D) Look into how to allow defereds in Model action results
#
# TODO MODEL I/F
# A) CONSDIDER HOW WE CAN MAKE IT ASYNC - LIKE ALLOW FOR DEFEREDS
# B) CONSDIER HOW TABLE REQUESTS MIGHT BE ASYNC ALSO (MAYBE PARTIAL RENDER, THEN ABORT OR CONSDIER EMPTY UNTIL REQUEST COMPELTE)


app= (window, undef) ->
	inClick= false
	counter= 0
	Model= {} # Namespace for others to populate with class implementations of Models
	Extra= {} # Namespace for others to populate with class implementations that are not Models
	oModel= {} # Instances of model classes
	oFist= {} # Instances of model classes
	appconfs= [] # Will be an array of the apps user sets in 'run'
	option= load_dirs: []
		# load: loadstratgy-class-name placed into E.Extra
		# render: render-class-name placed into E.Extra
		# option.c1: Function to call if inClick when click called
		# option.m1 view, model if not E.Model[cls]?
		# App.coffee reader
		# config.a1 view_name [if view_name not of aModels]
		# option.a2 view_name, attribute if attribute not of aModels[ view_name]
		# ClickAction:
		# option.ca1 action_token, original_path, click_node
		# FistGroupCache:
		# option.fg1 grp_nm [if not oLoader.fist grp_nm]
		# option.fg2 grp_nm, flist_nm [if not fgroup.FISTS[ flist_nm]]
		# option.fg3 grp_nm, flist_nm, nm [if nm not of fgroup.FIELDS]
		# Fist (fist back functions Fb_*)
		# option.fb1 field [field.cdata.length is 0, for psuedo field spec, expect list of fields]
		# FistFilt
		# option.ff1 fieldName, spec, one_spec [no such H2H 'one_spec']
	#TODO option[ nm]= (-> _log2 'ERROR: ', arguments) for nm in [ 'c1', 'm1', 'a1', 'a2', 'ca1', 'fg1', 'fg2', 'fg3', 'fb1', 'ff1']

	E= {} #() -> # TODO FIGURE OUT IF ANYTHING INTERESTING GOES HERE
	E.nextCounter= -> ++counter

	# O, O (Clone attrs that are not Undefined)
	# A, A (Clone position by postion) # TODO DOES THIS MAKES SENSE, TO REPLACE POSTION FOR POSTION IN THE ARRAY?
	# U, !U (dupu), o/a: merge o/a, source
	# S, !o/a/U =(dups)
	type_oau= (obj) -> {}.toString.call(obj)[8] # Use for O, A, or U (N is Null or Number, fyi)
	merge= (dest,sources...) ->
		# Dest rule: either object or array; sources must be the same
		# Dest's items are either non o/a, so source's must also be, and will copy, else o or a: use extend
		# If Dest is array, walk source to copy to dest
		otype= 'O'
		atype= 'A'
		utype= 'U'
		stype= 'S'
		depth= 0
		func= {}
		func[ otype]= (dest,source)-> # Dest is an object, source must also be
			f= 'func:O'
			#_log2 f+ depth, {dest,source}
			return undef if (type_oau source) isnt otype
			for snm of source
				ans= dup dest[ snm], source[ snm]
				dest[ snm]= ans if ans isnt undef
			undef
		func[ atype]= (dest,source)-> # Update 'dest' as an array
			f= 'func:A'
			#_log2 f+ depth, {dest,source}
			reutrn undef if (type_oau source) isnt atype # only copy if same type
			for s,inx in source
				ans= dup dest[ inx], s
				dest[ inx]= ans if ans isnt undef
			undef
		func[ utype]= (was,want)-> # Return new value, caller will assign
			f= 'func:U'
			#_log2 f+ depth, 'before', {dest,source}
			switch type_oau want
				when otype then become= {}; func[ otype] become, want
				when atype then become= []; func[ atype] become, want
				else become= want # if not undefined, will assign
			#_log2 f+ depth, 'after', {become}
			become
		func[ stype]= (was,want) -> # Copy if source isnt o/a/U
			return want if (type_oau want) of func
			return was # May be undef, which works
		dup= (dest, source) ->
			depth++
			type= type_oau dest
			type= stype if type not of func
			r= func[ type]( dest, source)
			depth--
			r
		for source in sources
			f= ':merge:source-loop'
			#_log2 f+ depth, 'before', {dest, source}
			dup dest, source
			#_log2 f+ depth, 'after', {dest, source}
		return dest

	# Caller indicates a login event, let interested models know
	E.login= ->
		f= ':login'
		_log2 f, oModel
		o.eventLogin?() for k,o of oModel

	# Caller indicates a logout event, let interested models know
	E.logout= (click_event, click_data)->
		if inClick isnt false
			setTimeout (=> E.logout click_event, click_data), 100
			return
		if click_event
			(click click_event, click_data).then -> finish_logout()
		else finish_logout()
	finish_logout= ->
		for k,o of oModel when o.eventLogout?() # True to reset model and state
			delete modelState[ k]
			delete oModel[ k]
		oFist= {}

	# Give caller an instance of a 'fist'
	E.fist= (flist_nm,grp_nm) -> # grp_nm optional
		if not grp_nm
			[f,t]= E.App().getStepPath()
			grp_nm= E.oA.getGroupNm f t
		fist_nm= E.fistGrp().fist grp_nm, flist_nm
		inst_nm= "#{grp_nm}_#{fist_nm}"
		if not (inst_nm of oFist)
			view_nm= E.oA.fist grp_nm, fist_nm
			oFist[ inst_nm]= new E.Fist grp_nm, fist_nm, view_nm, flist_nm
		oFist[ inst_nm]

	# Accept caller's request to start up an EpicMvc application
	E.run= (set_appconfs, more_options, init_func) ->
		appconfs= set_appconfs
		appInit()
		merge option, more_options
		E.oLoader= new Extra[ option.loader] appconfs
		promise= E.oLoader.D_loadAsync()
		promise.then ->
			init_func() if typeof init_func is 'function'
			E.App().go aSetting.go
			E.oRender= new Extra[ option.render] # Sets mithril's redraw to self
		return

	# Caller has requested processing a click event w/data
	click= (action_token,data) ->
		f= ':click:'+action_token
		_log2 f, data
		option.c1?() if inClick isnt false
		inClick= action_token
		m.startComputation()
		(clickAction action_token, data, E.App().getStepPath()).then (click_result) ->
			E.App().setIssues click_result[0]
			E.App().setMessages click_result[1]
			inClick= false
			modelState= {}
			modelState[k]= ss for k,o of oModel when o.saveState? and ss= o.saveState()
			m.endComputation() # Causes a render
		#TODO HANDLE ERROR CASES


	# TODO FIGURE OUT IF RENDER USES THIS FOR THE BACK/FWD BUTTONS OF BROWSER HISTORY
	setModelState= (s) ->
		modelState= s if s?
		#_log2 ':setModelState', s, modelState
		for inst_nm of oModel
			oModel[ inst_nm].restoreState? modelState[ inst_nm]

	# The old 'AppConf' class; use app*() functions now
	aSetting= frames: {}, modals: {}, layout: 'default', go: 'default//'
	aMacros= {}
	aClicks= {}
	aFlows= default: start: 'default', TRACKS: default: start: 'default', STEPS: default: {}
	aModels= {}
	aFists= false # Loaded on demand
	appLoadFormsIf= (config) ->
		if aFists is false # First time, build index
			aFists= {}
			for view_nm, node of aModels when node.fists
				group= node.group ? aSetting.group
				aFists[ group]?= {}
				aFists[ group][ form_nm]= view_nm for form_nm in node.forms
		return
	appInit= ()->
		for nm in appconfs
			app= E[ 'app$'+ nm] ? {}
			merge aFlows.default.TRACKS.default.STEPS, app.STEPS if app.STEPS
			merge aFlows.default.TRACKS, app.TRACKS if app.TRACKS
			merge obj, app[ nm] for nm,obj of SETTINGS: aSetting, MACROS: aMacros, CLICKS: aClicks, FLOWS: aFlows, MODELS: aModels, OPTIONS: option
		make_model_functions()
		return

	# MODELS map functions
	appModel= (view_name,attribute) ->
		config.a1 view_name if view_name not of aModels
		option.a2 view_name, attribute if attribute not of aModels[ view_name]
		aModels[ view_name][ attribute]
	appFist= (group_nm,fist_nm) ->
		appLoadFormsIf()
		aFist[ group_nm][ fist_nm]

	# Flow functions
	appFindNode= (flow,t,s,cat,nm) ->
		nf= aFlows[flow]
		if nf
			if t and (nt= nf.TRACKS?[t])?
				if s and (ns= nt.STEPS?[s])?
					if (ncat= ns[cat]?[nm])? then return ncat
				if (ncat= nt[cat]?[nm])? then return ncat
			if (ncat= nf[cat]?[nm])? then return ncat
		null
	appFindAttr= (flow,t,s,attr) ->
		nf= aFlows[flow]
		if nf
			if t and (nt= nf.TRACKS?[t])?
				if s and (ns= nt.STEPS?[s])?
					if (nattr= ns[attr])? then return nattr
				if (nattr= nt[attr])? then return nattr
			if (nattr= nf[attr])? then return nattr
		null
	# appGet? are used by App$Base to ensure the named entry exists
	appGetF= (flow)              -> aFlows[ flow]
	appGetT= (flow, track)       -> aFlows[ flow].TRACKS[ track]
	appGetS= (flow, track, step) -> aFlows[ flow].TRACKS[ track].STEPS[ step]
	appStartT=  (flow)           -> appGetF( flow).start
	appStartS=  (flow, track)    -> appGetT( flow, track).start

	appFindClick= (path,action_token) ->
		(appFindNode path[0], path[1], path[2], 'CLICKS', action_token) ?  aClicks[ action_token]
	appGetSetting= (setting_name, flow, track, step) ->
		return aSetting[ setting_name] if not flow # Some settings are not down in the flow
		( appFindAttr flow, track, (step ? false), setting_name ) ? aSetting[ setting_name]
	appGetVars= (flow,track,step) ->
		f= ':appGetVars'
		vars= merge {}, aFlows[ flow].v, aFlows[ flow].TRACKS[ track].v, aFlows[ flow].TRACKS[ track].STEPS[ step].v
		_log2 f, ( "#{k}:#{v}" for own k,v of vars).join ', '
		vars

	# How E.<view-model> function works:
	# E.<view-model>() gives instance
	# E.<view-model>('word') gives table (run model's getTable())
	# E.<view-model>(ctx, 'action', data) is Execute (run model's action())
	make_model_functions= () ->
		for view,model of aModels
			do (view,model) ->
				E[ view]= (table_or_ctx, act_if_action, data) ->
					# First, get instance into oModel cache
					inst_nm= model.inst
					if inst_nm not of oModel
						cls= model.class
						option.m1 view, model if not E.Model[cls]?
						oModel[ inst_nm]= new E.Model[ cls] view, model.options
						oModel[ inst_nm].restoreState oModel[inst_nm] if inst_nm of oModel
					oM= oModel[ inst_nm]
					return oM if table_or_ctx is undef # Wanted an instance
					return oM.getTable table_or_ctx if act_if_action is undef # Wanted a vew-table
					oM.action table_or_ctx, act_if_action, data

	clickAction= (action_token, data, original_path) ->
		d= new m.Deferred()
		d.resolve _d_clickAction action_token, data, original_path
		d.promise
	_d_clickAction= (action_token, data, original_path) ->
		f= ":clickAction(#{action_token})"
		_log2 f, data, original_path
		master_issue= new Issue 'App'
		master_message= new Issue 'App'
		click_node= appFindClick original_path, action_token
		_log2 f, click_node
		if not click_node?
			_log2 'WARNING', "No app. entry for action_token (#{action_token}) on path (#{original_path})" #TODO option.ca1
			return [master_issue, master_message] # No recognized action
		# Handle 'go:'
		if click_node.go?
			E.App().go click_node.go
		master_data= merge {}, data
		# Process 'pass:' (just a syntax check)
		nms= switch type_oau click_node.pass
			when 'A' then click_node.pass
			when 'S' then click_node.pass.split ','
			else []
		for nm in nms
			_log2 'WARNING', "Action (#{action_token}) request data is missing param #{nm}", data, click_node, original_path if nm not of data
		# Process 'set:'
		master_data[ nm]= val for nm,val of click_node.set
		# Handle 'do:'
		if click_node.do?
			# TODO: No '.' means a MACRO
			[view_nm,view_act]= click_node.do.split '.'
			view_act= view_act ? action_token
			d= new m.Deferred(); r= {}; i= new E.Issue view_nm, view_act; mg= new E.Issue view_nm ,view_act
			ctx= {d,r,i,m:mg}
			E[ view_nm] ctx, view_act, master_data
			master_data[ nm]= val for nm,val of ctx.r # We just polute the one object
			master_issue.addObj ctx.i
			master_message.addObj ctx.m
			[master_issue, master_message]
		[master_issue, master_message]


# This function will call a loadStrategy to get from network if needed, then cache processing of the file
# Users load up: E.fist$<name>
# It's an object with FIELDS {db_nm:, type:,...}, and FISTS: ['fieldname',...]
# TODO WOULD LIKE TO ADD FIELDS' ABILITY TO MERGE WITH OTHER DEFS: from:'fieldname' (OR 'group:fieldname')

	cacheByGrp= [] # Cache starts empty
	fgGetFistGroup= (grp_nm) ->
		option.fg1 grp_nm f not cacheByGrp[grp_nm]?= E.oLoader.fist grp_nm
		cacheByGrp[grp_nm]
	fgGetFistDef= (grp_nm, flist_nm) -> # NOT cannonical
		fgroup= fgGetFistGroup grp_nm
		option.fg2 grp_nm, flist_nm if not fgroup.FISTS[flist_nm]
		fgroup.FISTS[flist_nm]
	fgGetFieldDefsForGroup= (grp_nm) -> fgGetFistGroup( grp_nm).FIELDS # Maintenance
	fgGetFistDefsForGroup= (grp_nm) -> fgGetFistGroup( grp_nm).FISTS # Maintenance
	fgGetFieldDefsForFist= (grp_nm, flist_nm) ->
		fgroup= fgGetFistGroup grp_nm # Shortcut into cache for this 'group'
		fieldDef= {}
		for nm in fgGetFistDef grp_nm, flist_nm
			option.fg3 grp_nm, flist_nm, nm if not (nm of fgroup.FIELDS)
			fieldDef[ nm]= fgroup.FIELDS[ nm]
		fieldDef
	fgGetCanonicalFist= (grp_nm, flist_nm) -> (flist_nm.split '_')[ 0]

	E[ nm]= obj for nm,obj of {
		type_oau # TODO SEE IF THIS WORKS FOR PEOPLE TO REPLACE E.G. $.IsArray
		Model, Extra, option, click, merge, appconfs
		appGetF, appGetT, appGetS, appStartT, appStartS
		appFindClick, appGetSetting, appGetVars
		oModel, oFist # Just for internal checking / testing
	}
	return E

class Fist
	constructor: (@Epic, @grp_nm, flist_nm, @view_nm) ->
		oG= @Epic.getFistGroupCache()
		flist_nm= oG.getCanonicalFist grp_nm, flist_nm
		@fist_nm= flist_nm # Cannonical field-list list for this flist
		@oM= E[ @view_nm]()
		@form_state= 'empty' # form-states: empty, posted, loaded, restored
		@fistDef= oG.getFistDef grp_nm, @fist_nm
		#@fieldDef= oG.getFieldDefsForFist grp_nm, @fist_nm
		@cache_field_choice= [] # choices by field-name
		@filt= FistFilt # Static class of filters
		@Fb_ClearValues()
		# Upload fields
		@upload_todo= []
		@upload_fl= {}
		@focus_fl_nm= false # fl_nm of current focus
	getGroupNm: -> @grp_nm
	getFistNm: -> @fist_nm
	loadFieldDefs: ->
		@fieldDef?= @Epic.getFistGroupCache().getFieldDefsForFist @grp_nm, @fist_nm # Lazy load
	getFieldsDefs: -> @loadFieldDefs() # For models that xlate db_nm in load_table
	loadFieldChoices: (fl) -> # for pulldown choices
		f= ':Fist.loadFieldChoices:'+ fl
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
					json= JSON.parse json
					for k, v of json
						final_obj.options.push k; final_obj.values.push v
				when 'wist'
					[wist_grp, wist_nm, w_val, w_opt]= @fieldDef[fl].cdata.split ':'
					wist= @Epic.getViewTable "Wist/#{wist_grp}:#{wist_nm}"
					for row in wist
						final_obj.options.push row[w_opt]; final_obj.values.push row[w_val]
					_log2 f, final_obj

			@cache_field_choice[fl]= final_obj
		return
	getHtmlPostedFieldsList: (flist_nm) -> # flist_nm optional for sub-lists
		fistDef= @fistDef
		if flist_nm? and flist_nm isnt @fist_nm
			fistDef= @Epic.getFistGroupCache().getFistDef @grp_nm, flist_nm
		fistDef # List of fields that make up fist TODO WEED OUT NON-HTML FIELDS PER PSUEDO
	#getFieldAttributes: (fl_nm) -> @loadFieldDefs(); @fieldDef[fl_nm]
	getFieldAttributes: (fl_nm) -> (@Epic.getFistGroupCache().getFieldDefsForGroup @grp_nm)[fl_nm] # Psuedo-html not in fieldDef
	getHtmlFieldValue: (fl_nm) -> @loadData(); @fb_HTML[fl_nm]
	getHtmlFieldValues: ->
		@loadData()
		_log2 'getHtmlFieldValues', @fist_nm, @fb_HTML; @fb_HTML
	getDbFieldValue: (fl_nm) -> @loadData(); @fb_DB[fl_nm]
	getDbFieldValues: -> @loadData(); @fb_DB
	getFieldIssues: -> @fb_issues
	getFocus: -> @focus_fl_nm
	setFocus: (fl_nm)-> @focus_fl_nm= fl_nm # false to reset
	getChoices: (fl_nm) -> @loadFieldChoices fl_nm; @cache_field_choice[fl_nm]
	# Posted values are comming to us, need to set values, and validate
	fieldLevelValidate: (data,flist_nm,clear_issues) ->
		@form_state= 'posted'
		@Fb_FistValidate data, flist_nm ? @fist_nm, clear_issues ? true
	loadData: (data) -> #TODO SHOULD THIS BE IN Epic.fist_back?
		# form-states: empty, posted, loaded, restored
		if @form_state is 'empty'
			@oM.fistLoadData @ # Delegate to our 'model'
			@form_state= 'loaded' # Consider it loaded, no matter what
		return
	setFromDbValues: (data) -> @Fb_SetHtmlValuesFromDb data; @form_state= 'loaded'; return
	setFromHTMLValues: (data) -> @Fb_SetHtmlValuesFromHtml data; @form_state= 'loaded'; return
	eventNewRequest: (changed) ->
		if changed.step
 			@clearValues(); @upload_todo= []; @uploaded_fl= {}
 		return
	clearIssues: (html_nm) -> # Optionaly takes a single name
		if html_nm
			delete @fb_issues[ html_nm]
		else
			@fb_issues= {} # Hash by HTML nm, if any
		return
	clearValues: ->
		if @form_state isnt 'empty' then @Fb_ClearValues(); @form_state= 'empty'
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
		#_log2 'SetDbValues data:', data
		dbnms= @Fb_DbNames() # Load up the local list
		##_log2 'SetDbValues DbNames:', @Fb_DbNames()
		#@fb_DB[k]= v for k,v of data # Clone
		@fb_DB[k]= data[k] for k in dbnms when k of data # Clone
		@Fb_Db2Html()
		#_log2 'SetDbValues fb_HTML:', @fb_HTML
	Fb_SetHtmlValuesFromHtml: (data) -> # From Html post, calls Html2Html
		@Fb_Html2Html data, @fist_nm
		null
	Fb_ClearValues: () ->
		#_log2 'FistBack.ClearValues'
		@fb_DB= {} # Hash
		@fb_HTML= {} # Hash
		@fb_issues= {} # Hash by HTML nm, if any
		@Fb_Db2Html()
	Fb_FistValidate: (data,flist_nm,clear_issues) -> # Data is from an html post (not a hash of db names)
		# Logic to validate a posted form of data:
		#  (a) perform Html to Html filters on raw posted data (will change user's view)
		#  (b) Validate the HTML side values, using filters
		#  (c) return any issue found (or, continue next steps)
		#  (d) Move Html data to DB, using filters (possible psuedo prefix)

		@fb_issues= {} if clear_issues is true
		@Fb_Html2Html data, flist_nm
		issues = new Issue
		issues.call @Fb_Check flist_nm
		if issues.count() is 0
			#@Fb_Db2Html(); #TODO IS THIS GOOD/NEEDED TO PUT BACK FROM DB?
			@Fb_Html2Db flist_nm
			issues.call @Fb_Check flist_nm, true
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
		@issue_inline?= E.oA.getShowIssues() is 'inline'
		_log2 f, field, token_data, inline: @issue_inline
		if @issue_inline
			@fb_issues[field]= Issue.Make @view_nm, token_data[0], token_data[1]
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

	Fb_Check: (flist_nm, psuedo_only) ->
		f= 'Fist.Fb_Check:'+flist_nm
		#_log2 f, @Fb_DbNames flist_nm
		issue = new Issue
		for db_nm in @Fb_DbNames flist_nm
			nm= @dbNm2HtmlNm[ db_nm]
			field = @fieldDef[ nm]
			# If psuedo, validate sub fields first, then main field's value if no errors
			if psuedo_only
				continue unless field.type is 'psuedo'
			if field.type isnt 'psuedo' or psuedo_only
				@Fb_Make issue, nm, @Fb_Validate nm, @fb_HTML[ nm]
			else
				issue_count= 0
				for p_nm in field.cdata
					issue_cnt+= 1 if @Fb_Make issue, nm, @Fb_Validate (nm+ '_'+ p_nm), @fb_HTML[ nm+ '_'+ p_nm]
		issue
	Fb_Validate: (fieldName, value) ->
		f= 'Fist.Fb_Validate:'+ fieldName
		#_log2 f, value
		@loadFieldDefs() # Lazy load
		field= @fieldDef[ fieldName] ? @getFieldAttributes fieldName
		if (not value?) or value.length is 0
			#_log2 f, 'req', field.req
			if field.req is true # Value is empty, but required
				return if field.req_text #Value empty, not 'ok'
				then ['FIELD_EMPTY_TEXT', [fieldName, field.label, field.req_text]] #Value empty, not 'ok'
				else ['FIELD_EMPTY', [fieldName, field.label]] #Value empty, not 'ok'
			return true # Value is empty, and this is 'ok'

		if field.max_len> 0 and value.length> field.max_len
			#_log2 f, 'max_len,v.len', field.max_len, value.length
			return ['FIELD_OVER_MAX', [fieldName, field.label, field.max_len]]

		#_log2 f, 'validate,expr', field.validate, field.validate_expr
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
				value=( @fb_HTML[nm + '_' + p_nm] for p_nm in field.cdata)
			#_log2 f, 'H2D_', nm, field.db_nm, value
			@fb_DB[ field.db_nm]= @filt['H2D_' + field.h2d + psuedo_prefix] nm, field.h2d_expr, value
		#_log2 f, 'fb_DB', @fb_DB
		return

	Fb_Db2Html: () ->
		for db_nm in @Fb_DbNames()
			nm= @dbNm2HtmlNm[db_nm]
			field= @fieldDef[ nm]
			psuedo_fl= if field?.type is 'psuedo' then true else false
			# Not all fields are populated, TagExe display the default value in that case
			if not (db_nm of @fb_DB)
				if not psuedo_fl then @fb_HTML[ nm]= null
				else @fb_HTML[ nm+ '_'+ subfield]= null for subfield in field.cdata
				continue
			# Pull from DB, then put in various places in Html (if psuedo)
			value = @fb_DB[ db_nm]
			psuedo_prefix = ""
			# Psuedo fields need data pulled other fields
			if not psuedo_fl then @fb_HTML[ nm]= @filt['D2H_'+ field.d2h] db_nm+'%'+nm, field.d2h_expr, value
			else
				# filter will know what to do, and then move a 'list' to the right place
				switch field.cdata.length
					when 0 then option.fb1 field
					when 1 then BROKEN()
					else
						# Multiple fields in one, make a list; filter will combine them
						list= @filt['D2H_' + field.d2h + '_psuedo'] db_nm+'%'+nm, field.d2h_expr, value
						@fb_HTML[ nm+ '_'+ p_nm]= list[ i] for p_nm, i in field.cdata


	# Filter functions (default behaviour)

	# Four types of filters here...
	#
	#  H2H_generic		{fieldName spec value}
	#	Cleans up what the user typed, for the user to see
	#		- returns a value that has been trimmed, etc.
	#		-  (fieldName: for debug; spec=xxx:yyy)
	#
	# H2D_XXX[_psuedo]		{fieldName filtExpr value}
	#
	#	Cleans up user input, for a database value (Collects psuedo fields)
	#		- takes value (or list if psuedo), returns cleaned up value
	#
	# CHECK_XXX			(fieldName, validateExpr, value, oFist)
	#
	#	Checks the DB value for validity
	#		- Takes a value, reuturns true=good, false=bad
	#
	# D2H_XXX[_psuedo]		{fieldName value}
	#
	#	Moves db based data, into viewable/editable Html data
	#		- Takes a value, returns the formated value (or a list, if psuedo)

class FistFilt

	@H2H_generic: (fieldName, spec, value) ->
		# 'fieldName' is for debug only - this is a generic filter (not field knowlegable)
		new_value= value ? ''; # Default if nothing is to be done
		spec_ary= (spec ? '').split? ':'

		for k, one_spec of spec_ary
			new_value= switch one_spec
				when '' then new_value # Empty spec is do nothing?
				when 'trim_spaces' then (String new_value).trim()
				when 'digits_only' then new_value.replace /[^0-9]/g, ''
				when 'lower_case' then new_value.toLowerCase()
				when 'upper_case' then new_value.toUpperCase()
				else option.ff1 fieldName, spec, one_spec
		new_value

	#
	# Filters to validate the data (uses the HTML side)
	#

	@CHECK_:          (fieldName, validateExpr, value, oF) -> true
	@CHECK_null:      (fieldName, validateExpr, value, oF) -> true
	@CHECK_undefined: (fieldName, validateExpr, value, oF) -> true
	@CHECK_any:       (fieldName, validateExpr, value, oF) -> true

	@CHECK_phone: (fieldName, validateExpr, value, oF) ->
		switch validateExpr
			when undef
				value= value.replace /[^0-9]/g, ''
				check_pat = '[0-9]{10}'
			else BROKE()
		re = new RegExp('^' + check_pat + '$')
		if value.match re then true else false

	@CHECK_zip: (fieldName, validateExpr, value, oF) ->
		switch validateExpr
			when '5or9' then return false if not value.match /^[0-9]{5}(|[0-9]{4})$/
			else BROKE()
		true

	@CHECK_choice: (fieldName, validateExpr, value, oF) ->
		# Allow values that are in the pulldown choices (less first choice if validateExpr==1)
		_log2 'CHECK_choice:value/values', value, oF.getChoices(fieldName).values
		return false if value not in oF.getChoices(fieldName).values
		if validateExpr
			return false if oF.getChoices(fieldName).values[0] is value
		return true

	@CHECK_email: (fieldName, validateExpr, value, oF) ->
		# 'fieldName' is given for debug messages
		# [A-Z0-9._%-]+@[A-Z0-9.-]+\.[A-Z]{2,4}
		most= '[A-Z0-9._+%-]'
		some= '[A-Z0-9.-]'
		few = '[A-Z]'
		re = new RegExp "^#{most}+@#{some}+[.]#{few}{2,4}$", 'i'
		if value.match re then true else false

	@CHECK_regexp: (fieldName, validateExpr, value, oF) ->
		re = new RegExp "^#{validateExpr}$"
		if value.match re then true else false

	@CHECK_confirm: (fieldName, validateExpr, value, oF) ->
		other_value= oF.getHtmlFieldValue validateExpr
		return false if other_value isnt value
		true

	#
	# Filters to go from Html to DB
	#

	@H2D_: (fieldName, filtExpr, value) ->
		value

	@H2D_undefined: -> @H2D_.apply @, arguments # Alias

	@H2D__psuedo: (fieldName, filtExpr, value) ->
		# It's a list of control values, leave it as is
		value

	@H2D_date_psuedo: (fieldName, filtExpr, value) ->
		f= 'FF:H2D_date_psuedo'
		_log2 f, fieldName, filtExpr, value
		# It's a list of control values (m/d/Y); db wants YYYY-MM-DD
		[m,d,Y] = value
		# TODO WHAT TO DO IF NOTHING ENTERED, AND NEED TO CHECK 'REQ' VS. VALID
		return '' unless m? or d? or Y?
		m?= ''; d?= ''; Y?= ''
		m = '0' + m if m.length is 1
		d = '0' + d if d.length is 1
		"#{Y}-#{m}-#{d}"

	@H2D_join_psuedo: (fieldName, filtExpr, value) ->
		# It's a list of control values, join the list on this one filtExpr
		value.join filtExpr

	@H2D_phone: (fieldName, filtExpr, value) ->
		value.replace /[^0-9]/g, ''

	@H2D_zero_is_blank: (fieldName, filtExpr, value) ->
		if value is 0 or value is '0' then '' else value
	#
	# Filters to get from DB values to the Html for user to view/edit (fieldName is for debug msgs)
	#

	@D2H_: (fieldName, filtExpr, value) ->
		value

	@D2H_undefined: -> @D2H_.apply @, arguments # Alias
	@D2H_null:      -> @D2H_.apply @, arguments # Alias

	@D2H_phone: (fieldName, filtExpr, value) ->
		value= value.replace /[^0-9]/g, ''# TODO: Remove if needed to handle international dates
		value.replace /(...)(...)(...)/, '($1) $2-$3'

	@D2H_date: (fieldName, filtExpr, value) ->
		@D2H_date_psuedo(fieldName, filtExpr, value).join '/'

	@D2H_date_psuedo: (fieldName, filtExpr, value) ->
		f= 'FF:D2H_date_psuedo'
		_log2 f, fieldName, filtExpr, value
		# Control want's (m, d, y)
		[Y, m, d]= ((value ? '--').split /[^0-9-]/)[0].split '-'
		[((m ? '').replace /^0/, ''), ((d ? '').replace /^0/, ''), Y]

	@D2H_blank_is_zero: (fieldName, filtExpr, value) ->
		if value.length then value else '0'

#TODO REWRITE REVIEW LOGIC IN ISSUE, AND CALLERS, TO SEE WHAT FEATURES ARE REALLY NEEDED
class Issue
	constructor: (@t_view, @t_action) -> @issue_list= [] # Instance member
	@Make: (view,type,value_list) -> # Factory method (no t_view/t_action)
		issue= new Issue view
		issue.add type, value_list
		issue
	add: (type,msgs) ->
		f= ':Issue.add:'+@t_view+':'+@t_action
		_log2 f, 'params:type/msgs', type, msgs
		switch typeof msgs
			when 'undefined' then msgs= []
			when 'string' then msgs= [ msgs ]
		@issue_list.push token:type, more:msgs, t_view: @t_view, t_action: @t_action
	addObj: (issue_obj) ->
		f= ':Issue.addObj:'+ @t_view+'#'+@t_action
		return if typeof issue_obj isnt 'object' or not ('issue_list' of issue_obj)
		#_log2 f, 'issue_list', issue_obj.issue_list
		for issue in issue_obj.issue_list
			new_issue= E.merge {}, issue
			new_issue.t_view?= @t_view
			new_issue.t_action?= @t_action
			@issue_list.push new_issue
		return
	count: -> @issue_list.length
	asTable: (map) ->
		#_log2 'asTable: issue_list,map', @issue_list, map
		final= []
		for issue in @issue_list
			final.push
				token: issue.token
				title: "#{issue.t_view}##{issue.t_action}##{issue.token}##{issue.more.join ','}"
				issue: @map map, issue.t_view, issue.t_action, issue.token, issue.more
		final
	map: (map,t_view,t_action,token,more) ->
		if typeof map isnt 'object' then return "#{t_view}##{t_action}##{token}##{more.join ','}"
		map_list= []
		if t_view of map
			if t_action of map[t_view]
				map_list.push map[t_view][t_action]
			if 'default' of map[t_view]
				map_list.push map[t_view].default
		if 'default' of map
			if t_action of map.default
				map_list.push map.default[t_action]
			if 'default' of map.default
				map_list.push map.default.default
		#_log2 'map:tv,ta,token,more,map_list.length', t_view, t_action, token, more, map_list.length
		for sub_map in map_list
			for spec in (sub_map or [])
				#_log2 'map:spec', spec
				if token.match spec[0]
					return @doMap token, spec[1], more, token
		"#{t_view}##{t_action}##{token}##{more.join ','}"
	doMap: (token, pattern,vals) ->
		#_log2 'doMap', token, pattern, vals
		new_str= pattern.replace /%([0-9])(?::([0-9]))?%/g, (str,i1,i2,more) ->
			#_log2 str:str, i1:i1, i2:i2, more:more
			return token if i1 is '0'
			return if i2 then (vals[i1-1] or vals[i2-1] or '') else (vals[i1-1] or '')
		new_str

# E.ModelJS is an abstract for models implented all in JS
class ModelJS
	constructor: (@view_nm,@options,ss) ->
		@_ModelJS= ss: ss || false
		@restoreState false
	getTable: (tbl_nm) ->
		@loadTableIf tbl_nm
		@Table[tbl_nm]
	loadTableIf: (tbl_nm) ->
		@loadTable tbl_nm if not (tbl_nm of @Table)
	restoreState: (copy_of_state) ->
		delete @[key] for key of @_ModelJS.ss if @_ModelJS.ss?
		E.merge @, @_ModelJS.ss if @_ModelJS.ss?
		E.merge @, copy_of_state if copy_of_state
		@Table= {}
	saveState: -> # A simple method, use: super view, a: 'default_a', b: 'default_b'
		ss= @_ModelJS.ss # Shortcut
		return false unless ss
		st= {}
		st[nm]= @[nm] for nm of ss when @[nm] isnt ss[nm]
		E.merge {}, st # clone and return
	invalidateTables: (tbl_nms,not_tbl_names) -> # Use true for all
		f= ':ModelJS.invalidateTables~'+ @view_nm
		#_log2 f, tbl_nms, not_tbl_names
		not_tbl_names?= []
		tbl_nms= (nm for nm of @Table when not (nm in not_tbl_names)) if tbl_nms is true
		deleted_tbl_nms= []
		(deleted_tbl_nms.push nm; delete @Table[nm]) for nm in tbl_nms when nm of @Table
		E.View().invalidateTables @view_nm, tbl_nms, deleted_tbl_nms


w= if typeof window isnt "undefined" then window else {}
w.EpicMvc= w.E= new app w
w.E[ nm]= klass for nm,klass of {Issue, Fist, ModelJS, FistFilt}
# TODO NOTE This was needed, so EpicMvc-One has _log2 available as e.g. app.js's load
w._log2= ->
w._log2= Function.prototype.bind.call console.log, console #%# will be removed before uglify #	f= '

if typeof module isnt "undefined" and module isnt null then module.exports = w.E
if typeof define is "function" and define.amd then define () -> w.E
