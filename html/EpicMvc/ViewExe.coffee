'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
$= window.jQuery
class ViewExe
	constructor: (@Epic,@loadStrategy) ->
	init: (@template, @page) ->
		@Epic.log2 ':view T:'+ @template, 'P:'+ page, (v for v in (@Epic.getInstance 'Pageflow').getStepPath()).join '/'
		@instance= @Epic.nextCounter() # Use to ignore delayed requests after a new init occured
		@oTemplate= @loadStrategy.template @template
		@oPage= @loadStrategy.page @page
		@stack= []
		@TagExe= @Epic.getInstance 'Tag'
		@TagExe.resetForNextRequest()
		@current= null
		@dynamicParts= [defer:[],parent:0] # Parts refrences w/Tag-state allowing a re-draw of this part in the DOM
		@dynamicMap= {} # Hash by Model:tbl_nm - list of dynamicParts indexes
		@activeDynamicPartIx= 0 # Zero always exists, it's the template
	checkRefresh: (tables) -> alert 'Epic: ViewExec.checkRefresh was disabled.'; false
	part: (ix) -> @dynamicParts[ix or @activeDynamicPartIx]
	doDynamicPart: (ix, instance) ->
		return if instance isnt @instance
		part= @part ix
		return if part.pending is false # Must have gotten here already
		part.stamp= new Date().getTime()
		part.pending= false
		$('#'+part.id).html 'Changing...'
		# TODO RUN THE PART, ALSO NEED TO GET TAGEXE'S SNAPSHOT TO RENDER THE PART IN
		# TODO WORRY ABOUT NESTED CALLS COMING BACK TO US AS IF WE ARE AT THE TOP DOING A FRESH DISPLAY
		@TagExe.resetForNextRequest part.state
		$('#'+part.id).html @run @loadStrategy.part part.name
	pushDefer: (code) ->
		@part().defer.push code
	doDefer: ->
		(eval v.code for v in part.defer) for part in @dynamicParts
		true
	haveTableRefrence: (view_nm, tbl_nm) -> # Called from TagExe
		return if @activeDynamicPartIx is 0
		nm= (@Epic.getInstanceNm view_nm)+ ':'+ tbl_nm
		@dynamicMap[nm]?= []
		@dynamicMap[nm].push @activeDynamicPartIx # Need to detect parents in same list means don't need child
	addDynamicPart: (info) ->
		f= ':ViewExe.addDynamicPart'
		@Epic.log2 f, info, @activeDynamicPartIx, @part()
		alert 'Nested dynamic parts not really supported just now.' if @activeDynamicPartIx isnt 0
		# Tag calls us with the details; need to start tracking this part specifically
		@dynamicParts.push
			name: info.name, id: info.id, delay: info.delay, state: info.state, defer: [],
			parent: @activeDynamicPartIx, pending: false, stamp: new Date().getTime()
		@activeDynamicPartIx= @dynamicParts.length- 1
	invalidateTables: (view_nm, tbl_nms) ->
		sched= []
		return 'no dynamic parts' if @dynamicParts.length is 1 # We have no dynamic parts
		return 'in click' if @Epic.inClick
		ix_list= {}
		inst= @Epic.getInstanceNm view_nm
		for tbl_nm in tbl_nms
			nm= inst+ ':'+ tbl_nm
			if nm of @dynamicMap
				(ix_list[ix]= true) for ix in @dynamicMap[nm]
		# TODO Weed out child parts
		now= new Date().getTime()
		for ix of ix_list
			part= @part ix
			if part.pending is false
				sofar= now- part.stamp
				delay= if sofar> part.delay then 0 else part.delay- sofar
				part.pending= window.setTimeout (=> @doDynamicPart ix, @instance), delay
				sched.push ix
		sched
	run: (current,dynoInfo) ->
		current?= @oTemplate
		@stack.push [@current, @activeDynamicPartIx]
		@current= current
		@addDynamicPart dynoInfo if dynoInfo
		out= @doAllParts 0
		[@current, @activeDynamicPartIx]= @stack.pop()
		out
	includePage: () -> @run @oPage
	includePart: (nm,dynoInfo) ->
		dynoInfo.name= nm
		@run (@loadStrategy.part nm), dynoInfo
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
