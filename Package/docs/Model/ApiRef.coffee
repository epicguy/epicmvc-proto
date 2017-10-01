class ApiRef extends E.ModelJS
	constructor: (view_nm, opts) ->
		super view_nm, opts #,ss
		@ref= ref_data

	loadTable: (tbl_nm) ->
		f= "ApiRef:loadTable:#{tbl_nm}"
		console.log f
		@Table[tbl_nm]= (desc for func,desc of @ref[tbl_nm])

E.Model.ApiRef= ApiRef # Public API

ref_data=
	Fist:
		fistClear:
			func_name: 'fistClear'
			signature: 'E.Fist().fistClear( fist_nm)'
			description: 'Clears all values (DB, HTML) and ERRORs from the Fist. If the fist is rendered again, it will invoke the Model to reload the values.'
			Argument: [
				{ param: 'fist_nm', type: 'string', details: 'Name of the fist which appears in your fist.coffee file'}
			]
			Return: [
				type: 'void', details: ''
			]
		fistValidate:
			func_name: 'fistValidate'
			signature: 'E.Fist().fistValidate( ctx, fist_nm)'
			description: 'Runs all Fist filters including validation, setting error flags, and if valid, populating the "data" side of the Fist (with D2H)  the Fist. The "ctx" object will recieve (fist_nm): all the DB values, as well as fist$success="SUCCESS"/"FAIL" and fist$errors=(# of errors). This is typically used directly by the Controller using "fist: (fist_nm).'
			Argument: [
				{ param: 'ctx', type: 'object', details: 'Is mutated to include 3 hashes: (the fist_nm): DB values, fist$success:, fist$errors:'}
				{ param: 'fist_nm', type: 'string', details: 'Name of the fist which appears in your fist.coffee file, placed into E.fist$(pkg_nm)'}
			]
			Return: [
				type: 'void', details: ''
			]
		AFistDefinition:
			func_name: 'A Fist Definition'
			signature: 'E.fistDef[ fist_nm]'
			description: 'Grabs the fist definition for a Fist, which is a merged version of all E.fist$(pkg_nm)\'s. Fist definitions are typically defined in the applications fist file, under the FISTS key. Any hash values can appear in this structure, but EpicMvc and the Base/Model/Fist logic expects FIELDS: (array of field names), part: (optional part name), via: "Field" (to access each field individually.)'
			Argument: [
				{ param: 'fist_nm', type: 'string', details: 'Name of the fist which appears in your fist.coffee file, placed into E.fist$(pkg_nm)'}
				]
			Return: [
				type: 'object', details: 'Hashed by the HTML field names definied in fist.coffee, e.g. FIELDS: part: via:'
			]
		AFieldDefinition:
			func_name: 'A Field Definition'
			signature: 'E.fieldDef[ field_nm]'
			description: 'Grabs the field definition (not specific to a Fist), which is a merged version of all E.fist$(pkg_nm)\'s for this field. Field definitions are typically defined in the applications fist file, under the FIELDS key. Any hash values can appear in this structure, but EpicMvc and the Base/Model/Fist logic expects several pre-defined ones (see documentation).)'
			Argument: [
				{ param: 'field_nm', type: 'string', details: 'Name of the field which appears in your fist.coffee file, placed into E.fist$(pkg_nm)'}
				]
			Return: [
				type: 'object', details: 'Hash of the HTML field\'s attributes definied in fist.coffee FIELDS: [] array.'
			]
		AppClear:
			func_name: 'App.clear'
			signature: 'E.App().clear()'
			description: 'Clears the Issues and Messages tables. Can be called from the Controller as do: \'App.clear\''
			Argument: []
			Return: [
				type: 'void', details: ''
			]
		IssueAdd:
			func_name: 'Issue.add'
			signature: '(Issue object).add( token, extra_info?)'
			description: 'Adds a line to an issue object. This object is used for both Issues and Messages by the Controlller.'
			Argument: [
				{ param: 'token', type: 'string', details: 'Any string value used later to map to user friendly text using e.g. issues.coffee file, placed into E.issues$(pkg_nm)'}
				{ param: 'extra_info', type: 'Array of strings', details: 'Used when expanding to user friendly text using %1%, %2% etc.'}
				]
			Return: [
				type: 'void', details: ''
			]
		ERun:
			func_name: 'E.Run'
			signature: 'E.Run( packages, more_options?, init_func?)'
			description: 'Starts up the EpicMvc runtime (typically placed into your index.html after including the framework and your code. More_options will be merged with the Controller OPTIONS: hash (see Base/app.coffee and Dev/app.coffee)'
			Argument: [
				{ param: 'packages', type: 'Array of strings', details: ''}
				{ param: 'more_options.loadDirs', type: '{pkg_nm: \'./path\'', details: 'For Dev, to load files dynamically from a package'}
				{ param: 'more_options.loader', type: 'class', details: 'When you wish to override the dynamic loader class, looks in E.Extra[]'}
				{ param: 'more_options.render', type: 'class', details: 'When you wish to override the rendering class, looks in E.Extra[]'}
				{ param: 'more_options.event', type: 'function', details: 'When you wish to override the event handling function'}
				{ param: 'more_options.dataAction', type: 'function', details: 'When you wish to override the handling of browser events'}
				{ param: 'init_func', type: 'function', details: 'Called after the EpicMvc structures are ready to run'}
				]
			Return: [
				type: 'void', details: ''
			]
		ELogin:
			func_name: 'E.login'
			signature: 'E.login()'
			description: 'Used to let EpicMvc know a login event has occured. Will call any Model.eventLogin() for models that have been instantiated'
			Argument: []
			Return: [
				type: 'void', details: ''
			]
		ELogout:
			func_name: 'E.logout'
			signature: 'E.logout( action_lable?, action_data?)'
			description: 'Used to let EpicMvc know a logout event has occured. Will call any Model.eventLogout() for models that have been instantiated. If they return \'true\' then that model will be destoryed. If action_lable is provided, it will first call that action against the Controller.'
			Argument: [
				{ param: 'action_lable', type: 'String', details: 'An action-lable to send to the Controller'}
				{ param: 'action_data', type: 'Hash', details: 'The data to send with this action, to the Controller'}
			]
			Return: [
				type: 'void', details: ''
			]
		ENextCounter:
			func_name: 'E.nextCounter'
			signature: 'E.nextCounter()'
			description: 'Used to get a unique value.'
			Argument: []
			Return: [
				type: 'integer', details: 'Unique value that increments from zero from the time EpicMvc was first loaded.'
			]
		EModelFactory:
			func_name: 'E.(Model)'
			signature: 'E.(Model)() ... E.(Model)( table) ... E.(Model)( ctx, action_label, action_data )'
			description: 'First signature is a way to get the instance of this model. For example E.Self() gives the instance of the \'Self\' model, where the name \'Self\' is the View name set in the Controller under MODELS:. The second signature loads and returns this model\'s table. The third signature will call the model\'s action method. This factory method is used by EpicMvc because a model may not yet have been instantiated. The model instance can be used to call its methods directly for model-to-model communication if needed, or in the console to inspect instance variables.'
			Argument: [
				{ param: 'action_data', type: 'Hash', details: 'The data to send with this action, to the Controller'}
			]
			Return: [
				type: 'object', details: 'The model instance.'
				type: 'object', details: 'A Table (array of hashs, one per row.)'
				type: 'varies', details: 'Typically void, by could be a promise.'
			]
		_log2:
			func_name: '_log2'
			signature: 'window._log2( any,...)'
			description: 'Use as console.log. It can then be set to a no-op for production. Also, when used as _log( f,...) it is removed by the build process.'
			Argument: []
			Return: [
				type: 'void', details: ''
			]
		UnloadMessage:
			func_name: 'UnloadMessage'
			signature: 'E.oRender.UnloadMessage( ix, msg?)'
			description: 'Add to the list of messages to show in the dialog popup the browser shows using window.onbeforeunload. Multiple callers can set messages using a unique string "ix". When msg is given, it adds the message. When msg is not given, it will remove the previous message under this "ix". When all messages are removed, it will set window.onbeforeunload to null.'
			Argument: [
				{ param: 'ix', type: 'String', details: 'User defined string as a unique index to set and then remove this message'}
				{ param: 'msg', type: 'String', details: 'User defined message to show in the onbeforeunload popup.'}
			]
			Return: [
				type: 'void', details: ''
			]
		invalidateTables:
			func_name: 'invalidateTables'
			signature: '@invalidateTables( tables)'
			description: 'Used by a Model to inform EpicMvc that one or more of its tables will provide changed information. This method is provided by ModelJS when you extend it to create your own models.'
			Argument: [
				{ param: 'tables', type: 'Boolean', details: 'When passed as the boolean true, will invalidate all tables that currently exist in @Tables'}
				{ param: 'tables', type: 'Array of String', details: 'List of tables to invalidate.'}
			]
			Return: [
				type: 'void', details: ''
			]
