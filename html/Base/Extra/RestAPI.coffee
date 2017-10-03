'use strict'
#	Base/E/RestAPI
# 	Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.
#
#	A Simple REST Module that returns promises and supports both global headers and OAuth request headers
#
#	constructor: (@opts)->
#		@opts:
#			String host	(e.g my.app.com)
#			Number port (e.g 9500)
#			String prefix  (e.g api)
#			String version (e.g v1)
#			Hash app_headers (e.g. "X-DVB-VERISON": "ConsumerWeb~Production~1.1.9a83e22~20170321" [Added to each request]

class RestAPI
	constructor: (opts)->
		@opts= port: '', prefix: '', version: '', proto: '//', app_headers: {}
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
	D_Request: (method, route, data, header_obj_in)->
		f= 'BE/RestAPI.D_Request'
		header_obj= E.merge {}, @opts.app_headers,( header_obj_in ? {})
		status= code: false, text: false, ok: false
		promise= new Promise (resolve, reject)=>
			xhr= new XMLHttpRequest()
			xhr.onloadend= (event)=>
				status.code= xhr.status
				status.text= xhr.statusText
				status.xhr= xhr
				status.ok= true if xhr.status is 200
				if not xhr.responseText.length
					status.text= 'NetworkError'
					response= '{"error":"NETWORK_ERROR"}'
				else
					response= xhr.responseText
				jResponse= JSON.parse response # TODO FIGURE OUT WHEN THIS MAKES SENSE
				resolve {status, data: jResponse} # We don't reject

			xhr.open method, @route_prefix + route
			xhr.setRequestHeader nm,val for nm,val of header_obj # Must come after 'open'
			formData= new FormData()
			formData.append nm, val for nm,val of data
			xhr.send formData # TODO Someday figure out when to do JSON, and when to do FormData (using e.g. header_obj ?)
		promise.then (result)->
			E.log f, {result}
			result

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
	D_RequestAuth: (method, route, data, header_obj_in)->
		token= @GetToken()
		if token is false
			setTimeout ()->
				E.action 'Request.no_token'
			, 0
			return Promise.resolve status: {code: 401, text: 'NO_TOKEN', ok: false}, data: error:'TOKEN'
		# Set Authorization Header
		header_obj= E.merge {}, @opts.app_headers,( header_obj_in ? {})
		header_obj.Authorization= "#{token.token_type} #{token.access_token}"
		(@D_Request method, route, data, header_obj)
		.then (status_n_data)=>
			if status_n_data.status.code is 401
				setTimeout ()->
					E.action 'Request.bad_token'
				, 0
				return status: {code: 401, text: 'BAD_TOKEN', ok: false}, data: error:'TOKEN'
			status_n_data

E.Extra.RestAPI$Base= RestAPI

