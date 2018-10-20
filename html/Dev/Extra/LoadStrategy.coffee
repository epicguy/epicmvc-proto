'use strict'
# Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class LoadStrategy
	constructor: (@appconfs) ->
		@clearCache()
		@cache_local_flag= true # False if we want browser to cache responses
		@reverse_packages=( @appconfs[ i] for i in [@appconfs.length- 1..0])
	clearCache: () -> @cache= {}; @refresh_stamp= (new Date).valueOf() # Like jQuery's no_cache
	makePkgDir: (pkg)->
		E.option.loadDirs[ pkg]+ if (E.option.loadDirs[ pkg].slice -1) is '/' then pkg else ''
	D_loadAsync: () -> # Load up all the Model/Extra code stuff - caller should delay after
		f= 'DE/LoadStrategy.D_loadAsync:'
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
		for pkg in @appconfs
			continue if pkg not of E.option.loadDirs
			for type,file_list of E[ 'manifest$'+ pkg] ? {} when type isnt 'css'
				for file in file_list
					sub= if type is 'root' then '' else type+ '/'
					url= (@makePkgDir pkg)+ '/'+ sub+ file+ '.js'
					work.push url
					E.log f+ 'to do', {url}

		new Promise (resolve, reject)->
			next= (ix) ->
				if ix>= work.length
					E.log f+ 'done.', {ix}
					resolve null
					return
				E.log f+ 'doing', {ix, work:work[ ix]}
				el= document.createElement 'script'
				el.setAttribute 'type', 'text/javascript'
				el.setAttribute 'src', work[ ix]
				el.onload= -> next ix+ 1
				document.head.appendChild el
				return
			next 0
	inline: (type,nm) ->
		f= 'DE/LoadStrategy.inline:'
		el= document.getElementById id= 'view-'+ type+ '-'+ nm
		E.log f, {id, el}
		return el.innerHTML if el
		null
	preLoaded: (pkg,type,nm) ->
		f= 'DE/LoadStrategy.preLoaded:'
		E.log f+ 'looking for', {pkg, type, nm}
		r= E['view$'+pkg]?[type]?[nm]
		E.log f+ 'found', {preloaded: (if r?.preloaded then 'PRELOADED' else 'broken'), r}
		r
	compile: (name,uncompiled) ->
		parsed= E.Extra.ParseFile name, uncompiled
		parsed.content= (new Function parsed.content)
		@cache[name]= parsed if @cache_local_flag
		return parsed
	# This supports e.g. <script type="x/template" id="view-Layout-default"><:page/></script>
	d_get: (type,nm) ->
		f= 'DE/LoadStrategy.d_get:'
		full_nm= type+ '/'+ nm+ '.html'
		E.log f, {type,nm,full_nm}
		return @cache[ full_nm] if @cache[ full_nm]? # Note, could be a promise if same part asked again

		# Inline overrides everything (not pkg specific)
		return @compile full_nm, uncompiled if uncompiled= @inline type, nm

		promise= Promise.resolve false

		# TODO COMPATABILITY MODE, EH?
		type_alt= if type is 'Layout' then 'tmpl' else type.toLowerCase()
		full_nm_alt= type+ '/'+ nm+ '.'+ type_alt+ '.html'
		if E.option.compat_path
			for pkg in @reverse_packages when pkg not in ['Base', 'Dev', 'Proto'] and type isnt 'Layout'
				do (pkg) =>
					promise= promise.then (result) =>
						E.log f+ 'THEN-', {pkg, full_nm_alt, result: if 'S' is E.type_oau result then (result.slice 0, 40) else result}
						return result if result isnt false # No need to hit network again
						return false if pkg not of E.option.loadDirs
						@D_getFile pkg, full_nm_alt
		for pkg in @reverse_packages
			do (pkg) =>
				promise= promise.then (result) =>
					E.log f+ 'THEN-', {pkg, full_nm, result: if 'S' is E.type_oau result then (result.slice 0, 40) else result}
					return result if result isnt false # No need to hit network again
					return compiled if compiled= @preLoaded pkg, type, nm
					return false if pkg not of E.option.loadDirs
					@D_getFile pkg, full_nm
		promise= promise.then (result) => # False if no file ever found
			E.log f+ 'THEN-COMPILE', {full_nm, result}
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
			E.log f+ 'DEFER-L', {result, parsed}
			@cache[ full_nm]= parsed
			return parsed
		promise.then null, (error) -> throw error
		@cache[ full_nm]= promise
		return promise

	D_getFile: (pkg,nm) -> # Must return a promise
		f= 'DE/LoadStrategy.D_getFile:'
		path= (@makePkgDir pkg)+ '/'
		new Promise (resolve, reject)->
			xhr= new XMLHttpRequest()
			xhr.onloadend= (event)->
				resolve false unless xhr.status is 200
				resolve xhr.response
			xhr.open 'GET', path+ nm+ '?_='+ new Date().valueOf()
			xhr.setRequestHeader "Content-Type", "text/plain; charset=utf-8"
			xhr.send()

	d_layout: (nm) -> @d_get 'Layout', nm
	d_page:   (nm) -> @d_get 'Page', nm
	d_part:   (nm) -> @d_get 'Part', nm

E.Extra.LoadStrategy$Dev= LoadStrategy
E.opt loader: 'LoadStrategy$Dev'
