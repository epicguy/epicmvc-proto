# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# This 'Base' load strategy expects all assests to be in memory variables (E.* namespace)
class LoadStrategy$Base
	constructor: (appconfs) ->
		@reverse_packages=( appconfs[i] for i in [appconfs.length- 1..0])
	getArtifact: (nm, type) ->
		results= false
		for pkg in @reverse_packages
			results= E['view$'+ pkg]?[type]?[nm] ? false
			break if results isnt false
		console.log 'NO FILE FOUND! '+ nm if results is false
		results
	D_loadAsync: ->
		def= new m.Deferred()
		def.resolve()
		def.promise
	fist: (grp_nm) ->
		BROKEN()
		E['fist$'+ grp_nm]
	d_layout: (nm) ->
		@getArtifact nm, 'Layout'
	d_page: (nm) ->
		@getArtifact nm, 'Page'
	d_part: (nm) ->
		@getArtifact nm, 'Part'

E.Extra.LoadStrategy$Base= LoadStrategy$Base
