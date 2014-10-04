# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# This 'Base' load strategy expects all assests to be in memory variables (E.* namespace)
class LoadStrategy$Base
	constructor: () ->
	getArtifact: (nm, type) ->
		results= false
		@reverse_packages?=( E.appconfs[i] for i in [E.appconfs.length- 1..0])
		for pkg in @reverse_packages
			results= E['view$'+ pkg]?[type]?[nm] ? false
			break if results isnt false
		console.log 'NO FILE FOUND! '+ nm if results is false
		results
	getAppConfs: ->
		result= []
		for pkg in E.appconfs
			result.push E['app$'+pkg]
		result
	fist: (grp_nm) ->
		E['fist$'+ grp_nm]
	layout: (nm) ->
		@getArtifact nm, 'tmpl'
	page: (nm) ->
		@getArtifact nm, 'page'
	part: (nm) ->
		@getArtifact nm, 'part'

E.Extra.LoadStrategy$Base= LoadStrategy$Base
