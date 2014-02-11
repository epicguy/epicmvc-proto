# Generate a compressed version of compiled view files
#
_log= -> #console.log

fs= require 'fs'

epic_path= process.argv[ 2]+ '/EpicMvc'
window= EpicMvc: Extras: {}, Model: {}
(require epic_path+ '/parse.js') window
(require epic_path+ '/util.js') window

class MockLoadStrategy
	constructor: (dev_dir,pkg_nm) ->
		@path= dev_dir+ '/Package/'+ pkg_nm+'/view/'
	getTmplNm: (nm) -> @path+ nm+ '.tmpl.html'
	getPageNm: (nm) -> @path+ 'page/'+ nm+ '.page.html'
	getPartNm: (nm) -> @path+ 'part/'+ nm+ '.part.html'
	getFile: (nm) ->
		results= 'bad request?'
		results= fs.readFileSync nm
		String results
	getCombinedAppConfs: ->
		#console.log "getCombinedAppConfs: #{@Epic.appconfs}"
		result= {}
		for pkg in @Epic.appconfs
			window.$.extend true, result, window.EpicMvc['app$'+pkg]
		result
	template: (nm) ->
		#console.log "template: #{nm}"
		full_nm= @getTmplNm nm
		out= window.EpicMvc.ParseFile full_nm, @getFile full_nm
		#console.log out
		out
	page: (nm) ->
		#console.log "page: #{nm}"
		full_nm= @getPageNm nm
		out= window.EpicMvc.ParseFile full_nm, @getFile full_nm
		#console.log out
		out
	part: (nm) ->
		#console.log "part: #{nm}"
		full_nm= @getPartNm nm
		window.EpicMvc.ParseFile full_nm, @getFile full_nm
	readdir: (type) ->
		f= 'MockLoadStrategy.readdir'
		_log f, '>', type
		path_part= (if type is 'template' then '.' else type)
		_log f, '@path path_part', @path, path_part
		return [] if not fs.existsSync @path+ path_part
		files= fs.readdirSync @path+ path_part
		f[0] for f in (p.split '.' for p in files) when f?[1] is (if type is 'template' then 'tmpl' else type)

doIt= (dev_dir,pkg_nm) ->
	f= 'doIt'
	_log f, 'args', dev_dir, pkg_nm
	out= 'window.EpicMvc.view$'+ pkg_nm+ '={\n'
	load= new MockLoadStrategy dev_dir, pkg_nm
	out+= 'tmpl: {\n'
	end= ''
	for f in load.readdir 'template'
		out+= end+ "\"#{f}\": #{JSON.stringify load.template f}"
		end= ",\n"
	out+= '}, page: {\n'
	end= ''
	for f in load.readdir 'page'
		out+= end+ "\"#{f}\": #{JSON.stringify load.page f}"
		end= ",\n"
	out+= '}, part: {\n'
	end= ''
	for f in load.readdir 'part'
		out+= end+ "\"#{f}\": #{JSON.stringify load.part f}"
		end= ",\n"
	out+= '}};\n'
	console.log ''+ out

doIt process.argv[ 3], process.argv[ 4]
