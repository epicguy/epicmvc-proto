'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class ClickAction
	constructor: (@Epic) ->
	click: (action_token, data, path) ->
		f= ":ClickAction.click(#{action_token})"
		issue= new window.EpicMvc.Issue @Epic, 'ClickAction'
		message= new window.EpicMvc.Issue @Epic, 'ClickAction'
		if not action_token?
			return [issue, message] # No action
			path?= @Epic.getInstance('Pageflow').getStepPath()
		#_log2 'click:'+ action_token
		click_node= @Epic.appConf().findClick path, action_token
		if not click_node?
			_log f, 'no match', path: path, action_token: action_token
			return [issue, message] # No recognized action
		r= @doAction click_node, data, {}
		[rNode, rResults, rIssues, rMessages]= r
		issue.addObj rIssues; message.addObj rMessages
		limit= 5 # Recurse into 'result' tags, limit.
		while rNode
			if --limit< 0 then throw 'Max recurse limit ClickAction.click'
			r= @doAction rNode, data, rResults
			#_log2 f, '@doAction-result', r
			[rNode, rResults, rIssues, rMessages]= r
			issue.addObj rIssues; message.addObj rMessages
		[issue, message]
	doAction: (node, r_vals, prev_action_result) ->
		f= ":ClickAction.doAction(#{node.getTarget()})"
		#_log2 f, 'getPAttrs/node/prev_action_result',(( "#{k}=#{v}" for k,v of node.getPAttrs()).join ', '), node, prev_action_result
		a_params_list= @pullValueUsingAttr node, r_vals, prev_action_result
		class_method= node.getTarget() # Call= or Macro= 's value
		#_log2 f, pul_val: a_params_list, ep_req_vals: r_vals, prev_actn_res: prev_action_result
		look_for_macro_result_tags= false
		if node.hasMacro()
			macro_node= @Epic.appConf().getMacroNode class_method
			alias_params= @pullValueUsingAttr macro_node, r_vals, prev_action_result
			class_method= macro_node.getTarget()
			if macro_node.hasResult() then look_for_macro_result_tags= true # Else use caller node's RESULT?
			for own k,v of alias_params
				a_params_list[k]= v
			if path= macro_node.hasAttr 'go'
				dummy= @Epic.Execute 'Pageflow/path', path: path
		r= if class_method then @Epic.Execute class_method, a_params_list else [ {}, {}, {}]
		#_log2 f, '@Epic.Execute-result', r
		# Process any go: as shortcut to { call: 'Pageflow/path' p:{path:'//x'} }
		if path= node.hasAttr 'go'
			dummy= @Epic.Execute 'Pageflow/path', path: path
		[rResults, rIssues, rMessages]= r
		found_result_tag=
			(if look_for_macro_result_tags then macro_node else node).matchResult rResults
		[found_result_tag, rResults, rIssues, rMessages]
	pullValueUsingAttr: (node, r_vals, prev_action_result) ->
		f= ':ClickAction.pullValueUsingAttr'
		#_log2 f, node:node,r_vals:r_vals,prev_action_result:prev_action_result
		a_params_list= deep_extend {}, node.getPAttrs() # Clone
		if form_name= node.hasAttr 'use_form'
			oF= @Epic.getFistInstance form_name
			#fields_list= oF.getHtmlPostedFieldsList form_name
			fields_list= ( nm for nm of oF.getHtmlFieldValues())
			deep_extend a_params_list, @pullValues r_vals, fields_list, 'use_form'
		if attr= node.hasAttr 'use_fields'
			deep_extend a_params_list, @pullValues r_vals, attr.split( ','), 'use_fields'
		if attr= node.hasAttr 'use_result'
			deep_extend a_params_list, @pullValues prev_action_result, attr.split( ','), 'use_result'
		a_params_list
	pullValues: (source,value_list,attr_nm) ->
		f= ':ClickAction.pullValues'
		#_log2 f, source:source,value_list:value_list,attr_nm:attr_nm
		out_list= {}
		for nm_alias in value_list
			switch attr_nm
				when 'use_fields','use_result' then [nm, alias]= nm_alias.split ':'; alias?= nm
				else nm= alias= nm_alias
			out_list[ alias]= source[ nm]
		#_log2 f, out_list: out_list
		out_list

window.EpicMvc.ClickAction= ClickAction # Public API
