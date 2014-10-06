'use strict'
# Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# To transform EpicMvc tags and HTML for Mithril:
#  1) Remove all <!-- comments
#  2) Remove <script> tag stuff (no longer allowed)
#  3) All tags must be closed properly (like XHMTL) so we could do that for folks (<br> to <br/>, <img>, etc.)
#
#  4) All tags are functions: <[/]epic:tag_name> => oE.T_tag_name(attr,function(){return content}), <div> => m('div',attrs,content)
#  5.1) All attributes must be a object passed as first param to the tag
#  5.2) All child nodes must be passed as array to 'm'
#  6) Epic:tag_name's that have bodies (if, foreach) require body to be wrapped in function(?){return(...)}
#
#  7) &M/T/c; 2/3 converted to v2/v3 function calls
#  8) class= everywhere, to className= (and for= htmlFor=) (breaks: &T/c#.class="hide"; vs. class="&T/c#.hide;"
#  8.1) attr's with e.g. - in them, must be quoted
#  8.2) Attr's with leading - are 'special', use m2 function; allows that attr to be remove if value falsey
#  9) Style= attrs must not be strings but objects, with camelCase e.g. style={{fontSize:'1em'}}

# Parse attribute list

# //stackoverflow.com/questions/10425287/convert-string-to-camelcase-with-regular-expression
camelCase= (input) -> input.toLowerCase().replace /-(.)/g, (match, group1) -> group1.toUpperCase()

# Make an Object into a string of Javascript i.e. {a:'stuff',b:'other'} (Smaller than JSON)
mkNm= (nm) -> if nm.match /^[a-zA-Z_]$/ then nm else sq nm
mkObj= (obj) -> '{'+ ((mkNm nm)+ ':'+ val for nm,val of obj).join()+ '}'

# Single quote a string
sq= (text)-> "'"+ (text.replace /'/gm, '\\\'').replace( /\n/g, '\\n') + "'"

# TODO NEEDS SOME DECENT TEST SCENARIOS
findStyleVal= (i, a) -> # returns: [true, 'string-value', top, i] ['error-msg', nm, start, i] [false] (EOF)
	s= 'findStyleVal:'
	top= i
	# Find nm
	start= i
	while i< a.length
		break if (p= a[ i++].trim()) isnt ''
	return [false] if p is ''
	return [s+ 'name', start, i] unless i< a.length
	nm= camelCase p
	# Find ':'
	start= i
	while i< a.length
		break if (p= a[ i++].trim()) isnt ''
	return [s+ 'colon', start, i, nm] unless i< a.length and p is ':'
	# Find value
	start= i
	parts= []
	while i< a.length
		break if (p= a[ i++]) is ';'
		parts.push p
	return [s+ 'semi-colon', start, i, nm] unless p is ';' or i >= a.length # Ok to leave ';' off the end, eh?
	str=( parts.join '').trim()
	[true, top, i, nm, str]

findStyles= (file_info, parts) -> # Hash of styles w/EpicVars expressions if needed
	# Example: float:'left',marginRight:8px
	styles= {}
	i= 0
	while i< parts.length
		[good, start, i, nm, str]= findStyleVal i, parts
		break if good is false # EOF
		if good isnt true
			_log2 'STYLE-ERROR - parse:', {file_info, parts, good, start, i, nm, str}
			continue
		styles[ nm]=( findVars str).join '+'
	styles
		
nm_map=
	'class':'className', 'for':'htmlFor', defaultvalue:'defaultValue', defaultchecked:'defaultChecked'
	colspan:'colSpan', cellpadding:'cellPadding', cellspacing:'cellSpacing', maxlength: 'maxLength', tabindex: 'tabIndex'

