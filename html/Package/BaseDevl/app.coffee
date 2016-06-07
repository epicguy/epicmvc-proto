window.EpicMvc.app$BaseDevl=
	OPTIONS: frame: MMM_BaseDevl: 'bdevl'
	MODELS:
		Tag:      class: "TagExe$BaseDevl",     inst: "bdT"
		Devl:     class: "Devl$BaseDevl",       inst: "bdD"
	CLICKS:
		dbg_toggle:  call: 'Devl/toggle', use_fields: 'what'
		dbg_refresh: call: 'Devl/clear_cache'
		dbg_open_model: call: 'Devl/open_model', use_fields: 'name'
		dbg_open_table: call: 'Devl/open_table', use_fields: 'name'
		dbg_open_subtable: call: 'Devl/open_subtable', use_fields: 'name'
		dbg_close_subtable: call: 'Devl/close_subtable'
		dbg_table_left: call: 'Devl/table_left'
		dbg_table_right: call: 'Devl/table_right'
		dbg_table_col_set: call: 'Devl/table_col_set', use_fields: 'col'
		dbg_table_by_row: call: 'Devl/table_row_set'

