'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Request
	constructor: (@Epic) ->
		@click_link= ['zero']
		@link= []
	start: (link_index) -> # Gather form data; restore pageflow state
		@link= @click_link[link_index]
		if @link._b? # It was a 'button'; grab the form data
			form_data= @Epic.getFormData()
			@link[v.name]=v.value for v in form_data
			@link._a= @link._b
		if (sp= @link.temp_page_flow)?
			@Epic.getInstance('Pageflow').goTo sp[0], sp[1], sp[2]
	addLink: (link) ->
		r= @click_link.length
		link.temp_page_flow= @Epic.getInstance('Pageflow').getStepPath()
		@click_link.push link
		r
	haveAction: -> @link._a ? false
	getAction:  -> @link._a
	getValues: -> @link

window.EpicMvc.Request= Request
