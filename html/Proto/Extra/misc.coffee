
# Mitrhil extension/config-fuction to support 'timeago' package for 1min events on individual elements
# Use: <span data-ex-timeago="&Model/Subscription/expires;"></span>
# Note: Requires timeago and jQuery
E.ex$timeago= (el, isInit, ctx, val, p1, p2) ->
	un_doIt= ->( clearInterval ctx.timer; delete ctx.timer) if ctx.timer
	doIt= -> el.textContent= $.timeago val
	re_doIt= -> un_doIt(); ctx.timer= setInterval doIt, 60000
	doIt()
	re_doIt()
	ctx.onunload= un_doIt if isInit

# Generic function to set an attribute on an element that normally would not make it past the parser
# Example: what you want: <h1 oncontextmenu="return false;">Right click here</h1>
# What you will need to do: <h1 data-ex-attr-oncontextmenu-func="return false;">Right click here</h1>
E.ex$attr= (el, beenHere, ctx, value, attr_nm, cast_to) ->
	return if beenHere
	attr_nm= E.camelCase attr_nm, '_'
	switch cast_to
		when 'func'
			value= (new Function 'p1', 'p2', 'p3', value)
		when 'int'
			value= parseInt value
	_log2 "ex$attr: attr_nm=", attr_nm, " cast_to=", cast_to, " value=", value
	el[ attr_nm]= value
	return

# Generic version of fixing a scrollable div. Use for any of 'Top','Bottom','Right','Left'
# Example: data-ex-scroll="Top" (will set element.scollTop= 0
E.ex$scroll= (el, isInit, ctx, val, p1, p2)->
	f= 'E.ex$scroll:'
	_log2 f, {isInit, val, p1, p2}

	direction= 'scroll'+ val
	el[direction]= 0
