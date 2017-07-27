'use strict'
# Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class LoadStrategy
	constructor: (@appconfs) ->
		@clearCache()
		@cache_local_flag= true # False if we want browser to cache responses
		@reverse_packages=( @appconfs[ i] for i in [@appconfs.length- 1..0])
	clearCache: () -> @cache= {}; @refresh_stamp= (new Date).valueOf() # Like jQuery's no_cache
	makePkgDir: (pkg)->
		E.option.loadDirs[ pkg]+ if (E.option.loadDirs[ pkg].slice -1) is '/' then pkg else ''
	D_loadAsync: () -> # Load up all the Model/Extra code stuff - caller should delay after
		f= 'Dev:E/LoadStrategy.loadAsync'
		# Insert script tags for all MANIFEST entries of each package-app-config file
		for pkg in @appconfs
			continue if pkg not of E.option.loadDirs
			for type,file_list of E[ 'manifest$'+ pkg] ? {} when type is 'css'
				for file in file_list
					url= (@makePkgDir pkg)+ '/css/'+ file+ '.css'
					# <link rel="stylesheet" type="text/css" href="
					el= document.createElement 'link'
					el.setAttribute 'rel', 'stylesheet'
					el.setAttribute 'type', 'text/css'
					el.setAttribute 'href', url
					document.head.appendChild el
		work= []
		def= new m.Deferred()
		promise= def.promise
		for pkg in @appconfs
			continue if pkg not of E.option.loadDirs
			for type,file_list of E[ 'manifest$'+ pkg] ? {} when type isnt 'css'
				for file in file_list
					sub= if type is 'root' then '' else type+ '/'
					url= (@makePkgDir pkg)+ '/'+ sub+ file+ '.js'
					work.push url
					#_log2 f, 'to do ', url

		next= (ix) ->
			if ix>= work.length
				_log2 f, ix, 'done.'
				def.resolve null
				return
			_log2 f, 'doing', ix, work[ ix]
			el= document.createElement 'script'
			el.setAttribute 'type', 'text/javascript'
			el.setAttribute 'src', work[ ix]
			el.onload= -> next ix+ 1
			document.head.appendChild el
			return
		next 0
		# Note: caller should release the thread to allow browser to load the scripts
		promise
	inline: (type,nm) ->
		f= 'inline'
		el= document.getElementById id= 'view-'+ type+ '-'+ nm
		#_log2 f, 'inline el=', id, el
		return el.innerHTML if el
		null
	preLoaded: (pkg,type,nm) ->
		f= 'preLoaded'
		#_log2 f, 'looking for ', pkg, type, nm
		r= E['view$'+pkg]?[type]?[nm]
		#_log2 f, 'found', (if r?.preloaded then 'PRELOADED' else 'broken'), r
		r
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

		# TODO COMPATABILITY MODE, EH?
		type_alt= if type is 'Layout' then 'tmpl' else type.toLowerCase()
		full_nm_alt= type+ '/'+ nm+ '.'+ type_alt+ '.html'
		if E.option.compat_path
			for pkg in @reverse_packages when pkg not in ['Base', 'Dev', 'Proto'] and type isnt 'Layout'
				do (pkg) =>
					promise= promise.then (result) =>
						#_log2 f, 'THEN-'+ pkg, full_nm_alt, if 'S' is E.type_oau result then (result.slice 0, 40) else result
						return result if result isnt false # No need to hit network again
						return false if pkg not of E.option.loadDirs
						@D_getFile pkg, full_nm_alt
		for pkg in @reverse_packages
			do (pkg) =>
				promise= promise.then (result) =>
					#_log2 f, 'THEN-'+ pkg, full_nm, if 'S' is E.type_oau result then (result.slice 0, 40) else result
					return result if result isnt false # No need to hit network again
					return compiled if compiled= @preLoaded pkg, type, nm
					return false if pkg not of E.option.loadDirs
					@D_getFile pkg, full_nm
		promise= promise.then (result) => # False if no file ever found
			#_log2 f, 'THEN-COMPILE', full_nm, result
			if result isnt false
				# Could have been precompiled content
				# return result if result?.preloaded  # TODO FIGURE OUT WHAT GOES HERE TO DETECT PRECOMPILED CONTENT
				parsed= if result?.preloaded  # TODO FIGURE OUT WHAT GOES HERE TO DETECT PRECOMPILED CONTENT
				then result
				else @compile full_nm, result
			else
				throw new Error "Unable to locate View file (#{full_nm})."
				console.error 'ERROR', 'NO FILE FOUND! ', full_nm
				parsed= false
			#_log2 f, 'DEFER-L', '>results parsed>', result, parsed
			@cache[ full_nm]= parsed
			return parsed
		promise.then null, (error) -> throw error
		@cache[ full_nm]= promise
		return promise

	D_getFile: (pkg,nm) -> # Must return a deferred
		f= 'D_getFile'
		path= (@makePkgDir pkg)+ '/'
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
			#_log2 f, 'AJAX ERROR ' #, error
			false # Signal to try again
	d_layout: (nm) -> @d_get 'Layout', nm
	d_page:   (nm) -> @d_get 'Page', nm
	d_part:   (nm) -> @d_get 'Part', nm

E.Extra.LoadStrategy$Dev= LoadStrategy
E.opt loader: 'LoadStrategy$Dev'
