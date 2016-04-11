'use strict'
#	Base/E/RestAPI
# 	Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
#
#	A Simple REST Module that integrates with m.request (Mithril.js).
#
#	constructor: (@opts)->
#		@opts:
#			String host	(e.g my.app.com)
#			Number port (e.g 9500)
#			String prefix  (e.g api)
#			String version (e.g v1)

class RestAPI
	constructor: (opts)->
		@opts= port: '', prefix: '', version: '', proto: '//'
		@opts[nm]= val for nm,val of opts
		port= String @opts.port
		port= ':'+ port if port.length
		prefix= '/'+ @opts.prefix if @opts.prefix.length
		version= '/'+ @opts.version if @opts.version.length
		@route_prefix= "#{@opts.proto}#{@opts.host}#{port ? ''}#{prefix ? ''}#{version ? ''}/"
		@SetToken false
	GetPrefix: ()-> @route_prefix

	# OAuth 2.0 Tokens
	# access_token: "eyJpaWQiOjEwNSwiZXhwIjoxNDE0NzE0ODE3fQ.Hq555ysaamPg8u7kiqYeknXMsVlyvHo5yxr5Q8A86Wg"
	# expires_in: 600
	# refresh_token: "DAMiAougeTiW4RNFbJOgCA"
	# token_type: "bearer"
	GetToken: ()-> @token
	SetToken: (@token)->

	# Returns {status, data} for both success and error
	# @param method - http method to use
	# @param route -  http url
	# @param data -   data to be sent with request
	# @param header_obj - hashed by header name
	D_Request: (method, route, data, header_obj)->
		status= code: false, text: false, ok: false
		(m.request
			background: true # Don't want 'm' to redraw the view
			method: method
			url: @route_prefix + route
			data: data
			config: (xhr)->
				xhr.setRequestHeader nm,val for nm,val of header_obj ? {}; return
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

	# Shortcuts that populate the Authrorization header
	# Returns {status, data} for both success and error
	# @param route 	 - http url
	# @param data 	 - data to be sent with request
	D_Get: (route, data)-> @D_RequestAuth 'GET', route, data
	D_Post:(route, data)-> @D_RequestAuth 'POST',route, data
	D_Del: (route, data)-> @D_RequestAuth 'DEL', route, data
	D_Put: (route, data)-> @D_RequestAuth 'PUT', route, data

	# Sets Authorization Header
	# Returns promise of {status, data} for both success and error
	# @param method 	- http verb
	# @param route 		- uri resource
	# @param data 		- request body data
	# @param header_obj - headers to add, hashed by header name
	D_RequestAuth: (method, route, data, header_obj)->
		token= @GetToken()
		if token is false
			setTimeout ()->
				E.action 'Request.no_token'
			, 0
			d= new m.Deferred()
			d.resolve status: {code: 401, text: 'NO_TOKEN', ok: false}, data: error:'TOKEN'
			return d.promise
		# Set Authorization Header
		header_obj?= {}
		header_obj.Authorization= "#{token.token_type} #{token.access_token}"
		(@D_Request method, route, data, header_obj)
		.then (status_n_data)=>
			if status.code is 401
				setTimeout ()->
					E.action 'Request.bad_token'
				, 0
				return status: {code: 401, text: 'BAD_TOKEN', ok: false}, data: error:'TOKEN'
			status_n_data



E.Extra.RestAPI$Base= RestAPI

