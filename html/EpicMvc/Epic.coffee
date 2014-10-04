'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Epic
	constructor: ->
		@oAppConf= null
		@oFistGroupCache= null
		@getFistGroupCache= -> @oFistGroupCache
		@oModel= {} # Model instances, including e.g. Pageflow, Tag, Security
		@oFist= {} # Fist instances
		@counter= 0 # A counter value to get unique numbers per epic instance
		@guard_run= false # Protect @run from being called more than once
		@inClick= false
		@wasModal= false
		@modelState= {}
		@content_watch= [] # Callers that are watching changes in content
		@click_path_changed= {} # .flow, .track, .step (true/false-or-undefined) (for eventNewRequest)
		@options=
			click_warning_text: 'WARNING: Still processing previous click event (check for javascript errors.)'

	nextCounter: -> ++@counter
	getPageflowPath: () ->
		@getInstance( 'Pageflow').getStepPath().join '/'
	getInstanceNm: (view_nm) ->
		inst_nm= @oAppConf.getObj view_nm, 'inst'
	getInstance: (view_nm) ->
		inst_nm= @oAppConf.getObj view_nm, 'inst'
		if inst_nm not of @oModel
			cls= @oAppConf.getObj view_nm, 'class'
			if not window.EpicMvc.Model[cls]? # TODO CALL A DEBUG THINGY W/TOKEN AND view_nm/cls
				alert ":Epic.getInstance: (app.js) MODELS: #{view_nm}: class: #{cls} [(#{cls}) not in window.EpicMvc.Model]"
			@oModel[inst_nm]= new window.EpicMvc.Model[ cls] @, view_nm
			#_log2 ':getInstance', inst_nm, @modelState
			@oModel[inst_nm].restoreState @modelState[inst_nm] if inst_nm of @modelState
		@oModel[inst_nm]
	getViewTable: (view_tbl_nm) ->
		a= view_tbl_nm.split '/'
		@getInstance( a[0]).getTable a[1]
	getLookaheadClick: (planned_action) ->
		sp= @getInstance( 'Pageflow').getStepPath()
		@oAppConf.findClick sp, planned_action
	getDomCache: ->
		sp= @getInstance( 'Pageflow').getStepPath()
		attr= @oAppConf.getS( sp[0], sp[1], sp[2]).dom_cache
		return attr if typeof attr == 'string'
		false
	getExternalUrl: ->
		sp= @getInstance( 'Pageflow').getStepPath()
		attr= @oAppConf.getS( sp[0], sp[1], sp[2]).url
		return false unless typeof attr == 'string'
		a= attr.split '/'
		@getInstance( a[0]).action( a[1], {})[0].url
	getGroupNm: ->
		oPf= @getInstance 'Pageflow'
		[ts, t]= oPf.getTrackPath()
		@oAppConf.getGroupNm ts, t
	getFistInstance: (flist_nm,grp_nm) -> # grp_nm optional
		g= grp_nm ? @getGroupNm()
		fist_nm= @getFistGroupCache().getCanonicalFist g, flist_nm
		inst_nm= "#{g}_#{fist_nm}"
		if not (inst_nm of @oFist)
			view_nm= @oAppConf.getFistView g, fist_nm
			@oFist[inst_nm]= new window.EpicMvc.Fist @, g, fist_nm, view_nm, flist_nm
		@oFist[inst_nm]
	Execute: (va,params) ->
		_log2 ':Execute', va, params
		[view_nm, action]= va.split '/'
		oM= @getInstance view_nm
		oM.action action, params
	run: (appconfs,artifact_load_strategy_class,render_class,content_watch, options) ->
		return true if @guard_run # Called twice for some reason
		@guard_run= true
		@options[ nm]= nm for nm of options # TODO REWRITE NEW $.extend
		loader=   new window.EpicMvc.Extras[ artifact_load_strategy_class] @
		renderer= new window.EpicMvc.Extras[ render_class] @, content_watch
		@init appconfs, loader, renderer, content_watch
	init: (@appconfs, @loader, @renderer, @content_watch) ->
		@oFistGroupCache= new window.EpicMvc.FistGroupCache @, @loader
		@oAppConf=        new window.EpicMvc.AppConf @, @loader # Uses @loader in constructor
		flow= @oAppConf.loginF() # Find initial pageflow state
		(@getInstance 'Pageflow').goTo flow
		true
	isSecurityError: (e) ->
		special= 'Security'
		return true if e?.message?.substring? and (e.message.substring 0, special.length) is special
		false
	getFormData: -> @renderer.getFormData()
	renderStrategy: (content,history,click_index,modal) ->
		if content isnt false
			@renderer.render content, history, click_index, modal
		else
			@renderer.handleRenderState history, click_index
		null
	render: (layout,sp,avoid_form_reset) ->
		page= @oAppConf.getPage sp
		modal= @oAppConf.findAttr sp[0], sp[1], sp[2], 'modal'
		if modal
			layout= @oAppConf.mapModalLayout modal
		#TODO IS THIS SET ON ACTION, NOT PAGE? SHOULD I USE FIND-ATTR? history= @oAppConf.getHistory sp
		history= switch "#{if @wasModal then 1 else 0}:#{if modal then 1 else 0}"
			when '0:0' then true
			when '1:0' then 'replace'
			when '0:1' then false
			when '1:1' then false
			else alert 'my code is hosed'
		oView= @getInstance 'View'
		oView.init layout, page
		try
			stuff= oView.run()
		catch e
			# TODO REWRITE FIGURE OUT HOW WE WANT TO HANDLE SECURITIY ISSUES DURING RENDER; TRY TO SIMPLIFY THE CORE
			_log2 ':render error', e, e.stack
			if @isSecurityError e then return e
			else @inClick= false; throw e
		@renderStrategy stuff, history, @inClick, modal
		o.eventInitializePage?() for k,o of @oFist if avoid_form_reset isnt true # Load widgets
		@wasModal= modal
		true # No security issues
	login: ->
		f= ':login'
		_log2 f, @oModel
		for k,o of @oModel when o.eventLogin?() # True to (TODO)
			continue
	logout: (click_event, click_data)->
		if @inClick isnt false
			setTimeout (=> @logout click_event, click_data), 100
			return
		@makeClick false, click_event, click_data, true if click_event
		for k,o of @oModel when o.eventLogout?() # True to reset model and state
			delete @modelState[k]
			delete @oModel[k]
		@oFist= {}
	makeClick: (form_flag,action,params,render_flag) -> # Convience method to build click on the fly
		f= ':makeClick:'+action
		_log2 f, 'form?'+(if form_flag then 'Y' else 'N'), 'render'+(if render_flag then 'Y' else 'N'), params
		p_action= {}
		p_action[ if form_flag then '_b' else '_a']= action
		click_index= @oRequest.addLink $.extend p_action, params
		@click click_index, not render_flag
		click_index
	click: (action_token,data,no_render) ->
		f= ':click'
		_log2 f, action_token, data
		if @inClick isnt false and @options.click_warning_text isnt false then alert @options.click_warning_text

		oPf= @getInstance 'Pageflow'
		before_sp= oPf.getStepPath()
		if action_token and no_render isnt true
			planned_action= action_token
			first_node= @oAppConf.findClick before_sp, planned_action if planned_action
			no_render= true if first_node and (first_node.hasAttr 'dynamic') is true # app.coffee CLICKS: some_action: dynamic:true
			_log2 f, 'render?', no_render: no_render, sp: before_sp, action: planned_action, node: first_node
		@inClick= action_token if not no_render

		# TODO REWRITE FIND WAY TO MOVE FIST/MODEL STATE DURING FLOWS, TO APP.COFFEE
		o.eventNewRequest?( @click_path_changed) for k,o of @oFist # Removing state where appropriate
		o.eventNewRequest?( @click_path_changed) for k,o of @oModel

		oC= new window.EpicMvc.ClickAction @
		click_result= oC.click action_token, data
		after_sp= oPf.getStepPath()
		oPf.setIssues click_result[0]
		oPf.setMessages click_result[1]
		action_attrs= click_result[2]
		@click_path_changed.flow=  (before_sp[0]) isnt (after_sp[0])
		@click_path_changed.track= @click_path_changed.flow  or (before_sp[1]) isnt (after_sp[1])
		@click_path_changed.step=  @click_path_changed.track or (before_sp[2]) isnt (after_sp[2])
		@modelState= {}
		@modelState[k]= ss for k,o of @oModel when o.saveState? and ss= o.saveState()
		if no_render isnt true or @click_path_changed.step
			@renderSecure()
		else
			@renderStrategy false, 'replace', click_index
		@inClick= false
	renderSecure: (avoid_form_reset) ->
		f= ':renderSecure'
		_log2 f, 'start, avoid_form_reset', avoid_form_reset
		oC= new window.EpicMvc.ClickAction @
		oPf= @getInstance 'Pageflow'
		render_result= false
		render_attempts= 3
		while render_result!= true and --render_attempts> 0
			_log2 f, (if render_result is true then 'T' else if render_result is false then 'F' else render_result), render_attempts
			sp= oPf.getStepPath()
			if render_result!= false # Process secuirty exception (as click action)
				oC.click render_result.message, sp
			# Find names of layout, page
			sp= oPf.getStepPath()
			layout= @oAppConf.findLayout sp
			# Attempt to render view (by loading layout, page, etc.)
			render_result= @render layout, sp, avoid_form_reset
	getModelState: -> @modelState
	setModelState: (s) ->
		@modelState= s if s?
		#_log2 ':setModelState', s, @modelState
		for inst_nm of @oModel
			@oModel[inst_nm].restoreState? @modelState[inst_nm]

