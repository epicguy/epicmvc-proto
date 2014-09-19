'use strict'
# Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

# To use JSX, after modifying the epic tags and other stuff for JSX, then, in the browser;
# Needs preamble of: "/**\n* @jsx React.DOM\n*/\n"
# Call JSXTransformer.transform( preamble+ source)
# You get back an object; the .code is executable stuff
# If source was <script>X</script> you get [preamble]+ React.DOM.script(null, "X")

# To transform EpicMvc tags and HTML for JSX:
#  1) Remove all <!-- comments
#  2) Move <script> tag stuff to possible component insert logic
#  3) All tags must be closed properly (like XHMTL) so we could do that for folks (<br> to <br/>, <img>, etc.)
#  4) WILL TRY TO AVOID THIS: One root per part required
#
#  5) All tags are functions: <[/]epic:tag_name> => <[/]oEM.T_tag_name> div => React.DOM.div
#  5.1) All attributes must be a object passed as first param to the tag
#  5.2) All child nodes must be passed as ',' list to React.DOM.x or return T_a([]) in epic tags
#  6) Epic:tag_name's that have bodies (if, foreach) require body to be wrapped in function(?){return(...)} w/root node
#
#  7) &M/T/c; can be converted to VarGetX as today
#  8) class= everywhere, must be className= (and for= htmlFor=) (breaks: &T/c#.class="hide"; vs. class="&T/c#.hide;"
#  8.1) attr's with e.g. - in them, must be quoted
#  9) Style= attrs must not be strings but objects, with camelCase e.g. style={{fontSize:'1em'}}
#  10) Epic:defer couold be moved to a componentDidMount section? Requires one root tag

# Questions/Posiers...
#  - NOT USING JSX; Do we need to escape '{' somehow, if it appears in the HTML (since JSX things we broke out to JavaScript?
#  - TODO Confirm this is needed: remove <style>...</style> who's content confuses JSX (because of '{'s everywhere?)

# Parse attribute list

# //stackoverflow.com/questions/10425287/convert-string-to-camelcase-with-regular-expression
camelCase= (input) -> input.toLowerCase().replace /-(.)/g, (match, group1) -> group1.toUpperCase()

# Make an Object into a string of Javascript i.e. {a:'stuff',b:'other'} (Smaller than JSON)
mkNm= (nm) -> if nm.match /^[a-zA-Z_]$/ then nm else sq nm
mkObj= (obj) -> '{'+ ((mkNm nm)+ ':'+ val for nm,val of obj).join()+ '}'

# Single quote a string
sq= (text)-> "'"+ (text.replace /'/gm, '\\\'').replace( /\n/g, '\\n') + "'"

