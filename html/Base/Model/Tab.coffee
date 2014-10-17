class Tab extends E.ModelJS
	constructor: (view_nm, options) ->
		super view_nm, options
		@tabs= options ? {} # Hash by tab-group-name
	event: (name,type,groupNm,itemNm,data) ->
		f= 'event'
		_log2 f, {name,type,groupNm,itemNm,data}
		group= @_getTab groupNm, itemNm # Pass 'item' since it may never have been seen before
		changed= @_setTab group, itemNm
		@invalidateTables [groupNm] if changed
	action: (ctx,act,p) ->
		switch act
			when 'toggle'
				@event 'Tab', 'click', p.group, p.item, p
	loadTable: (tbl_nm) ->
		group= @_getTab tbl_nm
		@Table[ tbl_nm]= [ group]
	_getTab: (groupNm,itemNm) ->
		@tabs[ groupNm]?= {}
		@tabs[ groupNm][ itemNm]?= false if itemNm?
		return @tabs[ groupNm]
	_setTab: (group,itemNm) ->
		return false if group[ itemNm] is true # Already set
		group[ nm]= false for nm of group
		group[ itemNm]= true
		return true
E.Model.Tab$Base= Tab