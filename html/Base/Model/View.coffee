'use strict'
# Copyright 2014-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class View$Base extends E.ModelJS
	constructor: (view_nm, options) ->
		super view_nm, options
		frames= E.appGetSetting 'frames'
		@frames=( frames[ix] for ix in (nm for nm of frames).sort())
		@frames.push 'X' # Placeholder for layout
		@did_run= false
		@in_run= false
		window.oE= @ # Used by parser for e.g. oE.kids/v2/v3/weed
		@defer_it_cnt= 0
		@start= false #A global timestamp for run:
	nest_up: (who) ->
		f= 'nest_up:'+ who
		#_log2 f, @defer_it_cnt
		if @defer_it_cnt is 0
			BLOWUP() if @in_run
			@in_run= true
			@start= new Date().getTime() #%#
			#_log2 f, 'START RUN', @frames, @start
			@defer_it= new m.Deferred()
		@defer_it_cnt++
	nest_dn: (who) ->
		f= 'nest_dn:'+ who
		#_log2 f, @defer_it_cnt
		@defer_it_cnt-- if @defer_it_cnt > 0
		if @defer_it_cnt is 0
			_log2 f, 'END RUN', @defer_content, new Date().getTime()- @start
			@in_run= false
			#_log2 f, 'RESOLVE', @defer_content
			@defer_it.resolve @defer_content
	run: ->
		f= 'run'
		who= 'R'
		[flow, track, step]= E.App().getStepPath()
		layout= E.appGetSetting 'layout', flow, track, step
		@page_name=( E.appGetS flow, track, step).page ? step
		@did_run= true
		@frames[ @frames.length- 1]= layout
		@frame_inx= 0 # Start on the outer most @frames
		@resetInfo()
		@nest_up who
		@defer_content= @kids [['page',{}]]
		#_log2 f, 'after @kids, @defer_content=', @defer_content
		@nest_dn who
		@defer_it.promise
	resetInfo: () ->
		# Info for one render loop
		@R= {}   # 'Row' [table-name-alias|subtable-name-alias]['m'odel or 'p'arent, row-'c'ount, 'o'riginal-name
		@I= {}   # 'Info' [table-name-alias|subtable-nam-aliase]= single-row
		@P= [{}] # 'Parts' Push p:attrs with each part, then pop; (top level is row w/o attrs)
		@N= {}   # 'Names' [if-name]=boolean (from <if_xxx name="if-name" ..>
		@D= [[]] # 'Defer' Stack arrays of defers as we render parts
	saveInfo: () ->
		f= 'saveInfo'
		saved_info= E.merge {}, I: @I, P: @P
		#_log2 f, saved_info
		saved_info
	restoreInfo: (saved_info) ->
		f= 'restoreInfo'
		#_log2 f, 'saved_info', saved_info
		@resetInfo()
		@P= saved_info.P # TODO IS THIS SAFE?
		@I= saved_info.I # TODO IS THIS SAFE?
		# Rebuild 'R'
		@R[ nm]= @_getMyRow @I[ nm] for nm of @I when nm not of @R
		#_log2 f, 'restored:P,I,R', @P, @I, @R
	_getMyRow: (I) ->
		f= '_getMyRow'
		#_log2 f, I
		return (E[ I.m] I.o)[ I.c] if I.m? # I'm a top level table, get from model
		@R[ I.p]= @_getMyRow @I[ I.p] if I.p not of @R # Load parent if needed
		return @R[ I.p][ I.o][ I.c] if I.p and I.p of @R # Parent already loaded, return it's row
	getTable: (nm) ->
		f= 'Base:M/View.getTable:'+ nm
		#_log2 f, @P if nm is 'Part'
		switch nm
			when 'If' then [@N]
			when 'Part' then @P.slice -1
			else []
	invalidateTables: (view_nm, tbl_nms, deleted_tbl_nms) ->
		return unless @did_run and deleted_tbl_nms.length
		f= 'Base:M/View.invalidateTables'
		#_log2 f, view_nm, tbl_nms, deleted_tbl_nms #, (if E.inClick then 'IN')
		m.startComputation()
		m.endComputation()
		return
	# Wraper for page/part content which needs special treatment (dyanmic='div', epic:defer's, etc.)
	wrap: (view, attrs, content, defer, has_root)->
		inside= defer: defer
		attrs.config= (el, isInit, context) =>
			f= 'Base:M/View..config:'+ view
			for defer in inside.defer
				_log2 f, defer
				@doDefer defer, el
		attrs[ 'data-part']= view
		if 'dynamic' of attrs # Always render the container, even if content is null
			tag: attrs.dynamic, attrs: attrs, children: content
		else
			return '' unless content
			if has_root
				content
			else
				tag: 'div', attrs: attrs, children: content
	doDefer: (defer_obj, el) =>
		if 'A' is E.type_oau defer_obj.defer
			_log2 'WARNING', 'Got an array for defer', defer_obj.defer
			return 'WAS-ARRAY'
		return defer_obj.func el, defer_obj.attrs if defer_obj.func
		defer_obj.defer.then (f_content) =>
			defer_obj.func= new Function 'el', 'attrs', f_content
			@doDefer defer_obj, el
			return
	handleIt: (content) =>
		f= 'handleIt'
		#_log2 f, 'top',( typeof content) #, content
		content= content() if typeof content is 'function'
		#_log2 f, 'bottom',( typeof content), content
		content
	formatFromSpec: (val, spec, custom_spec) ->
		f= 'formatFromSpec'
		#_log2 f, val, spec, custom_spec
		switch spec
			when '' then (if custom_spec then (window.EpicMvc.custom_filter? val, custom_spec) else val)
			when 'count' then val?.length
			when 'bool' then (if val then true else false)
			when 'bytes' then window.bytesToSize Number val
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
				else E.option.v1 val, spec
	v3: (view_nm, tbl_nm, key, format_spec, custom_spec) ->
		row=( E[ view_nm] tbl_nm)[ 0] # TODO NOT USING @_accessModelTable SO NO DYNAMIC PARTIAL UPDATE SUPPORTED
		val= row[ key]
		#console.log 'G3:', view_nm, tbl_nm, key, format_spec, custom_spec, row #if key not of row
		if format_spec? then @formatFromSpec val, format_spec, custom_spec else val
	v2: (table_ref, col_nm, format_spec, custom_spec) ->
		#console.log 'G2:', {table_ref, col_nm, format_spec, custom_spec}
		ans= @R[ table_ref][ col_nm]
		if format_spec? then @formatFromSpec ans, format_spec, custom_spec else ans
	# When attrs may have leading '?' for special treatment
	weed: (attrs) ->
		f= 'weed'
		clean_attrs= {}
		for nm,val of attrs
			if nm[ 0] isnt '?'
				clean_attrs[ nm]= val
			else
				clean_attrs[ nm.slice 1]= val if val
		#_log2 f, clean_attrs
		clean_attrs
	kids: (kids) ->
		f= 'kids'
		who= 'K'
		#_log2 f, 'top', kids.length
		# Build a new array, with either a copy if 'object' or 'text', else array is T_ funcs w/deferreds
		out= []
		for kid,ix in kids
			#_log2 f, new Date().getTime()- @start
			if 'A' is E.type_oau kid # Arrays are the parser's indication of an epic tag
				out.push ix #['TBD',kid[ 0],kid[ 1]] # Place holder in 'out' for later population
				ans= @['T_'+ kid[ 0]] kid[ 1], kid[ 2]
				#_log2 f, 'CHECK FOR THEN', (if ans?.then then 'YES' else 'NO'), ans
				if ans?.then # A deferred object, eh?
					@nest_up who
					do (ix) => ans.then (result) =>
						#_log2 f, 'THEN', result
						out[ ix]= result; @nest_dn who
					, (err)=>
						console.error 'kids', err
						out[ ix]= err.message; @nest_dn who
				else
					out[ ix]= ans
			else out.push kid
		out # Must return an array, so we can fill it's slots later

	# Process data-e-any="value" into hash of 'any: value'
	loadPartAttrs: (attrs) ->
		f= 'Base:M/View.loadPartAttrs'
		result= {}
		for attr,val of attrs
			continue if 'data-e-' isnt attr.slice 0, 7
			result[ attr.slice 7]= val
		result
	T_page: ( attrs) =>
		f= 'T_page'
		#_log2 f, attrs, new Date().getTime()- @start
		if @frame_inx< @frames.length
			d_load= E.oLoader.d_layout name= @frames[ @frame_inx++]
			view= (if @frame_inx< @frames.length then 'Frame' else 'Layout')+ '/'+ name
		else
			d_load= E.oLoader.d_page name= @page_name
			view= 'Page/'+ name
		@piece_handle view, (attrs ? {}), d_load

	T_part: ( attrs) ->
		view= attrs.part
		f= 'T_part:'+ view
		#_log2 f, new Date().getTime()- @start
		d_load= E.oLoader.d_part view
		@piece_handle 'Part/'+ view, attrs, d_load, true

	# This step, may be happen in a .then, or immeadiate
	piece_handle: (view, attrs, obj, is_part) ->
		f= 'piece_handle'
		#_log2 f, view, obj
		return @D_piece view, attrs, obj, is_part if obj?.then # Was a thenable
		#_log2 f, view, new Date().getTime()- @start #, obj
		{content,can_componentize}= obj
		_log2 f, 'AFTER ASSIGN', view, obj if obj is false
		@P.push @loadPartAttrs attrs
		@D.push []
		content= @handleIt content
		defer= @D.pop()
		if can_componentize or attrs.dynamic or defer.length or not is_part
			if defer.length and not can_componentize and not attrs.dynamic
				_log2 "WARNING: DEFER logic in (#{view}); wrapping DIV tag."
			result= @wrap view, attrs, content, defer, can_componentize
		else
			result= content
		result
	D_piece: (view, attrs, d_load, is_part) ->
		f= 'D_piece'
		who= 'P'
		@nest_up who+ view
		saved_info= @saveInfo()
		d_result= d_load.then (obj) =>
			#_log2 f, 'THEN', obj
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
			return @_Err 'tag', 'page/part', attrs, err # TODO THIS IS USING EXTENDED DEV METHOD!!!!!
			throw err
		d_result

	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC ATTRS?
		f= 'Base:M/View.T_defer:'
		f_content= @handleIt content
		@D[ @D.length- 1].push {attrs, func: new Function 'el', 'attrs', f_content}
		'' # No content to display for these
	T_if_true: ( attrs, content) -> if @N[ attrs.name] then @handleIt content() else ''
	T_if_false: ( attrs, content) -> if @N[ attrs.name] then '' else @handleIt content
	T_if: ( attrs, content) => # TODO
		#console.log 'T_if', attrs, content?.length
		issue= false
		is_true= false
		if 'val' of attrs
			if 'eq' of attrs
				is_true= true if attrs.val is attrs.eq
			else if 'ne' of attrs
				is_true= true if attrs.val isnt attrs.ne
			else if 'in_list' of attrs
				is_true= true if attrs.val in attrs.in_list.split ','
			else issue= true
		else if 'set' of attrs
			is_true= if attrs.set then true else false
		else if 'not_set' of attrs
			is_true= if attrs.not_set then false else true
		else if 'table_is_not_empty' of attrs
			tbl= @_accessModelTable attrs.table_is_not_empty, false
			is_true= true if tbl.length
		else issue= true
		console.log 'ISSUE T_if', attrs if issue
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
		f= 'T_foreach'
		#_log2 f, attrs
		[tbl, rh_alias]= @_accessModelTable attrs.table, attrs.alias
		return '' if tbl.length is 0 # No rows means no output
		result= []
		limit= if 'limit' of attrs then Number( attrs.limit)- 1  else tbl.length
		for row,count in tbl
			row= tbl[ count]
			@R[ rh_alias]= row
			@I[ rh_alias].c= count
			result.push @handleIt content_f
		delete @I[ rh_alias]
		delete @R[ rh_alias]
		return result
	T_fist: (attrs, content_f) -> # Could have children, or a part=, or default to fist_default, (or E.fistDef[nm].part ?)
		f= 'T_fist'
		_log2 f, attrs, content_f
		fist= E.fistDef[ attrs.fist]
		model= fist.event ? 'Fist'
		table= attrs.fist+ if attrs.row? then ':'+ attrs.row else ''
		subTable= attrs.via ? fist.via ? 'Control'
		masterAlias= 'Fist'
		[tbl, rh_alias]= @_accessModelTable model+ '/'+ table, masterAlias
		_log2 f, 'tbl,rh_alias (master)', tbl, rh_alias
		@R[ rh_alias]= tbl[ 0]
		@I[ rh_alias].c= 0 # For save info
		rh_1= rh_alias

		content= if content_f # TODO EXPERIMENTAL - HTML FORM COULD GO RIGHT BETWEEN THE TAGS
			content_f
		else
			part= attrs.part ? fist.part ? 'fist_default'
			attrs.part?= fist.part ? 'fist_default'
			()=> @kids [['part',{part}]]
		foreach_attrs= table: masterAlias+ '/'+ subTable
		foreach_attrs.alias= attrs.alias if attrs.alias?
		ans= @T_foreach foreach_attrs, content
		(delete @R[ rh_1]; delete @I[ rh_1])
		ans

E.Model.View$Base= View$Base # Public API
