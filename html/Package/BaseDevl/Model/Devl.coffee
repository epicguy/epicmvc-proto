
class Devl extends window.EpicMvc.ModelJS
	constructor: (Epic,view_nm) ->
		super Epic, view_nm
		@opts= file: false, tag: false, tag2: false, form: false, model: false, stack: true
		@open_model= ''
		@open_table= ''
		@table_row_cnt= 0
		@table_by_col= false
		@table_col= false
	eventNewRequest: ->
		@invalidateTables true
		setTimeout (=> @invalidateTables true), 2000
	action: (act,p) ->
		f= 'dM:Devl('+ act+ ')'
		r= {}
		i= new window.EpicMvc.Issue @Epic
		m= new window.EpicMvc.Issue @Epic
		switch act
			when 'toggle' # p.what(file,tag,form)
				@opts[p.what]= not @opts[p.what]
			when 'clear_cache'
				@Epic.loader.clearCache()
			when 'open_model' # p.name
				if @open_model isnt p.name
					@open_model= p.name
				else @open_model= ''
				delete @Table.Model
			when 'open_table' # p.name
				if @open_table isnt p.name
					@table_row_cnt= 0
					@table_by_col= false
					@table_col= false
					@open_table= p.name
				else
					@open_table= ''
				delete @Table.Model
			when 'table_row_set' #p.row(opt)
					@table_by_col= false
					@table_row_cnt= p.row if p.row?
			when 'table_col_set' #p.col
					@table_col= p.col
					@table_by_col= true
			when 'table_left', 'table_right'
				incr= if act is 'table_left' then -1 else 1
				_log2 f, act, incr, @table_row_cnt
				@table_row_cnt+= incr
				delete @Table.Model
			else return super act, p
		[r, i, m]
	loadTable: (tbl_nm) ->
		f= 'dM:Devl.loadTable('+ tbl_nm+ ')'
		switch tbl_nm
			when 'Opts' then @Table[tbl_nm]= [@opts]
			when 'Model'
				table= []
				#for nm of @Epic.oAppConf.config.MODELS
				for inst of @Epic.oModel
					nm= @Epic.oModel[inst].view_nm
					row= $.extend {is_open: '', Table: []}, {inst: inst, name: nm}
					row.is_open= 'yes' if nm is @open_model
					for tnm,rec of @Epic.oModel[ inst].Table
						len= rec.length
						if len
							cols= (rcol for rcol of rec[0]) # List cols; select one via table-row-cnt
						else cols= []
						trow= is_open: '', name: tnm, rows: len, Cols: [], row_cnt: 0, col: '', curr_col: @table_col, by_col: @table_by_col
						if tnm is @open_table
							trow.is_open= 'yes'
							@table_row_cnt= len- 1 if @table_row_cnt< 0
							@table_row_cnt= 0 if @table_row_cnt> len- 1
							trow.row_cnt= @table_row_cnt
						trow.cols= if len then (col for col of rec[0]).join ', ' else 'no rows'
						if len
							if not @table_by_col # List cols/vals
								trow.Cols=({
									type: (if rval is null then 'Null' else typeof rval)
									col_ix: (cols.indexOf col), col: rcol, len: rval?.length
									val: rval
									} for rcol,rval of rec[ @table_row_cnt])
							else # List all rows with one col's vals
								trow.Rows=({
									row: rrow, len: rec[rrow][ @table_col]?.length
									type: (if rec[rrow][ @table_col] is null then 'Null' else typeof rec[rrow][ @table_col])
									val: rec[rrow][ @table_col]
									} for rrow of rec)
						row.Table.push trow
					row.tables= row.Table.length
					table.push row
					table.sort (a,b) ->
						if a.inst is b.inst then 0
						else if a.inst> b.inst then 1
						else -1

				_log2 f, 'final', table
				@Table[tbl_nm]= table
			else super tbl_nm

window.EpicMvc.Model.Devl$BaseDevl= Devl
