
class Devl extends window.EpicMvc.ModelJS
	constructor: (Epic,view_nm) ->
		super Epic, view_nm
		@opts= file: false, tag: false, form: false
	action: (act,p) ->
		r= {}
		i= new window.EpicMvc.Issue @Epic
		m= new window.EpicMvc.Issue @Epic
		switch act
			when 'toggle' # p.what(file,tag,form)
				@opts[p.what]= not @opts[p.what]
			when 'clear_cache'
				@Epic.loader.clearCache()
			else return super act, p
		[r, i, m]
	loadTable: (tbl_nm) ->
		switch tbl_nm
			when 'Opts' then @Table[tbl_nm]= [@opts]
			else super tbl_nm

window.EpicMvc.Model.Devl$BaseDevl= Devl
