'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Epic
	constructor: ->
		@appNm= 'Epic::appNm=NOT-SET'
		@oView= null
		@getView= -> @oView
		@oAppConf= null
		@appConf= -> @oAppConf
		@oRequest= null
		@request= -> @oRequest
		@oFistGroupCache= null
		@getFistGroupCache= -> @oFistGroupCache
		@v= appConf: null
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

	#log1: window.Function.prototype.bind.call( window.console.log, window.console)
	log1: () -> null
	#log2: window.Function.prototype.bind.call( window.console.log, window.console)
	log2: () -> null
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
			#@log2 ':getInstance', inst_nm, @modelState
			@oModel[inst_nm].restoreState @modelState[inst_nm] if inst_nm of @modelState
		@oModel[inst_nm]
	getViewTable: (view_tbl_nm) ->
		a= view_tbl_nm.split '/'
		@getInstance( a[0]).getTable a[1]
	getLookaheadClick: (planned_action) ->
		sp= @getInstance( 'Pageflow').getStepPath()
		@oAppConf.findClick planned_action, sp
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
		@log2 ':Execute', va, params
		[view_nm, action]= va.split '/'
		oM= @getInstance view_nm
		oM.action action, params
	run: (appconfs,artifact_load_strategy_class,render_class,content_watch, options) ->
		return true if @guard_run # Called twice for some reason
		@guard_run= true
		$.extend @options, options
		loader=   new window.EpicMvc.Extras[ artifact_load_strategy_class] @
		renderer= new window.EpicMvc.Extras[ render_class] @, content_watch
		@init appconfs, loader, renderer, content_watch
	init: (@appconfs, @loader, @renderer, @content_watch) ->
		@oRequest=        new window.EpicMvc.Request @
		@oFistGroupCache= new window.EpicMvc.FistGroupCache @, @loader
		@oAppConf=        new window.EpicMvc.AppConf @, @loader # Uses @loader in constructor
		@oView=           new window.EpicMvc.ViewExe @, @loader, @content_watch # Uses AppConf in constructor
		flow= @oAppConf.loginF() # Find initial pageflow state
		(@getInstance 'Pageflow').goTo flow
		true
	isSecurityError: (e) ->
		special= 'Security'
		return true if e?.message?.substring? and (e.message.substring 0, special.length) is special
		false
	getFormData: -> @renderer.getFormData()
	renderStrategy: (content,history,click_index,modal) ->
		@renderer.render content, history, click_index, modal
		null
	render: (template,sp,avoid_form_reset) ->
		page= @oAppConf.getPage sp
		modal= @oAppConf.findAttr sp[0], sp[1], sp[2], 'modal'
		if modal
			template= @oAppConf.mapModalTemplate modal
			modal= true
		#TODO IS THIS SET ON ACTION, NOT PAGE? SHOULD I USE FIND-ATTR? history= @oAppConf.getHistory sp
		history= switch "#{Number @wasModal}:#{Number modal}"
			when '0:0' then true
			when '1:0' then 'replace'
			when '0:1' then false
			when '1:1' then false
			else alert 'my code is hosed'
		@oView.init template, page
		try
			stuff= @oView.run()
		catch e
			@log2 ':render error', e
			if @isSecurityError e then return e
			else @inClick= false; throw e
		@renderStrategy stuff, history, @inClick, modal
		o.eventInitializePage?() for k,o of @oFist if avoid_form_reset isnt true # Load widgets (i.e. fileuploader)
		@wasModal= modal
		true # No security issues
	login: ->
		f= ':login'
		@log2 f, @oModel
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
	refresh: (forTables) =>
		if @inClick is true
			setTimeout (=> @refresh forTables), 500
		else @renderSecure true if @oView.checkRefresh forTables
	makeClick: (form_flag,action,params,render_flag) -> # Convience method to build click on the fly
		f= ':makeClick:'+action
		@log2 f, 'form?'+(if form_flag then 'Y' else 'N'), 'render'+(if render_flag then 'Y' else 'N'), params
		p_action= {}
		p_action[ if form_flag then '_b' else '_a']= action
		click_index= @oRequest.addLink $.extend p_action, params
		@click click_index, not render_flag
		click_index
	click: (click_index,no_render) ->
		f= ':click'
		@log2 f, click_index
		if @inClick isnt false and @options.click_warning_text isnt false then alert @options.click_warning_text
		@inClick= click_index if not no_render
		window.event?.returnValue = false #IE
		#TODO ALSO DO PREVENT DEFAULT, AND REMOVE THOSE RETURN FALSE'S
		#TODO CONSIDER NOT DOING NEW-REQUEST IF NO_RENDER?
		o.eventNewRequest?( @click_path_changed) for k,o of @oFist # Removing state where appropriate
		o.eventNewRequest?( @click_path_changed) for k,o of @oModel
		@oRequest.start click_index if click_index
		oPf= @getInstance 'Pageflow'
		before_sp= oPf.getStepPath()
		oC= new window.EpicMvc.ClickAction @
		click_result= oC.click()
		after_sp= oPf.getStepPath()
		oPf.setIssues click_result[0]
		oPf.setMessages click_result[1]
		@click_path_changed.flow=  (before_sp[0]) isnt (after_sp[0])
		@click_path_changed.track= @click_path_changed.flow  or (before_sp[1]) isnt (after_sp[1])
		@click_path_changed.step=  @click_path_changed.track or (before_sp[2]) isnt (after_sp[2])
		@modelState= {}
		@modelState[k]= ss for k,o of @oModel when o.saveState? and ss= o.saveState()
		@renderSecure() if no_render isnt true or @click_path_changed.step
		@inClick= false
	renderSecure: (avoid_form_reset) ->
		f= ':renderSecure'
		oC= new window.EpicMvc.ClickAction @
		oPf= @getInstance 'Pageflow'
		render_result= false
		render_attempts= 3
		while render_result!= true and --render_attempts> 0
			@log2 f, (if render_result is true then 'T' else if render_result is false then 'F' else render_result), render_attempts
			sp= oPf.getStepPath()
			if render_result!= false # Process secuirty exception (as click action)
				oC.click render_result.message, sp
			# Find names of template, page
			sp= oPf.getStepPath()
			template= @oAppConf.findTemplate sp
			# Attempt to render view (by loading template, page, etc.)
			render_result= @render template, sp, avoid_form_reset
		# Process defered logic (e.g. generate keyup in a listview-filter) <epic:defer>
		@oView.doDefer()
	getModelState: -> @modelState
	setModelState: (s) ->
		@modelState= s if s?
		#@log2 ':setModelState', s, @modelState
		for inst_nm of @oModel
			@oModel[inst_nm].restoreState? @modelState[inst_nm]

window.EpicMvc= Extras: {}, Model: {}, Epic: new Epic() # Singleton, Public API
