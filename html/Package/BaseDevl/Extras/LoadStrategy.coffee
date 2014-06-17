
class LoadStrategy
	constructor: (@Epic) ->
		@path= 'Package/Base/view/'
		@cache= {}
		@cache_local_flag= true # False if we want browser to cache responses
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
				results= window.EpicMvc.ParseFile full_nm, results if results isnt false
			@cache[full_nm]= results if @cache_local_flag and results isnt false
			break if results isnt false
		if results is false
			console.log 'NO FILE FOUND! '+ nm
		results
	getFile: (pkg,nm) ->
		results= false
		path= "Package/#{pkg}/view/"
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

window.EpicMvc.Extras.LoadStrategy$BaseDevl= LoadStrategy
