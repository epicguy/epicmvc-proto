'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# TODO One-field support - ALLOW ONE FIELD TO APPEAR AS ITS OWN FIST

E.fistD2H= (field,val) -> if field.d2h then E['fistD2H$'+ field.d2h] field, val else val
E.fistD2H$sliceIt= (field, val) -> expr= field.d2h_expr; (String val).slice expr[ 0], expr[ 1]

E.fistH2H= (field,val) ->
	val= E.fistH2H$pre val # Master pre-filter
	val= E['fistH2H$'+ str] val for str in (field.h2h?.split /[:,]/) ? []
	val
E.fistH2H$pre= (val) -> val # Users can change to e.g. val.replace /[<>]/g, ''
E.fistH2H$trim=  (val) -> (String val).trim()
E.fistH2H$lower= (val) -> (String val).toLowerCase()
E.fistH2H$upper= (val) -> (String val).toUpperCase()
E.fistH2H$zero=  (val) -> val ? 0
E.fistH2H$null=  (val) -> val ? null
E.fistH2H$empty= (val) -> val ? ''
E.fistH2H$digits=(val) -> val.replace /[^0-9]/g, ''
E.fistH2H$chars=(val) -> val.replace /[^a-z]/ig, ''

E.fistVAL= (field,val) ->
	delete field.issue
	check= true # Assume all is good
	# Either check if empty, or check for valid value
	if val.length is 0
		if field.req is true # Value is empty, but required
			check= if field.req_text
			then ['FIELD_EMPTY_TEXT', field.nm, field.label ? field.nm, field.req_text]
			else ['FIELD_EMPTY', field.nm, field.label ? field.nm]
	else
		if field.validate
			check= E['fistVAL$'+ field.validate] field, val
			if check is false # Failed, but use std token
				check= 'FIELD_ISSUE'+ if field.issue_text then '_TEXT' else ''
	if check isnt true
		# 'check' can be a token-array or single-token (so add some extra info if needed)
		token= check
		if 'A' isnt E.type_oau token
			token= [token, field.nm, field.label ? field.nm, field.issue_text]
		field.issue= new E.Issue field.fistNm, field.nm
		field.issue.add token[0], token.slice 1
	return check is true

E.fistVAL$test= (field, val) ->
	re= field.validate_expr
	re= new RegExp re if typeof re is 'string'
	re.test val

E.fistH2D= (field) -> if field.h2d then E['fistH2D$'+ field.h2d] field, field.hval else field.hval
E.fistH2D$zero= (field,val) -> val ? 0

