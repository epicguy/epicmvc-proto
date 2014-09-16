# Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class LoadStrategy
	constructor: (@Epic) ->
		@path= 'Package/Base/view/'
		@cache= {}
		@cache_local_flag= true # False if we want browser to cache responses
	# TODO TEMP FOR MANUAL
	missing: (type,nm) -> -> React.DOM.span {style: {color: 'red'}}, "No such #{type} called #{nm}."
	clearCache: () -> @cache= {}
	preLoaded: (pkg,type,nm) -> window.EpicMvc['view$'+pkg]?[type]?[nm]
	get: (type,nm) ->
		full_nm=( if type isnt 'tmpl' then type+ '/' else '')+ nm+ '.'+ type+ '.html'
		return @cache[full_nm] if @cache[full_nm]?
		@reverse_packages?=( @Epic.appconfs[i] for i in [@Epic.appconfs.length- 1..0])
		for pkg in @reverse_packages
			if p= @preLoaded pkg, type, nm
				results= p # Compiled and everything
			else
				results= @getFile pkg, full_nm
				continue if results is false # Did not find it in XHR
				results= window.EpicMvc.Extras.ParseFile$react full_nm, results if results isnt false
				# TODO RESULT NOW IS AN ARRAY OF FUNCTION CALLS THAT WE WILL TRY TO RETURN TO A CALLING COMPONENT
				results= new Function 'v2', 'return ['+( results.join())+ '];'
			@cache[full_nm]= results if @cache_local_flag and results isnt false
			break if results isnt false
		if results is false
			console.log 'NO FILE FOUND! '+ nm
			results= @missing type, nm+ ' USING XHR'
		results
	getFile: (pkg,nm) ->
		results= false
		path= "Package/#{pkg}/view/"
		path= "EpicPkg/#{pkg}/view/" if pkg in ['Base', 'BaseDevl', 'bootstrap', 'react']
		window.$.ajax
			url: path+ nm
			async:false
			cache: if @cache_local_flag then false else true
			dataType: 'text',
			success: (data) -> results= data
			error: (jqXHR,textStatus,errorThrown) ->
				console.log 'AJAX ERROR '
		return results
	getCombinedAppConfs: ->
		result= {}
		for pkg in @Epic.appconfs
			window.$.extend true, result, window.EpicMvc['app$'+pkg]
		result
	template: (nm) -> @get 'tmpl', nm
	page: (nm) -> @get 'page', nm
	part: (nm) -> @get 'part', nm
	fist: (grp_nm) -> window.EpicMvc['fist$'+ grp_nm]

window.EpicMvc.Extras.LoadStrategy$react= LoadStrategy
