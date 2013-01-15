'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

	# Filter functions (default behaviour)

	# Four types of filters here...
	#
	#  H2H_generic		{fieldName spec value}
	#	Cleans up what the user typed, for the user to see
	#		- returns a value that has been trimmed, etc.
	#		-  (fieldName: for debug; spec=xxx:yyy)
	#
	# H2D_XXX[_psuedo]		{fieldName filtExpr value}
	#
	#	Cleans up user input, for a database value (Collects psuedo fields)
	#		- takes value (or list if psuedo), returns cleaned up value
	#
	# CHECK_XXX			{fieldName validateExpr value}
	#
	#	Checks the DB value for validity
	#		- Takes a value, reuturns 1=good, 0=bad
	#
	# D2H_XXX[_psuedo]		{fieldName value}
	#
	#	Moves db based data, into viewable/editable Html data
	#		- Takes a value, returns the formated value (or a list, if psuedo)

class FistFilt

	@H2H_generic: (fieldName, spec, value) ->
		# 'fieldName' is for debug only - this is a generic filter (not field knowlegable)
		new_value= value ? ''; # Default if nothing is to be done
		spec_ary= (spec ? '').split? ':'

		for k, one_spec of spec_ary
			new_value= switch one_spec
				when '' then new_value # Empty spec is do nothing?
				when 'trim_spaces' then new_value.trim()
				when 'digits_only' then new_value.replace /[^0-9]/g, ''
				when 'lower_case' then new_value.toLowerCase()
				when 'upper_case' then new_value.toUpperCase()
				when 'zero_is_blank' then (if not new_value then '' else new_value)
				when 'blank_is_zero' then (if new_value.length then new_value else '0')
				else throw "Unknown H2H filter #{one_spec} in field #{fieldName}"
		new_value

	#
	# Filters to go from Html to DB (before validation, and to be validated)
	#

	@H2D_: (fieldName, filtExpr, value) ->
		value

	@H2D_undefined: -> @H2D_.apply @, arguments # Alias

	@H2D__psuedo: (fieldName, filtExpr, value) ->
		# It's a list of control values, leave it as is
		value

	@H2D_date_psuedo: (fieldName, filtExpr, value) ->
		# It's a list of control values (m/d/Y); db wants YYYY-MM-DD
		[m,d,Y] = value
		m = '0' + m if m.length is 1
		d = '0' + d if d.length is 1
		"#{Y}-#{m}-#{d}"

	@H2D_join_psuedo: (fieldName, filtExpr, value) ->
		# It's a list of control values, join the list on this one filtExpr
		value.join filtExpr

	@H2D_phone: (fieldName, filtExpr, value) ->
		value.replace /[^0-9]/g, ''

	#
	# Filters to validate the data (uses the DB side)
	#

	@CHECK_:          (fieldName, validateExpr, value) -> true
	@CHECK_null:      (fieldName, validateExpr, value) -> true
	@CHECK_undefined: (fieldName, validateExpr, value) -> true
	@CHECK_any:       (fieldName, validateExpr, value) -> true

	@CHECK_phone: (fieldName, validateExpr, value) ->
		switch validateExpr
			when undefined then check_pat = '[0-9]{10}'
			else BROKE()
		re = new RegExp('^' + check_pat + '$')
		if value.match re then true else false

	@CHECK_zip: (fieldName, validateExpr, value) ->
		switch validateExpr
			when '5or9' then return false if not value.match /^[0-9]{5}(|[0-9]{4})/
			else BROKE()
		true

	@CHECK_choice: (fieldName, validateExpr, value) ->
		# Allow values that are in the pulldown choices (less first choice if validateExpr==1)
		$.inArray value, @getChoices(fieldName).values, validateExpr #TODO TEST

	@CHECK_email: (fieldName, validateExpr, value) ->
		# 'fieldName' is given for debug messages
		ndc = '[a-zA-Z_0-9]'; # Non-dot chars
		cd = '[.a-zA-Z_0-9]'; # Chars + dot
		re = new RegExp "^#{ndc}#{cd}*@(#{ndc}+.)+#{ndc}{2,3}$"
		if value.match re then true else false

	@CHECK_regexp: (fieldName, validateExpr, value) ->
		re = new RegExp "^#{validateExpr}$"
		if value.match re then true else false

	#
	# Filters to get from DB values to the Html for user to view/edit (fieldName is for debug msgs)
	#

	@D2H_: (fieldName, filtExpr, value) ->
		value

	@D2H_undefined: -> @D2H_.apply @, arguments # Alias
	@D2H_null:      -> @D2H_.apply @, arguments # Alias

	@D2H_phone: (fieldName, filtExpr, value) ->
		value.replace /(...)(...)(...)/, '($1) $2-$3'

	@D2H_date: (fieldName, filtExpr, value) ->
		@D2H_date_psuedo(fieldName, filtExpr, value).join '/'

	@D2H_date_psuedo: (fieldName, filtExpr, value) ->
		# Control want's (m, d, y)
		[Y, m, d]= value.split '-'
		[((m ? '').replace /^0/, ''), ((d ? '').replace /^0/, ''), Y]

window.EpicMvc.FistFilt= FistFilt # Pubilc API
