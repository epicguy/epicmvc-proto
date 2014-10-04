'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO Grab 'title' from Tag.head, and inject it?
		
# Put on-load event scripts here

# Strategy(s) for rendering content
class RenderStrategy$Base
	constructor: () ->
		@very_first= true
		@was_popped= false
		@was_modal= false
		@unloadMsgs= {}
		@baseUrl= window.document.location.pathname
		@baseId= "epic-new-page"
		@modalId= "epic-new-modal"
		@basePage= '<div id="'+ @baseId+ '"></div><div id="'+ @modalId+ '"></div>'
		baseDiv= document.createElement 'div'
		baseDiv.id= @baseId
		document.body.appendChild baseDiv
		setTimeout (=> @onPopState true), 0
		#TODO DETECT MANUAL HASHCHANGE window.onhashchange = (a) -> console.log 'onhashChange', a; alert 'hashChange'
		window.onpopstate = @onPopState
		# TODO IMPLEMENT MODALS WITHOUT JQUERY, SO WITHOUT BOOTSTRAP I THINK
		#TODO JQUERY $(document).on 'hidden.bs.modal', => E.click 'close_modal', {}
		m.redraw= @m_redraw
		@init()
		true
	handleEvent: (event_obj) =>
		# Getting all events, need to weed out to 'data-action' nodes
		event_obj?= window.event # IE < 9
		target= event_obj.target
		data_action= target.getAttribute 'data-action'
		return if not data_action
		data_params= target.getAttribute 'data-params'
		type= event_obj.type
		val= target.value
		f= 'Base:E/RenderStrategy$Base.init:on[data-action]'
		#_log2 f, 'event', event_obj, target, type, data_action, data_params, val
		event_obj.preventDefault(); # Added to keep LOGIN FORM from posting, causing fresh instance to start up
		data_param_obj= JSON.parse data_params ? '{}'
		data_param_obj.val= val
		E.Extra[ E.option.data_action] event_obj.type, data_action, data_params
		return false; # TODO CONSIDER MAKING SURE WE WANTED TO STOP, OR DO MORE TO ENSURE WE STOP DOING MORE THAN THIS
	init: ->
		document[ 'on'+ event_name]= @handleEvent for event_name in ['click', 'change', 'dblclick']

	UnloadMessage: (ix,msg) ->
		if msg
		then @unloadMsgs[ix]= msg
		else delete @unloadMsgs[ix]
		new_msg= (rec for nm,rec of @unloadMsgs)
		new_msg= if new_msg.length then  new_msg.join "\n" else null
		window.onbeforeunload= -> new_msg
	onPopState: (event) =>
		f= 'E:bootstrap.onPopState: '
		_log2 f, was_popped: @was_popped, very_first: @very_first, true, state: if event is true then 'X' else event.state
		if event is true or not event.state # Special processing - making sure this logic happens in FF as initial load
			return if @was_popped or not @very_first # We did handle it already
		@was_popped= true
		if @very_first
			E.click 'browser_hash', hash: location.hash.substr 1
		else
			E.setModelState event.state if event.state
			BROKEN() or @render() # TODO
		return
		
	m_redraw: =>
		# TODO CALL VIEW TO GET CONTENT, THEN @render
		E.View().run().then (content) =>
			_log2 'DEFER-R', 'RESULTS: content', content
			@render content, 'TODO', 'TODO', false
	render: (content, history, click_index, modal) ->
		if @was_modal
			BROKEN() # TODO JQUERY
			#TODO JQUERY window.$('.modal-backdrop').remove() # Get rid of that backdrop
			#TODO JQUERY window.$('body').removeClass 'modal-open' # Bootstrap 3 adds this class to the body to disable page scroll
			m.render (document.getElementById @modalId), m()
		if modal
			BROKEN() # TODO JQUERY
			m.render (container= document.getElementById @modalId), @modalView content
		else
			_log2 'START RENDER', start= new Date().getTime()
			# TODO NEW DYNAMIC START/END METHOD? m.render (container= document.getElementById @baseId), m 'div', {}, content
			m.render (container= document.getElementById @baseId), m 'div', {}, content
			_log2 'END RENDER', new Date().getTime()- start
		console.log 'render......', @content_watch, container
		#TODO FIGURE OUT HOW TO GET THIS FROM E.G. OPTIONS (watch container) for watch in @content_watch
		#TODO WORK ON HISTORY NEXT @handleRenderState(history, click_index)
		@was_modal= modal
		@was_popped= false
		@very_first= false
		return

	#modalView: (content) ->
		#onload= (el, isInit, context) ->
			## TODO TEST TWO MODALS IN A ROW (OR ONE REPLACES THE OTHER (REMOVE 'if' IF NEEDS TO CALL MODAL AGAIN)
			#$( '.modal', el).modal() if isInit or true # TODO TRUE BECAUSE I HAVE SEEN ISSUES WITH THIS
			#context.onunload= (el) ->
				#$( '.modal', el).off 'hidden'
		#m 'div', {config: onload}, content

	handleRenderState: (history, click_index) ->
		# History can be: true, false, 'replace'
		f= 'E:bootstrap.handleRenderState:'+ history+ ':'+ click_index
		# Put a 'hash' into location bar, to match our current app location, for history
		_log2 f, vf: @very_first, wp: @was_popped
		return if not history
		displayHash= if @very_first then '' else 'click-'+ click_index
		# Does the current flow-path contain a 'dom_cache' value?
		new_hash= E.getDomCache()
		if new_hash is false then new_hash= E.getExternalUrl()
		if new_hash isnt false then displayHash= new_hash
		model_state= E.getModelState()
		#_log2 f, ms: model_state, ha: displayHash, cvw: [click_index, @very_first, @was_popped]
		if @very_first or history is 'replace'
			window.history.replaceState? model_state, displayHash, '#'+displayHash
		else if not @was_popped and history is true # click-action, create history item
			window.history.pushState? model_state, displayHash, '#'+displayHash
			window.document.title= displayHash
		return

E.Extra.RenderStrategy$Base= RenderStrategy$Base # Public API