FindAttrVal= (i, a) -> # false if eof, 'string' if error, else [i, attr-name, quote-char, val-as-parts]
	# Look for 'attr-name'
	top= start= i
	while i< a.length
		break if (p= a[ i++].trim()) isnt ''
	return [false] unless i< a.length
	return ['attr-name', start, i] if p is ''
	# TODO COULD CONFIRM attr-name (p) IS VALID SET OF CHARS (I.E. NOT '=' or '"')
	p.toLowerCase()
	nm= nm_map[ p] ?p
	# Look for '='
	start= i
	while i< a.length
		break unless (p= a[ i++].trim()) is ''
	if p isnt '='
		return [true, start, i- 1, nm, '=', '"', ['false']] if nm in [ 'selected', 'autofocus']
		return ['equals', start, i, nm]
	# Look for open-quote
	start= i
	while i< a.length
		break unless (p= a[ i++].trim()) is ''
	return ['open-quote', start, i, nm, '='] unless p is '"' or p is "'"
	quo= p
	# Look for close-quote (collect parts)
	start= i
	parts= []
	while i< a.length
		break if (p= a[ i++]) is quo
		parts.push p
	return ['close-quote', start, i, nm, '=', quo] if p isnt quo
	[true, top, i, nm, '=', quo, parts]

