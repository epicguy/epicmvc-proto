E.app$Base=
	MANIFEST: #%#
		Extra: ['LoadStrategy', 'RenderStrategy', 'dataAction'] #%#
		Model: ['App', 'View', 'Fist'] #%#
	OPTIONS:
		loader: 'LoadStrategy$Base'
		render: 'RenderStrategy$Base'
		data_action: 'dataAction$Base'
	MODELS:
		App:  class: "App$Base",  inst: "iBaseApp"
		View: class: "View$Base", inst: "iBaseView"
		Fist: class: "Fist$Base", inst: "iBaseFist"
	CLICKS:
		F$change:   pass: "fist", do: 'Fist.F$change'
		F$keyup:    pass: "fist", do: 'Fist.F$keyup'
		F$focus:    pass: "fist", do: 'Fist.F$focus'
		F$blur:     pass: "fist", do: 'Fist.F$blur'

