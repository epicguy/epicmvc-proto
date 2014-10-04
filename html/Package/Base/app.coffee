E.app$Base=
	MANIFEST: #%#
		Extra: ['LoadStrategy', 'RenderStrategy', 'dataAction'] #%#
		Model: ['App', 'View'] #%#
	OPTIONS:
		loader: 'LoadStrategy$Base'
		render: 'RenderStrategy$Base'
		data_action: 'dataAction$Base'
	MODELS:
		App:  class: "App$Base",  inst: "iBaseApp"
		View: class: "View$Base", inst: "iBaseView"

