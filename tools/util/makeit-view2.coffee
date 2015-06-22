# Generate a compressed version of compiled view files
#
window= {}
_log= ->
#_log= console.log
window._log2= ->
#window._log2= console.log

fs= require 'fs'

# Add the '../' because we are inside util/
dev_dir= '../'+ process.argv[ 3]
epic_path= '../'+ process.argv[ 2]
#window= E: Extra: {}, Model: {}
window.E= require epic_path+ '/EpicCore.js'
E= window.E # So it looks like it's in the global namespace, when used as closure below
(require epic_path+ '/Dev/Extra/ParseFile.js') window

class MockLoadStrategy
	constructor: (dev_dir,pkg_nm) ->
		@path= dev_dir+ '/'+ pkg_nm+ '/'
	getLayoNm: (nm) -> @path+ 'Layout/'+ nm+ '.html'
	getPageNm: (nm) -> @path+ 'Page/'+   nm+ '.html'
	getPartNm: (nm) -> @path+ 'Part/'+   nm+ '.html'
	getFile: (nm) ->
		results= 'bad request?'
		results= fs.readFileSync nm
		String results
	layout: (nm) ->
		_log "layout: #{nm}"
		full_nm= @getLayoNm nm
		out= E.Extra.ParseFile full_nm, @getFile full_nm
		#_log out
		out
	page: (nm) ->
		_log "page: #{nm}"
		full_nm= @getPageNm nm
		out= E.Extra.ParseFile full_nm, @getFile full_nm
		#_log out
		out
	part: (nm) ->
		_log "part: #{nm}"
		full_nm= @getPartNm nm
		E.Extra.ParseFile full_nm, @getFile full_nm
	readdir: (type) ->
		f= 'MockLoadStrategy.readdir'
		_log f, '>', type
		path_part= type
		_log f, '@path path_part', @path, path_part
		return [] if not fs.existsSync @path+ path_part
		files= fs.readdirSync @path+ path_part
		f[0] for f in (p.split '.' for p in files)

doObj= (obj) ->
		content= "function(){#{obj.content}}"
		"{preloaded:1,can_componentize:#{obj.can_componentize},defer:#{obj.defer},content:#{content}}"

doIt= (dev_dir,pkg_nm) ->
	f= 'doIt'
	_log f, 'args', dev_dir, pkg_nm
	out= 'E.view$'+ pkg_nm+ '={\n'
	load= new MockLoadStrategy dev_dir, pkg_nm

	out+= 'Layout: {\n'
	end= ''
	for fnm in load.readdir 'Layout'
		out+= end+ "\"#{fnm}\":#{doObj load.layout fnm}"
		end= ",\n"

	out+= '},\nPage: {\n'
	end= ''
	for fnm in load.readdir 'Page'
		out+= end+ "\"#{fnm}\":#{doObj load.page fnm}"
		end= ",\n"

	out+= '},\nPart: {\n'
	end= ''
	for fnm in load.readdir 'Part'
		out+= end+ "\"#{fnm}\":#{doObj load.part fnm}"
		end= ",\n"
	out+= '}};\n'
	console.log ''+ out

doIt dev_dir, process.argv[ 4]
