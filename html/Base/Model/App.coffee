'use strict'
# Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class App$Base extends E.ModelJS
	constructor: (view_nm, options) ->
		ss= f: null, t: null, s: null, sp: [] # Save-path stack
		super view_nm, options, ss
		@clear()
	clear: ->
		@issues= new E.Issue @view_nm
		@messages= new E.Issue @view_nm
		@invalidateTables ['Issue', 'Message']
	goTo: (flow,t,s) ->
		f= 'goTo'
		was= "#{@f}/#{@t}/#{@s}"
		@f= flow; @t= t; @s= s
		_log2 f, {was,is: "#{@f}/#{@t}/#{@s}"}
		if was isnt "#{@f}/#{@t}/#{@s}"
			@invalidateTables ['V'] # This table is specific to the 'path'
	go: (path) ->
		f= 'go:'+path
		[flow, t, s]= path.split '/'
		if not flow
			flow= @f
			if not t
				t= @t
		E.option.ap1 path, flow, t, s # Verify 2 slashes, and valid path #%#
		if not t then t= E.appStartT flow
		if not s then s= E.appStartS flow, t
		_log2 f, {flow,t,s}, @f, @t, @s
		@goTo flow, t, s
	appGet: (attr) -> E.appGetSetting attr, @f, @t, @s
	getStepPath: -> [@f, @t, @s]
	action: (ctx,act,p) ->
		f= ":App.action:#{act}"
		{r,i,m}= ctx
		switch act
			when 'path'      then @go p.path
			when 'push' then @sp.push [@f, @t, @s]
			when 'pop'
				if @sp.length then q= @sp.pop(); @goTo q[0], q[1], q[2]
			when 'add_message' then m.add p.type, p.msgs
			when 'add_issue'   then i.add p.type, p.msgs
			when 'clear' then @clear()
			when 'route' # p.route
				path= E.appSearchAttr 'route', p.route
				if path is false
					r.success= 'FAIL'
				else
					@goTo path[0], path[1], path[2]
					r.success= 'SUCCESS'
			when 'parse_hash' # p.hash
				[route,code]= p.hash.split '~' # Signifies token is attached
				if code?
					E.merge r, {type: 'code', route, code}
				else
					path= E.appSearchAttr 'route', route
					if path is false
						r.success= 'FAIL'
						E.merge r, {type: 'route', route} # For chaining to other logic (navhash #login checking)
					else E.merge r, {type: 'path', route, path: path.join '/'}
			else super ctx, act, p
	setIssues: (issue_obj) ->
		@issues.addObj issue_obj if issue_obj?.count() isnt 0
		@invalidateTables ['Issue']
	setMessages: (issue_obj) ->
		@messages.addObj issue_obj if issue_obj?.count() isnt 0
		@invalidateTables ['Message']
	loadTable: (tbl_nm) ->
		map= E['issues$'+ @appGet 'group']
		@Table[ tbl_nm]= switch tbl_nm
			when 'Message' then @messages.asTable map
			when 'Issue'   then @issues.asTable   map
			when 'V'       then [ E.appGetVars @f, @t, @s ]
			else super tbl_nm
		return

E.Model.App$Base= App$Base
