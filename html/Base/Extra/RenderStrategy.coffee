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
		@last_path= 'not_set'
		@unloadMsgs= {}
		@baseUrl= window.document.location.pathname
		@baseId= "epic-new-page"
		@modalId= "epic-new-modal"
		baseDiv= document.createElement 'div'
		baseDiv.id= @baseId
		document.body.appendChild baseDiv
		modalDiv= document.createElement 'div'
		modalDiv.id= @modalId
		document.body.appendChild modalDiv
		setTimeout (=> @onPopState true), 0
		#TODO DETECT MANUAL HASHCHANGE window.onhashchange = (a) -> console.log 'onhashChange', a; alert 'hashChange'
		window.onpopstate = @onPopState
		@redraw_guard= 0
		m.redraw= @m_redraw
		@init()
		true
	handleEvent: (event_obj) =>
		f= 'on[data-e-action]'
		_log2 f, 'top', @redraw_guard, (event_obj ? window.event).type
		# Getting all events, need to weed out to 'data-e-action' nodes
		event_obj?= window.event # IE < 9
		type= event_obj.type
		if type is 'mousedown' # This comes before 'blur' so I'm using it rather than 'click'
			return if event_obj.which isnt 1 # Not a left click
			type= 'click'
		#TODO TEST return if type in ['blur','focus'] # TODO FIX THIS ISSUE WITH FORM FIELDS BEING REDRAWN
		return if type is 'keyup' and event_obj.keyCode is 9 # TODO IS THIS NEEDED FOR FORMS?
		type= 'enter' if type is 'keyup' and event_obj.keyCode is ENTER_KEY
		target= event_obj.target
		return false if target is window # blur had this
		# Bubble up to any parent with a data-e-action
		while target.tagName isnt 'BODY' and not data_action= target.getAttribute 'data-e-action'
			target= target.parentElement
		E.option.event type, event_obj, target, data_action
		#_log2 f, 'event', {type, data_action}
		return false if not data_action
		data_params= {}; attrs= target.attributes
		for ix in [0...attrs.length] when 'data-e-' is attrs[ ix].name.slice 0, 7
			continue if 'action' is nm= attrs[ ix].name.slice 7
			data_params[ nm]= attrs[ ix].value
		val= target.value
		files= target.files
		_log2 f, 'event', {type, data_action, data_params, val, files}, target
		data_params.val= val
		data_params._files= files
		# Support for Touch Events
		data_params[nm]= event_obj[nm] for nm,val of event_obj when nm in ['touches','changedTouches','targetTouches']
		# TODO COMPATABILITY MODE, EH?
		old_params= target.getAttribute 'data-params'
		data_params[ nm]= rec for nm,rec of JSON.parse old_params if old_params

		#TODO IS THIS THE CLUPRIT? target.focus() # TODO TESTING IS THIS HOW BOOTSTRAP AVOIDS THE DBLCLICK TEXT MARKING?
		prevent= E.Extra[ E.option.dataAction] type, data_action, data_params
		event_obj.preventDefault() if prevent  # Added to keep LOGIN FORM from posting to fresh URL
		#TODO event_obj.stopPropagation()
		return false; # TODO
	init: ->
		interesting= [
			'mousedown', 'change', 'dblclick', 'keyup', 'blur', 'focus'
			'touchstart', 'touchmove', 'touchend' # Touch Events
		]
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
			m.startComputation() # Optionally call @m_redraw
			m.endComputation()
		return

	m_redraw: =>
		f= 'm_redraw'
		@redraw_guard++
		if @redraw_guard isnt 1
			_log2 f, 'GUARD REDRAW', @redraw_guard
			return
		E.View().run().then (modal_content) =>
			[modal, content]= modal_content
			_log2 'DEFER-R', 'RESULTS: modal, content', @redraw_guard, modal, content
			# Assume @render call won't go async and we end up back in this module
			@render modal, content # Do before decrement of guard, since 'blur' event fired during this
			@redraw_guard--
			if @redraw_guard isnt 0 # Someone updated content while we were busy drawing
				@redraw_guard= 0
				setTimeout (=> @m_redraw()), 16
		.then null, (err) => # Make own .then to catch issues in above .then
			# These may be errors from m.render
			console.error 'RenderStrategy$Base m_redraw', err

	render: (modal, content) ->
		f= 'render'
		start= new Date().getTime() #%#
		_log2 f, 'START RENDER', start, modal
		if modal
			# Note, Can put backdrop in layout if desired, with .modal-backdrop and optional e-action
			m.render (container= document.getElementById @modalId), content
		else
			if @was_modal # Get rid of what was there
				m.render (document.getElementById @modalId), []
			m.render (container= document.getElementById @baseId), m 'div', {}, content
		_log2 f, 'END RENDER', new Date().getTime()- start
		@handleRenderState() if not modal # Let's not bother with modals and history, for now
		@was_modal= modal
		@was_popped= false
		@very_first= false
		return

	handleRenderState: () ->
		path= E.App().getStepPath()
		str_path= path.join '/'
		history= if str_path is @last_path then 'replace' else true
		# History can be: true, false, 'replace'
		f= 'E:handleRenderState:'+ history+ ':'+ str_path
		# Put a 'hash' into location bar, to match our current app location, for history
		_log2 f, vf: @very_first, wp: @was_popped
		return if not history
		displayHash= '' # if @very_first then '' else 'action-'+ action
		# Does the current flow-path contain a 'dom_cache' value?
		new_hash= (E.appFindAttr path[0], path[1], path[2], 'route') ? false
		# new_hash= E.getExternalUrl new_hash, path # TODO: browser_hash variables
		if new_hash isnt false then displayHash= new_hash
		model_state= E.getModelState()
		#_log2 f, ms: model_state, ha: displayHash, cvw: [action, @very_first, @was_popped]
		if @very_first or history is 'replace'
			window.history.replaceState? model_state, displayHash, '#'+displayHash
		else if not @was_popped and history is true # action, create history item
			window.history.pushState? model_state, displayHash, '#'+displayHash
			window.document.title= displayHash
		@last_path= str_path
		return

E.Extra.RenderStrategy$Base= RenderStrategy$Base # Public API
