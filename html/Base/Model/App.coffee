'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

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
		if not flow or not E.appGetF(flow)?
			[flow, t, s]= (E.appGetSetting 'go').split '/'
		else if not t? or not E.appGetT(flow, t)?
			t= E.appStartT flow; s= E.appStartS flow, t
		else if not s? or not E.appGetS( flow, t, s)?
			s= E.appStartS flow, t
		@f= flow; @t= t; @s= s
		#_log2 f, {was,is: "#{@f}/#{@t}/#{@s}"}
		if was isnt "#{@f}/#{@t}/#{@s}"
			@invalidateTables ['V'] # This table is specific to the 'path'
	go: (path) ->
		f= 'go'
		q= path.split '/'
		#_log2 f, 'before', q, @f, @t, @s
		for v,ix in [@f, @t, @s]
			if not (q[ix]?.length) then q[ix]= v else break # Stop at first set value, rest will default
		#_log2 f, 'after', q, @f, @t, @s
		@goTo q[0], q[1], q[2]
	appGet: (attr) -> E.appGetSetting attr, @f, @t, @s
	getStepPath: -> [@f, @t, @s]
	action: (ctx,act,p) ->
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
			else  super ctx, act, p
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
