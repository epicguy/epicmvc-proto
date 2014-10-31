'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
#
#
# TODO LOGGING
#  - Would like to mark types of lines with possible detail level, which caller can then use to filter at will
#    - Like fm='issues' ff='make' _log fm, 2, ff, 'whatever', 'and', {stuff} (Module fm, level=2, function-name, messages)
#
# TODO APP.COFFEE
# A) ROUTES
#
# TODO DEPLOY
# A) Write a new version, which packages our stuff as a bower package
# B) USING MANIFEST FILE TO BUILD USER'S DEPLOY PACKAGE; ALSO REMOVES LOGS, ETC.
#
# TODO EVENTS
# C) CONSIDER HOW TO INTERACT WITH MITHRIL WHEN USES DOES COMPONENT WITH E.G. ONCHANGE, ONCLICK, ETC.
#
# TODO HISTORY (IN RENDER STRATEGY)
# A) CONSIDER IF APP.COFFEE HAS A ROLE HERE
# B) DECIDE IF MODALS SHOULD GO INTO HISTORY, AND IF NOT, WHAT WILL BACK BUTTON DO JUST THEN (WHILE IN IT)
# C) DECIDE IF SAME STEP SHOULD AVOID PUSHING A NEW STATE (VS REPLACE-STATE IF NEEDED)
#
# TODO MITHRIL
# A) Do sample component
# B) Integrate fist control fields (select, input, etc.) with correct attributes value vs. defaultValue ?
#
# TODO MODEL I/F
# B) CONSDIER HOW TABLE REQUESTS MIGHT BE ASYNC ALSO (MAYBE PARTIAL RENDER, THEN ABORT OR CONSDIER EMPTY UNTIL REQUEST COMPELTE)


