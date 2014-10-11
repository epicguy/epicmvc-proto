'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# TODO One-field support - ALLOW ONE FIELD TO APPEAR AS ITS OWN FIST

# Templates: Be sure to clone these
fist_template= state: 'new', focusFieldNm: false, FIELDS: {}
field_template= issue: false

E.fistD2H= {}
E.fistD2H.sliceIt= (val, expr) -> (String val).slice expr[ 0], expr[ 1]
class Fist extends E.ModelJS
	constructor: (view_nm, options) ->
		# E.fistDef and E.fieldDef contain combined fists info from all pacakges
		@fist= {} # Hash by fist-name-with-row-number, of hash of field-names, holding e.g. db/html values, issues
		super view_nm, options
	_dbMap: (fistVal) ->
		return if fistVal.dbMap
		fistVal.FIELDSdb= {}
		for fieldNm,rec of fistVal.FIELDS
			fieldDef= E.fieldDef[ fieldNm]
			fistVal.FIELDSdb[ fieldDef.db_nm]= rec # A pointer to same rec by fieldNm
	_db2html: (fistDef, fistVal, dbvals) ->
		f= '_db2html'
		@_dbMap fistVal
		_log2 f, fistVal.FIELDSdb, dbvals
		for nm,val of dbvals # TODO RUN DB2HTML FROM fieldDef
			fieldVal= fistVal.FIELDSdb[ nm]
			fieldDef= fieldVal.fieldDef
			fieldVal.html= if fieldDef.d2h then E.fistD2H[ fieldDef.d2h] fieldDef.d2h_expr else val
	action: (ctx,act,p) ->
		f= 'action:'+ act+ '-'+ p.fist+ '/'+ p.field
		_log2 f, p
		{r,i,m}= ctx if ctx
		# Expect p.fist, optional p.field, optional p.row
		if p.fist
			fistDef= E.fistDef[ p.fist]
			fistNm= fistDef.fistNm
			fistNm+= ':'+ p.row if p.row?
			fistVal= @fist[ fistNm] ? E.merge {}, fist_template
			_log2 f, 'got p.fist', {fistDef,fistNm,fistVal}
			if p.field
				fieldDef= E.fieldDef[ p.field]
				fieldNm= fieldDef.fieldNm
				fieldVal= fistVal.FIELDS[ fieldNm]
				_log2 f, 'Got p.field', {fieldDef,fieldNm,fieldVal}
		# Expect built-in actions: F$change
		switch act
			when 'F$start' # Fire up an instance of this form; ask model to populate it
				# p.fist, p.row
				return if fistVal.state isnt 'new'
				db_value_hash= E[ E.appFist fistNm]().fistGetValues fistNm
				# Move db values to html side, using db2html, then html2html
				for nm in fistDef.FIELDS
					fieldDef= E.fieldDef[ nm]
					fistVal.FIELDS[ fieldDef.fieldNm]= E.merge {fieldDef}, field_template
				@_db2html fistDef, fistVal, db_value_hash
				fistVal.state= 'loaded'
				@fist[ fistNm]= fistVal
				if ctx is false# Not if called from View
					delete @Table[ fistNm]
				else
					@invalidateTables [ fistNm ]
			when 'F$keyup', 'F$change' # User has changed a field's value possibly
				# p.val
				if fieldVal.html isnt p.val # Update our html-value state with el.value
					fieldVal.html= p.val
					if fieldVal.html.length isnt 3
						fieldVal.issue= E.Issue.Make @view_nm, 'NOT_3'
					else
						fieldVal.issue= false
					@invalidateTables [ fistNm]
			when 'F$focus'
				fistVal.focusFieldNm= fieldNm
			when 'F$validate' # Controller wants a fist's db values, after whole-form-validation
				BROKEN()
			else return super ctx, act, p
	loadTable: (tbl_nm)->
		# A table, which is a single fist (with some number of fields), is exposed as a row for the fist, and two subtables:
		# (a) Field - which is a hash of each field, separatly addressable i.e. &Fist/UserLogin/AuthName;
		# (b) Control - an array of (rows of) the fields, in the order they were speced.
		# TODO TEST ROW SUPPORT (table="Fist/UserLogin:2"
		[ baseFistNm, row]= tbl_nm.split ':'
		fistDef= E.fistDef[ baseFistNm]
		fistVal= @fist[ tbl_nm]
		Field= {}
		Control= []
		any_req= false
		for fieldNm,ix in fistDef.FIELDS
			fieldDef= E.fieldDef[ fieldNm]
			row= @_makeField fistDef, fieldDef, ix
			any_req= true if row.req
			Field[ fieldNm]= [row]
			Control.push row
		@Table[ tbl_nm]=[ {Field: [Field], Control, any_req}]
	_makeField: (fistDef,fieldDef,ix,row)->
		f= '_makeField'
		# TODO HAVE fistNm and fieldNm BE AUTO-INSERTED INTO E.fistDef/.fieldDef BY EPICCORE
		# TODO ALLOW FIST DEF TO HAVE OTHER HASHES, SO FIELDS GOES INTO FIELDS:
		fistVal= @fist[ fistNm= fistDef.fistNm]
		fieldNm= fieldDef.fieldNm
		fieldVal= fistVal?.FIELDS[ fieldNm]
		_log2 f, {fistVal, fieldNm, fieldVal}
		# TODO FIX E-IF SO WE DON'T NEED 'yes' else '' ANYMORE!
		defaults= {
			is_first: ix is 0, focus: fistVal?.focusFieldNm is fieldDef.fieldNm, yes_val: 'X'
			default: '', width: '', size: '', issue: '', value: '', selected: false, name: fieldNm, fistNm
		}
		fl= E.merge defaults, fieldDef
		fl.yes_val=( String (fl.cdata ? '1')) if fl.type is 'yesno'
		fl.type= (fl.type.split ':')[0]
		fl.id= 'U'+ E.nextCounter()
		if fieldVal # Only if we are managing an actual instance
			fl.value= (fieldVal.html) ? fl.default
			fl.selected= fl.type is 'yesno' and fl.value is fl.yes_val
			fl.issue= fieldVal.issue.asTable()[0].issue if fieldVal.issue
		else fl.value= fl.default

		if fl.type is 'radio' or fl.type is 'pulldown'
			choices= _getChoices fistDef, fieldDef
			rows= []; s= ''
			for ix in [0...choices.options.length]
				s= choices.values[ ix] is (String fl.value) if fieldVal
				rows.push option: choices.options[ ix], value: choices.values[ ix], selected: s
				fl.Choice= rows
		fl


E.Model.Fist$FistDevl= Fist # Public API
