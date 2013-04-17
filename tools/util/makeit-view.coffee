# Generate a compressed version of compiled view files

jsdom = require "jsdom"
testenv= require "../testlib/testenv"
fs= require 'fs'

doIt= (epic_path,dev_dir,pkg_nm) ->
	jsdom.env
		html: "<html><body><div id='fill_me'></div></body></html>"
		scripts: [
			'..'+ '/testlib/MockEpicSetup.js'
			'..'+ '/testlib/json2.js'
			epic_path+ '/parse.js'
			epic_path+ '/util.js'
		],
		(err, window)->
			#console.log err
			class MockLoadStrategy
				constructor: (@Xdev_dir,@Xpkg_nm) ->
					#@path= testenv.baseDir.substr( 'file://'.length)+ '/Package/'+ @pkg_nm+'/view/'
					@path= @Xdev_dir+ '/Package/'+ @Xpkg_nm+'/view/'
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
					path_part= (if type is 'template' then '.' else type)
					return [] if not fs.existsSync @path+ path_part
					files= fs.readdirSync @path+ path_part
					f[0] for f in (p.split '.' for p in files) when f?[1] is (if type is 'template' then 'tmpl' else type)

			out= 'window.EpicMvc.view$'+ pkg_nm+ '={\n'
			load= new MockLoadStrategy dev_dir, pkg_nm
			out+= 'tmpl: {\n'
			for f in load.readdir 'template'
				out+= "\"#{f}\": #{JSON.stringify load.template f},\n"
			out+= '}, page: {\n'
			for f in load.readdir 'page'
				out+= "\"#{f}\": #{JSON.stringify load.page f},\n"
			out+= '}, part: {\n'
			for f in load.readdir 'part'
				out+= "\"#{f}\": #{JSON.stringify load.part f},\n"
			out+= '}};\n'
			console.log ''+ out

doIt (process.argv[ 2]+'/EpicMvc'), process.argv[ 3], process.argv[ 4]
