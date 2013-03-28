'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Issue
	constructor: (@Epic) -> @issue_list= [] # Instance member
	@Make: (epic,type,value_list) -> # Factory method
		issue= new window.EpicMvc.Issue epic
		issue.add type, value_list
		issue
	add2: (token1,token2,more) ->
		@issue_list.push type: 'token2', token1: token1, token2: token2, more: more
	add: (type,msgs) ->
		class_name= 'none'
		switch type
			when 'TEXT' then @issue_list.push type:'text', text:msgs
			else
				if /^[A-Z_]+$/.test type # Issue tokens paramed with array values (msgs)
					@issue_list.push type:'token', token:type, values:msgs
				else
					@issue_list.push type:'unknown', text:msgs
	call2: (token1, function_call_returning_issue_or_null) -> # Only add if the call failed
		@addObj2 token1, function_call_returning_issue_or_null if function_call_returning_issue_or_null
		return
	call: (function_call_returning_issue_or_null) -> # Only add if the call failed
		@addObj function_call_returning_issue_or_null if function_call_returning_issue_or_null
		return
	addObj2: (token1, issue_obj) ->
		return if typeof issue_obj isnt 'object' or not ('issue_list' of issue_obj)
		for issue in issue_obj.issue_list
			switch issue.type
				when 'text'    then @add2 token1, 'text',    [issue.msgs]
				when 'unknown' then @add2 token1, 'unknown', [issue.msgs]
				else @add2 token1, issue.token, issue.values
		return
	addObj: (issue_obj) ->
		return if typeof issue_obj isnt 'object' or not ('issue_list' of issue_obj)
		@issue_list.push issue for issue in issue_obj.issue_list
		return
	count: -> @issue_list.length
	asTable: (map) ->
		_log2 'asTable: issue_list,map', @issue_list, map
		final= []
		for issue in @issue_list
			switch issue.type
				when 'token2' then final.push issue: @map map, issue.token1, issue.token2, issue.more
				else final.push issue: (issue.text ? issue.token)
		final
	map: (map,t1,t2,more) ->
		_log2 'map:map,t1,t2,more', map, t1, t2, more
		for spec in (map or [])
			_log2 'map:spec', spec
			if (t1.match spec[0]) and (t2.match spec[1])
				return @doMap spec[2], more
		"#{t1}::#{t2}::#{more.join ','}"
	doMap: (pattern,vals) ->
		_log2 'doMap', pattern, vals
		new_str= pattern.replace /%([0-9])(?::([0-9]))?%/g, (str,i1,i2,more) ->
			_log2 str:str, i1:i1, i2:i2, more:more
			return if i2 then (vals[i1-1] or vals[i2-1] or '') else (vals[i1-1] or '')
		new_str

window.EpicMvc.Issue= Issue # Public API
