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
# E( "model", "action", {data}) - replaces app.coffee's call: "model/action" ...
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
#  - Need to to push FIST data back to FIST object
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
# B) Integrate fist control fields (select, input, etc.) with correct attributes value vs. defaultValue ?
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
	appconfs= [] # Will be an array of the apps user sets in 'run'
	option= load_dirs: {}
		# load: loadstratgy-class-name placed into E.Extra
		# render: render-class-name placed into E.Extra
		# option.c1: Function to call if inClick when click called
		# option.m1 view, model if not E.Model[cls]?
		# App.coffee reader
		# config.a1 view_name [if view_name not of aModels]
		# option.a2 view_name, attribute if attribute not of aModels[ view_name]
		# ClickAction:
		# option.ca1 action_token, original_path, click_node
		# option.ca2 action_token, original_path, click_node # "ERROR: Missing '#{click_node.do}' from MACROS"
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

	# Accept caller's request to start up an EpicMvc application
	E.run= (set_appconfs, more_options, init_func) ->
		appconfs= set_appconfs
		appInit()
		merge option, more_options
		E.oLoader= new Extra[ option.loader] appconfs
		promise= E.oLoader.D_loadAsync()
		promise.then ->
			fistInit()
			issueInit()
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
	aFists= {}
	appLoadFormsIf= (config) ->
		return
	appInit= ()->
		for nm in appconfs
			app= E[ 'app$'+ nm] ? {}
			merge aFlows.default.TRACKS.default.STEPS, app.STEPS if app.STEPS
			merge aFlows.default.TRACKS, app.TRACKS if app.TRACKS
			hash= SETTINGS: aSetting, MACROS: aMacros, CLICKS: aClicks, FLOWS: aFlows, MODELS: aModels, OPTIONS: option
			merge obj, app[ nm] for nm,obj of hash
		for view_nm, node of aModels when node.fists
			aFists[ form_nm]= view_nm for form_nm in node.fists
		make_model_functions()
		return

	# MODELS map functions
	appModel= (view_name,attribute) ->
		config.a1 view_name if view_name not of aModels
		option.a2 view_name, attribute if attribute not of aModels[ view_name]
		aModels[ view_name][ attribute]
	appFist= (fist_nm) ->
		aFists[ fist_nm]

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
		master_data= merge {}, data
		click_node= appFindClick original_path, action_token
		_log2 f, click_node
		if not click_node?
			_log2 'WARNING', "No app. entry for action_token (#{action_token}) on path (#{original_path})" #TODO option.ca1
			return [master_issue, master_message] # No recognized action

		doLeftSide= (click_node)->
			_log2 f, 'doLeftSide:', {click_node}
			# Handle 'go:'
			if click_node.go?
				E.App().go click_node.go
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
				is_macro= not /[.]/.test click_node.do
				if is_macro # Handle 'MACRO'
					if not aMacros[click_node.do]
						option.ca2? action_token, original_path, click_node
					return doClickNode aMacros[click_node.do] if is_macro
				[view_nm,view_act]= click_node.do.split '.'
				view_act= view_act ? action_token
				d= new m.Deferred(); r= {}; i= new E.Issue view_nm, view_act; mg= new E.Issue view_nm ,view_act
				ctx= {d,r,i,m:mg}
				E[ view_nm] ctx, view_act, master_data
				master_data[ nm]= val for nm,val of ctx.r # We just polute the one object
				master_issue.addObj ctx.i
				master_message.addObj ctx.m
					# TODO: Return null or false if do was not a macro

		doRightSide= (click_node)->
			next_node= null
			for choice in click_node.next ? []
				(next_node= choice; break) if choice.when is 'default'
				(next_node= choice; break) if (typeof choice.when) is 'string' and choice.when is (master_data.success ? master_data.ok)
				matches= true
				for k,val of choice.when
					(matches= false; break;) if master_data[k] isnt val
				(next_node= choice; break) if matches
			if next_node
				_log2 'doRightSide:', {next_node}
				doClickNode next_node
			return

		# ClickNode is { do: left_click_node, next: right_click_node }
		#	execute left_click_node then
		#	execute right_click_node
		doClickNode= (click_node)->
			doLeftSide click_node
			doRightSide click_node

		doClickNode click_node

		[master_issue, master_message]

	fieldDef= {}
	fistDef= {}
	fistInit= ()->
		for nm in appconfs
			fist= E[ 'fist$'+ nm] ? {}
			merge fieldDef, fist.FIELDS if fist.FIELDS
			merge fistDef,  fist.FISTS  if fist.FISTS
		rec.fistNm= nm for nm,rec of fistDef
		rec.fieldNm= nm for nm,rec of fieldDef
	issueMap= {}
	issueInit= ()->
		for nm in appconfs
			issues= E[ 'issue$'+ nm] ? {}
			merge issueMap, issues

	E[ nm]= obj for nm,obj of {
		type_oau # TODO SEE IF THIS WORKS FOR PEOPLE TO REPLACE E.G. $.IsArray
		Model, Extra, option, click, merge, appconfs
		appGetF, appGetT, appGetS, appStartT, appStartS
		appFindClick, appGetSetting, appGetVars, appFist
		fieldDef, fistDef, issueMap
		oModel # Just for internal checking / testing
	}
	return E

class Issue
	constructor: (@t_view, @t_action) -> @issue_list= [] # Instance member
	@Make: (view,token,value_list) -> # Factory method (no t_view/t_action)
		issue= new Issue view
		issue.add token, value_list
		issue
	add: (token, msgs) ->
		f= ':Issue.add:'+@t_view+':'+@t_action
		_log2 f, 'params:type/msgs', token, msgs
		switch typeof msgs
			when 'undefined' then msgs= []
			when 'string' then msgs= [ msgs ]
		@issue_list.push token:token, more:msgs, t_view: @t_view, t_action: @t_action
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
	asTable: () ->
		#_log2 'asTable: issue_list,map', @issue_list
		final= []
		for issue in @issue_list
			final.push
				token: issue.token
				title: "#{issue.t_view}##{issue.t_action}##{issue.token}##{issue.more.join ','}"
				issue: @map issue.t_view, issue.t_action, issue.token, issue.more
		final
	map: (t_view,t_action,token,more) ->
		map= E.issueMap
		if typeof map isnt 'object' then return "(no map) #{t_view}##{t_action}##{token}##{more.join ','}"
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
		"(no match)#{t_view}##{t_action}##{token}##{more.join ','}"
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
w.E[ nm]= klass for nm,klass of {Issue, ModelJS}
# TODO NOTE This was needed, so EpicMvc-One has _log2 available as e.g. app.js's load
w._log2= ->
w._log2= Function.prototype.bind.call console.log, console #%# will be removed before uglify #	f= '

if typeof module isnt "undefined" and module isnt null then module.exports = w.E
if typeof define is "function" and define.amd then define () -> w.E
