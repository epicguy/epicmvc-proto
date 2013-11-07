# Use:
# (In your HTML file, inside $())
#
#	pre_flight_check= (action,vals) ->
#		_log2 'pre_flight_check', action, vals.to, vals.at, vals.from
#		return vals.to isnt vals.at and vals.to isnt vals.from
#
#	var drop= new window.EpicMvc.Extras.GlobalDrag( pre_flight_check);
#	Epic.run( ... [drop.update, {other-content-watch-functions}] ...

# How to use (note: elements can be both drag and drop at the same time):
# Items that can be dragged:
# class="data-drag" data-drag-data='{"from":&File/id;}' data-drag-type="file"
#
# Items that can be drop-targets.
#   class="data-drop"
#   data-drop-data='{"to":&File/id;,"callback_class":"ProgressSample"}' # Must be valid JSON
#   data-drop-file="copy_file" # These are your click-event names to put into app.coffee
#   data-drop-folder="copy_folder" # These are your click-event names to put into app.coffee
#   data-drop-Files="os_upload_drop" # Special '-Files' is outside-of-browser source (unknown what it is until it's dropped)
# (Optional, to make container clickable to also cause a click event on mouse-click:)
#   onclick="window.EpicMvc.Epic.makeClick(false,'go_add_new_item',{id:'&Directory/PRIVATE/active_folder;'},true)"
#

class GlobalDrag
	constructor: (@pre_flight) ->
		#@log3= window.Function.prototype.bind.call window.console.log, window.console
		@log3= ->
		@count_enter= 0
		@count_leave= 0
		@count_target= 0
		@src_elem= false
		@src_data= false
		@drag_type= false # Normalized to a string; if false, global ignores it so default can occur
		$ => $(document)
			.dragenter( @handleDragEnter)
			.dragleave( @handleDragLeave)
			.dragover( @handleDragOver)

	get_type: (t) ->
		@log3 'get_type', t
		# 't' on OS file drag: IE(undefined), Safari5(null), FF:()
		return 'BROKEN' if t is null or t is undefined # TODO Attempt to detect browsers we don't work well with, and cause 'none'
		t= t[0] if t and typeof t is 'object'
		return false if t is null or t is 'Text' or -1 isnt t.indexOf '/' # Ignore 'text' drags
		t # Can be 'Files' (with upper case 'F') or custom type (all lower case)

	# Global listeners
	handleDragOver: (evt) =>
		return true if @drag_type is false # Pass event to the default behaviour (i.e. for text DnD)
		evt.preventDefault()
		evt.dataTransfer.dropEffect= 'none'
		return false
	handleDragEnter: (evt) =>
		@light evt, 'global'
	handleDragLeave: (evt) =>
		@unlight evt, 'global'

	# Epic calls this function for each modified container, so we can re-attach listeners to dynamic content
	update: (selector) =>
		container= $ selector
		$('.data-drag', container).each (ix,el) =>
			$(el).attr('draggable','true').dragstart( @source_dragstart).dragend( @source_dragend)
		$('.data-drop', container).each (ix,el) =>
			$(el)
				.dragover( @target_dragover).drop( @target_drop)
				.dragenter( @target_dragenter).dragleave( @target_dragleave)

	# Source element logic (dragstart/dragend):
	source_dragstart: (e) =>
		$e= @find e, 'data-drag', false # false: Ignore <a> child (or use css a{-webkit-user-drag;none})
		return false if $e is false
		@src_start $e
		e.dataTransfer.setData ($e.attr 'data-drag-type'), $e.attr 'data-drag-data' # Valid only for external targets
		@log3 'start:type/data/$e', ($e.attr 'data-drag-type'), ($e.attr 'data-drag-data'), $e
		$e.addClass 'active-source' # light up self

	source_dragend: (e) =>
		$e= $ e.target
		$e.removeClass 'active-source' # Un-light up self
		@src_end() # If internal and no drop

	# Destination (target) logic:
	target_dragover: (e) =>
		return if @drag_type is false # TODO TEXT
		$e= @find e, 'active-target'
		if $e is false then e.dataTransfer.dropEffect= 'none'; return true
		e.preventDefault()
		return false

	target_dragenter: (e) =>
		@light e, 'target'
		$e= @find e, 'active-target'
		if $e is false then return
		@count_target+= 1
		$e.addClass 'active-drop' # Light up as drop-now!

	target_dragleave: (e) =>
		@unlight e, 'target'
		$e= @find e, 'active-target'
		if $e is false then return
		@count_target-= 1
		$e.removeClass 'active-drop' if @count_target is 0 # Un-Light up as drop-now!

	target_drop: (e) =>
		return true if @drag_type is false # TODO TEXT
		e.stopPropagation()
		e.preventDefault()
		$e= @find e, 'active-target'
		if $e is false then return true
		drag_type= @drag_type
		action= $e.attr 'data-drop-'+ drag_type
		drop_data= @data $e, 'drop'
		params= $.extend {}, @src_data, drop_data, event: e
		@src_end() # If external and so no 'end' event
		window.EpicMvc.Epic.makeClick false, action, params, true
		return false

	src_start: ($e) -> # Enter/Leave events don't have access to setData info, so internal drags put it here
		@drag_type= @get_type $e.attr 'data-drag-type'
		@log3 'src_start drag_type/$e', @drag_type, $e
		return if @drag_type is false # External only target?
		@src_elem= $e
		@src_data= @data $e, 'drag'
		@log3 'src_start src_data', @src_data
		return

	src_end: ->
		$('.active-target').removeClass 'active-target'
		@count_target= 0
		@count_enter= 0
		@count_leave= 0
		@src_data= false
		@src_elem= false
		@drag_type= false
		return

	light: (evt,src) ->
		if @count_enter is 0
			@count_enter= 1
			(@drag_type= @get_type evt.dataTransfer.types) if @drag_type is false # Not a 'src_start' yet?
			type= @drag_type
			src_data= @src_data
			Data= @data
			Pre_flight= @pre_flight
			@log3 'light0,type/src/src_data', type, src, src_data
			$('[data-drop-'+type+']').not('.active-source')
				.filter(->
					return true if src_data is false
					# What makeClick would be (action,params)
					Pre_flight ($(this).attr 'data-drop-'+type), $.extend {}, src_data, Data $(this), 'drop'
				)
				.addClass 'active-target'
			@check false
		else
			@count_enter+= 1

	unlight: (evt,src) ->
		@count_leave+= 1

	check: ( enter, leave) =>
		return if enter is 0 # Was previously cancelled
		# Drop/dragend occured if enter is true
		if enter && enter is leave and enter is @count_enter and leave is @count_leave
			$('.active-target').removeClass 'active-target'
			@count_enter= 0
			@count_leave= 0
			return # stop checking but leave @src_data intact
		current_enter= @count_enter
		current_leave= @count_leave
		do (current_enter, current_leave) =>
			setTimeout (=> @check current_enter, current_leave), 200

	data: ($e,drag_or_drop) =>
		data= if $e is false then drag_or_drop else $e.attr 'data-'+drag_or_drop+'-data'
		(return JSON.parse data) if data and data.length
		{}
	find: (evt,class_nm,traverse) ->
		class_nm= '.'+ class_nm
		$e= $ evt.target
		return $e if $e.is class_nm
		if traverse isnt false
			$e_parent= $e.parent class_nm
			return $e_parent if $e_parent.is class_nm
		false

window.EpicMvc.Extras.GlobalDrag= GlobalDrag # Public API
