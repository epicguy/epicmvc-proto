'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Epic
	constructor: ->
		#TODO CONSIDER CACHE OF PAGEFLOW IN EPIC, SINCE EPIC USES IT EXTENSIVLY
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
		@modelState= {}

	#log1: window.Function.prototype.bind.call( window.console.log, window.console)
	log1: () -> null
	#log2: window.Function.prototype.bind.call( window.console.log, window.console)
	log2: () -> null
	nextCounter: -> ++@counter
	getInstanceNm: (view_nm) ->
		inst_nm= @oAppConf.getObj view_nm, 'inst'
	getInstance: (view_nm) ->
		inst_nm= @oAppConf.getObj view_nm, 'inst'
		if inst_nm not of @oModel
			cls= @oAppConf.getObj view_nm, 'class'
			UNKOWN_MODEL() if cls not of window.EpicMvc.Model
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
			@oFist[inst_nm]= new window.EpicMvc.Fist @, g, fist_nm, view_nm
		@oFist[inst_nm]
	Execute: (va,params) ->
		@log2 'Epic.Execute', va, params
		[view_nm, action]= va.split '/'
		oM= @getInstance view_nm
		oM.action action, params
	run: (appconfs,artifact_load_strategy_class,render_class) ->
		return true if @guard_run # Called twice for some reason
		@guard_run= true
		loader=   new window.EpicMvc.Extras[ artifact_load_strategy_class] @
		renderer= new window.EpicMvc.Extras[ render_class] @
		@init appconfs, loader, renderer
	init: (@appconfs, @loader, @renderer) ->
		@oRequest=        new window.EpicMvc.Request @
		@oFistGroupCache= new window.EpicMvc.FistGroupCache @, @loader
		@oAppConf=        new window.EpicMvc.AppConf @, @loader
		@oView=           new window.EpicMvc.ViewExe @, @loader
		f= @oAppConf.loginF() # Find initial pageflow state
		(@getInstance 'Pageflow').goTo f
		true
	isSecurityError: (e) ->
		special= 'Security'
		return true if e?.message?.substring? and (e.message.substring 0, special.length) is special
		false
	getFormData: -> @renderer.getFormData()
	renderStrategy: (content,first_time) ->
		@renderer.render content, @inClick
		null
	render: (template,page,avoid_form_reset) ->
		@oView.init template, page
		try
			stuff= @oView.run()
		catch e
			if @isSecurityError e then return e
			else throw e
		@renderStrategy stuff
		o.eventInitializePage?() for k,o of @oFist if avoid_form_reset isnt true # Load widgets (i.e. fileuploader)
		true # No security issues
	refresh: (forTables) =>
		if @inClick is true
			setTimeout (=> @refresh forTables), 500
		else @renderSecure true if @oView.checkRefresh forTables
	click: (click_index) ->
		f= ':click'
		@log2 f, click_index
		if @inClick isnt false then alert 'WARNING: You are already in click'
		@inClick= click_index
		window.event?.returnValue = false #IE
		o.eventNewRequest?() for k,o of @oFist # Removing state where appropriate
		o.eventNewRequest?() for k,o of @oModel
		@oRequest.start click_index if click_index
		oC= new window.EpicMvc.ClickAction @
		click_result= oC.click()
		oPf= @getInstance 'Pageflow'
		oPf.setIssues click_result[0]
		oPf.setMessages click_result[1]
		@modelState= {}
		@modelState[k]= ss for k,o of @oModel when o.saveState? and ss= o.saveState()
		@renderSecure()
		@inClick= false
	renderSecure: (avoid_form_reset) ->
		oC= new window.EpicMvc.ClickAction @
		oPf= @getInstance 'Pageflow'
		render_result= false
		render_attempts= 3
		while render_result!= true and --render_attempts> 0
			sp= oPf.getStepPath()
			if render_result!= false # Process secuirty exception (as click action)
				oC.click render_result.message, sp
			# Find names of template, page
			sp= oPf.getStepPath()
			template= @oAppConf.findTemplate sp
			# Attempt to render view (by loading template, page, etc.)
			render_result= @render template, @oAppConf.getPage( sp), avoid_form_reset
		# Process defered logic (e.g. generate keyup in a listview-filter) <epic:defer>
		@oView.doDefer()
	getModelState: -> @modelState
	setModelState: (s) ->
		@modelState= s if s?
		#@log2 ':setModelState', s, @modelState
		for inst_nm of @oModel
			@oModel[inst_nm].restoreState? @modelState[inst_nm]

window.EpicMvc= Extras: {}, Model: {}, Epic: new Epic() # Singleton, Public API
