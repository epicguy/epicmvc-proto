'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO Grab 'title' from Tag.head, and inject it?
		
# Put on-load event scripts here

# Strategy(s) for rendering content
#_log2= -> # Turn off debug
class react
	constructor: (@Epic,@content_watch) ->
		@very_first= true
		@was_popped= false
		@was_modal= false
		@unloadMsgs= {}
		@baseUrl= window.document.location.pathname
		@baseId= "epic-new-page"
		@modalId= "epic-new-modal"
		@basePage= '<div id="'+ @baseId+ '"></div><div id="'+ @modalId+ '"></div>'
		$('body').html @basePage
		setTimeout (=> @onPopState true), 0
		#TODO DETECT MANUAL HASHCHANGE window.onhashchange = (a) -> console.log 'onhashChange', a; alert 'hashChange'
		window.onpopstate = @onPopState
		$(document).on 'hidden.bs.modal', => @Epic.makeClick false, 'close_modal', {}, true
		true
	UnloadMessage: (ix,msg) ->
		if msg
		then @unloadMsgs[ix]= msg
		else delete @unloadMsgs[ix]
		new_msg= (rec for nm,rec of @unloadMsgs)
		new_msg= if new_msg.length then  new_msg.join "\n" else null
		window.onbeforeunload= -> new_msg
	getFormData: -> $('form').serializeArray() # TODO Any form in *active* page (if other pages cahced in DOM)
	onPopState: (event) =>
		f= 'E:bootstrap.onPopState: '
		_log2 f, was_popped: @was_popped, very_first: @very_first, special: event is true, state: if event is true then 'XX' else event.state
		if event is true or not event.state # Special processing - making sure this logic happens in FF as initial load
			return if @was_popped or not @very_first # We did handle it already
		@was_popped= true
		if @very_first
			req_inx= @Epic.request().addLink _a:'browser_hash', hash: location.hash.substr 1
			@Epic.click req_inx
		else
			@Epic.setModelState event.state if event.state
			@Epic.renderSecure()
		return
		
	render: (content, history, click_index, modal) ->
		# TODO DOING React.DOM.div ON CONTENT, SO IT CAN BE AN ARRAY
		if @was_modal
			#window.$('#'+@modalId+ '>div>div.modal').modal 'hide' # REACT >div IS EXTRA CONTAINER FROM PARSEFILE
			window.$('.modal-backdrop').remove() # Get rid of that backdrop
			window.$('body').removeClass 'modal-open' # Bootstrap 3 adds this class to the body to disable page scroll
			React.renderComponent (React.DOM.span {}), document.getElementById @modalId
		if modal
			#React.renderComponent content, document.getElementById @modalId, =>
				#window.$('#'+@modalId+ ' div.modal').modal() # Activate it (must include boostrap-modal.js)
			React.renderComponent (@ModalComponent content: React.DOM.div {}, content), container= document.getElementById @modalId
		else
			_log2 'START RENDER', start= new Date().getTime()
			React.renderComponent (React.DOM.div {}, content), container= document.getElementById @baseId
			_log2 'END RENDER', new Date().getTime()- start
		console.log 'render......', @content_watch, container
		(watch container) for watch in @content_watch
		@handleRenderState(history, click_index)
		@was_modal= modal
		@was_popped= false
		@very_first= false
		return

	ModalComponent: new React.createClass {
		componentDidMount: ->
			$( '.modal', this.getDOMNode()).modal()
		componentWillUnMount: ->
			$( '.modal', this.getDOMNode()).off 'hidden'
		render: -> return this.props.content
	}

	handleRenderState: (history, click_index) ->
		# History can be: true, false, 'replace'
		f= 'E:bootstrap.handleRenderState:'+ history+ ':'+ click_index
		# Put a 'hash' into location bar, to match our current app location, for history
		_log2 f, vf: @very_first, wp: @was_popped
		return if not history
		displayHash= if @very_first then '' else 'click-'+ click_index
		# Does the current flow-path contain a 'dom_cache' value?
		new_hash= @Epic.getDomCache()
		if new_hash is false then new_hash= @Epic.getExternalUrl()
		if new_hash isnt false then displayHash= new_hash
		model_state= @Epic.getModelState()
		#_log2 f, ms: model_state, ha: displayHash, cvw: [click_index, @very_first, @was_popped]
		if @very_first or history is 'replace'
			window.history.replaceState? model_state, displayHash, '#'+displayHash
		else if not @was_popped and history is true # click-action, create history item
			window.history.pushState? model_state, displayHash, '#'+displayHash
			window.document.title= displayHash
		return

# Issue: Need a model 'Tag' to retrieve Tag/Part/var, but ViewExe isn't a model.
# Maybe Epic needs changing. Always was an issue also due to no way to intercept ViewExe methods
class tagexe
	constructor: (@Epic, @view_nm) ->
	getTable: (nm) -> @Epic.getView().getTable nm

window.EpicMvc.Model.TagExe$react= tagexe

window.EpicMvc.Extras.react$react= react # Public API
