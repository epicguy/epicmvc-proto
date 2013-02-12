'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

#TODO Grab 'title' from Tag.head, and inject it?
		
# Put on-load event scripts here
#window.$(window.document).bind "mobileinit", ->

# Strategy(s) for rendering content

class bootstrap
	constructor: (@Epic) ->
		@very_first= true
		@baseUrl= window.document.location.pathname
		@baseId= "epic-new-page"
		@basePage= '<div data-role="page" id="epic-new-page" data-theme="a" data-url="empty"></div>'
		@prefix= 'epic-dc-'
		@firstId= 'epic-dc-first'
		$('body').html @basePage
		setTimeout (=> @HashCheck()), 0
		true
	HashCheck: () ->
		req_inx= 0
		if location.hash.length
			oR= @Epic.request()
			req_inx= oR.addLink _a:'external', hash:location.hash
		@Epic.click req_inx
	render: (content, first_time) ->
		# TODO Could Implement a history-based method
		# Must be in the DOM, before handler returns, to allow 'defered' logic to work properly
		$('#'+@baseId).html content
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

window.EpicMvc.Extras.bootstrap$bootstrap= bootstrap # Public API
