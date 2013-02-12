
class LoadStrategy
	constructor: (@Epic) ->
		@path= 'Package/Base/view/'
		@cache= {}
	getTmplNm: (nm) -> nm+ '.tmpl.html'
	getPageNm: (nm) -> 'page/'+ nm+ '.page.html'
	getPartNm: (nm) -> 'part/'+ nm+ '.part.html'
	getFile: (nm) ->
		return @cache[nm] if @cache[nm]?
		results= false
		@reverse_packages?=( @Epic.appconfs[i] for i in [@Epic.appconfs.length- 1..0])
		for pkg in @reverse_packages
			path= "Package/#{pkg}/view/"
			window.$.ajax
				url: path+ nm
				async:false
				cache:false
				dataType: 'text',
				success: (data) -> results= data
				error: (jqXHR,textStatus,errorThrown) ->
					console.log 'AJAX ERROR '
			break if results isnt false
		console.log 'NO FILE FOUND! '+ nm if results is false
		@cache[nm]= String results
	getCombinedAppConfs: ->
		result= {}
		for pkg in @Epic.appconfs
			window.$.extend true, result, window.EpicMvc['app$'+pkg]
		result
	template: (nm) ->
		full_nm= @getTmplNm nm
		window.EpicMvc.ParseFile full_nm, @getFile full_nm
	page: (nm) ->
		full_nm= @getPageNm nm
		window.EpicMvc.ParseFile full_nm, @getFile full_nm
	part: (nm) ->
		full_nm= @getPartNm nm
		window.EpicMvc.ParseFile full_nm, @getFile full_nm
	fist: (grp_nm) ->
		window.EpicMvc['fist$'+ grp_nm]

window.EpicMvc.Extras.LoadStrategy$BaseDevl= LoadStrategy