# TODO TEST attr='"' attr="'" checked another== a=x/> or checked/>
FindAttrs= (file_info, str)->
	f= ':parse.FindAttrs:'
	str= str.replace /\se-/gm, 'data-e-'
	attr_split= str.trim().split /([\s="':;])/
	empty= if attr_split[ attr_split.length- 1] is '/' then '/' else ''
	attrs_need_cleaning= false # If an attr nm has leading dash, flag to clean from list if value is empty/false/undef/null (m2)
	attr_split.pop() if empty is '/'
	attr_obj= {}
	i= 0
	debug= false # TODO DEBUG
	while i< attr_split.length
		[good, start, i, nm, eq, quo, parts]= FindAttrVal i, attr_split
		break if good is false # EOF
		if good isnt true
			_log2 'ERROR - parse:', {file_info, good, start, i, nm, eq, quo, parts, str}
			continue
		if nm in ['data-e-click', 'data-e-change', 'data-e-dblclick'] # For data-e-action="click:action-name"
			debug= true # TODO DEBUG
			attr_obj['data-e-action']?= []
			attr_obj['data-e-action'].push (nm.slice 7)+ ':'+ parts.join ''
			continue
		if nm is 'data-e-action' # Allow users to use this attribute directly
			debug= true # TODO DEBUG
			attr_obj['data-e-action']?= []
			attr_obj[ nm].push parts.join ''
		if nm is 'style'
			style_obj= findStyles file_info, parts
			attr_obj[ nm]= mkObj style_obj
			continue
		attrs_need_cleaning= true if nm[ 0] is '?'
		#_log2 f, 'nm,fl', nm, attrs_need_cleaning
		attr_obj[ nm]=( findVars parts.join '').join '+'
	for data_nm in ['data-e-action']
		attr_obj[data_nm]=( findVars attr_obj[data_nm].join()).join '+' if attr_obj[data_nm]
	_log2 f, 'bottom', str, attr_obj if debug
	# A string of JavaScript code representing an object, and empty (as '' or '/')
	[ (mkObj attr_obj), empty, attrs_need_cleaning]

# Parse out varGet2/3's from a textual string - return list of expressions
findVars= (text) ->
	# TODO CONSIDER USING [^&;] AND THEN ERROR IF LAST CHAR IS NOT THE ';' (was missing obviously)
	parts= text.split /&([a-zA-Z0-9_]+\/[^;]{1,60});?/gm
	results= [] # ['text',func,'text'...]
	if parts.length== 1
		return [ sq parts[ 0] ]
	i= 0
	while i< parts.length- 1
		if parts[ i].length
			results.push sq parts[ i]
		args= parts[ i+ 1].split '/'
		last= args.length- 1
		if last isnt 1 and last isnt 2
			_log2 'ERROR VarGet:', parts[ i+ 1]
			continue
		[ args[last], hash_part, custom_hash_part]= args[last].split '#'
		ans= if last is 1
			"oE.v2(#{sq args[0]},#{sq args[1]}"
		else
			"oE.v3(#{sq args[0]},#{sq args[1]},#{sq args[2]}"
		if hash_part # Don't exect a custom_hash_part
			ans+= ",#{sq hash_part}"
		else
			ans+= ",'',#{sq custom_hash_part}" if custom_hash_part # Stub hashpart as empty
		ans+= ')'
		results.push ans
		i+= 2
	if parts[ parts.length- 1] # Last text node
		results.push sq parts[ parts.length- 1]
	return results # Return as array of expressions

doError= (file_stats, text) ->
	console.log 'ERROR', file_stats, text
	throw Error text
ParseFile= (file_stats, file_contents) ->
	f= ':BaseDevl.E/ParseFile.ParseFile~'+file_stats
	counter= 0
	nextCounter= -> ++counter
	etags= ['page','part', 'if', 'foreach', 'defer']
	T_EPIC= 0
	T_M1= 1
	T_M2= 2
	T_STYLE= 3
	T_TEXT= 4
	stats= text: 0, dom: 0, epic: 0, defer: 0
	dom_nms= [
		'style'
		'div', 'a', 'span', 'ol', 'ul', 'li', 'p', 'b', 'i', 'dl', 'dd', 'dt'
		'form', 'fieldset', 'label', 'legend', 'button', 'input', 'textarea', 'select', 'option'
		'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'
		'img', 'br', 'hr', 'header', 'footer', 'section'
	]
	dom_close= [ 'img', 'br', 'input', 'hr' ]
	dom_entity_map=
		nbsp: '\u00A0',reg: '\u00AE', copy: '\u00A9', times: '\u22A0'
		lt: '\u003C', gt: '\u003E', amp: '\u0026', quot: '\u0022'
	after_comment= file_contents.replace( /-->/gm, '\x02').replace /<!--[^\x02]*\x02/gm, (m) ->
		m.replace /[^\n]+/gm, '' # Preserve newlines
	after_script= after_comment.replace( /<\/script>/gm, '\x02').replace /<script[^\x02]*\x02/gm, ''
	after= after_script

	# Create array of 4 parts: non-tag-content, leading-slash, tag-name, attrs
	# End of 'attrs' may have a '/' (or is '/' if leading-slash is '/')
	parts= after.split /<(\/?)([:a-z_0-9-]+)([^>]*)>/
	i= 0
	tag_wait= [] # Holds back list of indexes while doing a nested tag
	children= [] # Current list of child expressions - can be text, DOM tags or Epic tags
	while i< parts.length- 1
		if tag_wait.length and tag_wait[ tag_wait.length- 1][ 1] is 'defer'
			children.push [T_TEXT, (findVars parts[ i]).join( '+')]
		else
			text= parts[ i].replace(/^\s+|\s+$/gm, ' ')
			if text.length and text isnt ' ' and text isnt '  ' # Not just whitespace
				text= text.replace /&([a-z]+);/gm, (m, p1) -> if p1 of dom_entity_map then dom_entity_map[ p1] else '&'+ p1+ 'BROKEN;'
				if tag_wait.length
					children.push [T_TEXT, (findVars text).join( '+')]
				else
					children.push [T_M1, 'span', {}, (findVars text).join( '+')]
				stats.text++ unless tag_wait.length
		if parts[ i+ 1]== '/' # Close tag
			if not tag_wait.length
				# TODO ERRORS COULD INCLUDE LINE NUMBERS AND EVEN FILE-TEXT SNIPIT
				doError file_stats, "Close tag found when none expected close=#{parts[i+2]}"
			[oi, base_nm, attrs, prev_children, flavor]= tag_wait.pop()
			if base_nm is 'defer'
				stats.defer++
			if parts[ i+ 2] isnt parts[ oi+ 2]
				tag_names_for_debugger= open: parts[ oi+ 2], close: parts[ i+ 2]
				doError file_stats, "Mismatched tags open=#{parts[oi+2]}, close=#{parts[i+2]}"
			if children.length is 0 # Simple case
				whole_tag= [flavor, base_nm, attrs, []]
			else if flavor is T_EPIC
				whole_tag= [flavor, base_nm,  attrs, children]
				stats.epic++ unless tag_wait.length
			else if base_nm is 'style'
				flavor= T_STYLE
				whole_tag= [flavor, base_nm, attrs, children]
				#_log2 f, 'style tag is special', whole_tag
			else
				whole_tag= [flavor, base_nm, attrs, children]
				stats.dom++ unless tag_wait.length
			children= prev_children # Move back to the enclosing tag's list
			children.push whole_tag # Include this closing tag's content as a child
		else # Open tag
			empty= ''
			attrs= '{}'
			attr_clean= false
			flavor= if 'e-' is parts[ i+ 2].slice 0, 2 then T_EPIC else T_M1
			if parts[ i+ 3].length> 0
				[attrs, empty, attr_clean]= FindAttrs file_stats, parts[ i+ 3]
			if flavor is T_EPIC
				base_nm= parts[ i+ 2].slice 2
				if base_nm in ['page', 'part']
					empty= '/' # Force as no-body
				if base_nm not in etags
					doError file_stats, "UNKNONW EPIC TAG (#{base_nm}) : Expected one of #{etags.join()}"
			else
				base_nm= parts[ i+ 2]
				if base_nm in ['img', 'br', 'input', 'hr']
					empty= '/' # Force as no-body or self-closing
				if base_nm not in dom_nms
					doError file_stats, 'Unknown tag name '+ base_nm+ ' in '+ file_stats
				if attr_clean
					#_log2 f, 'attr_clean', attrs
					flavor= T_M2
			if empty is '/' # This tag is the child, no need to push things
				stats.defer++ if base_nm is 'defer'
				whole_tag= [flavor, base_nm, attrs, []]
				children.push whole_tag
				(if flavor is T_EPIC then stats.epic++ else stats.dom++) unless tag_wait.length
			else
				# Wait till closing tag...
				tag_wait.push [ i, base_nm, attrs, children, flavor]
				children= [] # Start my tag fresh, without children
		i+= 4

	if tag_wait.length
		doError file_stats, "Missing closing tags#{(parts[t+2] for [t] in tag_wait).join ', '}"
	text= parts[ i].replace /^\s+|\s+$/g, ' '
	if text.length and text isnt ' ' and text isnt '  ' # Not just whitespace
		text= text.replace /&([a-z]+);/gm, (m, p1) -> if p1 of dom_entity_map then dom_entity_map[ p1] else '&'+ p1+ 'BROKEN;'
		children.push [T_M1, 'span', {}, (findVars text).join( '+')]
		stats.text++
	#_log2 f, 'before do', children.length, stats, children
	# Give to loadStrategy (or compiler) to handle as in-browser or minimized JavaScript
	# Caller expects: content,can_componentize,defer
	#
	# Now, try to create a texual representation
	# Return oE.kids(['page',{},function(){[]}),{tag:'div',attrs:{}},'text',{tag:'style',attrs:{},children:[]},
	#
	doChildren= (child_array, fwrap)->
		GLOBWUP() if 'A' isnt E.type_oau child_array # LOOK OUT FOR T_M1'S WITHOUT BRACKETS ON KIDS
		# fwrap means wrap with function as children of an epic tag
		out= []
		has_epic= false
		for [flavor,tag,attr,kids],ix in child_array
			switch flavor
				when T_EPIC
					has_epic= true
					out.push "['#{tag}',#{attr},#{doChildren kids, true}]"
				when T_M1
					out.push "{tag:'#{tag}',attrs:#{attr},children:#{doChildren kids}}"
				when T_M2
					out.push "{tag:'#{tag}',attrs:oE.weed(#{attr}),children:#{doChildren kids}}"
				when T_STYLE
					GLOWUP() if kids.length isnt 1
					BLOWUP() if kids[0][0] isnt T_TEXT
					out.push "{tag:'#{tag}',attrs:#{attr},children:m.trust(#{kids[ 0][ 1]})}"
				when T_TEXT
					out.push tag # The 'text' part is at [1] not [3]
				else BLOWUP_FLAVOR_NOT_KNOWN()
		stuff='['+ out.join()+ ']'
		if has_epic
			stuff= 'oE.kids('+ stuff+ ')'
		if fwrap
			stuff= 'function(){return '+ stuff+ '}'
		stuff
	content= 'return '+ doChildren children
	_log2 f, 'final', content
	return  content: content, defer: stats.defer, can_componentize: children.length is 1 and stats.epic is 0

# Public API
if window? then E.Extra.ParseFile= ParseFile
else module.exports= (w)-> w.E.Extra.ParseFile= ParseFile
