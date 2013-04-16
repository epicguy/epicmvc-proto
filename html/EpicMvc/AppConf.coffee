'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class AppConf
	constructor: (@Epic,@loadStrategy) ->
		@config= @loadStrategy.getCombinedAppConfs()
		@config.CLICKS?= {}
		@config.MACROS?= {}
		@config.OPTIONS.frame?= {}
		@config.FORMS= false
	# MODELS map functions
	getObj: (view_name,attribute) ->

		if view_name not of @config.MODELS
			alert ":AppConf.getObj: (app.js) MODELS: #{view_name}: [(#{view_name}) not in MODELS:, check spelling/case]"
		if attribute not of @config.MODELS[view_name]
			a= @confiig.XXX[ view_name+'#'+attribute+'#'+(nm for nm of @config.MODELS[view_name])]

		@config.MODELS[view_name][attribute]
	loadFormsIf: ->
		if @config.FORMS is false # First time, build index
			@config.FORMS= {}
			for own view_nm, node of @config.MODELS
				continue if not ('forms' of node)
				group= node.group
				group?= @config.OPTIONS.settings.group
				@config.FORMS[group]?= {}
				for form_nm in node.forms.split ','
					@config.FORMS[group][form_nm]= view_nm
		@config.FORMS
	getFistView: (group_nm,fist_nm) ->
		@loadFormsIf()
		@config.FORMS[group_nm][fist_nm]
	# Flow functions
	findNode: (f,t,s,cat,nm) ->
		nf= @config.FLOWS[f]
		if nf
			if t and (nt= nf.TRACKS?[t])?
				if s and (ns= nt.STEPS?[s])?
					if (ncat= ns[cat]?[nm])? then return ncat
				if (ncat= nt[cat]?[nm])? then return ncat
			if (ncat= nf[cat]?[nm])? then return ncat
		false
	findAttr: (f,t,s,attr) ->
		nf= @config.FLOWS[f]
		if nf
			if t and (nt= nf.TRACKS?[t])?
				if s and (ns= nt.STEPS?[s])?
					if (nattr= ns[attr])? then return nattr
				if (nattr= nt[attr])? then return nattr
			if (nattr= nf[attr])? then return nattr
		false
	getF: (f)     -> @config.FLOWS[f]
	getT: (f,t)   -> @config.FLOWS[f].TRACKS[t]
	getS: (f,t,s) -> @config.FLOWS[f].TRACKS[t].STEPS[s]

	startT: (f)   -> @getF(f).start
	startS: (f,t) -> @getT(f,t).start

	getPage: (p) -> @getS(p[0],p[1],p[2]).page

	getMacro: (nm) -> @config.MACROS[nm]
	getMacroNode: (nm) ->
		node= @getMacro nm
		return new window.EpicMvc.ConfExe node if node
		false

	loginF: -> @config.OPTIONS.login.flow

	findClick: (p,a) ->
		node= @findNode p[0], p[1], p[2], 'CLICKS', a
		if node== false and (n= @config.CLICKS[a])? then node= n
		return new window.EpicMvc.ConfExe node if node
		null
	mapModalTemplate: (modal) ->
		@config.OPTIONS.template[modal] || modal
	findTemplate: (f,t,s) ->
		if typeof t is 'undefined' then s= f[2]; t=f[1]; f= f[0]
		template= ( @findAttr f, t, s, 'template' ) || @config.OPTIONS.template.default
	getShowIssues: (f,t) ->
		group= ( @findAttr f, t, false, 'show_issues' ) || @config.OPTIONS.settings.show_issues
	getGroupNm: (f,t) ->
		group= ( @findAttr f, t, false, 'group' ) || @config.OPTIONS.settings.group
	getVars: (f,t,s) ->
		vars= $.extend {}, @config.FLOWS[f].v, @config.FLOWS[f].TRACKS[t].v, @config.FLOWS[f].TRACKS[t].STEPS[s].v
		@Epic.log2 ( "#{k}:#{v}" for own k,v of vars).join ', '
		vars

	# returns: Object indexed by frame name (caller may alpha-sort for render order)
	#Example: OPTIONS: frame: 499_BaseDevl: 'bdev' (view/bdev.frame.html)
	getFrames: -> @config.OPTIONS.frame

window.EpicMvc.AppConf= AppConf # Public API
