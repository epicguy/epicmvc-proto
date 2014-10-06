window.EpicMvc.app$BaseDevl=
	MANIFEST: #%#
		Model: ['ModelJS', 'Devl', 'View'] #%#
		Extra: ['ParseFile'] #%#
	SETTINGS:
		frames: MMM_BaseDevl: 'bdevl'
	OPTIONS:
		loader: 'LoadStrategy$BaseDevl'
	MODELS:
		Devl:     class: "Devl$BaseDevl",       inst: "iBaseDevl_Devl"
		View:     class: "View$BaseDevl",       inst: "iBaseDevl_View"
	CLICKS:
		dbg_toggle:         do: 'Devl.toggle', pass: 'what'
		dbg_refresh:        do: 'Devl.clear_cache'
		dbg_open_model:     do: 'Devl.open_model', pass: 'name'
		dbg_open_table:     do: 'Devl.open_table', pass: 'name'
		dbg_open_subtable:  do: 'Devl.open_subtable', pass: 'name'
		dbg_close_subtable: do: 'Devl.close_subtable'
		dbg_table_left:     do: 'Devl.table_left'
		dbg_table_right:    do: 'Devl.table_right'
		dbg_table_col_set:  do: 'Devl.table_col_set', pass: 'col'
		dbg_table_by_row:   do: 'Devl.table_row_set'

