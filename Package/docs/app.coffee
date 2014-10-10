
window.EpicMvc.app$docs=
	MANIFEST:
		MODEL: ['Wist','ApiRef']
	SETTINGS:
		go: 'anon//'
		layout: 'logged_out'
		group: 'docs'
		show_issues: 'inline'
	MODELS:
		Wist:		class: 'Wist',		inst: 'edW'
		ApiRef:		class: 'ApiRef',	inst: 'edAr'
	CLICKS:
		close_modal: 		call: 'Pageflow/restore_path'
		go_overview: 		go: 'anon/home/overview'
		go_api: 			go: 'anon/home/api_ref'
		go_examples: 		go: 'anon/home/examples'
		go_views: 			go: 'anon/views/views'
		go_views_overview: 	go: 'anon/views/overview'
		go_views_ppt: 		go: 'anon/views/ppt'
		go_views_data: 		go: 'anon/views/data'
		go_views_links: 	go: 'anon/views/links'
		go_views_forms: 	go: 'anon/views/forms'
		go_views_logic: 	go: 'anon/views/logic'
		go_views_tags: 		go: 'anon/views/tags'
		go_views_fists: 	go: 'anon/views/fists'
		go_views_issues: 	go: 'anon/views/issues'
		go_models: 			go: 'anon/models/models'
		go_models_create:	go: 'anon/models/create'
		go_models_install:	go: 'anon/models/install'
		go_models_state:	go: 'anon/models/state'
		go_models_tables:	go: 'anon/models/tables'
		go_models_actions:	go: 'anon/models/actions'
		go_models_forms:	go: 'anon/models/forms'
		go_controller: 		go: 'anon/controller/ctr'
		go_ctrl_overview:	go: 'anon/controller/overview'
		go_ctrl_app:		go: 'anon/controller/app'
		go_ctrl_options:	go: 'anon/controller/options'
		go_ctrl_models:		go: 'anon/controller/models'
		go_ctrl_clicks:		go: 'anon/controller/clicks'
		go_ctrl_results:	go: 'anon/controller/results'
		go_ctrl_macros:		go: 'anon/controller/macros'
		go_ctrl_flows:		go: 'anon/controller/flows'
	FLOWS:
		anon:
			start: 'home'
			v:
				scroll:'top',is_api_ref:'',is_examples:'',is_ctrl:'',is_overview:''
				is_views:'',is_v_overview:'',is_v_ppt:'',is_v_data:'',is_v_links:'',is_v_forms:'',is_v_logic:'',is_v_tags:'',is_v_fists:'',is_v_issues:''
				is_models:'',is_m_create:'',is_m_install:'',is_m_state:'', is_m_tables:'',is_m_actions:'',is_m_forms:''
				is_c_overview:'',is_c_app:'',is_c_options:'',is_c_models:'',is_c_macros:'',is_clicks:'',is_c_flows:'',is_c_results:''
			TRACKS:
				home:
					start: 'overview'
					STEPS:
						api_ref: 		page: 'api_ref', 		v:{scroll:'top', is_api_ref:'yes'}
						examples:		page: 'examples', 		v:{scroll:'top', is_examples:'yes'}
						overview:		page: 'overview', 		v:{scroll:'top', is_overview:'yes'}
				views:
					start: 'views'
					v:{is_views:'yes'}
					STEPS:
						views:	page: 'views',	v:{scroll:'top'}
						overview: page: 'views', v:{scroll:'views_overview',		is_v_overview:'yes'}, dom_cache:'views_overview'
						ppt:	page: 'views', 	v:{scroll:'page_part_tmpl',			is_v_ppt:'yes'}, 	dom_cache:'page_part_tmpl'
						data:	page: 'views', 	v:{scroll:'views_data',				is_v_data:'yes'}, 	dom_cache:'views_data'
						links:	page: 'views', 	v:{scroll:'links_nav',				is_v_links:'yes'}, 	dom_cache:'links_nav'
						forms:	page: 'views', 	v:{scroll:'forms_fields_buttons',	is_v_forms:'yes'}, 	dom_cache:'forms_fields_buttons'
						logic:	page: 'views', 	v:{scroll:'conditional_logic',		is_v_logic:'yes'}, 	dom_cache:'conditional_logic'
						tags:	page: 'views', 	v:{scroll:'other_tags',				is_v_tags:'yes'}, 	dom_cache:'other_tags'
						fists:	page: 'views', 	v:{scroll:'forms_fists',			is_v_fists:'yes'}, 	dom_cache:'forms_fists'
						issues:	page: 'views', 	v:{scroll:'issues_messages',		is_v_issues:'yes'}, dom_cache:'issues_messages'
				models:
					start: 'models'
					v:{is_models:'yes'}
					STEPS:
						models:		page: 'models',		v:{scroll:'top'}
						create:		page: 'models', 	v:{scroll:'models_create',	is_m_create:'yes'}, dom_cache:'models_create'
						install:	page: 'models', 	v:{scroll:'models_install',	is_m_install:'yes'},dom_cache:'models_install'
						state:		page: 'models', 	v:{scroll:'models_state',	is_m_state:'yes'}, 	dom_cache:'models_state'
						tables:		page: 'models', 	v:{scroll:'models_tables',	is_m_tables:'yes'}, dom_cache:'models_tables'
						actions:	page: 'models', 	v:{scroll:'models_actions',	is_m_actions:'yes'},dom_cache:'models_actions'
						forms:		page: 'models', 	v:{scroll:'models_forms',	is_m_forms:'yes'}, 	dom_cache:'models_forms'
				controller:
					start: 'ctrl'
					v:{is_ctrl:'yes'}
					STEPS:
						ctrl:		page: 'controller',	v:{scroll:'top'}
						overview:	page: 'controller', v:{scroll:'ctrl_overview',	is_c_overview:'yes'}, dom_cache:'ctrl_overview'
						app:		page: 'controller', v:{scroll:'ctrl_app',		is_c_app:'yes'}, 	 dom_cache:'ctrl_app'
						options:	page: 'controller', v:{scroll:'ctrl_options',	is_c_options:'yes'}, dom_cache:'ctrl_options'
						models:		page: 'controller', v:{scroll:'ctrl_models',	is_c_models:'yes'},	 dom_cache:'ctrl_models'
						clicks:		page: 'controller', v:{scroll:'ctrl_clicks',	is_c_clicks:'yes'},  dom_cache:'ctrl_clicks'
						results:	page: 'controller', v:{scroll:'ctrl_results',	is_c_results:'yes'},  dom_cache:'ctrl_results'
						macros:		page: 'controller', v:{scroll:'ctrl_macros',	is_c_macros:'yes'},  dom_cache:'ctrl_macros'
						flows:		page: 'controller', v:{scroll:'ctrl_flows',		is_c_flows:'yes'},   dom_cache:'ctrl_flows'