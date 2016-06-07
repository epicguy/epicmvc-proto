#
#	Socket.io interface for EpicMvc to work with blueprint socket.io
#
# Invalid Token: Fail; Stop doing work
# No Token: Get a Valid Token
# Valid Token: Push a token from time to time


class Push
	constructor: (io, host, port, push_url)->
		f= 'Push:'
		@handlers= {}
		uri= 'http://' + host + ':' + port + '/' + push_url
		opts=
			reconnectionDelay: 1000
			reconnectionDelayMax: 10000
			reconnectionAttempts: 10
		@socket= io.connect uri, opts
		@manager= @socket.io
		_log2 f, 'manager:', @manager

		# Server emited events
		@socket.on 'connected', @_onConnected
		@socket.on 'update', @_onUpdate

		# socket.io events
		@socket.on 'connect', ()->
			f= 'Push:socket:connect:'
			_log2 f, 'got connected'

		@socket.on 'disconnect', (reason)->
			f= 'Push:socket:disconnect:'
			_log2 f, reason

		@socket.on 'reconnect_attempt', (nextAttemptNum)->
			f= 'Push:socket:reconnect_attempt:'
			_log2 f, 'about to try for the:', nextAttemptNum, 'time'

		@socket.on 'reconnecting', (attemptNum)=>
			f= 'Push:socket:reconnecting:'
			_log2 f, 'attempting reconnect for the:', attemptNum, 'time'

		# error.type in ["TransportError"]
		@socket.on 'reconnect_error', (error)->
			f= 'Push:socket:reconnect_error:'
			_log2 f, error.type, ":", error.message

		@socket.on 'reconnect', (attemptNum)->
			f= 'Push:socket:reconnect:'
			_log2 f, 'success after attempt:', attemptNum

		@socket.on 'reconnect_failed', ()=>
			f= 'Push:socket:reconnect_failed:'
			_log2 f, 'giving up trying to reconnect'

		@socket.on 'error', (error)->
			f= 'Push:socket:error:'
			_log2 f, { error}

	sync: (push_handle, syncFunc)->
		f= 'Push:sync:'
		_log2 f, push_handle

		@handlers[push_handle]= syncFunc
		@socket.emit 'listen', push_handle

	_onConnected: ()->
		f= 'Push:_onConnected:'
		_log2 f, 'connected to server'

	_onUpdate: (data)=>
		f= 'Push:_onUpdate:'
		@handlers[data.push_handle](data.sync)

window.EpicMvc.Extras.Push= Push