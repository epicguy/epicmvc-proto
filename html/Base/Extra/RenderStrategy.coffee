'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO Grab 'title' from Tag.head, and inject it?

# Put on-load event scripts here
ENTER_KEY= 13

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
		#TODO JQUERY $(document).on 'hidden.bs.modal', => E.action 'close_modal', {}
		@redraw_guard= false
		m.redraw= @m_redraw
		@init()
		true
	handleEvent: (event_obj) =>
		f= 'on[data-e-action]'
		# Getting all events, need to weed out to 'data-e-action' nodes
		event_obj?= window.event # IE < 9
		type= event_obj.type
		type= 'enter' if type is 'keyup' and event_obj.keyCode is ENTER_KEY
		target= event_obj.target
		return false if target is window # blur had this
		# Bubble up to any parent with a data-e-action
		while target.tagName isnt 'BODY' and not data_action= target.getAttribute 'data-e-action'
			target= target.parentElement
		_log2 f, 'event', {type, data_action}
		return false if not data_action
		data_params= {}; attrs= target.attributes
		for ix in [0...attrs.length] when 'data-e-' is attrs[ ix].name.slice 0, 7
			continue if 'action' is nm= attrs[ ix].name.slice 7
			data_params[ nm]= attrs[ ix].value
		val= target.value
		_log2 f, 'event', {type, data_action, data_params, val}
		data_params.val= val
		# TODO COMPATABILITY MODE, EH?
		old_params= target.getAttribute 'data-params'
		data_params[ nm]= rec for nm,rec of old_params if old_params

		prevent= E.Extra[ E.option.dataAction] type, data_action, data_params
		event_obj.preventDefault() if prevent  # Added to keep LOGIN FORM from posting to fresh URL
		#TODO event_obj.stopPropagation()
		return false; # TODO
	init: ->
		interesting= ['click', 'change', 'dblclick', 'keyup', 'blur', 'focus']
		document.body.addEventListener event_name, @handleEvent, true for event_name in interesting

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
			E.action 'browser_hash', hash: location.hash.substr 1
		else
			E.setModelState event.state if event.state
			BROKEN() or @render() # TODO
		return

	m_redraw: =>
		f= 'm_redraw'
		if @redraw_guard isnt false
			_log2 f, 'GUARD REDRAW'
			return
		@redraw_guard= true
		E.View().run().then (content) =>
			#_log2 'DEFER-R', 'RESULTS: content', content
			@render content, 'TODO', 'TODO', false
			@redraw_guard= false
	render: (content, history, action, modal) ->
		f= 'render'
		if @was_modal
			BROKEN() # TODO JQUERY
			#TODO JQUERY window.$('.modal-backdrop').remove() # Get rid of that backdrop
			#TODO JQUERY window.$('body').removeClass 'modal-open' # Bootstrap 3 adds this class to the body to disable page scroll
			m.render (document.getElementById @modalId), m()
		if modal
			BROKEN() # TODO JQUERY
			m.render (container= document.getElementById @modalId), @modalView content
		else
			_log2 f, 'START RENDER', start= new Date().getTime()
			# TODO NEW DYNAMIC START/END METHOD? m.render (container= document.getElementById @baseId), m 'div', {}, content
			m.render (container= document.getElementById @baseId), m 'div', {}, content
			_log2 f, 'END RENDER', new Date().getTime()- start
		_log2 f, 'render......', @content_watch, container
		#TODO FIGURE OUT HOW TO GET THIS FROM E.G. OPTIONS (watch container) for watch in @content_watch
		#TODO WORK ON HISTORY NEXT @handleRenderState(history, action)
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

	handleRenderState: (history, action) ->
		# History can be: true, false, 'replace'
		f= 'E:bootstrap.handleRenderState:'+ history+ ':'+ action
		# Put a 'hash' into location bar, to match our current app location, for history
		_log2 f, vf: @very_first, wp: @was_popped
		return if not history
		displayHash= if @very_first then '' else 'action-'+ action
		# Does the current flow-path contain a 'dom_cache' value?
		new_hash= E.getDomCache()
		if new_hash is false then new_hash= E.getExternalUrl()
		if new_hash isnt false then displayHash= new_hash
		model_state= E.getModelState()
		#_log2 f, ms: model_state, ha: displayHash, cvw: [action, @very_first, @was_popped]
		if @very_first or history is 'replace'
			window.history.replaceState? model_state, displayHash, '#'+displayHash
		else if not @was_popped and history is true # action, create history item
			window.history.pushState? model_state, displayHash, '#'+displayHash
			window.document.title= displayHash
		return

E.Extra.RenderStrategy$Base= RenderStrategy$Base # Public API
