'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO Grab 'title' from Tag.head, and inject it?
		
# Put on-load event scripts here

# Strategy(s) for rendering content
_log2= -> # Turn off debug
class bootstrap
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
		#setTimeout (=> @Epic.click 0), 0
		setTimeout (=> @onPopState true), 0
		#setTimeout (=> @LocationHashChanged newURL: window.location.href), 0
		#window.onhashchange = @LocationHashChanged
		#TODO DETECT MANUAL HASHCHANGE window.onhashchange = (a) -> console.log 'onhashChange', a; alert 'hashChange'
		window.onpopstate = @onPopState
		true
	UnloadMessage: (ix,msg) ->
		if msg
		then @unloadMsgs[ix]= msg
		else delete @unloadMsgs[ix]
		new_msg= (rec for nm,rec of @unloadMsgs)
		new_msg= if new_msg.length then  new_msg.join "\n" else null
		window.onbeforeunload= -> new_msg
	getFormData: -> $('form').serializeArray() # TODO Any form in *active* page (if other pages cahced in DOM)
	form_action: (out_attrs, click_index, action, value) ->
        o= """
<button #{out_attrs.join ' '} onclick="EpicMvc.Epic.click(#{click_index});return false;">#{value}</button>
			"""
	link_action: (click_index, id, attr_text, text) ->
        o= """
<a#{id} href="#" onclick="EpicMvc.Epic.click(#{click_index});return false;"#{attr_text}>#{text}</a>
			"""
	doControl: (oFi,c_nm,val,c_ty,c_data,wd,mx_len,do_one_radio) -> # TODO BOOTSTRAP LOOKING CONTROLS, NOT JQM
		html= ''
		c_ty= c_ty.split(':')[0]
		if c_ty is 'radio' and do_one_radio then c_ty= 'do_one_radio'
		val?= '' #TODO NOT IF 'loaded' FROM DB? +oFi.getFieldAttributes(c_nm).default_value
		switch c_ty
			when 'upload'
				id= 'U'+ @Epic.nextCounter()
				from_id= 'fr'+id
				to_id= 'to'+ id
				btn_id= 'bt'+ id
				msg_id= 'ms'+ id

				button= """
<span data-theme="a" class="ui-btn ui-btn-corner-all ui-shadow ui-btn-up-a" aria-disabled="false" id="#{btn_id}">
<span class="ui-btn-inner ui-btn-corner-all" aria-hidden="true">
<span class="ui-btn-text">Upload</span></span></span>
					"""

				msgs= """
<span class="qq-message" id="#{msg_id}">#{oFi.getUploadedMsg c_nm, val}</span>
					"""

				inputs= """
<input class="ui-input-text" type="file" style="display:none" id="#{from_id}" name="upload_#{c_nm}" value="#{val}" size="#{wd}">
<input type="hidden" id="#{to_id}" name="#{c_nm}" value="#{val}">
					"""

				html= """
<table style="display:inline-block; width:60%">
	<tr>
		<td style="width:120px">#{button}</td>
		<td>#{msgs}</td>
		<td>#{inputs}</td>
	</tr>
</table>
					"""
				oFi.haveUpload c_nm, from_id, to_id, btn_id, msg_id
			when 'textarea'
				attrs= " name=\"#{c_nm}\""
				split= c_data.split ' '
				for i in [0...split.length] by 2
					attrs+= ' '+ split[i].toLowerCase()+ '="'+ split[i+1]+ '"'
				html+= "<textarea#{attrs}>#{window.EpicMvc.escape_html val}</textarea>"
			when 'password', 'text'
				html+= """
<input class="ui-input-text" type="#{c_ty.toLowerCase()}" name="#{c_nm}" value="#{val}" size="#{wd}">
					"""
			when 'do_one_radio', 'radio' then break #TODO
			when 'pulldown'
				choices= oFi.getChoices c_nm
				size= if wd then " size=\"#{wd}\"" else ''
				html= """
					<select name="#{c_nm}"#{size} data-native-menu="false">
					"""
				for choice_option, i in choices.options
					choice_value= choices.values[i]
					s= if choice_value is val then ' selected="selected"' else ''
					html+= """
						\n<option value="#{window.EpicMvc.escape_html choice_value}"#{s}>
							#{window.EpicMvc.escape_html choice_option}</option>
						"""
				html+= "\n</select>"
		html

	onPopState: (event) =>
		f= 'E:bootstrap.onPopState: '
		_log2 f, was_popped: @was_popped, very_first: @very_first, special: event is true
		if event is true # Special processing - making sure this logic happens in FF as initial load
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
		f= 'E:bootstrap.render2: '
		_log2 f, history, modal, @was_modal
		if typeof history is 'undefined' then throw new Error 'History is hosed!'
		# Must be in the DOM, before handler returns, to allow 'defered' logic to work properly
		# TODO NEXT TWO LINES BREAK DIALOG WANTING TO REDISPLAY WITH ERROR; IT HELPED WHEN TWO BACKGROUND REQUESTS CAME
		#if @was_modal and modal # to avoid 'snap'
		#	return alert 'Attempting to create a modal, while one is active, may "snap" - check your JavaScript'
		if @was_modal
			window.$('#'+@modalId+ '>div').modal 'hide' # Get rid of that backdrop
			$('#'+@modalId).html ''
		if modal
			container= '#'+ @modalId
			$(container).html content
			window.$('#'+@modalId+ ' div.modal').modal() # Activate it (must include boostrap-modal.js)
			.on 'hidden', =>
				@Epic.makeClick false, 'close_modal', {}, true
		else
			container= '#'+ @baseId
			$(container).html content
		(watch container) for watch in @content_watch
		@handleRenderState(history, click_index)
		@was_modal= modal
		@was_popped= false
		@very_first= false
		return

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

window.EpicMvc.Extras.bootstrap$bootstrap= bootstrap # Public API
