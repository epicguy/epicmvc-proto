'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class ClickAction
	constructor: (@Epic) ->
	click: (action_token, path) ->
		f= ":ClickAction.click(#{action_token})"
		issue= new window.EpicMvc.Issue @Epic, 'ClickAction'
		message= new window.EpicMvc.Issue @Epic, 'ClickAction'
		if not action_token?
			if not action_token= @Epic.request().haveAction()
				return [issue, message] # No action
			path= @Epic.getInstance('Pageflow').getStepPath()
		#@Epic.log2 'click:'+ action_token
		click_node= @Epic.appConf().findClick path, action_token
		if not click_node?
			@Epic.log1 f, 'no match', path: path, action_token: action_token
			return [issue, message] # No recognized action
		r= @doAction click_node, {}
		[rNode, rResults, rIssues, rMessages]= r
		issue.addObj rIssues; message.addObj rMessages
		limit= 5 # Recurse into 'result' tags, limit.
		while rNode
			if --limit< 0 then throw 'Max recurse limit ClickAction.click'
			r= @doAction rNode, rResults
			#@Epic.log2 f, '@doAction-result', r
			[rNode, rResults, rIssues, rMessages]= r
			issue.addObj rIssues; message.addObj rMessages
		[issue, message]
	doAction: (node, prev_action_result) ->
		f= ":ClickAction.doAction(#{node.getTarget()})"
		@Epic.log2 f, 'getPAttrs/node/prev_action_result', ("#{k}=#{v}" for k,v of node.getPAttrs()).join ', ', node, prev_action_result
		r_vals= @Epic.request().getValues()
		a_params_list= @pullValueUsingAttr node, r_vals, prev_action_result
		class_method= node.getTarget() # Call= or Macro= 's value
		#@Epic.log2 f, pul_val: a_params_list, ep_req_vals: r_vals, prev_actn_res: prev_action_result
		look_for_macro_result_tags= false
		if node.hasMacro()
			macro_node= @Epic.appConf().getMacroNode class_method
			alias_params= @pullValueUsingAttr macro_node, r_vals, prev_action_result
			class_method= macro_node.getTarget()
			if macro_node.hasResult() then look_for_macro_result_tags= true # Else use caller node's RESULT?
			for own k,v of alias_params
				a_params_list[k]= v
		r= @Epic.Execute class_method, a_params_list
		#@Epic.log2 f, '@Epic.Execute-result', r
		[rResults, rIssues, rMessages]= r
		found_result_tag=
			(if look_for_macro_result_tags then macro_node else node).matchResult rResults
		[found_result_tag, rResults, rIssues, rMessages]
	pullValueUsingAttr: (node, r_vals, prev_action_result) ->
		a_params_list= $.extend {}, node.getPAttrs() # Clone
		if form_name= node.hasAttr 'use_form'
			oF= @Epic.getFistInstance form_name
			fields_list= oF.getHtmlPostedFieldsList form_name
			$.extend a_params_list, @pullValues r_vals, fields_list, 'use_form'
		if attr= node.hasAttr 'use_fields'
			$.extend a_params_list, @pullValues r_vals, attr.split( ','), 'use_fields'
		if attr= node.hasAttr 'use_result'
			$.extend a_params_list, @pullValues prev_action_result, attr.split( ','), 'use_result'
		a_params_list
	pullValues: (source,value_list,attr_nm) ->
		f= ':ClickAction.pullValues'
		#@Epic.log2 f, source:source,value_list:value_list,attr_nm:attr_nm
		out_list= {}
		for nm_alias in value_list
			switch attr_nm
				when 'use_fields','use_result' then [nm, alias]= nm_alias.split ':'; alias?= nm
				else nm= alias= nm_alias
			out_list[ alias]= source[ nm]
		#@Epic.log2 f, out_list: out_list
		out_list

window.EpicMvc.ClickAction= ClickAction # Public API
