'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

	# Backend data processing functions (default behaviour)

	# Support USER's objects doing validations from 'action' methods
	# USERs should consider using 'field_level_validate' from main Epic.Fist class
	# Example fieldDef:
	#   ValidateFunc: load_nm="GroupField" db_nm:"validate" description:""
	#   type:"pulldown:use_word_list" cdata:""
	#   label:"Validate Func" width:"1" max_len:"" req:"1" default_value:""
	#   req_text:"" issue_text:"" help_text:"Use any if you ..."
	#   h2h:"zero_is_blank"
	#   validate:"choice" validate_expr:"1"
	#   h2d:"" h2d_expr:"" d2h:"" d2h_expr:""

class FistBack
	constructor: (@Epic,@fieldDef) ->
		@filt= window.EpicMvc.FistFilt # Static class of filters
		@ClearValues()
		#@Epic.log2 'FistBack.cons', @fieldDef

	# These three functions constitute the public interface to a Fist

	SetHtmlValuesFromDb: (data) -> # Not from Html post, calls Db2Html
		#@Epic.log2 'SetDbValues data:', data
		@DbNames() # Load up the local list
		##@Epic.log2 'SetDbValues DbNames:', @DbNames()
		@fb_DB[k]= v for k,v of data # Clone
		@Db2Html()
		#@Epic.log2 'SetDbValues fb_HTML:', @fb_HTML
	ClearValues: () ->
		#@Epic.log2 'FistBack.ClearValues'
		@fb_DB= {} # Hash
		@fb_HTML= {} # Hash
	FistValidate: (data) -> # Data is from an html post (not a hash of db names)
		# Logic to validate a posted form of data:
		#  (a) perform Html to Html filters on raw posted data (will change user's view)
		#  (b) Move Html data to DB, using filters (possible psuedo prefix)
		#  (c) Validate the DB data, using filters
		#  (d) return any issue found

		@Html2Html(data)
		@Html2Db()
		issues = new window.EpicMvc.Issue @Epic
		issues.call @Check()
		if issues.count() is 0
			@Db2Html(); #TODO IS THIS GOOD/NEEDED TO PUT BACK FROM DB?
		issues

	# Below are all 'internanl' functions

	DbNames: () -> # list of fields at DB level (no psuedo fields)
		if not @fb_DB_names?
			@dbNm2HtmlNm= {}
			@dbNm2HtmlNm[rec.db_nm]= nm for nm,rec of @fieldDef
			@fb_DB_names?=( db_nm for db_nm of @dbNm2HtmlNm)
		@fb_DB_names

	Make: (token, data) -> window.EpicMvc.Issue.Make @Epic, token, data

	Html2Html: (p) ->
		for nm of @fieldDef # TODO HANDLE 'SUB' FISTS?
			@fb_HTML[ nm]= @filt.H2H_generic nm, @fieldDef[ nm].h2h, p[ nm]
		return

	Html2Db: () ->
		f= 'FistBack.Html2Db'
		for nm,field of @fieldDef
			psuedo_prefix = ""
			# Psuedo fields need data pulled from other fields
			if field.type isnt 'psuedo' then value= @fb_HTML[ nm]
			else
				psuedo_prefix= '_psuedo'
				# Multiple fields in one, make a list; filter will combine them
				value=( @fb_HTML[nm + '-' + p_nm] for p_nm in field.cdata)
			#@Epic.log2 f, 'H2D_', nm, field.db_nm, value
			@fb_DB[ field.db_nm]= @filt['H2D_' + field.h2d + psuedo_prefix] nm, field.h2d_expr, value
		#@Epic.log2 f, 'fb_DB', @fb_DB
		return

	Check: () ->
		#@Epic.log2 'Check: ', @DbNames()
		issue = new window.EpicMvc.Issue @Epic
		for db_nm in @DbNames()
			nm= @dbNm2HtmlNm[ db_nm]
			#if not (nm of @fieldDef) then throw 'What is up with DbNames? '+ nm
			field = @fieldDef[ nm]
			# If psuedo, validate sub fields first, then main field's value if no errors
			if field.type isnt 'psuedo' then issue.call @Validate nm, @fb_DB[ db_nm]
			else
				start_issue_count = issue.count(); # Increases if psuedo and has sub-field errors
				for p_nm in field.cdata
					issue.call @Validate p_nm, @fb_HTML[ nm+ '-'+ p_nm]
				if start_issue_count is issue.count()
					issue.call @Validate nm, @fb_DB[ db_nm]
		issue
	Validate: (fieldName, value) ->
		#@Epic.log2 'Validate:', fieldName, value
		field= @fieldDef[ fieldName]
		if (not value?) or value.length is 0
			if field.req is true # Value is empty, but required
				return @Make 'FIELD_EMPTY', [fieldName, field.req_text] #Value empty, not 'ok'
			return true # Value is empty, and this is 'ok'

		if field.max_len> 0 and value.length> field.max_len
			return @Make 'FIELD_OVER_MAX', [fieldName, field.max_len]

		if not @filt['CHECK_' + field.validate] fieldName, field.validate_expr, value
			return @Make 'FIELD_ISSUE', [ fieldName, field.issue_text ]
		return true # Value passes filter check

	Db2Html: () ->
		for db_nm in @DbNames()
			nm= @dbNm2HtmlNm[db_nm]
			field= @fieldDef[ nm]
			psuedo_fl= if field?.type is 'psuedo' then true else false
			# Not all fields are populated, TagExe display the default value in that case
			if not (db_nm of @fb_DB)
				if not psuedo_fl then delete @fb_HTML[ nm]
				else delete @fb_HTML[ subfield] for subfield in field.cdata
				continue
			# Pull from DB, then put in various places in Html (if psuedo)
			value = @fb_DB[ db_nm]
			psuedo_prefix = ""
			# Psuedo fields need data pulled other fields
			if not psuedo_fl then @fb_HTML[ nm]= @filt['D2H_'+ field.d2h] db_nm+'%'+nm, field.d2h_expr, value
			else
				# filter will know what to do, and then move a 'list' to the right place
				switch field.cdata.length
					when 0 then throw 'Requires cdata with psuedo: '+ db_nm+'%'+nm
					when 1 then BROKEN()
					else
						# Multiple fields in one, make a list; filter will combine them
						list= @filt['D2H_' + field.d2h + '_psuedo'] db_nm+'%'+nm, field.d2h_expr, value
						@fb_HTML[ nm+ '-'+ p_nm]= list[ i] for p_nm, i in field.cdata

window.EpicMvc.FistBack= FistBack # Pubilc API
