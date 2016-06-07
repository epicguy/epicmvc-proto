console.log( 'What up?');
window.EpicMvc= { Extras: {}, Model: {} };

window.EpicMvc.app$Base= {
  OPTIONS: {
    login: { flow: "starter_flow$Base" },
    template: { default: "starter" }
  },
  MODELS: {
    Pageflow: { 'class': "Pageflow$Base",   inst: "ePF" },
    Security: { 'class': "NoSecurity$Base", inst: "eSC" },
    Property: { 'class': "Property$Base",   inst: "ePR" },
    Tag:      { 'class': "TagExe$Base",     inst: "eTG" },
  },
  FLOWS: {
    starter_flow$Base: { start: "starter_track",
      TRACKS: {
        starter_track: { start: "starter_step",
          STEPS: {
            starter_step: { page: "page" }
          }
        }
      }
    }
  }
};

window.EpicMvc.app$Test= {
	OPTIONS: { settings: { group: 'test_group_default' } },
	MODELS: {
		Test: { 'class': "TestClass$Test", inst: 'tTC', group: 'test_group', forms: 'fA,fB,fC' }
	},
	MACROS: {
		tclick: { call: 'Test/MACROS_global_tclick' },
		t_confexe_m1: { call: 'Test/MACROS_global_t_confexe_m1' },
	},
	CLICKS: {
		tclick: { call: 'Test/CLICKS_global_tclick' },
		t_confexe_1: { call: 'Test/CLICKS_global_tclick', p: {x: 'y'} },
		t_confexe_2: { call: 'Test/CLICKS_global_tclick', use_forms: 'fA,fB',
			RESULTS: [
				{ r: {success: 'SUCCESS'}, call: 'Test/result_1' },
			]
		},
		t_confexe_3: { macro: 't_confexe_m1' },
	},
	FLOWS: {
		flow_1: { start: 'track_2', template: 'template_flow_1', group: 'flow_1_group',
			CLICKS: {
				tclick: { call: 'Test/flow_1_tclick' },
			},
			TRACKS: {
				track_1: { start: 'step_2', template: 'template_track_1',
					CLICKS: {
						tclick: { call: 'Test/track_1_1_tclick' },
					},
					STEPS: {
						step_1: { page: '_1_1_1_page' },
						step_2: { page: '_1_1_2_page' },
					},
				},
				track_2: { start: 'step_1',
					CLICKS: {
						tclick: { call: 'Test/track_1_2_tclick' },
					},
					STEPS: {
						step_1: { page: '_1_2_1_page',
							CLICKS: {
								tclick: { call: 'Test/step_1_2_1_tclick' },
							},
						},
					},
				},
			},
		},
	},
};
