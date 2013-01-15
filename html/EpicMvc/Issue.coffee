'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Issue
	constructor: (@Epic) -> @issue_list= [] # Instance member
	@Make: (epic,type,value_list) -> # Factory method
		issue= new window.EpicMvc.Issue epic
		issue.add type, value_list
		issue
	add: (type,msgs) ->
		class_name= 'none'
		switch type
			when 'TEXT' then @issue_list.push type:'text', text:msgs
			else
				if /^[A-Z_]+$/.test type # Issue tokens paramed with array values (msgs)
					@issue_list.push type:'token', token:type, values:msgs
				else
					@issue_list.push type:'unknown', text:msgs
	call: (function_call_returning_issue_or_null) -> # Only add if the call failed
		@addObj function_call_returning_issue_or_null if function_call_returning_issue_or_null
		return
	addObj: (issue_obj) ->
		return if typeof issue_obj isnt 'object' or not ('issue_list' of issue_obj)
		@issue_list.push issue for issue in issue_obj.issue_list
		return
	count: -> @issue_list.length
	asTable: -> (issue: (issue.text ? issue.token) for issue in @issue_list)

window.EpicMvc.Issue= Issue # Public API
