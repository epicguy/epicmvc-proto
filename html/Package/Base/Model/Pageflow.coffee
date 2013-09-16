'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Pageflow extends window.EpicMvc.ModelJS
	constructor: (epic,view_nm) ->
		ss= f: null, t: null, s: null, sp: [] # Save-path stack
		super epic, view_nm, ss
		@eventNewRequest()
	eventNewRequest: ->
		@issues= new window.EpicMvc.Issue @Epic, @view_nm
		@messages= new window.EpicMvc.Issue @Epic, @view_nm
		@Table= {}
	goTo: (f,t,s) ->
		oC= @Epic.appConf()
		if not f? or not oC.getF(f)?
			f= oC.loginF(); t= oC.startT f; s= oC.startS f, t
		else if not t? or not oC.getT(f, t)?
			t= oC.startT f; s= oC.startS f, t
		else if not s? or not oC.getS( f, t, s)?
			s= oC.startS f, t
		@f= f; @t= t; @s= s
	go: (path) ->
		q= path.split '/'
		for v,ix in [@f, @t, @s]
			if not (q[ix]?.length) then q[ix]= v else break # Stop at first set value, rest will default
		@goTo q[0], q[1], q[2]
	getF: -> @f
	getTrackPath: -> [@f, @t]
	getStepPath: -> [@f, @t, @s]
	action: (a,p) ->
		r= {}
		i= new window.EpicMvc.Issue @Epic, @view_nm, a
		m= new window.EpicMvc.Issue @Epic, @view_nm, a
		switch a
			when 'flow'      then @goTo p.flow
			when 'track'     then @goTo @f, p.track
			when 'step'      then @goTo @f, @t, p.step
			when 'refresh'   then null # Do nothing
			when 'save_path' then @sp.push [@f, @t, @s]
			when 'path'      then @go p.path
			when 'restore_path'
				if @sp.length then q= @sp.pop(); @goTo q[0], q[1], q[2]
			when 'add_message' then m.add p.type, p.msgs
			when 'add_issue'   then i.add p.type, p.msgs
			else  super a, p
		[r, i, m]
	setIssues: (issue_obj) ->
		@issues.addObj issue_obj if issue_obj?.count() isnt 0
		@invalidateTables ['Issue']
	setMessages: (issue_obj) ->
		@messages.addObj issue_obj if issue_obj?.count() isnt 0
	loadTable: (tbl_nm) ->
		map= window.EpicMvc['issues$'+ @Epic.appConf().getGroupNm()]
		@Table[ tbl_nm]= switch tbl_nm
			when 'Message' then @messages.asTable map
			when 'Issue'   then @issues.asTable   map
			when 'V'   then [ @Epic.appConf().getVars @f, @t, @s ]
			else super tbl_nm
		return

window.EpicMvc.Model.Pageflow$Base= Pageflow
