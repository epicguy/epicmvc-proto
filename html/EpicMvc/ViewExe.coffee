'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class ViewExe
	constructor: (@Epic,@loadStrategy) ->
	init: (template, page) ->
		@Epic.log2 ':view T:'+ template, 'P:'+ page, (v for v in (@Epic.getInstance 'Pageflow').getStepPath()).join '/'
		@oTemplate= @loadStrategy.template template
		@oPage= @loadStrategy.page page
		@stack= []
		@defer= []
		@TagExe= @Epic.getInstance 'Tag'
		@TagExe.resetForNextRequest template, page
		@current= null
	pushDefer: (code) -> @defer.push code
	doDefer: ->
		eval v.code for v in @defer
		true
	checkRefresh: (list) ->
		for item in list
			return true if item of @TagExe.refresh_names
		false
	run: (current) ->
		current?= @oTemplate
		@stack.push @current
		@current= current
		out= @doAllParts 0
		@current= @stack.pop()
		out
	includePage: -> @run @oPage
	includePart: (nm) -> @run @loadStrategy.part nm
	doAllParts: (parts_inx) ->
		parts_inx= Number parts_inx
		out= ''
		if parts_inx is 0 # Top tag
			out+= @handleIt @current[0]
			parts_inx= @current.length- 1
			first= false # No first index to ignore
		else
			first= true
			out+= @handleIt @current[ parts_inx+ 3] # First part after tag is tags first part
		for tag_self in @current[parts_inx]
			if first then first= false; continue
			tag= @current[ tag_self+ 1]
			attr= @current[ tag_self+ 2]
			out+= @TagExe['Tag_'+ tag] parts: tag_self, attrs: attr
			out+= @handleIt @current[ @current[ tag_self][0]] # First index is postfix-text
		out
	handleIt: (text_n_vars) ->
		return text_n_vars if typeof text_n_vars is 'string'
		out= text_n_vars[ 0]
		for i in [1...text_n_vars.length] by 2
			[cmd, args]= text_n_vars[ i]
			out+= @TagExe[cmd].apply @TagExe, args
			out+= text_n_vars[ i+ 1]
		out

window.EpicMvc.ViewExe= ViewExe # Public API
