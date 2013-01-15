# Some utility functions (as class, not instance functions)
#
window.EpicMvc.escape_html= (str) ->
	String(str)
		.replace(/&/g,'&amp;') # '&' must be first
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;')
		.replace(/"/g,'&quot;')