class Fist extends E.ModelJS
	constructor: (view_nm, options) ->
		# E.fistDef and E.fieldDef contain combined fists info from all pacakges
		@fist= {} # Hash by fist-name-with-row-number, of hash of field-names, holding e.g. db/html values, issues
		super view_nm, options
	action: (ctx,act,p) -> # p.async=true to avoid @invalidateTables() call (avoid recursion from M/View?)
		f= 'action:'+ act+ '-'+ p.fist+ '/'+ p.field
		_log2 f, p
		{r,i,m}= ctx if ctx
		# Expect p.fist, optional p.field, optional p.row
		fist= @_getFist p.fist, p.row
		field= fist.ht[ p.field] if p.field
		# Expect built-in actions: F$change
		switch act
			when 'F$keyup', 'F$change' # User has changed a field's value possibly
				# p.val
				if field.hval isnt p.val # Update our html-value state with el.value
					had_issue= field.issue
					field.hval= p.val
					E.fistVAL field, field.hval
					invalidate= true if act is 'F$change' or had_issue isnt field.issue
			when 'F$blur'
				was_val= field.hval
				field.hval= E.fistH2H field, field.hval # Initial cleanup
				was_issue= E.fistVAL field, field.hval # Validate (sets/clears .issue)
				invalidate= true if was_val isnt field.hval or was_issue
			when 'F$focus'
				if fist.fnm isnt p.field
					fist.fnm= p.field
					invalidate= true
			when 'F$validate' # Controller wants a fist's db values, after whole-form-validation
				errors= 0
				for fieldNm, field of fist.ht
					errors++ if E.fistVAL field, field.hval
				if errors
					invalidate= true
					r.success= 'FAIL'
					r.errors= errors
				else
					r.success= 'SUCCESS'
					ans= r[ fist.nm]= {}
					ans[ nm]= E.fistH2D field for nm,field of fist.db
			else return super ctx, act, p
		if invalidate
			if p.async isnt true then @invalidateTables [ fist.rnm] else delete @Table[ fist.rnm]
		return
	loadTable: (tbl_nm)->
		# A table, which is a single fist (with some number of fields), is exposed as a row for the fist, and two subtables:
		# (a) Field - which is a hash of each field, separatly addressable i.e. &Fist/UserLogin/AuthName;
		# (b) Control - an array of (rows of) the fields, in the order they were speced.
		# TODO TEST ROW SUPPORT (table="Fist/UserLogin:2"
		[ baseFistNm, row]= tbl_nm.split ':'
		fist= @_getFist baseFistNm, row
		Field= {}
		Control= []
		any_req= false
		for fieldNm,ix in fist.sp.FIELDS
			field= fist.ht[ fieldNm]
			row= @_makeField fist, field, ix, row
			any_req= true if row.req
			Field[ fieldNm]= [row]
			Control.push row
		@Table[ tbl_nm]=[ {Field: [Field], Control, any_req}]
	_makeField: (fist,field,ix,row)->
		f= '_makeField'
		_log2 f, {fist, field, ix}
		# TODO FIX E-IF SO WE DON'T NEED 'yes' else '' ANYMORE!
		defaults= {
			is_first: ix is 0, focus: fist.fnm is field.nm, yes_val: 'X'
			default: '', width: '', size: '', issue: '', value: '', selected: false, name: field.nm
		}
		fl= E.merge defaults, field
		fl.yes_val=( String (fl.cdata ? '1')) if fl.type is 'yesno'
		[fl.type, choice_type]= fl.type.split ':'
		fl.id= 'U'+ E.nextCounter()
		fl.value= (field.hval) ? fl.default
		fl.selected= fl.type is 'yesno' and fl.value is fl.yes_val
		fl.issue= field.issue.asTable()[0].issue if field.issue

		if fl.type is 'radio' or fl.type is 'pulldown'
			choices= _getChoices choice_type, fist, field, row
			rows= []; s= ''
			for ix in [0...choices.options.length]
				s= choices.values[ ix] is (String fl.value) if fieldVal
				rows.push option: choices.options[ ix], value: choices.values[ ix], selected: s
				fl.Choice= rows
		fl
	_getFist: (p_fist, p_row) ->
		# Return fist as record
		# 'fist' rec is: nm:fistNm, rnm:fistNm+row, row:row, st:state, sp:spec
		#   ht:{field recs by html name}, db:{field recs by db_nm}
		rnm= p_fist+ if p_row then ':'+ p_row else ''
		if rnm not of @fist
			fist= @fist[ rnm]= {rnm, nm: p_fist, row: p_row, ht: {}, db: {}, st: 'new', sp: E.fistDef[ p_fist]}
			for fieldNm in fist.sp.FIELDS
				field= E.merge {}, E.fieldDef[ fieldNm], nm: fieldNm, fistNm: p_fist, row: p_row
				fist.ht[ fieldNm]= fist.db[ field.db_nm]= field # Alias by db_nm
		else fist= @fist[ rnm]
		if fist.st is 'new'
			db_value_hash= E[ E.appFist p_fist]().fistGetValues p_fist, p_row
			for nm,val of db_value_hash
				field= fist.db[ nm]
				field.hval= E.fistD2H field, val
			fist.st= 'loaded'
		return fist
	_getChoices: (type, fist, field) ->
		switch type
			when 'array'
				field.cdata # TODO IF ONE ARRAY, MAKE IT THE HASH THING
			when 'custom'
				E[ E.appFist fist.nm]().fistGetChoices fist.nm, field.nm, fist.row
			else BROKEN()
		
E.Model.Fist$FistDevl= Fist # Public API
