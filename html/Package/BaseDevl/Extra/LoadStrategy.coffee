'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class LoadStrategy
	constructor: (@appconfs) ->
		@cache= {}
		@cache_local_flag= true # False if we want browser to cache responses
		@reverse_packages=( @appconfs[ i] for i in [@appconfs.length- 1..0])
		# grab defined dirs for each package, from index.html's E.run([],{load_dirs:[{dir:'',pkgs:[]}]})
		dir_map= {}
		for {dir,pkgs} in E.option.load_dirs
			dir_map[ pkg]= dir for pkg in pkgs
		@dir_map= dir_map
	loadAsync: () -> # Load up all the Model/Extra code stuff - caller should delay after
		f= 'Base:E/LoadStragegy.loadAsync'
		# Insert script tags for all MANIFEST entries of each package-app-config file
		head= document.getElementsByTagName( 'head')[ 0]
		script_attrs= type: 'text/javascript'
		total= 0
		for pkg in @appconfs
			for type,file_list of E[ 'app$'+ pkg].MANIFEST # Extra, Model: ['Render']
				for file in file_list
					script= document.createElement 'script'
					script_attrs.src= @dir_map[ pkg]+ pkg+ '/'+ type+ '/'+ file+ '.js'
					script.setAttribute nm, val for nm, val of script_attrs
					head.appendChild script
					total++
		# Note: caller should release the thread to allow browser to load the scripts
		total
	clearCache: () -> @cache= {}
	preLoaded: (pkg,type,nm) -> E['view$'+pkg]?[type]?[nm]
	get: (type,nm) ->
		result= m.deferred()
		result.resolve @_d_get type, nm
		result.promise
	_d_get: (type,nm) ->
		full_nm= type+ '/'+ nm+ '.html'
		return @cache[ full_nm] if @cache[ full_nm]?
		_Do_while= (count, cb) =>
			offset= 0
			_until_not_false= (result) =>
				return result if result isnt false or offset >= count
				(cb offset++).then _until_not_false
			_until_not_false false

		_getFile_cb= (offset) =>
			f= 'BaseDevl:E/LoadStrategy._getFile_cb'
			pkg= @reverse_packages[ offset]
			if p= @preLoaded pkg, type, nm
				p # Compiled and everything
			else
				@getFile pkg, full_nm

		(_Do_while @reverse_packages.length, _getFile_cb).then (results) =>
			if results isnt false
				parsed= E.Extra.ParseFile full_nm, results
				parsed.content[ ix]= (new Function 'return '+ parsed.content[ ix]) for ix in [0...parsed.content.length]
				@cache[full_nm]= parsed if @cache_local_flag
			else
				_log2 'ERROR', 'NO FILE FOUND! '+ nm
				parsed= false
			#_log2 'DEFER-L', '>results parsed>', results, parsed
			parsed
	getFile: (pkg,nm) -> # Must return a deferred
		path= @dir_map[ pkg]+ pkg+ '/'
		(m.request
			background: true # Don't want 'm' to redraw the view
			method: 'GET'
			url: path+ nm
			data: _: (new Date).valueOf() # Like jQuery's no_cache
			config: (xhr,options) ->
				xhr.setRequestHeader "Content-Type", "text/plain; charset=utf-8"
				xhr
			deserialize: (x)->x
		).then null, (error) ->
			#_log2 'AJAX ERROR ' #, error
			false # Signal to try again
	layout: (nm) -> @get 'Layout', nm
	page: (nm) -> @get 'Page', nm
	part: (nm) -> @get 'Part', nm
	fist: (grp_nm) -> E[ 'fist$'+ grp_nm]

E.Extra.LoadStrategy$BaseDevl= LoadStrategy