# O, O (dupo)
# A, A (dupa)
# U, !o/a/U (dupu)
# S, !o/a/U =(dups)
deep_extend= (dest,sources...) ->
	# Dest rule: either object or array; sources must be the same (if deep is false, can be non o/a to copy only
	# Dest's items are either non o/a, so source's must also be, and will copy, else o or a: use extend
	# If Dest is array, walk source to copy to dest
	otype= '[object Object]'
	atype= '[object Array]'
	utype= 'undefined'
	stype= 'scalar'
	func[ otype]= (dest,source)-> # Dest is an object, source must also be
		return undefined if typeof source isnt otype
		for snm of source
			ans= dup( dest[ snm], source[ snm])
			dest[ snm]= ans if ans isnt undefined
		undefined
	func[ atype]= (dest,source)-> # Update 'dest' as an array
		reutrn undefined if typeof want isnt atype # only copy if same type
		for sinx of source
			ans= dup( dest[ sinx], source[ sinx])
			dest[ sinx]= ans if ans isnt undefined
		undefined
	func[ utype]= (was,want)-> # Return new value, caller will assign
		if typeof was not in [otype, atype] # Non objects are just copied, if 'want' isnt also an object
			return want if typeof want not in [otype, atype]
			return was # Don't copy to non object from object
		return was if typeof was isnt typeof want # Nested items must be same type
	func[ stype]= (was,want) -> # Copy if source isnt o/a/U
		return want if typeof want of func
		return was # May be undefined, which works
	dup= (dest, source) ->
		type= typeof dest
		type= stype if type not of func
		func[ typeof dest]( dest, source)
	for source in sources
		dup dest, source
	return dest

window.EpicMvc= deep_extend: deep_extend, Extras: {}, Model: {}, Epic: new Epic() # Singleton, Public API
