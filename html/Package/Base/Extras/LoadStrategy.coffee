
class LoadStrategy
	constructor: (@Epic) ->
	getArtifact: (nm, type) ->
		results= false
		@reverse_packages?=( @Epic.appconfs[i] for i in [@Epic.appconfs.length- 1..0])
		for pkg in @reverse_packages
			results= window.EpicMvc['view$'+ pkg]?[type]?[nm] ? false
			break if results isnt false
		console.log 'NO FILE FOUND! '+ nm if results is false
		results
	getCombinedAppConfs: ->
		result= {}
		for pkg in @Epic.appconfs
			window.$.extend true, result, window.EpicMvc['app$'+pkg]
		result
	fist: (grp_nm) ->
		window.EpicMvc['fist$'+ grp_nm]
	template: (nm) ->
		@getArtifact nm, 'tmpl'
	page: (nm) ->
		@getArtifact nm, 'page'
	part: (nm) ->
		@getArtifact nm, 'part'

window.EpicMvc.Extras.LoadStrategy$Base= LoadStrategy
