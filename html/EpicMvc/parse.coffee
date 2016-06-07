'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.


# Parse out varGet2/3's as array with func name set
FindVars= (text) ->
	parts= text.split /&([a-zA-Z0-9_]+\/[^;]{1,50});?/gm
	i= 0
	return text if parts.length== 1
	while i< parts.length- 1
		args= parts[ i+ 1].split '/'
		last= args.length- 1
		[ args[last], hash_part, custom_hash_part]= args[last].split '#'
		parts[ i+ 1]= switch args.length
			when 2 then [ 'varGet2', [args[0], args[1], hash_part, custom_hash_part] ]
			when 3 then [ 'varGet3', [args[0], args[1], args[2], hash_part, custom_hash_part] ]
			else throw "VarGet reference did not have just 2 or 3 slashes (#{parts[i+ 1]})"
		i+= 2
	return parts

ParseFile= (file_stats, file_contents) ->
	clean= file_contents.replace( /-->/gm, '\x02').replace /<!--[^\x02]*\x02/gm, ''
	parts= clean.split /<(\/?)epic:([a-z_0-9]+)([^>]*)>/
	i= 0
	tag_wait= [] # Holds back list of indexes while doing a nested tag
	finish= [] # List of indexes for a tag
	while i< parts.length- 1
		parts[ i]= FindVars parts[ i]
		if parts[ i+ 1]== '/' # Close tag
			if not tag_wait.length
				throw "[#{file_stats}] Close tag found when none expected close=#{parts[i+2]}"
			oi= tag_wait.pop()
			if parts[ i+ 2] isnt parts[ oi+ 2]
				throw "[#{file_stats}] Mismatched tags open=#{parts[oi+2]}, close=#{parts[i+2]}"
			finish[ 0]= i+ 4; parts[ oi+ 1]= finish
			finish= tag_wait.pop()
			parts[ i+ 1]= parts[ i+ 2]= ''
		else # Open tag
			finish.push i+ 1
			attr= {} # No attributes (default)
			empty= false
			if parts[ i+ 3].length> 0
				attr_split= parts[ i+ 3].trim().split /\s*=\s*"([^"]*)"\s*/
				empty= attr_split.pop()== '/'
				parts[ i+ 3]= attr_split
				for a in [0...attr_split.length] by 2
					attr[ attr_split[ a].toLowerCase()]= FindVars attr_split[ a+ 1]
			parts[ i+ 3]= attr

			# Check for 'empty' tag (slash on end of attrs match)
			if empty== true
				parts[ i+ 1]= [ i+ 4] # No parts to handle
			else
				tag_wait.push finish; finish= [ -1]
				tag_wait.push i
		i+= 4

	if tag_wait.length
		throw "[#{file_stats}] Missing closing epic tags#{(parts[t+2] for t in tag_wait).join ', '}"
	parts[ i]= FindVars parts[ i]
	parts.push finish # Top level list of parts to render
	return parts

# Public API
window.EpicMvc.ParseFile= ParseFile
