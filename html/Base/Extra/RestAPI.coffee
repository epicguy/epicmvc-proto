'use strict'
#	Base/E/RestAPI
# 	Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
#
#	constructor: (@opts)->
#		@opts:
#			String host
#			Number port
#			String prefix
#			String version
#
#	A Simple REST Module that integrates with m.request (Mithril.js).
#

class RestAPI
	constructor: (opts)->
		@opts= port: '', prefix: '', version: ''
		@opts[nm]= val for nm,val of opts
		port= String @opts.port
		port= ':'+ port if port.length
		prefix= '/'+ @opts.prefix if @opts.prefix.length
		version= '/'+ @opts.version if @opts.version.length
		@route_prefix= "//#{@opts.host}#{port ? ''}#{prefix ? ''}#{version ? ''}/"
	GetPrefix: ()-> @route_prefix

	# Returns {status, data} for both success and error
	# @param method - http method to use
	# @param route -  http url
	# @param data -   data to be sent with request
	D_Request: (method, route, data)->
		status= code: false, text: false, ok: false
		(m.request
			background: true # Don't want 'm' to redraw the view
			method: method
			url: @route_prefix + route
			data: data
			unwrapSuccess: (response)-> {status, data: response}
			unwrapError: (response)-> {status, data: response}
			extract: (xhr, options)->
				status.code= xhr.status
				status.text= xhr.statusText
				status.ok= true if xhr.status is 200
				if not xhr.responseText.length and xhr.readyState is 4 # 4: XHR DONE
					status.text= 'NetworkError'
					return '{"error":"NETWORK_ERROR"}'
				xhr.responseText
		).then null, (e_with_status_n_data)-> e_with_status_n_data # Will be {status, data}

E.Extra.RestAPI$Base= RestAPI

