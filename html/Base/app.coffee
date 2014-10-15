E.app$Base=
	MANIFEST: #%#
		Extra: ['LoadStrategy', 'RenderStrategy', 'dataAction'] #%#
		Model: ['App', 'View', 'Fist'] #%#
	OPTIONS:
		loader: 'LoadStrategy$Base'
		render: 'RenderStrategy$Base'
		dataAction: 'dataAction$Base'
	MODELS:
		App:  class: "App$Base",  inst: "iBaseApp"
		View: class: "View$Base", inst: "iBaseView"
		Fist: class: "Fist$Base", inst: "iBaseFist"