app= (window, undef) ->
	inAction= false
	counter= 0
	Model= {} # Namespace for others to populate with class implementations of Models
	Extra= {} # Namespace for others to populate with class implementations that are not Models
	oModel= {} # Instances of model classes
	modelState= {}
	appconfs= [] # Will be an array of the apps user sets in 'run'
	option= event: (->), loadDirs: {}
		# load: loadstratgy-class-name placed into E.Extra
		# render: render-class-name placed into E.Extra
		# option.xxN - see Dev/app. for explainations of these

	# Define these small validation functions as no-ops; Dev pkg can do the 'real' work
	option[ nm]= (->) for nm in [ #%#
		'c1', 'a1', 'a2', 'ap1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6' #%#
		'ca1', 'ca2', 'ca3', 'ca4', 'fi1', 'fi2', 'fi3', 'v1', 'w1' #%#
	] #%#

	E= {}
	E.nextCounter= -> ++counter
	E.opt= (object) -> merge option, object

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
			return want if (type_oau want) isnt utype #TODO of func
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
	E.logout= (action_event, action_data)->
		if inAction isnt false
			setTimeout (=> E.logout action_event, action_data), 100
			return
		if action_event
			(action action_event, action_data).then -> finish_logout()
		else finish_logout()
	finish_logout= ->
		for k,o of oModel when o.eventLogout?() # True to reset model and state
			delete modelState[ k]
			delete oModel[ k]

	# Accept caller's request to start up an EpicMvc application
	E.run= (set_appconfs, more_options, init_func) ->
		appconfs= set_appconfs
		merge option, more_options # Has loadDirs, needed for loader
		E.oLoader= new Extra[ option.loader] appconfs
		promise= E.oLoader.D_loadAsync()
		promise.then ->
			appInit()
			merge option, more_options # Re-merge if apps overwrite them
			make_model_functions()
			fistInit()
			wistInit()
			issueInit()
			init_func() if typeof init_func is 'function'
			E.App().go aSetting.go
			E.oRender= new Extra[ option.render] # Sets mithril's redraw to self
		return

	# TODO FIGURE OUT IF RENDER USES THIS FOR THE BACK/FWD BUTTONS OF BROWSER HISTORY
	setModelState= (s) ->
		f= ':setModelState'
		modelState= s if s?
		#_log2 f, s, modelState
		for inst_nm of oModel
			oModel[ inst_nm].restoreState? modelState[ inst_nm]

	getModelState= ()->
		modelState= {}
		modelState[k]= ss for k,o of oModel when o.saveState? and ss= o.saveState()
		modelState
	# The old 'AppConf' class; use app*() functions now
	aSetting= frames: {}, modals: {}, layout: 'default', go: 'default//'
	aMacros= {}
	aActions= {}
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
			hash= SETTINGS: aSetting, MACROS: aMacros, ACTIONS: aActions, FLOWS: aFlows, MODELS: aModels, OPTIONS: option
			merge obj, app[ nm] for nm,obj of hash
		for view_nm, node of aModels when node.fists
			aFists[ form_nm]= view_nm for form_nm in node.fists
		return

	# MODELS map functions
	appModel= (view_name,attribute) ->
		option.a1 view_name, aModels #if view_name not of aModels #%#
		option.a2 view_name, aModels, attribute #if attribute not of aModels[ view_name] #%#
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

	appFindAction= (path,action_token) ->
		(appFindNode path[0], path[1], path[2], 'ACTIONS', action_token) ?  aActions[ action_token]
	appGetSetting= (setting_name, flow, track, step) ->
		return aSetting[ setting_name] if not flow # Some settings are not down in the flow
		( appFindAttr flow, track, (step ? false), setting_name ) ? aSetting[ setting_name]
	appGetVars= (flow,track,step) ->
		f= ':appGetVars'
		vars= merge {}, aFlows[ flow].v, aFlows[ flow].TRACKS[ track].v, aFlows[ flow].TRACKS[ track].STEPS[ step].v
		#_log2 f, ( "#{k}:#{v}" for own k,v of vars).join ', '
		vars

	appSearchAttr= (attrNm, val)->
		for flowNm, flow of aFlows
			for trackNm, track of flow.TRACKS
				for stepNm, step of track.STEPS
					return [flowNm, trackNm, stepNm] if step[attrNm] is val
				return [flowNm, trackNm, track.start] if track[attrNm] is val
			return [flowNm, flow.start, aFlows[flow.start].start] if flow[attrNm] is val
		return false
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
						option.m1 view, model #if not E.Model[ model.class]? #%#
						oModel[ inst_nm]= new E.Model[ model.class] view, model.options
						oModel[ inst_nm].restoreState oModel[inst_nm] if inst_nm of oModel
					oM= oModel[ inst_nm]
					return oM if table_or_ctx is undef # Wanted an instance
					return oM.getTable table_or_ctx if act_if_action is undef # Wanted a vew-table
					oM.action table_or_ctx, act_if_action, data

	# Caller has requested processing a action event w/data
	action= (action_token,data) ->
		f= ':action:'+action_token
		_log2 f, data
		option.c1 inAction # if inAction isnt false #%#
		inAction= action_token
		m.startComputation()
		final= () ->
			m.endComputation() # Causes a render
		more= (action_result) ->
			_log2 f, 'cb:', action_result[ 0], action_result[ 1]
			E.App().setIssues action_result[ 0]
			E.App().setMessages action_result[ 1]
			inAction= false
			#final() # Must be called to avoid halting all rendering, but not until promise finishes
		try
			ans= _d_doAction action_token, data, E.App().getStepPath()
		finally
			if ans?.then?
			then (ans.then more).then final,( (e)-> final(); throw e) # Call final for better or for worse, in sickness or in health
			else
				# If _d_doAction fails, ans is likely undefined, and so 'more' will likely fail
				#try more ans finally final()
				setTimeout final, 0 # Same as try/finally, assuming more does not go async, but better for e.g. erorrs in model call
				more ans if ans? # Errors in _d_doAction result in no ans defined
		return

	_d_doAction= (action_token, data, original_path) ->
		f= ":_d_doAction(#{action_token})"
		#_log2 f, data, original_path
		master_issue= new Issue 'App'
		master_message= new Issue 'App'
		master_data= merge {}, data
		action_node= appFindAction original_path, action_token
		_log2 f, 'got node:', action_node
		# WARNING: "No app. entry for action_token (#{action_token}) on path (#{original_path})"
		option.ca1 action_token, original_path, action_node #if not action_node? #%#
		return [master_issue, master_message] if not action_node? # No recognized action

		d_doLeftSide= (action_node)->
			#_log2 f, 'd_doLeftSide:', {action_node}
			# Process 'fist:' or 'clear:'
			for what in ['fist','clear'] # TODO CONSIDER HANDLING clear: AS A doRightSide ACTIVITY, SO AFER do: PROCESING
				continue if what not of action_node
				option.ca4 action_token, original_path, action_node, what
				fist= action_node[ what]
				fist_model= E.fistDef[ fist].event ? 'Fist'
				#_log2 f, 'd_doLeftSide:', {what, fist, fist_model, master_data}
				if what is 'clear'
					E[fist_model]().fistClear fist, master_data.row
				else
					E[fist_model]().fistValidate r= {}, fist, master_data.row
					#_log2 f, 'd_doLeftSide:', {what,r}
					E.merge master_data, r
					return unless r.fist$success is 'SUCCESS'
			# Process 'pass:' (just a syntax check)
			nms= switch type_oau action_node.pass
				when 'A' then action_node.pass
				when 'S' then action_node.pass.split ','
				else []
			for nm,ix in nms when (nm.indexOf ':') > -1
				[name, copy_to]= nm.split ':'
				master_data[copy_to]= master_data[name]
				nms[ix]= name
			# WARNING: "Action (#{action_token}) request data is missing param #{nm}"
			option.ca2 action_token, original_path, nms, data, action_node #%#
			# Process 'set:'
			master_data[ nm]= val for nm,val of action_node.set
			# Handle 'do:'
			if action_node.do?
				is_macro= (action_node.do.indexOf '.') < 0
				if is_macro # Handle 'MACRO'
					option.ca3 action_token, original_path, action_node, aMacros #if not aMacros[action_node.do] #%#
					return d_doActionNode aMacros[action_node.do]
				[view_nm,view_act]= action_node.do.split '.'
				view_act= if view_act then view_act else action_token
				d= new m.Deferred(); r= {}; i= new E.Issue view_nm, view_act; mg= new E.Issue view_nm ,view_act
				ctx= {d,r,i,m:mg}
				ans= E[ view_nm] ctx, view_act, master_data # TODO: Process d_cb
				d_cb= ()->
					#_log2 f, 'd_doLeftSide: d_cb:', {ctx}
					master_data[ nm]= val for nm,val of ctx.r # We just polute the one object
					master_issue.addObj ctx.i
					master_message.addObj ctx.m
				_log2 f, 'd_doLeftSide: after model called:', {view_nm,view_act,master_data,ans,r:ctx.r}
				return if ans?.then? then ans.then d_cb else d_cb ans

		d_doRightSide= (action_node)->
			# Handle 'go:'
			if action_node.go?
				E.App().go action_node.go
			next_node= null
			action_node.next?= []
			action_node.next= [action_node.next] unless 'A' is type_oau action_node.next
			for choice in action_node.next
				#_log2 f+ '-d_doRightSide', 'choice', choice, master_data
				(next_node= choice; break) if 'when' not of choice
				(next_node= choice; break) if choice.when is 'default'
				(next_node= choice; break) if (typeof choice.when) is 'string' and choice.when is (master_data.success ? master_data.ok)
				matches= true
				for k,val of choice.when
					(matches= false; break;) if master_data[k] isnt val
				(next_node= choice; break) if matches
			if next_node
				#_log2 f, 'd_doRightSide:', {next_node}
				return d_doActionNode next_node
			return

		# ActionNode is { do: left_action_node, next: right_action_node }
		#	execute left_action_node then
		#	execute right_action_node
		d_doActionNode= (action_node)->
			ans= d_doLeftSide action_node
			d_rsCb= ()-> d_doRightSide action_node
			if ans?.then? then ans.then d_rsCb else d_rsCb ans

		ans= d_doActionNode action_node
		done= ()->
			[master_issue, master_message]
		err= (err) ->
			BLOWUP() # TODO DO THE END COMPUTAION _ HOPE THAT THIS RESTORES DRAWING ABILITY
		if ans?.then? then ans.then done, err else done ans

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
			issues= E[ 'issues$'+ nm] ? {}
			merge issueMap, issues
	wistDef= {}
	wistInit= ()->
		for nm in appconfs
			wists= E[ 'wist$'+ nm] ? {}
			merge wistDef, wists

	E[ nm]= obj for nm,obj of {
		type_oau # TODO SEE IF THIS WORKS FOR PEOPLE TO REPLACE E.G. $.IsArray
		Model, Extra, option
		action, merge, getModelState, setModelState
		appGetF, appGetT, appGetS, appStartT, appStartS
		appFindAction, appGetSetting, appGetVars, appFist
		appFindAttr, appSearchAttr
		fieldDef, fistDef, issueMap, wistDef
		oModel, appconfs, aFlows # Just for internal checking / testing #%#
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
	# These methods are for development support, when a Model isn't complete
	# Invoked when user does e.g. 'else super <params>'
	action: (ctx,act,params) ->             E.option.m2 @view_nm, act,params #%#
	loadTable: (tbl_nm) ->                  E.option.m3 @view_nm, tbl_nm # if tbl_nm not of @Table #%#
	fistValidate: (ctx,fistNm,row) ->       E.option.m4 @view_nm, fistNm, row #%#
	fistGetValues: (fistNm,row) ->          E.option.m5 @view_nm, fistNm, row #%#
	fistGetChoices: (fistNm,fieldNm,row) -> E.option.m6 @view_nm, fistNm, fieldNm, row #%#

w= if typeof window isnt "undefined" then window else {}
w.EpicMvc= w.E= new app w
w.E[ nm]= klass for nm,klass of {Issue, ModelJS}
# TODO NOTE This was needed, so EpicMvc-One has _log2 available as e.g. app.js's load
w._log2= ->
w._log2= Function.prototype.bind.call console.log, console #%#

if typeof module isnt "undefined" and module isnt null then module.exports = w.E #%#
if typeof define is "function" and define.amd then define () -> w.E #%#
