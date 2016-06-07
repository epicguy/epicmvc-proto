'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Issue
	constructor: (@Epic, @t_view, @t_action) -> @issue_list= [] # Instance member
	@Make: (epic,view,type,value_list) -> # Factory method (no t_view/t_action)
		issue= new window.EpicMvc.Issue epic, view
		issue.add type, value_list
		issue
	add: (type,msgs) ->
		f= ':Issue.add:'+@t_view+':'+@t_action
		@Epic.log2 f, 'params:type/msgs', type, msgs
		switch typeof msgs
			when 'undefined' then msgs= []
			when 'string' then msgs [ msgs ]
		switch type
			when 'TEXT' then @issue_list.push token:'text', more:msgs, t_view: @t_view, t_action: @t_action
			else
				if /^[a-zA-Z0-9_]+$/.test type # Issue tokens paramed with array more (msgs)
					@issue_list.push token:type, more:msgs, t_view: @t_view, t_action: @t_action
				else
					alert f+ ' - Unknown "type" for Issue.add '+ type
					@issue_list.push token:'unknown', more:[type], t_view: @t_view, t_action: @t_action
		#@Epic.log2 f, @issue_list[@issue_list.length- 1]
	call: (function_call_returning_issue_or_null) -> # Only add if the call failed
		@addObj function_call_returning_issue_or_null if function_call_returning_issue_or_null
		return
	addObj: (issue_obj) ->
		f= ':Issue.addObj:'+ @t_view+'#'+@t_action
		return if typeof issue_obj isnt 'object' or not ('issue_list' of issue_obj)
		#@Epic.log2 f, 'issue_list', issue_obj.issue_list
		for issue in issue_obj.issue_list
			new_issue= $.extend true, {}, issue
			new_issue.t_view?= @t_view
			new_issue.t_action?= @t_action
			@issue_list.push new_issue
		return
	count: -> @issue_list.length
	asTable: (map) ->
		#@Epic.log2 'asTable: issue_list,map', @issue_list, map
		final= []
		for issue in @issue_list
			final.push
				title: "#{issue.t_view}##{issue.t_action}##{issue.token}##{issue.more.join ','}"
				issue: @map map, issue.t_view, issue.t_action, issue.token, issue.more
		final
	map: (map,t_view,t_action,token,more) ->
		if typeof map isnt 'object' then return "#{t_view}##{t_action}##{token}##{more.join ','}"
		map_list= []
		if t_view of map
			if t_action of map[t_view]
				map_list.push map[t_view][t_action]
			if 'default' of map[t_view]
				map_list.push map[t_view].default
		if 'default' of map
			if t_action of map.default
				map_list.push map.default[t_action]
			if 'default' of map.default
				map_list.push map.default.default
		#@Epic.log2 'map:tv,ta,token,more,map_list.length', t_view, t_action, token, more, map_list.length
		for sub_map in map_list
			for spec in (sub_map or [])
				#@Epic.log2 'map:spec', spec
				if token.match spec[0]
					return @doMap spec[1], more
		"#{t_view}##{t_action}##{token}##{more.join ','}"
	doMap: (pattern,vals) ->
		#@Epic.log2 'doMap', pattern, vals
		new_str= pattern.replace /%([0-9])(?::([0-9]))?%/g, (str,i1,i2,more) ->
			#@Epic.log2 str:str, i1:i1, i2:i2, more:more
			return if i2 then (vals[i1-1] or vals[i2-1] or '') else (vals[i1-1] or '')
		new_str

window.EpicMvc.Issue= Issue # Public API
