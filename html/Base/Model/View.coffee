'use strict'
# Copyright 2014-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class View$Base extends E.ModelJS
	constructor: (view_nm, options) ->
		super view_nm, options
		frames= E.appGetSetting 'frames'
		@frames=( frames[ix] for ix in (nm for nm of frames).sort())
		@frames.push 'X' # Placeholder for layout
		@did_run= false
		@in_run= false
		window.oE= @ if window? # Used by parser for e.g. oE.kids/v2/v3/weed
		@defer_it_cnt= 0
		@start= false #A global timestamp for run:
	nest_up: (who) ->
		f= 'BM/View.nest_up:'+ who
		E.log f, {@defer_it_cnt}
		if @defer_it_cnt is 0
			BLOWUP() if @in_run
			@in_run= true
			@start= new Date().getTime() #%#
			E.log f+ 'START RUN', {@frames, @start}
			@defer_it= promise: null, resolve: null # Old style Promise.deferred()
			@defer_it.promise= new Promise (resolve, reject)=> @defer_it.resolve= resolve
		@defer_it_cnt++
	nest_dn: (who) ->
		f= 'BM/View.nest_dn:'+ who
		E.log f, {@defer_it_cnt}
		@defer_it_cnt-- if @defer_it_cnt > 0
		if @defer_it_cnt is 0
			E.log f+ 'END RUN', {@defer_content, date_diff: new Date().getTime()- @start}
			@in_run= false
			E.log f+ 'RESOLVE', {@modal, @defer_content}
			@defer_it.resolve [@modal, @defer_content]
	run: ->
		f= 'BM/View.run:'
		who= 'R'
		[flow, track, step]= E.App().getStepPath()
		if modal= E.appFindAttr flow, track, step,  'modal'
			modal=( E.appGetSetting 'modals')[ modal] ? modal
		layout= modal ? E.appGetSetting 'layout', flow, track, step
		@N= {}   # 'Names' [if-name]=boolean (from <if_xxx name="if-name" ..>
		@modal= if modal then true else false
		@page_name=( E.appGetS flow, track, step).page ? step
		@did_run= true
		@frames[ @frames.length- 1]= layout
		@frame_inx= 0 # Start on the outer most @frames
		@resetInfo()
		@nest_up who
		@defer_content= @kids [['page',{}]]
		E.log f+ 'after @kids', {@defer_content}
		@nest_dn who
		@defer_it.promise
	resetInfo: () ->
		# Info for one render loop
		@R= {}   # 'Row' [table-name-alias|subtable-name-alias]['m'odel or 'p'arent, row-'c'ount, 'o'riginal-name
		@I= {}   # 'Info' [table-name-alias|subtable-nam-aliase]= single-row
		@P= [{}] # 'Parts' Push p:attrs with each part, then pop; (top level is row w/o attrs)
		return
	saveInfo: () ->
		f= 'BM/View.saveInfo:'
		saved_info= E.merge {}, I: @I, P: @P
		E.log f, {saved_info}
		saved_info
	restoreInfo: (saved_info) ->
		f= 'BM/View.restoreInfo:'
		E.log f, {saved_info}
		@resetInfo()
		@P= saved_info.P
		@I= saved_info.I
		# Rebuild 'R'
		@R[ nm]= @_getMyRow @I[ nm] for nm of @I when nm not of @R
		E.log f+ 'restored:', {@P, @I, @R}
		return
	_getMyRow: (I) ->
		f= 'BM/View._getMyRow:'
		E.log f, {I}
		return (E[ I.m] I.o)[ I.c] if I.m? # I'm a top level table, get from model
		@R[ I.p]= @_getMyRow @I[ I.p] if I.p not of @R # Load parent if needed
		return @R[ I.p][ I.o][ I.c] if I.p and I.p of @R # Parent already loaded, return it's row
		# TODO WHAT HAPPENS WHEN THE IF ABOVE FAILS? WHAT IS RETURNED?
	getTable: (nm) ->
		f= 'BM/View.getTable:'+ nm
		E.log f, {@P} if nm is 'Part'
		switch nm
			when 'If' then [@N]
			when 'Part'
				# @P.slice -1
				rVal= {}
				E.merge rVal, p for p in @P
				[rVal]
			else
				E.option.m3 @view_nm , nm #%#
				[] # Return consitent value so production acts like dev, even if caller is wrong
	invalidateTables: (view_nm, tbl_nms, deleted_tbl_nms) ->
		return unless @did_run and deleted_tbl_nms.length
		f= 'BM/View.invalidateTables:'
		E.log f, {view_nm, tbl_nms, deleted_tbl_nms} #, (if E.inClick then 'IN')
		m.startComputation()
		m.endComputation()
		return
	handleIt: (content) =>
		f= 'BM/View.handleIt:'
		E.log f+ 'top', typeof_content: ( typeof content) #, content
		content= content() if typeof content is 'function'
		E.log f+ 'bottom', {content}
		content
	formatFromSpec: (val, spec, custom_spec) ->
		f= 'BM/View.formatFromSpec:'
		E.log f, {val, spec, custom_spec}
		switch spec
			when ''
				if custom_spec
						E.option.v2 val, custom_spec #%#
						E.custom_filter val, custom_spec
					else val
			when 'count' then val?.length
			when 'bool' then (if val then true else false)
			when 'uriencode' then encodeURIComponent val
			# Allows an item to be put inside single quotes
			when 'quo' then ((val.replace /\\/g, '\\\\').replace /'/g, '\\\'').replace /"/g, '\\"'
			when '1' then (String val)[0]
			when 'lc' then (String val).toLowerCase()
			when 'ucFirst'
				str= (String str).toLowerCase()
				str.slice( 0, 1).toUpperCase()+ str.slice 1
			else
				if spec[0] is '?' # Ex. &Model/Tbl/val#?true?false;
					[left,right]= spec.slice(1).split '?'
					(if val then left else right ? '')
						.replace( (new RegExp '[%]', 'g'), val)
				else E.option.v1 val, spec #%#
	v3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		row=( E[ view_nm] tbl_nm)[ 0] # TODO NOT USING @_accessModelTable SO NO DYNAMIC PARTIAL UPDATE SUPPORTED
		val= row[ key]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		if format_spec? then @formatFromSpec val, format_spec, custom_spec else val
	v2: (table_ref, col_nm, format_spec, custom_spec) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec}
		if col_nm[ 0] is '_' # For e.g. &Table/_COUNT;
			ans= @R[ table_ref]._[ col_nm.slice 1]
		else
			ans= @R[ table_ref][ col_nm]
		if format_spec? then @formatFromSpec ans, format_spec, custom_spec else ans
	# When attrs may have leading '?' for special treatment
	weed: (attrs) ->
		f= 'BM/View.weed:'
		clean_attrs= {}
		for nm,val of attrs
			if nm[ 0] isnt '?'
				clean_attrs[ nm]= val
			else
				clean_attrs[ nm.slice 1]= val if val
		E.log f, {clean_attrs}
		clean_attrs
	kids: (kids) ->
		f= 'BM/View.kids:'
		who= 'K'
		E.log f+ 'top', kids_length: kids.length
		# Build a new array, with either a copy if 'object' or 'text', else array is T_ funcs w/promises
		out= []
		for kid,ix in kids
			E.log f, date_diff: new Date().getTime()- @start
			if 'A' is E.type_oau kid # Arrays are the parser's indication of an epic tag
				out.push ix #['TBD',kid[ 0],kid[ 1]] # Place holder in 'out' for later population
				ans= @['T_'+ kid[ 0]] kid[ 1], kid[ 2]
				E.log f+ 'CHECK FOR THEN', {then: (if ans?.then then 'YES' else 'NO'), ans}
				if ans?.then # A promise eh?
					@nest_up who
					do (ix) => ans.then (result) =>
						E.log f+ 'THEN', {result}
						out[ ix]= result; @nest_dn who
					, (err)=>
						console.error 'kids', err
						out[ ix]= err.message; @nest_dn who
				else
					out[ ix]= ans
			else out.push kid
		out # Must return an array, so we can fill it's slots later

	# Process data-e-any="value" into hash of 'any: value'
	loadPartAttrs: (attrs,full) ->
		f= 'BM/View.loadPartAttrs:'
		result= {}
		for attr,val of attrs
			continue if 'data-e-' isnt attr.slice 0, 7
			result[ if full then attr else attr.slice 7]= val
		result
	T_page: ( attrs) =>
		f= 'BM/View.T_page:'
		E.log f, {attrs, date_diff: new Date().getTime()- @start}
		if @frame_inx< @frames.length
			d_load= E.oLoader.d_layout name= @frames[ @frame_inx++]
			view= (if @frame_inx< @frames.length then 'Frame' else 'Layout')+ '/'+ name
		else
			d_load= E.oLoader.d_page name= @page_name
			view= 'Page/'+ name
		@piece_handle view, (attrs ? {}), d_load

	T_part: ( attrs) ->
		view= attrs.part
		f= 'BM/View.T_part:'+ view
		E.log f, date_diff: new Date().getTime()- @start
		d_load= E.oLoader.d_part view
		@piece_handle 'Part/'+ view, attrs, d_load, true

	# This step, may be happen in a .then, or immeadiate
	piece_handle: (view, attrs, obj, is_part) ->
		f= 'BM/View.piece_handle:'
		E.log f, {view, obj, typeof_content: typeof obj.content, has_then: (if obj?.then then 'yes' else 'no')}
		return @D_piece view, attrs, obj, is_part if obj?.then # Was a thenable
		E.log f, {view} #, new Date().getTime()- @start #, obj
		content= obj.content # TODO WHEN WE WANT TO HAVE JUST THE CONTENT RETURNED IN PARSEFILE THEN DROP THE .content
		E.log f+ 'AFTER ASSIGN', {view, obj} if obj is false
		saved_info= @saveInfo()
		@P.push @loadPartAttrs attrs
		content= @handleIt content
		@restoreInfo saved_info
		content
	D_piece: (view, attrs, d_load, is_part) ->
		f= 'BM/View.D_piece:'
		who= 'P'
		@nest_up who+ view
		saved_info= @saveInfo()
		d_result= d_load.then (obj) =>
			E.log f+ 'THEN', {obj}
			try
				BLOWUP() if obj?.then # THIS WOULD CAUSE A LOOP BACK TO  US
				@restoreInfo saved_info
				result= @piece_handle view, attrs, obj, is_part
				return result
			finally
				@nest_dn who+ view
		, (err)=>
			console.error 'D_piece', err
			@nest_dn who+ view+ ' IN-ERROR'
			return @_Err? 'tag', 'page/part', attrs, err # @_Err may be defined by a super-class (like Dev)
			throw err
		d_result

	T_if_true: ( attrs, content) -> if @N[ attrs.name] then @handleIt content() else ''
	T_if_false: ( attrs, content) -> if @N[ attrs.name] then '' else @handleIt content
	T_if: ( attrs, content) =>
		#console.log 'T_if', attrs, content?.length
		issue= false
		is_true= false
		if 'val' of attrs
			if 'eq' of attrs
				is_true= true if attrs.val is attrs.eq
			else if 'ne' of attrs
				is_true= true if attrs.val isnt attrs.ne
			else if 'gt' of attrs
				is_true= true if attrs.val > attrs.gt
			else if 'in_list' of attrs
				is_true= true if attrs.val in attrs.in_list.split ','
			else if 'not_in_list' of attrs
				is_true= true if attrs.val not in attrs.not_in_list.split ','
			else issue= true
		else if 'set' of attrs
			is_true= if attrs.set then true else false
		else if 'not_set' of attrs
			is_true= if attrs.not_set then false else true
		else if 'table_is_empty' of attrs
			tbl= @_accessModelTable attrs.table_is_empty, false
			is_true= true if not tbl.length
		else if 'table_is_not_empty' of attrs
			tbl= @_accessModelTable attrs.table_is_not_empty, false
			is_true= true if tbl.length
		else issue= true
		console.error 'ISSUE T_if', attrs if issue
		@N[ attrs.name]= is_true if 'name' of attrs
		return if is_true and content
			@handleIt content
		else ''
	_accessModelTable: (at_table, alias) ->
		# Special case, alias===false if coming from <e-if> test, so don't save anything
		[lh, rh]= at_table.split '/' # Left/right halfs
		if lh of @R # Nested table reference
			tbl= @R[lh][rh]
			root= p: lh # Parent's name in @I[]
		else
			tbl= E[ lh] rh
			root= m: lh # No 'p'arent, so a 'm'odel name
		return tbl if alias is false

		rh_alias= alias ? rh
		return [tbl, rh_alias] if tbl.length is 0 # No rows, so no need to store info nor reference alias

		root.o= rh # Original name
		@I[ rh_alias]= root
		[tbl, rh_alias]

	T_foreach: (attrs, content_f) ->
		f= 'BM/View.T_foreach:'
		E.log f, {attrs}
		[tbl, rh_alias]= @_accessModelTable attrs.table, attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		result= []
		limit= if 'limit' of attrs then Number( attrs.limit)- 1  else tbl.length
		for row,count in tbl
			row._= count: count, first: count is 0, last: count is limit- 1, break: false # break: TODO
			@R[ rh_alias]= row
			@I[ rh_alias].c= count
			result.push @handleIt content_f
		delete @I[ rh_alias]
		delete @R[ rh_alias]
		return result
	T_fist: (attrs, content_f) -> # Could have children, or a part=, or default to fist_default, (or E.fistDef[nm].part ?)
		f= 'BM/View.T_fist:'
		E.log f, {attrs, content_f}
		fist= E.fistDef[ attrs.fist]
		model= fist.event ? 'Fist'
		table= attrs.fist+ if attrs.row?.length then ':'+ attrs.row else ''
		subTable= attrs.via ? fist.via ? 'Control'
		masterAlias= '__Fist'
		[tbl, rh_alias]= @_accessModelTable model+ '/'+ table, masterAlias
		E.log f, {tbl, rh_alias}
		@R[ rh_alias]= tbl[ 0]
		@I[ rh_alias].c= 0 # For save info
		rh_1= rh_alias

		content= if content_f # TODO EXPERIMENTAL - HTML FORM COULD GO RIGHT BETWEEN THE TAGS
			content_f
		else
			part= attrs.part ? fist.part ? 'fist_default'
			attrs.part?= fist.part ? 'fist_default'
			()=> @kids [['part', E.merge {part}, @loadPartAttrs attrs, true]] # Pass along only data-e-* attrs
		foreach_attrs= table: masterAlias+ '/'+ subTable
		foreach_attrs.alias= attrs.alias if attrs.alias?
		ans= @T_foreach foreach_attrs, content
		(delete @R[ rh_1]; delete @I[ rh_1])
		ans
	# Referenced by parser as: oE.ex
	ex: (el, isInit, ctx) => # Mithril config function
		f= 'BM/View.ex:'
		attrs= el.attributes
		for ix in [0...attrs.length] when 'data-ex-' is attrs[ ix].name.slice 0, 8
			[d,e,nm,p1,p2]= attrs[ ix].name.split '-'
			val= attrs[ ix].value
			E.log f, {name: attrs[ ix].name, val, p1, p2}
			E.option.ex1 nm, attrs[ ix].name #%#
			E['ex$'+ nm] el, isInit, ctx, val, p1, p2

E.Model.View$Base= View$Base # Public API
