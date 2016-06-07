# Some utility functions (as class, not instance functions)
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

escape_html= (str) ->
	String(str)
		.replace(/&/g,'&amp;') # '&' must be first
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;')
		.replace(/"/g,'&quot;')
		.replace(/'/g,'&apos;')


if window? then window.EpicMvc.escape_html= escape_html
else module.exports= (w)-> w.EpicMvc.escape_html= escape_html
