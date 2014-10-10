class Wist extends E.ModelJS
	constructor: (view_nm, opts) ->
		super view_nm, opts #,ss
		@rest= window.rest_v1

	loadTable: (tbl_nm) ->
		f= "Wist:loadTable:#{tbl_nm}"
		[resource, sub_resource]= tbl_nm.split ':'
		map= @rest.getMap resource, sub_resource
		_log2 f, map
		@Table[tbl_nm]=( rec for nm,rec of map)

E.Model.Wist= Wist # Public API
