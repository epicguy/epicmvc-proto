# Generate a compressed version of compiled view files

jsdom = require "jsdom"
testenv= require "../testlib/testenv"
fs= require 'fs'

doIt= (pkg_nm) ->
	jsdom.env
		html: "<html><body><div id='fill_me'></div></body></html>"
		scripts: [
			#testenv.jquery
			#testenv.testDir+ '/testlib/MockEpicSetup.js'
			#testenv.testDir+ '/testlib/json2.js'
			'..'+ '/testlib/MockEpicSetup.js'
			'..'+ '/testlib/json2.js'
			#testenv.baseDir+ '/EpicMvc/parse.js'
			#testenv.baseDir+ '/EpicMvc/util.js'
			'..'+ '/EpicMvc/parse.js'
			'..'+ '/EpicMvc/util.js'
		],
		(err, window)->
			#console.log err
			class MockLoadStrategy
				constructor: (@pkg_nm) ->
					#@path= testenv.baseDir.substr( 'file://'.length)+ '/Package/'+ @pkg_nm+'/view/'
					@path= '../DevHtml'+ '/Package/'+ @pkg_nm+'/view/'
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
					files= fs.readdirSync @path+ (if type is 'template' then '.' else type)
					f[0] for f in (p.split '.' for p in files) when f?[1] is (if type is 'template' then 'tmpl' else type)

			out= 'window.EpicMvc.view$'+ pkg_nm+ '={\n'
			load= new MockLoadStrategy pkg_nm
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

doIt process.argv[ 2] || 'bad-arg'
