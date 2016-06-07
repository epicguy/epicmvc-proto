'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# Epic.ConfExe manages execution of a click/macro from app.conf
class ConfExe
	constructor: (appConfNode) ->
		@node= $.extend true, {}, appConfNode # clone
	matchResult: (results) ->
		found_node= false
		count= (k for v,k of results).length
		if 'RESULTS' of @node
			for node in @node.RESULTS
				result_node= new window.EpicMvc.ConfExe node
				r_attrs= result_node.getRAttrs()
				if r_attrs?
					if result_node.match results then found_node= result_node; break
				else if count is 0 then found_node= result_node; break

		debug_results= ("#{k}=#{v}" for k,v of results).join ', '
		if found_node is false then EpicMvc.Epic.log2 ':matchResult ', found_node, debug_results if debug_results.length
		else EpicMvc.Epic.log2 ':matchResult ', found_node.node, 'p:', found_node.getPAttrs?(), "{#{debug_results}}"
		found_node
	match: (results) ->
		r_attrs= @getRAttrs()
		for own k, v of r_attrs # TODO CHECK FINAL APP USAGE (I CHANGED FROM USING 'results' HERE
			if not (k of results) or v isnt results[k] then return false
		true
	getTarget: -> @node.call || @node.macro
	hasMacro: -> if @node.call? then false else true
	hasResult: -> if @node.RESULTS? then true else false
	getPAttrs: -> @node.p || null
	getRAttrs: -> @node.r || null
	hasAttr: (nm) -> @node[nm] || false

window.EpicMvc.ConfExe= ConfExe # Public API
