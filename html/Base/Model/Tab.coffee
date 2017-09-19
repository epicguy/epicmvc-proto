'use strict'
# Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class Tab extends E.ModelJS
	constructor: (view_nm, options) ->
		super view_nm, options
		@tabs= E.merge {Modal: backdrop: false}, options # Hash by tab-group-name
	event: (name,type,groupNm,itemNm,data) ->
		f= 'event'
		_log2 f, {name,type,groupNm,itemNm,data}
		group= @_getTab groupNm, itemNm # Pass 'item' since it may never have been seen before
		type= group.TYPE ? groupNm
		switch type.toUpperCase()
			when 'MODAL' # This one toggles on/off
				changed= @_toggleModal group, itemNm
			when 'DROP', 'COLLAPSE' # This one toggles on/off
				changed= @_toggleDrop group, itemNm
			else
				changed= @_setTab group, itemNm
		@invalidateTables [groupNm] if changed
	action: (ctx,act,p) ->
		switch act
			when 'toggle'
				@event 'Tab', 'click', p.group, p.item, p # TODO THIS DOES NOT ACTUALLY TOGGLE THE VALUE, FYI
			when 'clear_modal' # Close any modals, remove backdrop
				groupNm= 'Modal'
				group= @_getTab groupNm
				change= false
				for nm of group when nm isnt 'backdrop' and group[ nm] is true
					(group.backdrop= group[ nm]= false; change= true)
				@invalidateTables [ groupNm] if change
			when 'clear_drop' # Clear any dropdowns that may be active
				groupNm= 'Drop'
				group= @_getTab groupNm
				change= false
				(group[ nm]= false; change= true) for nm of group when group[ nm] is true
				@invalidateTables [ groupNm] if change
			when 'clear'
				@event 'Tab', 'click', p.group, '_CLEARED', p # Set some unused tab
			else return super ctx,act,p
		return
	loadTable: (tbl_nm) ->
		group= @_getTab tbl_nm
		@Table[ tbl_nm]= [ group]
	_getTab: (groupNm,itemNm) ->
		@tabs[ groupNm]?= {}
		@tabs[ groupNm][ itemNm]?= false if itemNm?
		return @tabs[ groupNm]
	_toggleModal: ( group, itemNm) ->
		if itemNm is '_CLEARED'
			change= false
			for nm of group when nm not in [ 'backdrop', itemNm] and group[ nm] is true
				(change= true; group.backdrop= group[ nm]= false)
		else if group[ itemNm] isnt true
			change= true
			now= group.backdrop= group[ itemNm]= true
			group[ nm]= false for nm of group when nm not in [ 'backdrop', itemNm] and group[ nm] is true
		return change
	_toggleDrop: ( group, itemNm) ->
		if itemNm is '_CLEARED'
			change= false
			(change= true; group[ nm]= false) for nm of group when nm isnt itemNm and group[ nm] is true
		else
			change= true
			now= group[ itemNm]= not group[ itemNm]
			if now is true # If one is 'up' the others must be 'down'
				group[ nm]= false for nm of group when nm isnt itemNm and group[ nm] is true
		return change
	_setTab: ( group, itemNm) ->
		return false if group[ itemNm] is true # Already set
		group[ nm]= false for nm of group
		group[ itemNm]= true
		return true
E.Model.Tab$Base= Tab

# Mithril extension/config function referenced by ParseFile for user shortcut attribute 'data-e-collapse-pane'
E.ex$collapse= (el, isInit, ctx, val, p1, p2) -> # set el's height using scrollHeight, if Tab/g/i is set, else 0
	f= 'A_ex_collapse'
	[g,i]= val.split ':' # Group-name : Item-name
	_log2 f, {g,i,sH:el.scrollHeight,g_row:(E.Tab g)[ 0]}
	height= if (E.Tab g)[ 0][ i] then el.scrollHeight else 0
	el.style.height=( String height)+ 'px'
