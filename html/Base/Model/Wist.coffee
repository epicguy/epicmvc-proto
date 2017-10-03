'use strict'
# Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Wist extends E.ModelJS
	constructor: (view_nm,options) ->
		super view_nm, options
		@wist= {} # Wist as both 'hash' and 'table' with 'token' added to hash e.g. hash:{token:},table:[]
	loadTable: (tbl_nm) ->
		f= "BM/Wist.loadTable:#{tbl_nm}"
		E.log f
		@Table[ tbl_nm]=( @_getWist tbl_nm).table
	_getWist: (wistNm) ->
		if wistNm not of @wist
			E.option.w1 wistNm #%#
			hash= E.wistDef[ wistNm]
			table= []
			(rec.token=( String nm); table.push rec) for nm,rec of hash
			@wist[ wistNm]= {hash,table}
		@wist[ wistNm]

E.Model.Wist$Base= Wist # Public API