# TODO DO NEEDS SOME DECENT TEST SCENARIOS
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
			console.log 'STYLE-ERROR - ParseFile:', {file_info, parts, good, start, i, nm, str}
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
	str= str.replace /\sp:([a-zA-Z0-9_]+=)/gm, ' p_$1' # Handle p:attr= as non-first chars
	str= 'p_'+ str.slice 2 if (str.slice 0, 2) is 'p:' # Handle as first chars
	attr_split= str.trim().split /([\s="':;])/
	empty= if attr_split[ attr_split.length- 1] is '/' then '/' else ''
	attr_split.pop() if empty is '/'
	attr_obj= {}
	i= 0
	while i< attr_split.length
		[good, start, i, nm, eq, quo, parts]= FindAttrVal i, attr_split
		break if good is false # EOF
		if good isnt true
			console.log 'ERROR - ParseFile:', {file_info, good, start, i, nm, eq, quo, parts, str}
			continue
		if nm is 'style'
			style_obj= findStyles file_info, parts
			attr_obj[ nm]= mkObj style_obj
			continue
		attr_obj[ nm]=( findVars parts.join '').join '+'
	# A string of JavaScript code representing an object, and empty (as '' or '/')
	[ (mkObj attr_obj), empty]

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

ParseFile= (file_stats, file_contents) ->
	f= 'react/E/ParseFile.ParseFile:'+file_stats
	stats= text: 0, dom: 0, epic: 0
	dom_nms= [
		'style'
		'div', 'a', 'span', 'ol', 'ul', 'li', 'p', 'b', 'i', 'dl', 'dd', 'dt'
		'form', 'fieldset', 'label', 'legend', 'button', 'input', 'textarea', 'select', 'option'
		'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5'
		'img', 'br', 'hr', 'header', 'footer', 'section'
	]
	dom_close= [ 'img', 'br', 'input', 'hr' ]
	dom_entity_map= nbsp: '\u00A0',reg: '\u00AE', copy: '\u00A9', times: '\u22A0', lt: '\u003C', gt: '\u003E', amp: '\u0026', quot: '\u0022'
	after_trim= file_contents.trim()
	after_comment= after_trim.replace( /-->/gm, '\x02').replace /<!--[^\x02]*\x02/gm, ''
	after_style= after_comment # REACT ALLOWS STYLE TAGS .replace( /<\/style>/gm, '\x02').replace /<style[^\x02]*\x02/gm, '' # TODO MOVE TO COMPONENT?
	after_script= after_style.replace( /<\/script>/gm, '\x02').replace /<script[^\x02]*\x02/gm, '' # React allows SCRIPT, but we dont' like it
	after= after_script
	after= after.trim() # Whitespace is left after removing other stuff above

	# Create array of 4 parts: non-tag-content, leading-slash, tag-name, attrs
	# End of 'attrs' may have a '/' (or is '/' if leading-slash is '/')
	parts= after.split /<(\/?)([:a-z_0-9]+)([^>]*)>/
	i= 0
	tag_wait= [] # Holds back list of indexes while doing a nested tag
	children= [] # Current list of child expressions - can be text, DOM tags or Epic tags
	while i< parts.length- 1
		text= parts[ i].replace(/^\s+|\s+$/gm, ' ')
		if text.length and text isnt ' ' and text isnt '  ' # Not just whitespace
			text= text.replace /&([a-z]+);/gm, (m, p1) -> if p1 of dom_entity_map then dom_entity_map[ p1] else '&'+ p1+ 'BROKEN;'
			if tag_wait.length
				tw= tag_wait[ tag_wait.length- 1]
				# TODO DID NOT WORK text.replace /"/gm, dom_entity_map.quot if tw[ 1] is 'style'
				#text= text.replace /"/gm, "\\u0022" if tw[ 1] is 'React.DOM.style'
				children.push (findVars text).join( '+')
			else
				children.push 'React.DOM.span({},'+ (findVars text).join( '+')+ ')'
			stats.text++ unless tag_wait.length
		if parts[ i+ 1]== '/' # Close tag
			if not tag_wait.length
				# TODO ERRORS COULD INCLUDE LINE NUMBERS AND EVEN FILE-TEXT SNIPIT; MAY NEED TO MODIFY THOSE 'AFTER_*' REGEX'S TO PRESERVE NEWLINES/LINE COUNT
				throw "[#{file_stats}] Close tag found when none expected close=#{parts[i+2]}"
			[oi, nm, attrs, prev_children, is_epic]= tag_wait.pop()
			if parts[ i+ 2] isnt parts[ oi+ 2]
				tag_names_for_debugger= open: parts[ oi+ 2], close: parts[ i+ 2]
				throw "[#{file_stats}] Mismatched tags open=#{parts[oi+2]}, close=#{parts[i+2]}"
			if children.length is 0 # Simple case
				whole_tag= nm+ '('+ attrs+ ')'
			else if is_epic
				whole_tag= nm+  '('+ attrs+ ',function(){return ['+( children.join ',')+ ']})'
				stats.epic++ unless tag_wait.length
			else if nm is 'React.DOM.style'
				comma= if attrs.length is 2 then '' else ','
				attrs=( attrs.slice 0, -1)+ comma+ 'dangerouslySetInnerHTML:{__html: '+( children.join '+')+ '}'+ '}'
				whole_tag= nm+ '('+ attrs+ ')'
				console.log f, 'style tag is special', whole_tag
			else
				whole_tag= nm+ '('+ attrs+ ','+( children.join ',')+ ')'
				stats.dom++ unless tag_wait.length
			children= prev_children # Move back to the enclosing tag's list
			children.push whole_tag # Include this closing tag's content as a child
		else # Open tag
			empty= ''
			attrs= '{}'
			is_epic= 'epic:' is parts[ i+ 2].slice 0, 5
			if parts[ i+ 3].length> 0
				[attrs, empty]= FindAttrs file_stats, parts[ i+ 3]
			if is_epic
				base_nm= parts[ i+ 2].slice 5
				if base_nm in ['page', 'page_part']
					empty= '/' # Force as no-body
				nm= 'oE.T_'+ base_nm
			else
				base_nm= parts[ i+ 2]
				if base_nm in ['img', 'br', 'input', 'hr']
					empty= '/' # Force as no-body or self-closing
				if base_nm not in dom_nms
					throw new Error 'Unknown tag name '+ base_nm+ ' in '+ file_stats
				nm= 'React.DOM.'+ parts[ i+ 2]
			if empty is '/' # This tag is the child, no need to push things
				whole_tag= nm+ '('+ attrs+ ')'
				children.push whole_tag
				(if is_epic then stats.epic++ else stats.dom++) unless tag_wait.length
			else
				# Wait till closing tag...
				tag_wait.push [ i, nm, attrs, children, is_epic]
				children= [] # Start my tag fresh, without children
		i+= 4

	if tag_wait.length
		throw "[#{file_stats}] Missing closing tags#{(parts[t+2] for [t] in tag_wait).join ', '}"
	#children.push (findVars parts[ i]).join '+' if parts[ i].length
	text= parts[ i].replace /^\s+|\s+$/g, ' '
	if text.length and text isnt ' ' and text isnt '  ' # Not just whitespace
		text= text.replace /&([a-z]+);/gm, (m, p1) -> if p1 of dom_entity_map then dom_entity_map[ p1] else '&'+ p1+ 'BROKEN;'
		children.push 'React.DOM.span({},'+ (findVars text).join( '+')+ ')'
		stats.text++
	_log2 f, children.length, stats, children
	# Note: multi-child part content cannot be rendered as a component, since components require a single root tag
	# Give to loadStrategy (or compiler) to handle as in-browser or minimized JavaScript
	# Caller expects: content,can_componentize,defer,style,script,must_wrap
	return content: children, must_wrap: true, can_componentize: children.length is 1 and stats.epic is 0

# Public API
if window? then window.EpicMvc.Extras.ParseFile$react= ParseFile
else module.exports= (w)-> w.EpicMvc.Extras.ParseFile$react= ParseFile

