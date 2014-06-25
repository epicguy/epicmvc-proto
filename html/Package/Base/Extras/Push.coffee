#
#	Socket.io interface for EpicMvc to work with blueprint socket.io
#

class Push
	constructor: (io, host, port, push_url)->
		f= 'Push:'
		@handlers= {}
		@socket= io.connect 'http://' + host + ':' + port + '/' + push_url
		@socket.on 'connected', @_onConnected
		@socket.on 'update', @_onUpdate
	
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