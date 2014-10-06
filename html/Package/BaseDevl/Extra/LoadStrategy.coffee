'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class LoadStrategy
	constructor: (@appconfs) ->
		@cache= {}
		@cache_local_flag= true # False if we want browser to cache responses
		@reverse_packages=( @appconfs[ i] for i in [@appconfs.length- 1..0])
		# Index defined dirs by package: *.html: E.run([],{load_dirs:[{dir:'Package/',pkgs:['Test']}]})
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
	inline: (type,nm) ->
		el= document.getElementById 'view-'+ type+ '-'+ nm
		return el.innerHTML if el
		null
	preLoaded: (pkg,type,nm) -> E['view$'+pkg]?[type]?[nm]
	compile: (name,uncompiled) ->
		parsed= E.Extra.ParseFile name, uncompiled
		parsed.content= (new Function parsed.content)
		@cache[name]= parsed if @cache_local_flag
		return parsed
	# This supports e.g. <script type="x/template" id="view-Layout-default"><:page/></script>
	d_get: (type,nm) ->
		f= 'd_get'
		full_nm= type+ '/'+ nm+ '.html'
		return @cache[ full_nm] if @cache[ full_nm]? # Note, could be a promise if same part asked again

		# Inline overrides everything (not pkg specific)
		return @compile full_nm, uncompiled if uncompiled= @inline type, nm

		def= new m.Deferred()
		def.resolve false
		promise= def.promise
		for pkg in @reverse_packages
			do (pkg) =>
				promise= promise.then (result) =>
					_log2 f, 'THEN-'+ pkg, full_nm, (if result is false then false else result.slice 0, 40)
					return result if result isnt false # No need to hit network again
					return compiled if compiled= @preLoaded pkg, type, nm
					@D_getFile pkg, full_nm

		promise= promise.then (result) => # False if no file ever found
			#_log2 f, 'THEN-COMPILE', full_nm, result
			if result isnt false
				# Could have been precompiled content
				return result if result?.preloaded  # TODO FIGURE OUT WHAT GOES HERE TO DETECT PRECOMPILED CONTENT
				parsed= @compile full_nm, result
			else
				_log2 'ERROR', 'NO FILE FOUND! '+ type+ ' - '+ nm
				parsed= false
			#_log2 'DEFER-L', '>results parsed>', result, parsed
			return parsed
		return promise

	D_getFile: (pkg,nm) -> # Must return a deferred
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
	d_layout: (nm) -> @d_get 'Layout', nm
	d_page: (nm) -> @d_get 'Page', nm
	d_part: (nm) -> @d_get 'Part', nm
	fist: (grp_nm) -> BROKEN() # TODO NEED TO BE AJAX NOW, ALSO DO ISSUES LOAD E[ 'fist$'+ grp_nm]

E.Extra.LoadStrategy$BaseDevl= LoadStrategy
