# Some utility functions (as class, not instance functions)
#
escape_html= (str) ->
	String(str)
		.replace(/&/g,'&amp;') # '&' must be first
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;')
		.replace(/"/g,'&quot;')


if window? then window.EpicMvc.escape_html= escape_html
else module.exports= (w)-> w.EpicMvc.escape_html= escape_html
