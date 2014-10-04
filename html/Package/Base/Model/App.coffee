'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class App$Base extends E.ModelJS
	constructor: (view_nm, options) ->
		ss= f: null, t: null, s: null, sp: [] # Save-path stack
		super view_nm, options, ss
		@Table= {}
	goTo: (f,t,s) ->
		was= "#{@f}/#{@t}/#{@s}"
		if not f or not E.appGetF(f)?
			[f, t, s]= (E.appGetOpt 'go').split '/'
		else if not t? or not E.appGetT(f, t)?
			t= E.appStartT f; s= E.appStartS f, t
		else if not s? or not E.appGetS( f, t, s)?
			s= E.appStartS f, t
		@f= f; @t= t; @s= s
		if was isnt "#{@f}/#{@t}/#{@s}"
			@invalidateTables ['V'] # This table is specific to the 'path'
	go: (path) ->
		q= path.split '/'
		for v,ix in [@f, @t, @s]
			if not (q[ix]?.length) then q[ix]= v else break # Stop at first set value, rest will default
		@goTo q[0], q[1], q[2]
	appGet: (attr) -> E.appGetAttr @f, @t, @s, attr
	getStepPath: -> [@f, @t, @s]
	action: (ctx,act,p) ->
		switch act
			when 'path'      then @go p.path
			when 'save_path' then @sp.push [@f, @t, @s]
			when 'restore_path'
				if @sp.length then q= @sp.pop(); @goTo q[0], q[1], q[2]
			when 'add_message' then m.add p.type, p.msgs
			when 'add_issue'   then i.add p.type, p.msgs
			when 'clear'
				@issues= new E.Issue @view_nm
				@messages= new E.Issue @view_nm
				@invalidateTables ['Issue', 'Message']
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
			when 'V'
				row= E.appGetVars @f, @t, @s
				row.LAYOUT= @appGet 'layout'
				row.PAGE= @appGet 'page'
				row.MODAL= @appGet 'modal'
				[ row ]
			else super tbl_nm
		return

E.Model.App$Base= App$Base
