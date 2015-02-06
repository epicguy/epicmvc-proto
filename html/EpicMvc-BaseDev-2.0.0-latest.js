/* Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved. */
Mithril = m = new function app(window, undefined) {
	var sObj = "[object Object]", sArr = "[object Array]", sStr = "[object String]"
	function type(obj) {return {}.toString.call(obj)}
	function isObj(obj) {return type(obj) == sObj}
	function isArr(obj) {return type(obj) == sArr}
	function isFn(obj) {return typeof obj == "function"}
	function isStr(obj){ return type(obj) == sStr}
	var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/
	var voidElements = /AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR/

	/*
	 * @typedef {String} Tag
	 * A string that looks like -> div.classname#id[param=one][param2=two]
	 * Which describes a DOM node
	 */

	/*
	 *
	 * @param {Tag} The DOM node tag
	 * @param {Object=[]} optional key-value pairs to be mapped to DOM attrs
	 * @param {...mNode=[]} Zero or more Mithril child nodes. Can be an array, or splat (optional)
	 *
	 */
	function m() {
		var arrSlice = Array.prototype.slice;
		var args = arrSlice.call(arguments, 0)
		var hasAttrs = args[1] != null && isObj(args[1]) && !("tag" in args[1]) && !("subtree" in args[1])
		var attrs = hasAttrs ? args[1] : {}
		var classAttrName = "class" in attrs ? "class" : "className"
		var cell = {tag: "div", attrs: {}}
		var match, classes = []
		while (match = parser.exec(args[0])) {
			if (match[1] == "") cell.tag = match[2]
			else if (match[1] == "#") cell.attrs.id = match[2]
			else if (match[1] == ".") classes.push(match[2])
			else if (match[3][0] == "[") {
				var pair = attrParser.exec(match[3])
				cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true)
			}
		}
		if (classes.length > 0) cell.attrs[classAttrName] = classes.join(" ")


		var children = hasAttrs ? args[2] : args[1]
		if (isArr(children) || type(children) == "[object Arguments]") {
			cell.children = arrSlice.call(children, 0)
		}
		else {
			cell.children = hasAttrs ? args.slice(2) : args.slice(1)
		}

		for (var attrName in attrs) {
			if (attrName == classAttrName) cell.attrs[attrName] = (cell.attrs[attrName] || "") + " " + attrs[attrName]
			else cell.attrs[attrName] = attrs[attrName]
		}
		return cell
	}
	function build(parentElement, parentTag, parentCache, parentIndex, data, cached, shouldReattach, index, editable, namespace, configs) {
		//`build` is a recursive function that manages creation/diffing/removal of DOM elements based on comparison between `data` and `cached`
		//the diff algorithm can be summarized as this:
		//1 - compare `data` and `cached`
		//2 - if they are different, copy `data` to `cached` and update the DOM based on what the difference is
		//3 - recursively apply this algorithm for every array and for the children of every virtual element

		//the `cached` data structure is essentially the same as the previous redraw's `data` data structure, with a few additions:
		//- `cached` always has a property called `nodes`, which is a list of DOM elements that correspond to the data represented by the respective virtual element
		//- in order to support attaching `nodes` as a property of `cached`, `cached` is *always* a non-primitive object, i.e. if the data was a string, then cached is a String instance. If data was `null` or `undefined`, cached is `new String("")`
		//- `cached also has a `configContext` property, which is the state storage object exposed by config(element, isInitialized, context)
		//- when `cached` is an Object, it represents a virtual element; when it's an Array, it represents a list of elements; when it's a String, Number or Boolean, it represents a text node

		//`parentElement` is a DOM element used for W3C DOM API calls
		//`parentTag` is only used for handling a corner case for textarea values
		//`parentCache` is used to remove nodes in some multi-node cases
		//`parentIndex` and `index` are used to figure out the offset of nodes. They're artifacts from before arrays started being flattened and are likely refactorable
		//`data` and `cached` are, respectively, the new and old nodes being diffed
		//`shouldReattach` is a flag indicating whether a parent node was recreated (if so, and if this node is reused, then this node must reattach itself to the new parent)
		//`editable` is a flag that indicates whether an ancestor is contenteditable
		//`namespace` indicates the closest HTML namespace as it cascades down from an ancestor
		//`configs` is a list of config functions to run after the topmost `build` call finishes running

		//there's logic that relies on the assumption that null and undefined data are equivalent to empty strings
		//- this prevents lifecycle surprises from procedural helpers that mix implicit and explicit return statements
		//- it simplifies diffing code
		if (data == null) data = ""
		if (data.subtree === "retain") return cached
		var cachedType = type(cached), dataType = type(data)
		if (cached == null || cachedType != dataType) {
			if (cached != null) {
				if (parentCache && parentCache.nodes) {
					var offset = index - parentIndex
					var end = offset + (dataType == sArr ? data : cached.nodes).length
					clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end))
				}
				else if (cached.nodes) clear(cached.nodes, cached)
			}
			cached = new data.constructor
			if (cached.tag) cached = {} //if constructor creates a virtual dom element, use a blank object as the base cached node instead of copying the virtual el (#277)
			cached.nodes = []
		}

		if (dataType == sArr) {
			data = flatten(data)
			var nodes = [], intact = cached.length === data.length, subArrayCount = 0

			//keys algorithm: sort elements without recreating them if keys are present
			//1) create a map of all existing keys, and mark all for deletion
			//2) add new keys to map and mark them for addition
			//3) if key exists in new list, change action from deletion to a move
			//4) for each key, handle its corresponding action as marked in previous steps
			//5) copy unkeyed items into their respective gaps
			var DELETION = 1, INSERTION = 2 , MOVE = 3
			var existing = {}, unkeyed = [], shouldMaintainIdentities = false
			for (var i = 0; i < cached.length; i++) {
				if (cached[i] && cached[i].attrs && cached[i].attrs.key != null) {
					shouldMaintainIdentities = true
					existing[cached[i].attrs.key] = {action: DELETION, index: i}
				}
			}
			if (shouldMaintainIdentities) {
				for (var i = 0; i < data.length; i++) {
					if (data[i] && data[i].attrs) {
						if (data[i].attrs.key != null) {
							var key = data[i].attrs.key
							if (!existing[key]) existing[key] = {action: INSERTION, index: i}
							else existing[key] = {
								action: MOVE,
								index: i,
								from: existing[key].index,
								element: parentElement.childNodes[existing[key].index] || window.document.createElement("div")
							}
						}
						else unkeyed.push({index: i, element: parentElement.childNodes[i] || window.document.createElement("div")})
					}
				}
				var actions = Object.keys(existing).map(function(key) {return existing[key]})
				var changes = actions.sort(function(a, b) {return a.action - b.action || a.index - b.index})
				var newCached = cached.slice()

				for (var i = 0, change; change = changes[i]; i++) {
					if (change.action == DELETION) {
						clear(cached[change.index].nodes, cached[change.index])
						newCached.splice(change.index, 1)
					}
					if (change.action == INSERTION) {
						var dummy = window.document.createElement("div")
						dummy.key = data[change.index].attrs.key
						parentElement.insertBefore(dummy, parentElement.childNodes[change.index])
						newCached.splice(change.index, 0, {attrs: {key: data[change.index].attrs.key}, nodes: [dummy]})
					}

					if (change.action == MOVE) {
						if (parentElement.childNodes[change.index] !== change.element && change.element !== null) {
							parentElement.insertBefore(change.element, parentElement.childNodes[change.index])
						}
						newCached[change.index] = cached[change.from]
					}
				}
				for (var i = 0; i < unkeyed.length; i++) {
					var change = unkeyed[i]
					parentElement.insertBefore(change.element, parentElement.childNodes[change.index])
					newCached[change.index] = cached[change.index]
				}
				cached = newCached
				cached.nodes = []
				for (var i = 0, child; child = parentElement.childNodes[i]; i++) cached.nodes.push(child)
			}
			//end key algorithm

			for (var i = 0, cacheCount = 0; i < data.length; i++) {
				//diff each item in the array
				var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs)
				if (item === undefined) continue
				if (!item.nodes.intact) intact = false
				subArrayCount += isArr(item) ? item.length : 1
				cached[cacheCount++] = item
			}
			if (!intact) {
				//diff the array itself

				//update the list of DOM nodes by collecting the nodes from each item
				for (var i = 0; i < data.length; i++) {
					if (cached[i] != null) nodes = nodes.concat(cached[i].nodes)
				}
				//remove items from the end of the array if the new array is shorter than the old one
				//if errors ever happen here, the issue is most likely a bug in the construction of the `cached` data structure somewhere earlier in the program
				for (var i = 0, node; node = cached.nodes[i]; i++) {
					if (node.parentNode != null && nodes.indexOf(node) < 0) clear([node], [cached[i]])
				}
				//add items to the end if the new array is longer than the old one
				for (var i = cached.nodes.length, node; node = nodes[i]; i++) {
					if (node.parentNode == null) parentElement.appendChild(node)
				}
				if (data.length < cached.length) cached.length = data.length
				cached.nodes = nodes
			}
		}
		else if (data != null && dataType == sObj) {
			//if an element is different enough from the one in cache, recreate it
			if (data.tag != cached.tag || Object.keys(data.attrs).join() != Object.keys(cached.attrs).join() || data.attrs.id != cached.attrs.id) {
				clear(cached.nodes)
				if (cached.configContext && isFn(cached.configContext.onunload)) cached.configContext.onunload()
			}
			if (!isStr(data.tag)) return

			var node, isNew = cached.nodes.length === 0
			if (data.attrs.xmlns) namespace = data.attrs.xmlns
			else if (data.tag === "svg") namespace = "http://www.w3.org/2000/svg"
			else if (data.tag === "math") namespace = "http://www.w3.org/1998/Math/MathML"
			if (isNew) {
				node = namespace === undefined ? window.document.createElement(data.tag) : window.document.createElementNS(namespace, data.tag)
				cached = {
					tag: data.tag,
					//process children before attrs so that select.value works correctly
					children: build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs),
					attrs: setAttributes(node, data.tag, data.attrs, {}, namespace),
					nodes: [node]
				}
				parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			else {
				node = cached.nodes[0]
				setAttributes(node, data.tag, data.attrs, cached.attrs, namespace)
				cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs)
				cached.nodes.intact = true
				if (shouldReattach === true && node != null) parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			//schedule configs to be called. They are called after `build` finishes running
			if (isFn(data.attrs["config"])) {
				var context = cached.configContext = cached.configContext || {}

				// bind
				var callback = function(data, args) {
					return function() {
						return data.attrs["config"].apply(data, args)
					}
				}
				configs.push(callback(data, [node, !isNew, context, cached]))
			}
		}
		else if (!isFn(dataType)) {
			//handle text nodes
			var nodes
			if (cached.nodes.length === 0) {
				if (data.$trusted) {
					nodes = injectHTML(parentElement, index, data)
				}
				else {
					nodes = [window.document.createTextNode(data)]
					if (!parentElement.nodeName.match(voidElements)) parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
				}
				cached = "string number boolean".indexOf(typeof data) > -1 ? new data.constructor(data) : data
				cached.nodes = nodes
			}
			else if (cached.valueOf() !== data.valueOf() || shouldReattach === true) {
				nodes = cached.nodes
				if (!editable || editable !== window.document.activeElement) {
					if (data.$trusted) {
						clear(nodes, cached)
						nodes = injectHTML(parentElement, index, data)
					}
					else {
						//corner case: replacing the nodeValue of a text node that is a child of a textarea/contenteditable doesn't work
						//we need to update the value property of the parent textarea or the innerHTML of the contenteditable element instead
						if (parentTag === "textarea") parentElement.value = data
						else if (editable) editable.innerHTML = data
						else {
							if (nodes[0].nodeType == 1 || nodes.length > 1) { //was a trusted string
								clear(cached.nodes, cached)
								nodes = [window.document.createTextNode(data)]
							}
							parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
							nodes[0].nodeValue = data
						}
					}
				}
				cached = new data.constructor(data)
				cached.nodes = nodes
			}
			else cached.nodes.intact = true
		}

		return cached
	}
	function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
		for (var attrName in dataAttrs) {
			var dataAttr = dataAttrs[attrName]
			var cachedAttr = cachedAttrs[attrName]
			if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr)) {
				cachedAttrs[attrName] = dataAttr
				try {
					//`config` isn't a real attributes, so ignore it
					//we don't ignore `key` because it must be unique and having it on the DOM helps debugging
					if (attrName === "config") continue
					//hook event handlers to the auto-redrawing system
					else if (isFn(dataAttr) && attrName.indexOf("on") == 0) {
						node[attrName] = autoredraw(dataAttr, node)
					}
					//handle `style: {...}`
					else if (attrName === "style" && isObj(dataAttr)) {
						for (var rule in dataAttr) {
							if (cachedAttr == null || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule]
						}
						for (var rule in cachedAttr) {
							if (!(rule in dataAttr)) node.style[rule] = ""
						}
					}
					//handle SVG
					else if (namespace != null) {
						if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr)
						else if (attrName === "className") node.setAttribute("class", dataAttr)
						else node.setAttribute(attrName, dataAttr)
					}
					//handle cases that are properties (but ignore cases where we should use setAttribute instead)
					//- list and form are typically used as strings, but are DOM element references in js
					//- when using CSS selectors (e.g. `m("[style='']")`), style is used as a string, but it's an object in js
					else if (attrName in node && !(attrName == "list" || attrName == "style" || attrName == "form")) {
						node[attrName] = dataAttr
					}
					else node.setAttribute(attrName, dataAttr)
				}
				catch (e) {
					//swallow IE's invalid argument errors to mimic HTML's fallback-to-doing-nothing-on-invalid-attributes behavior
					if (e.message.indexOf("Invalid argument") < 0) throw e
				}
			}
		}
		return cachedAttrs
	}
	function clear(nodes, cached) {
		for (var i = nodes.length - 1; i > -1; i--) {
			if (nodes[i] && nodes[i].parentNode) {
				nodes[i].parentNode.removeChild(nodes[i])
				cached = [].concat(cached)
				if (cached[i]) unload(cached[i])
			}
		}
		if (nodes.length != 0) nodes.length = 0
	}
	function unload(cached) {
		if (cached.configContext && isFn(cached.configContext.onunload)) cached.configContext.onunload()
		if (cached.children) {
			if (isArr(cached.children)) {
				for (var i = 0; i < cached.children.length; i++) unload(cached.children[i])
			}
			else if (cached.children.tag) unload(cached.children)
		}
	}
	function injectHTML(parentElement, index, data) {
		var nextSibling = parentElement.childNodes[index]
		if (nextSibling) {
			var isElement = nextSibling.nodeType != 1
			var placeholder = window.document.createElement("span")
			if (isElement) {
				parentElement.insertBefore(placeholder, nextSibling)
				placeholder.insertAdjacentHTML("beforebegin", data)
				parentElement.removeChild(placeholder)
			}
			else nextSibling.insertAdjacentHTML("beforebegin", data)
		}
		else parentElement.insertAdjacentHTML("beforeend", data)
		var nodes = []
		while (parentElement.childNodes[index] !== nextSibling) {
			nodes.push(parentElement.childNodes[index])
			index++
		}
		return nodes
	}
	function flatten(data) {
		var flattened = []
		for (var i = 0; i < data.length; i++) {
			var item = data[i]
			if (isArr(item)) flattened.push.apply(flattened, flatten(item))
			else flattened.push(item)
		}
		return flattened
	}
	function autoredraw(callback, object) {
		return function(e) {
			e = e || event
			m.redraw.strategy("diff")
			m.startComputation()
			try {return callback.call(object, e)}
			finally {
				m.endComputation()
			}
		}
	}

	var html
	var documentNode = {
		appendChild: function(node) {
			if (html === undefined) html = window.document.createElement("html")
			if (window.document.documentElement && window.document.documentElement !== node) {
				window.document.replaceChild(node, window.document.documentElement)
			}
			else window.document.appendChild(node)
			this.childNodes = window.document.childNodes
		},
		insertBefore: function(node) {
			this.appendChild(node)
		},
		childNodes: []
	}
	var nodeCache = [], cellCache = {}
	m.render = function(root, cell, forceRecreation) {
		var configs = []
		if (!root) throw new Error("Please ensure the DOM element exists before rendering a template into it.")
		var id = getCellCacheKey(root)
		var isDocumentRoot = root == window.document
		var node = isDocumentRoot || root == window.document.documentElement ? documentNode : root
		if (isDocumentRoot && cell.tag != "html") cell = {tag: "html", attrs: {}, children: cell}
		if (cellCache[id] === undefined) clear(node.childNodes)
		if (forceRecreation === true) reset(root)
		cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs)
		for (var i = 0; i < configs.length; i++) configs[i]()
	}
	function getCellCacheKey(element) {
		var index = nodeCache.indexOf(element)
		return index < 0 ? nodeCache.push(element) - 1 : index
	}

	m.trust = function(value) {
		value = new String(value)
		value.$trusted = true
		return value
	}

	function gettersetter(store) {
		var prop = function() {
			if (arguments.length) store = arguments[0]
			return store
		}

		prop.toJSON = function() {
			return store
		}

		return prop
	}

	var roots = [], modules = [], controllers = [], lastRedrawId = null, lastRedrawCallTime = 0, computePostRedrawHook = null, prevented = false
	var FRAME_BUDGET = 16 //60 frames per second = 1 call per 16 ms
	m.redraw = function() {}

	var pendingRequests = 0
	var pendingMax= 0
	var pendingGuardRequest= 0
	m.startComputation = function(guard) {
		//try { throw new Error( 'startComputation')} catch ( e) { console.error( e.message, (e.stack.split('\n'))[2])}
		if (guard && pendingRequests=== pendingGuardRequest) pendingGuardRequest++;
		pendingMax= Math.max( pendingMax, ++pendingRequests);
	}
	m.endComputation = function() {
		//try { throw new Error( 'endComputation')} catch ( e) { console.error( e.message, (e.stack.split('\n'))[2])}
		pendingRequests = Math.max(pendingRequests - 1, 0);
		if (pendingRequests=== 0) {
			if( pendingMax> pendingGuardRequest) m.redraw() //JCS: TODO setTimeout( m.redraw, 10); // JCS: ALLOW MULTIPLE DOM EVENTS TO ACCUMUATE
			pendingGuardRequest= pendingMax= 0;
		 }
	}

	function buildQueryString(object, prefix) {
		var str = []
		for(var prop in object) {
			var key = prefix ? prefix + "[" + prop + "]" : prop, value = object[prop]
			str.push(isObj(value) ? buildQueryString(value, key) : encodeURIComponent(key) + "=" + encodeURIComponent(value))
		}
		return str.join("&")
	}
	function reset(root) {
		var cacheKey = getCellCacheKey(root)
		clear(root.childNodes, cellCache[cacheKey])
		cellCache[cacheKey] = undefined
	}

	//Promiz.mithril.js | Zolmeister | MIT
	//a modified version of Promiz.js, which does not conform to Promises/A+ for two reasons:
	//1) `then` callbacks are called synchronously (because setTimeout is too slow, and the setImmediate polyfill is too big
	//2) throwing subclasses of Error cause the error to be bubbled up instead of triggering rejection (because the spec does not account for the important use case of default browser error handling, i.e. message w/ line number)
	function Deferred(successCallback, failureCallback) {
		var RESOLVING = 1, REJECTING = 2, RESOLVED = 3, REJECTED = 4
		var self = this, state = 0, promiseValue = 0, next = []

		self["promise"] = {}

		self["resolve"] = function(value) {
			if (!state) {
				promiseValue = value
				state = RESOLVING

				fire()
			}
			return this
		}

		self["reject"] = function(value) {
			if (!state) {
				promiseValue = value
				state = REJECTING
				
				fire()
			}
			return this
		}

		self.promise["then"] = function(successCallback, failureCallback) {
			var deferred = new Deferred(successCallback, failureCallback)
			if (state == RESOLVED) {
				deferred.resolve(promiseValue)
			}
			else if (state == REJECTED) {
				deferred.reject(promiseValue)
			}
			else {
				next.push(deferred)
			}
			return deferred.promise
		}
		
		function finish(type) {
			state = type || REJECTED
			next.map(function(deferred) {
				state == RESOLVED && deferred.resolve(promiseValue) || deferred.reject(promiseValue)
			})
		}

		function thennable(then, successCallback, failureCallback, notThennableCallback) {
			if ((isObj(promiseValue) || isFn(promiseValue)) && isFn(then)) {
				try {
					// count protects against abuse calls from spec checker
					var count = 0
					then.call(promiseValue, function(value) {
						if (count++) return
						promiseValue = value
						successCallback()
					}, function (value) {
						if (count++) return
						promiseValue = value
						failureCallback()
					})
				}
				catch (e) {
					Deferred.onerror(e)
					promiseValue = e
					failureCallback()
				}
			} else {
				notThennableCallback()
			}
		}

		function fire() {
			// check if it's a thenable
			var then
			try {
				then = promiseValue && promiseValue.then
			}
			catch (e) {
				Deferred.onerror(e)
				promiseValue = e
				state = REJECTING
				return fire()
			}
			thennable(then, function() {
				state = RESOLVING
				fire()
			}, function() {
				state = REJECTING
				fire()
			}, function() {
				try {
					if (state == RESOLVING && isFn(successCallback)) {
						promiseValue = successCallback(promiseValue)
					}
					else if (state == REJECTING && isFn(failureCallback)) {
						promiseValue = failureCallback(promiseValue)
						state = RESOLVING
					}
				}
				catch (e) {
					Deferred.onerror(e)
					promiseValue = e
					return finish()
				}

				if (promiseValue == self) {
					promiseValue = TypeError()
					finish()
				}
				else {
					thennable(then, function () {
						finish(RESOLVED)
					}, finish, function () {
						finish(state == RESOLVING && RESOLVED)
					})
				}
			})
		}
	}
	Deferred.onerror = function(e) {
		if (type(e) == "[object Error]" && !e.constructor.toString().match(/ Error/)) throw e
	}

	function identity(value) {return value}

	function ajax(options) {
		if (options.dataType && options.dataType.toLowerCase() === "jsonp") {
			var callbackKey = "mithril_callback_" + new Date().getTime() + "_" + (Math.round(Math.random() * 1e16)).toString(36)
			var script = window.document.createElement("script")

			window[callbackKey] = function(resp){
				delete window[callbackKey]
				window.document.body.removeChild(script)
				options.onload({
					type: "load",
					target: {
						responseText: resp
					}
				})
			}

			script.onerror = function(e) {
				delete window[callbackKey]
				window.document.body.removeChild(script)

				options.onerror({
					type: "error",
					target: {
						status: 500,
						responseText: JSON.stringify({error: "Error making jsonp request"})
					}
				})

				return false
			}

			script.onload = function(e) {
				return false
			}

			script.src = options.url
				+ (options.url.indexOf("?") > 0 ? "&" : "?")
				+ (options.callbackKey ? options.callbackKey : "callback")
				+ "=" + callbackKey
				+ "&" + buildQueryString(options.data || {})
			window.document.body.appendChild(script)
		}
		else {
			var xhr = new window.XMLHttpRequest
			xhr.open(options.method, options.url, true, options.user, options.password)
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) options.onload({type: "load", target: xhr})
					else options.onerror({type: "error", target: xhr})
				}
			}
			if (options.serialize == JSON.stringify && options.data && options.method != "GET") {
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
			}
			if (options.deserialize == JSON.parse) {
				xhr.setRequestHeader("Accept", "application/json, text/*");
			}
			if (isFn(options.config)) {
				var maybeXhr = options.config(xhr, options)
				if (maybeXhr != null) xhr = maybeXhr
			}

			xhr.send(options.method == "GET" || !options.data ? "" : options.data)
			return xhr
		}
	}
	function bindData(xhrOptions, data, serialize) {
		if (data && Object.keys(data).length > 0) {
			if (xhrOptions.method == "GET" && xhrOptions.dataType != "jsonp") {
				xhrOptions.url = xhrOptions.url + (xhrOptions.url.indexOf("?") < 0 ? "?" : "&") + buildQueryString(data)
			}
			else xhrOptions.data = serialize(data)
		}
		return xhrOptions
	}
	function parameterizeUrl(url, data) {
		var tokens = url.match(/:[a-z]\w+/gi)
		if (tokens && data) {
			for (var i = 0; i < tokens.length; i++) {
				var key = tokens[i].slice(1)
				url = url.replace(tokens[i], data[key])
				delete data[key]
			}
		}
		return url
	}

	m.request = function(xhrOptions) {
		if (xhrOptions.background !== true) m.startComputation()
		var deferred = new Deferred()
		var isJSONP = xhrOptions.dataType && xhrOptions.dataType.toLowerCase() === "jsonp"
		var serialize = xhrOptions.serialize = isJSONP ? identity : xhrOptions.serialize || JSON.stringify
		var deserialize = xhrOptions.deserialize = isJSONP ? identity : xhrOptions.deserialize || JSON.parse
		var extract = xhrOptions.extract || function(xhr) {
			return xhr.responseText.length === 0 && deserialize === JSON.parse ? null : xhr.responseText
		}
		xhrOptions.url = parameterizeUrl(xhrOptions.url, xhrOptions.data)
		xhrOptions = bindData(xhrOptions, xhrOptions.data, serialize)
		xhrOptions.onload = xhrOptions.onerror = function(e) {
			try {
				e = e || event
				var unwrap = (e.type == "load" ? xhrOptions.unwrapSuccess : xhrOptions.unwrapError) || identity
				var response = unwrap(deserialize(extract(e.target, xhrOptions)))
				if (e.type == "load") {
					if (isArr(response) && xhrOptions.type) {
						for (var i = 0; i < response.length; i++) response[i] = new xhrOptions.type(response[i])
					}
					else if (xhrOptions.type) response = new xhrOptions.type(response)
				}
				deferred[e.type == "load" ? "resolve" : "reject"](response)
			}
			catch (e) {
				Deferred.onerror(e)
				deferred.reject(e)
			}
			if (xhrOptions.background !== true) m.endComputation()
		}
		ajax(xhrOptions)
		return deferred.promise
	}

	//testing API
	m.deps = function(mock) {return window = mock}
	//for internal testing only, do not use `m.deps.factory`
	m.deps.factory = app

	//JCS: Expose base Deferred object
	m.Deferred= Deferred;
	return m
}(typeof window != "undefined" ? window : {})

if (typeof module != "undefined" && module !== null) module.exports = m
if (typeof define == "function" && define.amd) define(function() {return m})

;;;

/*EpicCore*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var Issue, ModelJS, app, klass, nm, w, _ref,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  app = function(window, undef) {
    var E, Extra, Model, aActions, aFists, aFlows, aMacros, aModels, aSetting, action, appFindAction, appFindAttr, appFindNode, appFist, appGetF, appGetS, appGetSetting, appGetT, appGetVars, appInit, appLoadFormsIf, appModel, appSearchAttr, appStartS, appStartT, appconfs, counter, fieldDef, finish_logout, fistDef, fistInit, getModelState, inAction, issueInit, issueMap, make_model_functions, merge, modelState, nm, oModel, obj, option, setModelState, type_oau, wistDef, wistInit, _d_doAction, _i, _len, _ref, _ref1;
    inAction = false;
    counter = 0;
    Model = {};
    Extra = {};
    oModel = {};
    modelState = {};
    appconfs = [];
    option = {
      event: (function() {}),
      loadDirs: {}
    };
    _ref = ['c1', 'a1', 'a2', 'ap1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'ca1', 'ca2', 'ca3', 'ca4', 'fi1', 'fi2', 'fi3', 'v1', 'w1'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      nm = _ref[_i];
      option[nm] = (function() {});
    }
    E = {};
    E.nextCounter = function() {
      return ++counter;
    };
    E.opt = function(object) {
      return merge(option, object);
    };
    type_oau = function(obj) {
      return {}.toString.call(obj)[8];
    };
    merge = function() {
      var atype, depth, dest, dup, f, func, otype, source, sources, stype, utype, _j, _len1;
      dest = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      otype = 'O';
      atype = 'A';
      utype = 'U';
      stype = 'S';
      depth = 0;
      func = {};
      func[otype] = function(dest, source) {
        var ans, f, snm;
        f = 'func:O';
        if ((type_oau(source)) !== otype) {
          return undef;
        }
        for (snm in source) {
          ans = dup(dest[snm], source[snm]);
          if (ans !== undef) {
            dest[snm] = ans;
          }
        }
        return undef;
      };
      func[atype] = function(dest, source) {
        var ans, f, inx, s, _j, _len1;
        f = 'func:A';
        if ((type_oau(source)) !== atype) {
          return undef;
        }
        for (inx = _j = 0, _len1 = source.length; _j < _len1; inx = ++_j) {
          s = source[inx];
          ans = dup(dest[inx], s);
          if (ans !== undef) {
            dest[inx] = ans;
          }
        }
        return undef;
      };
      func[utype] = function(was, want) {
        var become, f;
        f = 'func:U';
        switch (type_oau(want)) {
          case otype:
            become = {};
            func[otype](become, want);
            break;
          case atype:
            become = [];
            func[atype](become, want);
            break;
          default:
            become = want;
        }
        return become;
      };
      func[stype] = function(was, want) {
        if ((type_oau(want)) !== utype) {
          return want;
        }
        return was;
      };
      dup = function(dest, source) {
        var r, type;
        depth++;
        type = type_oau(dest);
        if (!(type in func)) {
          type = stype;
        }
        r = func[type](dest, source);
        depth--;
        return r;
      };
      for (_j = 0, _len1 = sources.length; _j < _len1; _j++) {
        source = sources[_j];
        f = ':merge:source-loop';
        dup(dest, source);
      }
      return dest;
    };
    E.login = function() {
      var f, k, o, _results;
      f = ':login';
      _log2(f, oModel);
      _results = [];
      for (k in oModel) {
        o = oModel[k];
        _results.push(typeof o.eventLogin === "function" ? o.eventLogin() : void 0);
      }
      return _results;
    };
    E.logout = function(action_event, action_data) {
      var _this = this;
      if (inAction !== false) {
        setTimeout((function() {
          return E.logout(action_event, action_data);
        }), 100);
        return;
      }
      if (action_event) {
        return (action(action_event, action_data)).then(function() {
          return finish_logout();
        });
      } else {
        return finish_logout();
      }
    };
    finish_logout = function() {
      var k, o, _results;
      _results = [];
      for (k in oModel) {
        o = oModel[k];
        if (!(typeof o.eventLogout === "function" ? o.eventLogout() : void 0)) {
          continue;
        }
        delete modelState[k];
        _results.push(delete oModel[k]);
      }
      return _results;
    };
    E.run = function(set_appconfs, more_options, init_func) {
      var promise;
      appconfs = set_appconfs;
      merge(option, more_options);
      E.oLoader = new Extra[option.loader](appconfs);
      promise = E.oLoader.D_loadAsync();
      promise.then(function() {
        appInit();
        merge(option, more_options);
        make_model_functions();
        fistInit();
        wistInit();
        issueInit();
        if (typeof init_func === 'function') {
          init_func();
        }
        E.App().go(aSetting.go);
        return E.oRender = new Extra[option.render];
      });
    };
    setModelState = function(s) {
      var f, inst_nm, _base, _results;
      f = ':setModelState';
      if (s != null) {
        modelState = s;
      }
      _results = [];
      for (inst_nm in oModel) {
        _results.push(typeof (_base = oModel[inst_nm]).restoreState === "function" ? _base.restoreState(modelState[inst_nm]) : void 0);
      }
      return _results;
    };
    getModelState = function() {
      var k, o, ss;
      modelState = {};
      for (k in oModel) {
        o = oModel[k];
        if ((o.saveState != null) && (ss = o.saveState())) {
          modelState[k] = ss;
        }
      }
      return modelState;
    };
    aSetting = {
      frames: {},
      modals: {},
      layout: 'default',
      go: 'default//'
    };
    aMacros = {};
    aActions = {};
    aFlows = {
      "default": {
        start: 'default',
        TRACKS: {
          "default": {
            start: 'default',
            STEPS: {
              "default": {}
            }
          }
        }
      }
    };
    aModels = {};
    aFists = {};
    appLoadFormsIf = function(config) {};
    appInit = function() {
      var form_nm, hash, node, obj, view_nm, _j, _k, _len1, _len2, _ref1, _ref2;
      for (_j = 0, _len1 = appconfs.length; _j < _len1; _j++) {
        nm = appconfs[_j];
        app = (_ref1 = E['app$' + nm]) != null ? _ref1 : {};
        if (app.STEPS) {
          merge(aFlows["default"].TRACKS["default"].STEPS, app.STEPS);
        }
        if (app.TRACKS) {
          merge(aFlows["default"].TRACKS, app.TRACKS);
        }
        hash = {
          SETTINGS: aSetting,
          MACROS: aMacros,
          ACTIONS: aActions,
          FLOWS: aFlows,
          MODELS: aModels,
          OPTIONS: option
        };
        for (nm in hash) {
          obj = hash[nm];
          merge(obj, app[nm]);
        }
      }
      for (view_nm in aModels) {
        node = aModels[view_nm];
        if (node.fists) {
          _ref2 = node.fists;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            form_nm = _ref2[_k];
            aFists[form_nm] = view_nm;
          }
        }
      }
    };
    appModel = function(view_name, attribute) {
      option.a1(view_name, aModels);
      option.a2(view_name, aModels, attribute);
      return aModels[view_name][attribute];
    };
    appFist = function(fist_nm) {
      return aFists[fist_nm];
    };
    appFindNode = function(flow, t, s, cat, nm) {
      var ncat, nf, ns, nt, _ref1, _ref2, _ref3, _ref4, _ref5;
      nf = aFlows[flow];
      if (nf) {
        if (t && ((nt = (_ref1 = nf.TRACKS) != null ? _ref1[t] : void 0) != null)) {
          if (s && ((ns = (_ref2 = nt.STEPS) != null ? _ref2[s] : void 0) != null)) {
            if ((ncat = (_ref3 = ns[cat]) != null ? _ref3[nm] : void 0) != null) {
              return ncat;
            }
          }
          if ((ncat = (_ref4 = nt[cat]) != null ? _ref4[nm] : void 0) != null) {
            return ncat;
          }
        }
        if ((ncat = (_ref5 = nf[cat]) != null ? _ref5[nm] : void 0) != null) {
          return ncat;
        }
      }
      return null;
    };
    appFindAttr = function(flow, t, s, attr) {
      var nattr, nf, ns, nt, _ref1, _ref2;
      nf = aFlows[flow];
      if (nf) {
        if (t && ((nt = (_ref1 = nf.TRACKS) != null ? _ref1[t] : void 0) != null)) {
          if (s && ((ns = (_ref2 = nt.STEPS) != null ? _ref2[s] : void 0) != null)) {
            if ((nattr = ns[attr]) != null) {
              return nattr;
            }
          }
          if ((nattr = nt[attr]) != null) {
            return nattr;
          }
        }
        if ((nattr = nf[attr]) != null) {
          return nattr;
        }
      }
      return null;
    };
    appGetF = function(flow) {
      return aFlows[flow];
    };
    appGetT = function(flow, track) {
      return aFlows[flow].TRACKS[track];
    };
    appGetS = function(flow, track, step) {
      return aFlows[flow].TRACKS[track].STEPS[step];
    };
    appStartT = function(flow) {
      return appGetF(flow).start;
    };
    appStartS = function(flow, track) {
      return appGetT(flow, track).start;
    };
    appFindAction = function(path, action_token) {
      var _ref1;
      return (_ref1 = appFindNode(path[0], path[1], path[2], 'ACTIONS', action_token)) != null ? _ref1 : aActions[action_token];
    };
    appGetSetting = function(setting_name, flow, track, step) {
      var _ref1;
      if (!flow) {
        return aSetting[setting_name];
      }
      return (_ref1 = appFindAttr(flow, track, step != null ? step : false, setting_name)) != null ? _ref1 : aSetting[setting_name];
    };
    appGetVars = function(flow, track, step) {
      var f, vars;
      f = ':appGetVars';
      vars = merge({}, aFlows[flow].v, aFlows[flow].TRACKS[track].v, aFlows[flow].TRACKS[track].STEPS[step].v);
      return vars;
    };
    appSearchAttr = function(attrNm, val) {
      var flow, flowNm, step, stepNm, track, trackNm, _ref1, _ref2;
      for (flowNm in aFlows) {
        flow = aFlows[flowNm];
        _ref1 = flow.TRACKS;
        for (trackNm in _ref1) {
          track = _ref1[trackNm];
          _ref2 = track.STEPS;
          for (stepNm in _ref2) {
            step = _ref2[stepNm];
            if (step[attrNm] === val) {
              return [flowNm, trackNm, stepNm];
            }
          }
          if (track[attrNm] === val) {
            return [flowNm, trackNm, track.start];
          }
        }
        if (flow[attrNm] === val) {
          return [flowNm, flow.start, aFlows[flow.start].start];
        }
      }
      return false;
    };
    make_model_functions = function() {
      var model, view, _results;
      _results = [];
      for (view in aModels) {
        model = aModels[view];
        _results.push((function(view, model) {
          return E[view] = function(table_or_ctx, act_if_action, data) {
            var inst_nm, oM;
            inst_nm = model.inst;
            if (!(inst_nm in oModel)) {
              option.m1(view, model);
              oModel[inst_nm] = new E.Model[model["class"]](view, model.options);
              if (inst_nm in oModel) {
                oModel[inst_nm].restoreState(oModel[inst_nm]);
              }
            }
            oM = oModel[inst_nm];
            if (table_or_ctx === undef) {
              return oM;
            }
            if (act_if_action === undef) {
              return oM.getTable(table_or_ctx);
            }
            return oM.action(table_or_ctx, act_if_action, data);
          };
        })(view, model));
      }
      return _results;
    };
    action = function(action_token, data) {
      var ans, f, final, more;
      f = ':action:' + action_token;
      _log2(f, data);
      option.c1(inAction);
      inAction = action_token;
      m.startComputation();
      final = function() {
        return m.endComputation();
      };
      more = function(action_result) {
        _log2(f, 'cb:', action_result[0], action_result[1]);
        E.App().setIssues(action_result[0]);
        E.App().setMessages(action_result[1]);
        return inAction = false;
      };
      try {
        ans = _d_doAction(action_token, data, E.App().getStepPath());
      } finally {
        if ((ans != null ? ans.then : void 0) != null) {
          (ans.then(more)).then(final, (function(e) {
            final();
            throw e;
          }));
        } else {
          setTimeout(final, 0);
          if (ans != null) {
            more(ans);
          }
        }
      }
    };
    _d_doAction = function(action_token, data, original_path) {
      var action_node, ans, d_doActionNode, d_doLeftSide, d_doRightSide, done, err, f, master_data, master_issue, master_message;
      f = ":_d_doAction(" + action_token + ")";
      master_issue = new Issue('App');
      master_message = new Issue('App');
      master_data = merge({}, data);
      action_node = appFindAction(original_path, action_token);
      _log2(f, 'got node:', action_node);
      option.ca1(action_token, original_path, action_node);
      if (!(action_node != null)) {
        return [master_issue, master_message];
      }
      d_doLeftSide = function(action_node) {
        var ans, copy_to, ctx, d, d_cb, fist, fist_model, i, is_macro, ix, mg, name, nms, r, val, view_act, view_nm, what, _j, _k, _len1, _len2, _ref1, _ref2, _ref3, _ref4, _ref5;
        _ref1 = ['fist', 'clear'];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          what = _ref1[_j];
          if (!(what in action_node)) {
            continue;
          }
          option.ca4(action_token, original_path, action_node, what);
          fist = action_node[what];
          fist_model = (_ref2 = E.fistDef[fist].event) != null ? _ref2 : 'Fist';
          if (what === 'clear') {
            E[fist_model]().fistClear(fist, master_data.row);
          } else {
            E[fist_model]().fistValidate(r = {}, fist, master_data.row);
            E.merge(master_data, r);
            if (r.fist$success !== 'SUCCESS') {
              return;
            }
          }
        }
        nms = (function() {
          switch (type_oau(action_node.pass)) {
            case 'A':
              return action_node.pass;
            case 'S':
              return action_node.pass.split(',');
            default:
              return [];
          }
        })();
        for (ix = _k = 0, _len2 = nms.length; _k < _len2; ix = ++_k) {
          nm = nms[ix];
          if (!((nm.indexOf(':')) > -1)) {
            continue;
          }
          _ref3 = nm.split(':'), name = _ref3[0], copy_to = _ref3[1];
          master_data[copy_to] = master_data[name];
          nms[ix] = name;
        }
        option.ca2(action_token, original_path, nms, data, action_node);
        _ref4 = action_node.set;
        for (nm in _ref4) {
          val = _ref4[nm];
          master_data[nm] = val;
        }
        if (action_node["do"] != null) {
          is_macro = (action_node["do"].indexOf('.')) < 0;
          if (is_macro) {
            option.ca3(action_token, original_path, action_node, aMacros);
            return d_doActionNode(aMacros[action_node["do"]]);
          }
          _ref5 = action_node["do"].split('.'), view_nm = _ref5[0], view_act = _ref5[1];
          view_act = view_act ? view_act : action_token;
          d = new m.Deferred();
          r = {};
          i = new E.Issue(view_nm, view_act);
          mg = new E.Issue(view_nm, view_act);
          ctx = {
            d: d,
            r: r,
            i: i,
            m: mg
          };
          ans = E[view_nm](ctx, view_act, master_data);
          d_cb = function() {
            var _ref6;
            _ref6 = ctx.r;
            for (nm in _ref6) {
              val = _ref6[nm];
              master_data[nm] = val;
            }
            master_issue.addObj(ctx.i);
            return master_message.addObj(ctx.m);
          };
          _log2(f, 'd_doLeftSide: after model called:', {
            view_nm: view_nm,
            view_act: view_act,
            master_data: master_data,
            ans: ans,
            r: ctx.r
          });
          if ((ans != null ? ans.then : void 0) != null) {
            return ans.then(d_cb);
          } else {
            return d_cb(ans);
          }
        }
      };
      d_doRightSide = function(action_node) {
        var choice, k, matches, next_node, val, _j, _len1, _ref1, _ref2, _ref3, _ref4;
        if (action_node.go != null) {
          E.App().go(action_node.go);
        }
        next_node = null;
        if ((_ref1 = action_node.next) == null) {
          action_node.next = [];
        }
        if ('A' !== type_oau(action_node.next)) {
          action_node.next = [action_node.next];
        }
        _ref2 = action_node.next;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          choice = _ref2[_j];
          if (!('when' in choice)) {
            next_node = choice;
            break;
          }
          if (choice.when === 'default') {
            next_node = choice;
            break;
          }
          if ((typeof choice.when) === 'string' && choice.when === ((_ref3 = master_data.success) != null ? _ref3 : master_data.ok)) {
            next_node = choice;
            break;
          }
          matches = true;
          _ref4 = choice.when;
          for (k in _ref4) {
            val = _ref4[k];
            if (master_data[k] !== val) {
              matches = false;
              break;
            }
          }
          if (matches) {
            next_node = choice;
            break;
          }
        }
        if (next_node) {
          return d_doActionNode(next_node);
        }
      };
      d_doActionNode = function(action_node) {
        var ans, d_rsCb;
        ans = d_doLeftSide(action_node);
        d_rsCb = function() {
          return d_doRightSide(action_node);
        };
        if ((ans != null ? ans.then : void 0) != null) {
          return ans.then(d_rsCb);
        } else {
          return d_rsCb(ans);
        }
      };
      ans = d_doActionNode(action_node);
      done = function() {
        return [master_issue, master_message];
      };
      err = function(err) {
        throw new Error('BLOWUP:' + err.message);
      };
      if ((ans != null ? ans.then : void 0) != null) {
        return ans.then(done, err);
      } else {
        return done(ans);
      }
    };
    fieldDef = {};
    fistDef = {};
    fistInit = function() {
      var fist, rec, _j, _len1, _ref1, _results;
      for (_j = 0, _len1 = appconfs.length; _j < _len1; _j++) {
        nm = appconfs[_j];
        fist = (_ref1 = E['fist$' + nm]) != null ? _ref1 : {};
        if (fist.FIELDS) {
          merge(fieldDef, fist.FIELDS);
        }
        if (fist.FISTS) {
          merge(fistDef, fist.FISTS);
        }
      }
      for (nm in fistDef) {
        rec = fistDef[nm];
        rec.fistNm = nm;
      }
      _results = [];
      for (nm in fieldDef) {
        rec = fieldDef[nm];
        _results.push(rec.fieldNm = nm);
      }
      return _results;
    };
    issueMap = {};
    issueInit = function() {
      var issues, _j, _len1, _ref1, _results;
      _results = [];
      for (_j = 0, _len1 = appconfs.length; _j < _len1; _j++) {
        nm = appconfs[_j];
        issues = (_ref1 = E['issues$' + nm]) != null ? _ref1 : {};
        _results.push(merge(issueMap, issues));
      }
      return _results;
    };
    wistDef = {};
    wistInit = function() {
      var wists, _j, _len1, _ref1, _results;
      _results = [];
      for (_j = 0, _len1 = appconfs.length; _j < _len1; _j++) {
        nm = appconfs[_j];
        wists = (_ref1 = E['wist$' + nm]) != null ? _ref1 : {};
        _results.push(merge(wistDef, wists));
      }
      return _results;
    };
    _ref1 = {
      type_oau: type_oau,
      Model: Model,
      Extra: Extra,
      option: option,
      action: action,
      merge: merge,
      getModelState: getModelState,
      setModelState: setModelState,
      appGetF: appGetF,
      appGetT: appGetT,
      appGetS: appGetS,
      appStartT: appStartT,
      appStartS: appStartS,
      appFindAction: appFindAction,
      appGetSetting: appGetSetting,
      appGetVars: appGetVars,
      appFist: appFist,
      appFindAttr: appFindAttr,
      appSearchAttr: appSearchAttr,
      fieldDef: fieldDef,
      fistDef: fistDef,
      issueMap: issueMap,
      wistDef: wistDef,
      oModel: oModel,
      appconfs: appconfs,
      aFlows: aFlows
    };
    for (nm in _ref1) {
      obj = _ref1[nm];
      E[nm] = obj;
    }
    return E;
  };

  Issue = (function() {

    function Issue(t_view, t_action) {
      this.t_view = t_view;
      this.t_action = t_action;
      this.issue_list = [];
    }

    Issue.Make = function(view, token, value_list) {
      var issue;
      issue = new Issue(view);
      issue.add(token, value_list);
      return issue;
    };

    Issue.prototype.add = function(token, msgs) {
      var f;
      f = ':Issue.add:' + this.t_view + ':' + this.t_action;
      _log2(f, 'params:type/msgs', token, msgs);
      switch (typeof msgs) {
        case 'undefined':
          msgs = [];
          break;
        case 'string':
          msgs = [msgs];
      }
      return this.issue_list.push({
        token: token,
        more: msgs,
        t_view: this.t_view,
        t_action: this.t_action
      });
    };

    Issue.prototype.addObj = function(issue_obj) {
      var f, issue, new_issue, _i, _len, _ref, _ref1, _ref2;
      f = ':Issue.addObj:' + this.t_view + '#' + this.t_action;
      if (typeof issue_obj !== 'object' || !('issue_list' in issue_obj)) {
        return;
      }
      _ref = issue_obj.issue_list;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        issue = _ref[_i];
        new_issue = E.merge({}, issue);
        if ((_ref1 = new_issue.t_view) == null) {
          new_issue.t_view = this.t_view;
        }
        if ((_ref2 = new_issue.t_action) == null) {
          new_issue.t_action = this.t_action;
        }
        this.issue_list.push(new_issue);
      }
    };

    Issue.prototype.count = function() {
      return this.issue_list.length;
    };

    Issue.prototype.asTable = function() {
      var final, issue, _i, _len, _ref;
      final = [];
      _ref = this.issue_list;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        issue = _ref[_i];
        final.push({
          token: issue.token,
          title: "" + issue.t_view + "#" + issue.t_action + "#" + issue.token + "#" + (issue.more.join(',')),
          issue: this.map(issue.t_view, issue.t_action, issue.token, issue.more)
        });
      }
      return final;
    };

    Issue.prototype.map = function(t_view, t_action, token, more) {
      var map, map_list, spec, sub_map, _i, _j, _len, _len1, _ref;
      map = E.issueMap;
      if (typeof map !== 'object') {
        return "(no map) " + t_view + "#" + t_action + "#" + token + "#" + (more.join(','));
      }
      map_list = [];
      if (t_view in map) {
        if (t_action in map[t_view]) {
          map_list.push(map[t_view][t_action]);
        }
        if ('default' in map[t_view]) {
          map_list.push(map[t_view]["default"]);
        }
      }
      if ('default' in map) {
        if (t_action in map["default"]) {
          map_list.push(map["default"][t_action]);
        }
        if ('default' in map["default"]) {
          map_list.push(map["default"]["default"]);
        }
      }
      for (_i = 0, _len = map_list.length; _i < _len; _i++) {
        sub_map = map_list[_i];
        _ref = sub_map || [];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          spec = _ref[_j];
          if (token.match(spec[0])) {
            return this.doMap(token, spec[1], more, token);
          }
        }
      }
      return "(no match)" + t_view + "#" + t_action + "#" + token + "#" + (more.join(','));
    };

    Issue.prototype.doMap = function(token, pattern, vals) {
      var new_str;
      new_str = pattern.replace(/%([0-9])(?::([0-9]))?%/g, function(str, i1, i2, more) {
        if (i1 === '0') {
          return token;
        }
        if (i2) {
          return vals[i1 - 1] || vals[i2 - 1] || '';
        } else {
          return vals[i1 - 1] || '';
        }
      });
      return new_str;
    };

    return Issue;

  })();

  ModelJS = (function() {

    function ModelJS(view_nm, options, ss) {
      this.view_nm = view_nm;
      this.options = options;
      this._ModelJS = {
        ss: ss || false
      };
      this.restoreState(false);
    }

    ModelJS.prototype.getTable = function(tbl_nm) {
      this.loadTableIf(tbl_nm);
      return this.Table[tbl_nm];
    };

    ModelJS.prototype.loadTableIf = function(tbl_nm) {
      if (!(tbl_nm in this.Table)) {
        return this.loadTable(tbl_nm);
      }
    };

    ModelJS.prototype.restoreState = function(copy_of_state) {
      var key;
      if (this._ModelJS.ss != null) {
        for (key in this._ModelJS.ss) {
          delete this[key];
        }
      }
      if (this._ModelJS.ss != null) {
        E.merge(this, this._ModelJS.ss);
      }
      if (copy_of_state) {
        E.merge(this, copy_of_state);
      }
      return this.Table = {};
    };

    ModelJS.prototype.saveState = function() {
      var nm, ss, st;
      ss = this._ModelJS.ss;
      if (!ss) {
        return false;
      }
      st = {};
      for (nm in ss) {
        if (this[nm] !== ss[nm]) {
          st[nm] = this[nm];
        }
      }
      return E.merge({}, st);
    };

    ModelJS.prototype.invalidateTables = function(tbl_nms, not_tbl_names) {
      var deleted_tbl_nms, f, nm, _i, _len;
      f = ':ModelJS.invalidateTables~' + this.view_nm;
      if (not_tbl_names == null) {
        not_tbl_names = [];
      }
      if (tbl_nms === true) {
        tbl_nms = (function() {
          var _results;
          _results = [];
          for (nm in this.Table) {
            if (!(__indexOf.call(not_tbl_names, nm) >= 0)) {
              _results.push(nm);
            }
          }
          return _results;
        }).call(this);
      }
      deleted_tbl_nms = [];
      for (_i = 0, _len = tbl_nms.length; _i < _len; _i++) {
        nm = tbl_nms[_i];
        if (nm in this.Table) {
          deleted_tbl_nms.push(nm);
          delete this.Table[nm];
        }
      }
      return E.View().invalidateTables(this.view_nm, tbl_nms, deleted_tbl_nms);
    };

    ModelJS.prototype.action = function(ctx, act, params) {
      return E.option.m2(this.view_nm, act, params);
    };

    ModelJS.prototype.loadTable = function(tbl_nm) {
      return E.option.m3(this.view_nm, tbl_nm);
    };

    ModelJS.prototype.fistValidate = function(ctx, fistNm, row) {
      return E.option.m4(this.view_nm, fistNm, row);
    };

    ModelJS.prototype.fistGetValues = function(fistNm, row) {
      return E.option.m5(this.view_nm, fistNm, row);
    };

    ModelJS.prototype.fistGetChoices = function(fistNm, fieldNm, row) {
      return E.option.m6(this.view_nm, fistNm, fieldNm, row);
    };

    return ModelJS;

  })();

  w = typeof window !== "undefined" ? window : {};

  w.EpicMvc = w.E = new app(w);

  _ref = {
    Issue: Issue,
    ModelJS: ModelJS
  };
  for (nm in _ref) {
    klass = _ref[nm];
    w.E[nm] = klass;
  }

  w._log2 = function() {};

  w._log2 = Function.prototype.bind.call(console.log, console);

  if (typeof module !== "undefined" && module !== null) {
    module.exports = w.E;
  }

  if (typeof define === "function" && define.amd) {
    define(function() {
      return w.E;
    });
  }

}).call(this);

/*Base/app.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var tell_Tab;

  tell_Tab = function(type, event_obj, target, data_action) {
    if ((type === 'click' || type === 'enter') || type === 'keyup' && event_obj.keyCode === 27) {
      if (!/event:Tab:Drop:/.test(data_action)) {
        return E.Tab().event('Tab', type, 'Drop', '_CLEARED', {});
      }
    }
  };

  E.app$Base = {
    OPTIONS: {
      render: 'RenderStrategy$Base',
      dataAction: 'dataAction$Base',
      event: tell_Tab
    },
    MODELS: {
      App: {
        "class": "App$Base",
        inst: "iBaseApp"
      },
      View: {
        "class": "View$Base",
        inst: "iBaseView"
      },
      Fist: {
        "class": "Fist$Base",
        inst: "iBaseFist"
      },
      Tab: {
        "class": "Tab$Base",
        inst: "iBaseTab"
      },
      Wist: {
        "class": "Wist$Base",
        inst: "iBaseWist"
      }
    }
  };

}).call(this);

/*Base/manifest.coffee*/// Generated by CoffeeScript 1.4.0
(function() {

  E.manifest$Base = {
    Extra: ['LoadStrategy', 'RenderStrategy', 'dataAction', 'RestAPI'],
    Model: ['App', 'View', 'Fist', 'Wist', 'Tab'],
    js: [],
    root: ['app']
  };

}).call(this);

/*Base/Model/View.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var View$Base,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  View$Base = (function(_super) {

    __extends(View$Base, _super);

    function View$Base(view_nm, options) {
      this.ex = __bind(this.ex, this);

      this.T_if = __bind(this.T_if, this);

      this.T_page = __bind(this.T_page, this);

      this.handleIt = __bind(this.handleIt, this);

      this.doDefer = __bind(this.doDefer, this);

      var frames, ix, nm;
      View$Base.__super__.constructor.call(this, view_nm, options);
      frames = E.appGetSetting('frames');
      this.frames = (function() {
        var _i, _len, _ref, _results;
        _ref = ((function() {
          var _results1;
          _results1 = [];
          for (nm in frames) {
            _results1.push(nm);
          }
          return _results1;
        })()).sort();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ix = _ref[_i];
          _results.push(frames[ix]);
        }
        return _results;
      })();
      this.frames.push('X');
      this.did_run = false;
      this.in_run = false;
      window.oE = this;
      this.defer_it_cnt = 0;
      this.start = false;
    }

    View$Base.prototype.nest_up = function(who) {
      var f;
      f = 'nest_up:' + who;
      if (this.defer_it_cnt === 0) {
        if (this.in_run) {
          BLOWUP();
        }
        this.in_run = true;
        this.start = new Date().getTime();
        this.defer_it = new m.Deferred();
      }
      return this.defer_it_cnt++;
    };

    View$Base.prototype.nest_dn = function(who) {
      var f;
      f = 'nest_dn:' + who;
      if (this.defer_it_cnt > 0) {
        this.defer_it_cnt--;
      }
      if (this.defer_it_cnt === 0) {
        _log2(f, 'END RUN', this.defer_content, new Date().getTime() - this.start);
        this.in_run = false;
        return this.defer_it.resolve([this.modal, this.defer_content]);
      }
    };

    View$Base.prototype.run = function() {
      var f, flow, layout, modal, step, track, who, _ref, _ref1, _ref2;
      f = 'run';
      who = 'R';
      _ref = E.App().getStepPath(), flow = _ref[0], track = _ref[1], step = _ref[2];
      if (modal = E.appFindAttr(flow, track, step, 'modal')) {
        modal = (_ref1 = (E.appGetSetting('modals'))[modal]) != null ? _ref1 : modal;
      }
      layout = modal != null ? modal : E.appGetSetting('layout', flow, track, step);
      this.modal = modal ? true : false;
      this.page_name = (_ref2 = (E.appGetS(flow, track, step)).page) != null ? _ref2 : step;
      this.did_run = true;
      this.frames[this.frames.length - 1] = layout;
      this.frame_inx = 0;
      this.resetInfo();
      this.nest_up(who);
      this.defer_content = this.kids([['page', {}]]);
      this.nest_dn(who);
      return this.defer_it.promise;
    };

    View$Base.prototype.resetInfo = function() {
      this.R = {};
      this.I = {};
      this.P = [{}];
      this.N = {};
      return this.D = [[]];
    };

    View$Base.prototype.saveInfo = function() {
      var f, saved_info;
      f = 'saveInfo';
      saved_info = E.merge({}, {
        I: this.I,
        P: this.P
      });
      return saved_info;
    };

    View$Base.prototype.restoreInfo = function(saved_info) {
      var f, nm, _results;
      f = 'restoreInfo';
      this.resetInfo();
      this.P = saved_info.P;
      this.I = saved_info.I;
      _results = [];
      for (nm in this.I) {
        if (!(nm in this.R)) {
          _results.push(this.R[nm] = this._getMyRow(this.I[nm]));
        }
      }
      return _results;
    };

    View$Base.prototype._getMyRow = function(I) {
      var f;
      f = '_getMyRow';
      if (I.m != null) {
        return (E[I.m](I.o))[I.c];
      }
      if (!(I.p in this.R)) {
        this.R[I.p] = this._getMyRow(this.I[I.p]);
      }
      if (I.p && I.p in this.R) {
        return this.R[I.p][I.o][I.c];
      }
    };

    View$Base.prototype.getTable = function(nm) {
      var f;
      f = 'Base:M/View.getTable:' + nm;
      switch (nm) {
        case 'If':
          return [this.N];
        case 'Part':
          return this.P.slice(-1);
        default:
          return [];
      }
    };

    View$Base.prototype.invalidateTables = function(view_nm, tbl_nms, deleted_tbl_nms) {
      var f;
      if (!(this.did_run && deleted_tbl_nms.length)) {
        return;
      }
      f = 'Base:M/View.invalidateTables';
      m.startComputation();
      m.endComputation();
    };

    View$Base.prototype.wrap = function(view, attrs, content, defer, has_root) {
      var f, inside,
        _this = this;
      f = 'wrap';
      if (defer.length) {
        inside = E.merge([], defer);
        attrs.config = function(element, isInit, context) {
          var _i, _len, _results;
          f = 'Base:M/View..config:' + view;
          _results = [];
          for (_i = 0, _len = inside.length; _i < _len; _i++) {
            defer = inside[_i];
            _log2(f, defer);
            _results.push(_this.doDefer(defer, element, isInit, context));
          }
          return _results;
        };
      }
      if ('dynamic' in attrs) {
        return {
          tag: attrs.dynamic,
          attrs: attrs,
          children: content
        };
      } else {
        if (!content) {
          return '';
        }
        if (has_root) {
          _log2(f, 'has-root-content', {
            view: view,
            attrs: attrs,
            content: content,
            defer: defer,
            has_root: has_root
          });
          if ('A' !== E.type_oau(content)) {
            BLOWUP();
          }
          return content;
        } else {
          return {
            tag: 'div',
            attrs: attrs,
            children: content
          };
        }
      }
    };

    View$Base.prototype.doDefer = function(defer_obj, element, isInit, context) {
      if ('A' === E.type_oau(defer_obj.defer)) {
        _log2('WARNING', 'Got an array for defer', defer_obj.defer);
        return 'WAS-ARRAY';
      }
      if (defer_obj.func) {
        return defer_obj.func(element, isInit, context, defer_obj.attrs);
      }
    };

    View$Base.prototype.handleIt = function(content) {
      var f;
      f = 'handleIt';
      if (typeof content === 'function') {
        content = content();
      }
      return content;
    };

    View$Base.prototype.formatFromSpec = function(val, spec, custom_spec) {
      var f, left, right, str, _base, _ref;
      f = 'formatFromSpec';
      switch (spec) {
        case '':
          if (custom_spec) {
            return typeof (_base = window.EpicMvc).custom_filter === "function" ? _base.custom_filter(val, custom_spec) : void 0;
          } else {
            return val;
          }
        case 'count':
          return val != null ? val.length : void 0;
        case 'bool':
          if (val) {
            return true;
          } else {
            return false;
          }
        case 'bytes':
          return window.bytesToSize(Number(val));
        case 'uriencode':
          return encodeURIComponent(val);
        case 'quo':
          return ((val.replace(/\\/g, '\\\\')).replace(/'/g, '\\\'')).replace(/"/g, '\\"');
        case '1':
          return (String(val))[0];
        case 'lc':
          return (String(val)).toLowerCase();
        case 'ucFirst':
          str = (String(str)).toLowerCase();
          return str.slice(0, 1).toUpperCase() + str.slice(1);
        default:
          if (spec[0] === '?') {
            _ref = spec.slice(1).split('?'), left = _ref[0], right = _ref[1];
            return (val ? left : right != null ? right : '').replace(new RegExp('[%]', 'g'), val);
          } else {
            return E.option.v1(val, spec);
          }
      }
    };

    View$Base.prototype.v3 = function(view_nm, tbl_nm, key, format_spec, custom_spec) {
      var row, val;
      row = (E[view_nm](tbl_nm))[0];
      val = row[key];
      if (format_spec != null) {
        return this.formatFromSpec(val, format_spec, custom_spec);
      } else {
        return val;
      }
    };

    View$Base.prototype.v2 = function(table_ref, col_nm, format_spec, custom_spec) {
      var ans;
      if (col_nm[0] === '_') {
        ans = this.R[table_ref]._[(col_nm.slice(1)).toLowerCase()];
      } else {
        ans = this.R[table_ref][col_nm];
      }
      if (format_spec != null) {
        return this.formatFromSpec(ans, format_spec, custom_spec);
      } else {
        return ans;
      }
    };

    View$Base.prototype.weed = function(attrs) {
      var clean_attrs, f, nm, val;
      f = 'weed';
      clean_attrs = {};
      for (nm in attrs) {
        val = attrs[nm];
        if (nm[0] !== '?') {
          clean_attrs[nm] = val;
        } else {
          if (val) {
            clean_attrs[nm.slice(1)] = val;
          }
        }
      }
      return clean_attrs;
    };

    View$Base.prototype.kids = function(kids) {
      var ans, f, ix, kid, out, who, _i, _len,
        _this = this;
      f = 'kids';
      who = 'K';
      out = [];
      for (ix = _i = 0, _len = kids.length; _i < _len; ix = ++_i) {
        kid = kids[ix];
        if ('A' === E.type_oau(kid)) {
          out.push(ix);
          ans = this['T_' + kid[0]](kid[1], kid[2]);
          if (ans != null ? ans.then : void 0) {
            this.nest_up(who);
            (function(ix) {
              return ans.then(function(result) {
                out[ix] = result;
                return _this.nest_dn(who);
              }, function(err) {
                console.error('kids', err);
                out[ix] = err.message;
                return _this.nest_dn(who);
              });
            })(ix);
          } else {
            out[ix] = ans;
          }
        } else {
          out.push(kid);
        }
      }
      return out;
    };

    View$Base.prototype.loadPartAttrs = function(attrs) {
      var attr, f, result, val;
      f = 'Base:M/View.loadPartAttrs';
      result = {};
      for (attr in attrs) {
        val = attrs[attr];
        if ('data-e-' !== attr.slice(0, 7)) {
          continue;
        }
        result[attr.slice(7)] = val;
      }
      return result;
    };

    View$Base.prototype.T_page = function(attrs) {
      var d_load, f, name, view;
      f = 'T_page';
      if (this.frame_inx < this.frames.length) {
        d_load = E.oLoader.d_layout(name = this.frames[this.frame_inx++]);
        view = (this.frame_inx < this.frames.length ? 'Frame' : 'Layout') + '/' + name;
      } else {
        d_load = E.oLoader.d_page(name = this.page_name);
        view = 'Page/' + name;
      }
      return this.piece_handle(view, attrs != null ? attrs : {}, d_load);
    };

    View$Base.prototype.T_part = function(attrs) {
      var d_load, f, view;
      view = attrs.part;
      f = 'T_part:' + view;
      d_load = E.oLoader.d_part(view);
      return this.piece_handle('Part/' + view, attrs, d_load, true);
    };

    View$Base.prototype.piece_handle = function(view, attrs, obj, is_part) {
      var can_componentize, content, defer, f, result;
      f = 'piece_handle';
      if (obj != null ? obj.then : void 0) {
        return this.D_piece(view, attrs, obj, is_part);
      }
      content = obj.content, can_componentize = obj.can_componentize;
      this.P.push(this.loadPartAttrs(attrs));
      this.D.push([]);
      content = this.handleIt(content);
      defer = this.D.pop();
      if (can_componentize || attrs.dynamic || defer.length || !is_part) {
        if (defer.length && !can_componentize && !attrs.dynamic) {
          _log2("WARNING: DEFER logic in (" + view + "); wrapping DIV tag.");
        }
        result = this.wrap(view, attrs, content, defer, can_componentize);
      } else {
        _log2(f, 'defer NO!', view, defer);
        result = content;
      }
      return result;
    };

    View$Base.prototype.D_piece = function(view, attrs, d_load, is_part) {
      var d_result, f, saved_info, who,
        _this = this;
      f = 'D_piece';
      who = 'P';
      this.nest_up(who + view);
      saved_info = this.saveInfo();
      d_result = d_load.then(function(obj) {
        var result;
        try {
          if (obj != null ? obj.then : void 0) {
            BLOWUP();
          }
          _this.restoreInfo(saved_info);
          result = _this.piece_handle(view, attrs, obj, is_part);
          return result;
        } finally {
          _this.nest_dn(who + view);
        }
      }, function(err) {
        console.error('D_piece', err);
        _this.nest_dn(who + view + ' IN-ERROR');
        return _this._Err('tag', 'page/part', attrs, err);
        throw err;
      });
      return d_result;
    };

    View$Base.prototype.T_defer = function(attrs, content) {
      var ans, f, f_content, joiner, sep;
      f = 'Base:M/View.T_defer:';
      f_content = this.handleIt(content);
      if ('A' === E.type_oau(f_content)) {
        sep = '';
        ans = '';
        joiner = function(a) {
          var e, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            e = a[_i];
            if ('A' === E.type_oau(e)) {
              _results.push(joiner(e));
            } else {
              _results.push(ans += sep + e);
            }
          }
          return _results;
        };
        joiner(f_content);
        f_content = ans;
      }
      this.D[this.D.length - 1].push({
        attrs: attrs,
        func: new Function('element', 'isInit', 'context', 'attrs', f_content)
      });
      return '';
    };

    View$Base.prototype.T_if_true = function(attrs, content) {
      if (this.N[attrs.name]) {
        return this.handleIt(content());
      } else {
        return '';
      }
    };

    View$Base.prototype.T_if_false = function(attrs, content) {
      if (this.N[attrs.name]) {
        return '';
      } else {
        return this.handleIt(content);
      }
    };

    View$Base.prototype.T_if = function(attrs, content) {
      var is_true, issue, tbl, _ref, _ref1;
      issue = false;
      is_true = false;
      if ('val' in attrs) {
        if ('eq' in attrs) {
          if (attrs.val === attrs.eq) {
            is_true = true;
          }
        } else if ('ne' in attrs) {
          if (attrs.val !== attrs.ne) {
            is_true = true;
          }
        } else if ('gt' in attrs) {
          if (attrs.val > attrs.gt) {
            is_true = true;
          }
        } else if ('in_list' in attrs) {
          if (_ref = attrs.val, __indexOf.call(attrs.in_list.split(','), _ref) >= 0) {
            is_true = true;
          }
        } else if ('not_in_list' in attrs) {
          if (_ref1 = attrs.val, __indexOf.call(attrs.not_in_list.split(','), _ref1) < 0) {
            is_true = true;
          }
        } else {
          issue = true;
        }
      } else if ('set' in attrs) {
        is_true = attrs.set ? true : false;
      } else if ('not_set' in attrs) {
        is_true = attrs.not_set ? false : true;
      } else if ('table_is_empty' in attrs) {
        tbl = this._accessModelTable(attrs.table_is_empty, false);
        if (!tbl.length) {
          is_true = true;
        }
      } else if ('table_is_not_empty' in attrs) {
        tbl = this._accessModelTable(attrs.table_is_not_empty, false);
        if (tbl.length) {
          is_true = true;
        }
      } else {
        issue = true;
      }
      if (issue) {
        console.log('ISSUE T_if', attrs);
      }
      if ('name' in attrs) {
        this.N[attrs.name] = is_true;
      }
      if (is_true && content) {
        return this.handleIt(content);
      } else {
        return '';
      }
    };

    View$Base.prototype._accessModelTable = function(at_table, alias) {
      var lh, rh, rh_alias, root, tbl, _ref;
      _ref = at_table.split('/'), lh = _ref[0], rh = _ref[1];
      if (lh in this.R) {
        tbl = this.R[lh][rh];
        root = {
          p: lh
        };
      } else {
        tbl = E[lh](rh);
        root = {
          m: lh
        };
      }
      if (alias === false) {
        return tbl;
      }
      rh_alias = alias != null ? alias : rh;
      if (tbl.length === 0) {
        return [tbl, rh_alias];
      }
      root.o = rh;
      this.I[rh_alias] = root;
      return [tbl, rh_alias];
    };

    View$Base.prototype.T_foreach = function(attrs, content_f) {
      var count, f, limit, result, rh_alias, row, tbl, _i, _len, _ref;
      f = 'T_foreach';
      _ref = this._accessModelTable(attrs.table, attrs.alias), tbl = _ref[0], rh_alias = _ref[1];
      if (tbl.length === 0) {
        return '';
      }
      result = [];
      limit = 'limit' in attrs ? Number(attrs.limit) - 1 : tbl.length;
      for (count = _i = 0, _len = tbl.length; _i < _len; count = ++_i) {
        row = tbl[count];
        row = tbl[count];
        row._ = {
          count: count,
          first: count === 0,
          last: count === limit - 1,
          "break": false
        };
        this.R[rh_alias] = row;
        this.I[rh_alias].c = count;
        result.push(this.handleIt(content_f));
      }
      delete this.I[rh_alias];
      delete this.R[rh_alias];
      return result;
    };

    View$Base.prototype.T_fist = function(attrs, content_f) {
      var ans, content, f, fist, foreach_attrs, masterAlias, model, part, rh_1, rh_alias, subTable, table, tbl, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7,
        _this = this;
      f = 'T_fist';
      _log2(f, attrs, content_f);
      fist = E.fistDef[attrs.fist];
      model = (_ref = fist.event) != null ? _ref : 'Fist';
      table = attrs.fist + (attrs.row != null ? ':' + attrs.row : '');
      subTable = (_ref1 = (_ref2 = attrs.via) != null ? _ref2 : fist.via) != null ? _ref1 : 'Control';
      masterAlias = 'Fist';
      _ref3 = this._accessModelTable(model + '/' + table, masterAlias), tbl = _ref3[0], rh_alias = _ref3[1];
      _log2(f, 'tbl,rh_alias (master)', tbl, rh_alias);
      this.R[rh_alias] = tbl[0];
      this.I[rh_alias].c = 0;
      rh_1 = rh_alias;
      content = content_f ? content_f : (part = (_ref4 = (_ref5 = attrs.part) != null ? _ref5 : fist.part) != null ? _ref4 : 'fist_default', (_ref6 = attrs.part) != null ? _ref6 : attrs.part = (_ref7 = fist.part) != null ? _ref7 : 'fist_default', function() {
        return _this.kids([
          [
            'part', {
              part: part
            }
          ]
        ]);
      });
      foreach_attrs = {
        table: masterAlias + '/' + subTable
      };
      if (attrs.alias != null) {
        foreach_attrs.alias = attrs.alias;
      }
      ans = this.T_foreach(foreach_attrs, content);
      delete this.R[rh_1];
      delete this.I[rh_1];
      return ans;
    };

    View$Base.prototype.value = function(el) {
      if (el.value !== el.defaultValue) {
        return el.value = el.defaultValue;
      }
    };

    View$Base.prototype.A_at = function(orig_attrs) {
      var attrs, nm, parts, val, _results;
      attrs = E.merge({}, orig_attrs);
      _results = [];
      for (nm in attrs) {
        val = attrs[nm];
        if (!(nm[0] === 'e' && nm[2] === '-')) {
          continue;
        }
        parts = nm.split('-');
        _results.push(this['A_' + parts[0]](parts, val, attrs));
      }
      return _results;
    };

    View$Base.prototype.A_ea = function(parts, val, attrs) {
      var _ref, _ref1;
      if ((_ref = attrs.className) == null) {
        attrs.className = '';
      }
      return attrs.className += " " + ((_ref1 = parts[1]) != null ? _ref1 : 'click') + ":" + val;
    };

    View$Base.prototype.ex = function(el, isInit, ctx) {
      var attrs, d, e, f, ix, nm, p1, p2, val, _i, _ref, _ref1, _results;
      f = 'ex';
      attrs = el.attributes;
      _results = [];
      for (ix = _i = 0, _ref = attrs.length; 0 <= _ref ? _i < _ref : _i > _ref; ix = 0 <= _ref ? ++_i : --_i) {
        if (!('data-ex-' === attrs[ix].name.slice(0, 8))) {
          continue;
        }
        _ref1 = attrs[ix].name.split('-'), d = _ref1[0], e = _ref1[1], nm = _ref1[2], p1 = _ref1[3], p2 = _ref1[4];
        val = attrs[ix].value;
        _log2(f, attrs[ix].name, val, p1, p2);
        _results.push(this['A_ex_' + nm](el, isInit, ctx, val, p1, p2));
      }
      return _results;
    };

    View$Base.prototype.A_ex_value = function(el, isInit, ctx, val, p1, p2) {
      var f;
      f = 'A_ex_value';
      _log2(f, el.value, val, (el.value !== val ? 'CHANGE' : 'SAME'));
      if (el.value !== val) {
        return el.value = val;
      }
    };

    View$Base.prototype.A_ex_timeago = function(el, isInit, ctx, val, p1, p2) {
      var doIt, re_doIt, un_doIt;
      un_doIt = function() {
        if (ctx.timer) {
          clearInterval(ctx.timer);
          return delete ctx.timer;
        }
      };
      doIt = function() {
        return el.textContent = $.timeago(val);
      };
      re_doIt = function() {
        un_doIt();
        return ctx.timer = setInterval(doIt, 60000);
      };
      doIt();
      re_doIt();
      if (isInit) {
        return ctx.onunload = un_doIt;
      }
    };

    View$Base.prototype.A_ex_collapse = function(el, isInit, ctx, val, p1, p2) {
      var f, g, height, i, _ref;
      f = 'A_ex_collapse';
      _ref = val.split(':'), g = _ref[0], i = _ref[1];
      _log2(f, {
        g: g,
        i: i,
        sH: el.scrollHeight,
        g_row: (E.Tab(g))[0]
      });
      height = (E.Tab(g))[0][i] ? el.scrollHeight : 0;
      return el.style.height = (String(height)) + 'px';
    };

    return View$Base;

  })(E.ModelJS);

  E.Model.View$Base = View$Base;

}).call(this);

/*Base/Model/Fist.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var Fist,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Fist = (function(_super) {

    __extends(Fist, _super);

    function Fist(view_nm, options) {
      this.fist = {};
      Fist.__super__.constructor.call(this, view_nm, options);
    }

    Fist.prototype.eventLogout = function() {
      return true;
    };

    Fist.prototype.event = function(name, act, fistNm, fieldNm, p) {
      var f, field, fist, had_issue, invalidate, invalidate2, tmp_val, was_issue, was_val;
      f = 'event:' + act + '-' + fistNm + '/' + fieldNm;
      _log2(f, p);
      if (name !== 'Fist') {
        BLOWUP();
      }
      fist = this._getFist(fistNm, p.row);
      if (fieldNm) {
        field = fist.ht[fieldNm];
      }
      switch (act) {
        case 'keyup':
        case 'change':
          if (field.type === 'yesno') {
            if (p.val === field.cdata[0]) {
              p.val = field.cdata[1];
            } else {
              p.val = field.cdata[0];
            }
          }
          if (field.hval !== p.val) {
            had_issue = field.issue;
            field.hval = p.val;
            tmp_val = E.fistH2H(field, field.hval);
            E.fistVAL(field, tmp_val);
            if (act === 'change' || had_issue !== field.issue) {
              invalidate = true;
            }
          }
          break;
        case 'blur':
          was_val = field.hval;
          was_issue = field.issue;
          field.hval = E.fistH2H(field, field.hval);
          E.fistVAL(field, field.hval);
          _log2(f, 'invalidate?', was_val, field.hval, was_issue, field.issue);
          if (was_val !== field.hval || was_issue !== field.issue) {
            invalidate = true;
          }
          break;
        case 'focus':
          if (fist.fnm !== fieldNm) {
            fist.fnm = fieldNm;
          }
          break;
        default:
          return Fist.__super__.event.call(this, name, act, fistNm, fieldNm, p);
      }
      invalidate2 = this.confirm(fist, field, act);
      if (invalidate || invalidate2) {
        if (p.async !== true) {
          this.invalidateTables([fist.rnm]);
        } else {
          delete this.Table[fist.rnm];
        }
      }
    };

    Fist.prototype.confirm = function(fist, field, act) {
      var check, src, tar, tval, val, was_issue, was_val;
      if (!((field.confirm != null) || (field.confirm_src != null))) {
        return false;
      }
      tar = field.confirm_src != null ? field : fist.ht[field.confirm];
      src = fist.ht[tar.confirm_src];
      if (tar.issue != null) {
        if (src.issue != null) {
          delete src.issue;
          return true;
        }
        return false;
      }
      was_val = src.hval;
      if (was_val === '' && src.fieldNm !== field.fieldNm) {
        return false;
      }
      was_issue = src.issue;
      val = E.fistH2H(tar, was_val);
      tval = E.fistH2H(tar, tar.hval);
      if (val === tval) {
        delete src.issue;
      } else {
        check = 'FIELD_ISSUE' + (src.issue_text ? '_TEXT' : '');
        this._makeIssue(check, src);
      }
      return was_issue !== src.issue;
    };

    Fist.prototype._makeIssue = function(check, field) {
      var token, _ref;
      token = check;
      if ('A' !== E.type_oau(token)) {
        token = [token, field.nm, (_ref = field.label) != null ? _ref : field.nm, field.issue_text];
      }
      field.issue = new E.Issue(field.fistNm, field.nm);
      return field.issue.add(token[0], token.slice(1));
    };

    Fist.prototype.fistClear = function(fistNm, row) {
      var rnm;
      rnm = fistNm + (row ? ':' + row : '');
      return delete this.fist[rnm];
    };

    Fist.prototype.fistValidate = function(ctx, fistNm, row) {
      var ans, errors, f, field, fieldNm, fist, invalidate, nm, r, _ref, _ref1, _ref2;
      f = 'fistValidate:' + fistNm + (row != null ? ':' + row : '');
      _log2(f);
      r = ctx;
      fist = this._getFist(fistNm, row);
      errors = 0;
      _ref = fist.ht;
      for (fieldNm in _ref) {
        field = _ref[fieldNm];
        if (true !== E.fistVAL(field, field.hval)) {
          errors++;
        }
      }
      _ref1 = fist.ht;
      for (fieldNm in _ref1) {
        field = _ref1[fieldNm];
        if (field.confirm != null) {
          if (true === this.confirm(fist, field, 'fistValidate')) {
            errors++;
          }
        }
      }
      if (errors) {
        invalidate = true;
        r.fist$success = 'FAIL';
        r.fist$errors = errors;
      } else {
        r.fist$success = 'SUCCESS';
        ans = r[fist.nm] = {};
        _ref2 = fist.db;
        for (nm in _ref2) {
          field = _ref2[nm];
          ans[nm] = E.fistH2D(field, field.hval);
        }
      }
      _log2(f, 'result', r, ans);
      if (invalidate === true) {
        this.invalidateTables([fist.rnm]);
      }
    };

    Fist.prototype.loadTable = function(tbl_nm) {
      var Control, Field, any_req, baseFistNm, field, fieldNm, fist, ix, row, _i, _len, _ref, _ref1;
      _ref = tbl_nm.split(':'), baseFistNm = _ref[0], row = _ref[1];
      fist = this._getFist(baseFistNm, row);
      Field = {};
      Control = [];
      any_req = false;
      _ref1 = fist.sp.FIELDS;
      for (ix = _i = 0, _len = _ref1.length; _i < _len; ix = ++_i) {
        fieldNm = _ref1[ix];
        field = fist.ht[fieldNm];
        row = this._makeField(fist, field, ix, row);
        if (row.req) {
          any_req = true;
        }
        Field[fieldNm] = [row];
        Control.push(row);
      }
      return this.Table[tbl_nm] = [
        {
          Field: [Field],
          Control: Control,
          any_req: any_req
        }
      ];
    };

    Fist.prototype._makeField = function(fist, field, ix, row) {
      var choice_type, choices, defaults, f, fl, rows, s, _i, _ref, _ref1, _ref2;
      f = '_makeField';
      defaults = {
        is_first: ix === 0,
        focus: fist.fnm === field.nm,
        yes_val: 'X',
        req: false,
        "default": '',
        width: '',
        size: '',
        issue: '',
        value: '',
        selected: false,
        name: field.nm
      };
      fl = E.merge(defaults, field);
      _ref = fl.type.split(':'), fl.type = _ref[0], choice_type = _ref[1];
      fl.id = 'U' + E.nextCounter();
      fl.value = field.hval;
      if (fl.type === 'yesno') {
        if ((_ref1 = fl.cdata) == null) {
          fl.cdata = ['1', '0'];
        }
        fl.yes_val = String(fl.cdata[0]);
        if (fl.value === fl.yes_val) {
          fl.selected = true;
        } else {
          fl.value = fl.cdata[1];
        }
      }
      if (field.issue) {
        fl.issue = field.issue.asTable()[0].issue;
      }
      if (fl.type === 'radio' || fl.type === 'pulldown') {
        choices = this._getChoices(choice_type, fist, field, row);
        rows = [];
        s = '';
        for (ix = _i = 0, _ref2 = choices.options.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; ix = 0 <= _ref2 ? ++_i : --_i) {
          s = choices.values[ix] === (String(fl.value));
          rows.push({
            option: choices.options[ix],
            value: choices.values[ix],
            selected: s
          });
          fl.Choice = rows;
        }
      }
      return fl;
    };

    Fist.prototype._getFist = function(p_fist, p_row) {
      var db_value_hash, f, field, fieldNm, fist, nm, rec, rnm, _i, _len, _ref, _ref1, _ref2, _ref3;
      f = '_getFist:' + p_fist + (p_row != null ? ':' + p_row : '');
      rnm = p_fist + (p_row ? ':' + p_row : '');
      if (!(rnm in this.fist)) {
        fist = {
          rnm: rnm,
          nm: p_fist,
          row: p_row,
          ht: {},
          db: {},
          st: 'new',
          sp: E.fistDef[p_fist]
        };
        _log2(f, 'new fist', fist);
        E.option.fi1(fist);
        _ref = fist.sp.FIELDS;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fieldNm = _ref[_i];
          field = E.merge({}, E.fieldDef[fieldNm], {
            nm: fieldNm,
            fistNm: p_fist,
            row: p_row
          });
          field.h2h = (function() {
            switch (E.type_oau(field.h2h)) {
              case 'S':
                return field.h2h.split(/[:,]/);
              case 'A':
                return field.h2h;
              default:
                return [];
            }
          })();
          E.option.fi2(field, fist);
          fist.ht[fieldNm] = fist.db[field.db_nm] = field;
        }
        _ref1 = fist.ht;
        for (fieldNm in _ref1) {
          rec = _ref1[fieldNm];
          if (rec.confirm != null) {
            fist.ht[rec.confirm].confirm_src = fieldNm;
          }
        }
        this.fist[rnm] = fist;
      } else {
        fist = this.fist[rnm];
      }
      if (fist.st === 'new') {
        db_value_hash = (_ref2 = E[E.appFist(p_fist)]().fistGetValues(p_fist, p_row)) != null ? _ref2 : {};
        _ref3 = fist.db;
        for (nm in _ref3) {
          field = _ref3[nm];
          field.hval = E.fistD2H(field, db_value_hash[nm]);
        }
        fist.st = 'loaded';
      }
      return fist;
    };

    Fist.prototype._getChoices = function(type, fist, field) {
      var opt_col, options, rec, row, val_col, values, wistNm, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      options = [];
      values = [];
      switch (type) {
        case 'array':
          _ref = field.cdata;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            rec = _ref[_i];
            if (typeof rec === 'object') {
              options.push(String(rec[1]));
              values.push(String(rec[0]));
            } else {
              options.push(String(rec));
              values.push(String(rec));
            }
          }
          return {
            options: options,
            values: values
          };
        case 'wist':
          _ref1 = field.cdata.split(':'), wistNm = _ref1[0], val_col = _ref1[1], opt_col = _ref1[2];
          _ref2 = E.Wist(wistNm);
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            row = _ref2[_j];
            options.push(row[opt_col]);
            values.push(row[val_col]);
          }
          return {
            options: options,
            values: values
          };
        case 'custom':
          return E[E.appFist(fist.nm)]().fistGetChoices(fist.nm, field.nm, fist.row);
        default:
          return E.option.fi4(type, fist, field);
      }
    };

    return Fist;

  })(E.ModelJS);

  E.fistH2H = function(field, val) {
    var str, _i, _len, _ref;
    val = E.fistH2H$pre(field, val);
    _ref = field.h2h;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      str = _ref[_i];
      val = E['fistH2H$' + str](field, val);
    }
    return val;
  };

  E.fistH2H$pre = function(field, val) {
    return val;
  };

  E.fistH2D = function(field, val) {
    if (field.h2d) {
      return E['fistH2D$' + field.h2d](field, val);
    } else {
      return val;
    }
  };

  E.fistD2H = function(field, val) {
    var _ref;
    if (field.d2h) {
      return E['fistD2H$' + field.d2h](field, val);
    } else {
      return (_ref = val != null ? val : field["default"]) != null ? _ref : '';
    }
  };

  E.fistVAL = function(field, val) {
    var check, token, _ref, _ref1, _ref2;
    delete field.issue;
    check = true;
    E.option.fi3(field, val);
    if (val.length === 0) {
      if (field.req === true) {
        check = field.req_text ? ['FIELD_EMPTY_TEXT', field.nm, (_ref = field.label) != null ? _ref : field.nm, field.req_text] : ['FIELD_EMPTY', field.nm, (_ref1 = field.label) != null ? _ref1 : field.nm];
      }
    } else {
      if (field.validate) {
        check = E['fistVAL$' + field.validate](field, val);
        if (check === false) {
          check = 'FIELD_ISSUE' + (field.issue_text ? '_TEXT' : '');
        }
      }
    }
    if (check !== true) {
      token = check;
      if ('A' !== E.type_oau(token)) {
        token = [token, field.nm, (_ref2 = field.label) != null ? _ref2 : field.nm, field.issue_text];
      }
      field.issue = new E.Issue(field.fistNm, field.nm);
      field.issue.add(token[0], token.slice(1));
    }
    return check === true;
  };

  E.fistVAL$test = function(field, val) {
    var re;
    re = field.validate_expr;
    if (typeof re === 'string') {
      re = new RegExp(re);
    }
    return re.test(val);
  };

  E.Model.Fist$Base = Fist;

}).call(this);

/*Base/Model/Wist.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var Wist,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Wist = (function(_super) {

    __extends(Wist, _super);

    function Wist(view_nm, options) {
      Wist.__super__.constructor.call(this, view_nm, options);
      this.wist = {};
    }

    Wist.prototype.loadTable = function(tbl_nm) {
      var f;
      f = "Wist:loadTable:" + tbl_nm;
      _log2(f);
      return this.Table[tbl_nm] = (this._getWist(tbl_nm)).table;
    };

    Wist.prototype._getWist = function(wistNm) {
      var hash, nm, rec, table;
      if (!(wistNm in this.wist)) {
        E.option.w1(wistNm);
        hash = E.wistDef[wistNm];
        table = [];
        for (nm in hash) {
          rec = hash[nm];
          rec.token = String(nm);
          table.push(rec);
        }
        this.wist[wistNm] = {
          hash: hash,
          table: table
        };
      }
      return this.wist[wistNm];
    };

    return Wist;

  })(E.ModelJS);

  E.Model.Wist$Base = Wist;

}).call(this);

/*Base/Model/Tab.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var Tab,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tab = (function(_super) {

    __extends(Tab, _super);

    function Tab(view_nm, options) {
      Tab.__super__.constructor.call(this, view_nm, options);
      this.tabs = E.merge({
        Modal: {
          backdrop: false
        }
      }, options);
    }

    Tab.prototype.event = function(name, type, groupNm, itemNm, data) {
      var changed, f, group, _ref;
      f = 'event';
      _log2(f, {
        name: name,
        type: type,
        groupNm: groupNm,
        itemNm: itemNm,
        data: data
      });
      group = this._getTab(groupNm, itemNm);
      type = (_ref = group.TYPE) != null ? _ref : groupNm;
      switch (type.toUpperCase()) {
        case 'MODAL':
          changed = this._toggleModal(group, itemNm);
          break;
        case 'DROP':
        case 'COLLAPSE':
          changed = this._toggleDrop(group, itemNm);
          break;
        default:
          changed = this._setTab(group, itemNm);
      }
      if (changed) {
        return this.invalidateTables([groupNm]);
      }
    };

    Tab.prototype.action = function(ctx, act, p) {
      var change, group, groupNm, nm;
      switch (act) {
        case 'toggle':
          this.event('Tab', 'click', p.group, p.item, p);
          break;
        case 'clear_modal':
          groupNm = 'Modal';
          group = this._getTab(groupNm);
          change = false;
          for (nm in group) {
            if (nm !== 'backdrop' && group[nm] === true) {
              group.backdrop = group[nm] = false;
              change = true;
            }
          }
          if (change) {
            this.invalidateTables([groupNm]);
          }
          break;
        case 'clear_drop':
          groupNm = 'Drop';
          group = this._getTab(groupNm);
          change = false;
          for (nm in group) {
            if (group[nm] === true) {
              group[nm] = false;
              change = true;
            }
          }
          if (change) {
            this.invalidateTables([groupNm]);
          }
          break;
        case 'clear':
          this.event('Tab', 'click', p.group, '_CLEARED', p);
          break;
        default:
          return Tab.__super__.action.call(this, ctx, act, p);
      }
    };

    Tab.prototype.loadTable = function(tbl_nm) {
      var group;
      group = this._getTab(tbl_nm);
      return this.Table[tbl_nm] = [group];
    };

    Tab.prototype._getTab = function(groupNm, itemNm) {
      var _base, _base1, _ref, _ref1;
      if ((_ref = (_base = this.tabs)[groupNm]) == null) {
        _base[groupNm] = {};
      }
      if (itemNm != null) {
        if ((_ref1 = (_base1 = this.tabs[groupNm])[itemNm]) == null) {
          _base1[itemNm] = false;
        }
      }
      return this.tabs[groupNm];
    };

    Tab.prototype._toggleModal = function(group, itemNm) {
      var change, nm, now;
      if (itemNm === '_CLEARED') {
        change = false;
        for (nm in group) {
          if ((nm !== 'backdrop' && nm !== itemNm) && group[nm] === true) {
            change = true;
            group.backdrop = group[nm] = false;
          }
        }
      } else if (group[itemNm] !== true) {
        change = true;
        now = group.backdrop = group[itemNm] = true;
        for (nm in group) {
          if ((nm !== 'backdrop' && nm !== itemNm) && group[nm] === true) {
            group[nm] = false;
          }
        }
      }
      return change;
    };

    Tab.prototype._toggleDrop = function(group, itemNm) {
      var change, nm, now;
      if (itemNm === '_CLEARED') {
        change = false;
        for (nm in group) {
          if (nm !== itemNm && group[nm] === true) {
            change = true;
            group[nm] = false;
          }
        }
      } else {
        change = true;
        now = group[itemNm] = !group[itemNm];
        if (now === true) {
          for (nm in group) {
            if (nm !== itemNm && group[nm] === true) {
              group[nm] = false;
            }
          }
        }
      }
      return change;
    };

    Tab.prototype._setTab = function(group, itemNm) {
      var nm;
      if (group[itemNm] === true) {
        return false;
      }
      for (nm in group) {
        group[nm] = false;
      }
      group[itemNm] = true;
      return true;
    };

    return Tab;

  })(E.ModelJS);

  E.Model.Tab$Base = Tab;

}).call(this);

/*Base/Model/App.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var App$Base,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  App$Base = (function(_super) {

    __extends(App$Base, _super);

    function App$Base(view_nm, options) {
      var ss;
      ss = {
        f: null,
        t: null,
        s: null,
        sp: []
      };
      App$Base.__super__.constructor.call(this, view_nm, options, ss);
      this.clear();
    }

    App$Base.prototype.clear = function() {
      this.issues = new E.Issue(this.view_nm);
      this.messages = new E.Issue(this.view_nm);
      return this.invalidateTables(['Issue', 'Message']);
    };

    App$Base.prototype.goTo = function(flow, t, s) {
      var f, was;
      f = 'goTo';
      was = "" + this.f + "/" + this.t + "/" + this.s;
      this.f = flow;
      this.t = t;
      this.s = s;
      _log2(f, {
        was: was,
        is: "" + this.f + "/" + this.t + "/" + this.s
      });
      if (was !== ("" + this.f + "/" + this.t + "/" + this.s)) {
        return this.invalidateTables(['V']);
      }
    };

    App$Base.prototype.go = function(path) {
      var f, flow, s, t, _ref;
      f = 'go:' + path;
      _ref = path.split('/'), flow = _ref[0], t = _ref[1], s = _ref[2];
      if (!flow) {
        flow = this.f;
        if (!t) {
          t = this.t;
        }
      }
      E.option.ap1(path, flow, t, s);
      if (!t) {
        t = E.appStartT(flow);
      }
      if (!s) {
        s = E.appStartS(flow, t);
      }
      _log2(f, {
        flow: flow,
        t: t,
        s: s
      }, this.f, this.t, this.s);
      return this.goTo(flow, t, s);
    };

    App$Base.prototype.appGet = function(attr) {
      return E.appGetSetting(attr, this.f, this.t, this.s);
    };

    App$Base.prototype.getStepPath = function() {
      return [this.f, this.t, this.s];
    };

    App$Base.prototype.action = function(ctx, act, p) {
      var code, f, i, m, path, q, r, route, _ref;
      f = ":App.action:" + act;
      r = ctx.r, i = ctx.i, m = ctx.m;
      switch (act) {
        case 'path':
          return this.go(p.path);
        case 'push':
          return this.sp.push([this.f, this.t, this.s]);
        case 'pop':
          if (this.sp.length) {
            q = this.sp.pop();
            return this.goTo(q[0], q[1], q[2]);
          }
          break;
        case 'add_message':
          return m.add(p.type, p.msgs);
        case 'add_issue':
          return i.add(p.type, p.msgs);
        case 'clear':
          return this.clear();
        case 'route':
          path = E.appSearchAttr('route', p.route);
          if (path === false) {
            return r.success = 'FAIL';
          } else {
            this.goTo(path[0], path[1], path[2]);
            return r.success = 'SUCCESS';
          }
          break;
        case 'parse_hash':
          _ref = p.hash.split('~'), route = _ref[0], code = _ref[1];
          if (code != null) {
            return E.merge(r, {
              type: 'code',
              route: route,
              code: code
            });
          } else {
            path = E.appSearchAttr('route', route);
            if (path === false) {
              return r.success = 'FAIL';
            } else {
              return E.merge(r, {
                type: 'path',
                path: path.join('/')
              });
            }
          }
          break;
        default:
          return App$Base.__super__.action.call(this, ctx, act, p);
      }
    };

    App$Base.prototype.setIssues = function(issue_obj) {
      if ((issue_obj != null ? issue_obj.count() : void 0) !== 0) {
        this.issues.addObj(issue_obj);
      }
      return this.invalidateTables(['Issue']);
    };

    App$Base.prototype.setMessages = function(issue_obj) {
      if ((issue_obj != null ? issue_obj.count() : void 0) !== 0) {
        this.messages.addObj(issue_obj);
      }
      return this.invalidateTables(['Message']);
    };

    App$Base.prototype.loadTable = function(tbl_nm) {
      var map;
      map = E['issues$' + this.appGet('group')];
      this.Table[tbl_nm] = (function() {
        switch (tbl_nm) {
          case 'Message':
            return this.messages.asTable(map);
          case 'Issue':
            return this.issues.asTable(map);
          case 'V':
            return [E.appGetVars(this.f, this.t, this.s)];
          default:
            return App$Base.__super__.loadTable.call(this, tbl_nm);
        }
      }).call(this);
    };

    return App$Base;

  })(E.ModelJS);

  E.Model.App$Base = App$Base;

}).call(this);

/*Base/Extra/dataAction.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var dataAction,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  dataAction = function(type, data_action, data_params) {
    var action_specs, do_action, f, group, interesting, item, one_spec, prevent, spec_action, spec_type, _base, _i, _len, _ref;
    f = 'Base:E/dataAction:on[data-e-action]' + type;
    if (typeof (_base = E.option).activity === "function") {
      _base.activity(type);
    }
    action_specs = data_action.split(',');
    do_action = true;
    prevent = false;
    for (_i = 0, _len = action_specs.length; _i < _len; _i++) {
      one_spec = action_specs[_i];
      _ref = one_spec.split(':'), spec_type = _ref[0], spec_action = _ref[1], group = _ref[2], item = _ref[3], interesting = _ref[4];
      if (!spec_action) {
        spec_action = spec_type;
        spec_type = 'click';
      }
      if (spec_type === 'event') {
        E.event(spec_action, type, group, item, interesting, data_params);
      }
      if (do_action && spec_type === type) {
        if (spec_type === 'click') {
          prevent = true;
        }
        do_action = false;
        E.action(spec_action, data_params);
      }
    }
    return prevent;
  };

  E.Extra.dataAction$Base = dataAction;

  E.event = function(name, type, group, item, interesting, params) {
    var event_names, _ref;
    if (interesting !== 'all') {
      event_names = interesting.split('-');
      if (__indexOf.call(event_names, type) < 0) {
        return;
      }
    }
    if (name === 'Fist') {
      name = (_ref = E.fistDef[group].event) != null ? _ref : name;
    }
    return E[name]().event(name, type, group, item, params);
  };

}).call(this);

/*Base/Extra/LoadStrategy.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var LoadStrategy$Base;

  LoadStrategy$Base = (function() {

    function LoadStrategy$Base(appconfs) {
      var i;
      this.reverse_packages = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = _ref = appconfs.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
          _results.push(appconfs[i]);
        }
        return _results;
      })();
    }

    LoadStrategy$Base.prototype.getArtifact = function(nm, type) {
      var pkg, results, _i, _len, _ref, _ref1, _ref2, _ref3;
      results = false;
      _ref = this.reverse_packages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pkg = _ref[_i];
        results = (_ref1 = (_ref2 = E['view$' + pkg]) != null ? (_ref3 = _ref2[type]) != null ? _ref3[nm] : void 0 : void 0) != null ? _ref1 : false;
        if (results !== false) {
          break;
        }
      }
      if (results === false) {
        console.log('NO FILE FOUND! ' + nm);
      }
      return results;
    };

    LoadStrategy$Base.prototype.D_loadAsync = function() {
      var def;
      def = new m.Deferred();
      def.resolve();
      return def.promise;
    };

    LoadStrategy$Base.prototype.d_layout = function(nm) {
      return this.getArtifact(nm, 'Layout');
    };

    LoadStrategy$Base.prototype.d_page = function(nm) {
      return this.getArtifact(nm, 'Page');
    };

    LoadStrategy$Base.prototype.d_part = function(nm) {
      return this.getArtifact(nm, 'Part');
    };

    return LoadStrategy$Base;

  })();

  E.Extra.LoadStrategy$Base = LoadStrategy$Base;

  E.opt({
    loader: 'LoadStrategy$Base'
  });

}).call(this);

/*Base/Extra/RestAPI.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var RestAPI;

  RestAPI = (function() {

    function RestAPI(opts) {
      var nm, port, prefix, val, version;
      this.opts = {
        port: '',
        prefix: '',
        version: ''
      };
      for (nm in opts) {
        val = opts[nm];
        this.opts[nm] = val;
      }
      port = String(this.opts.port);
      if (port.length) {
        port = ':' + port;
      }
      if (this.opts.prefix.length) {
        prefix = '/' + this.opts.prefix;
      }
      if (this.opts.version.length) {
        version = '/' + this.opts.version;
      }
      this.route_prefix = "//" + this.opts.host + (port != null ? port : '') + (prefix != null ? prefix : '') + (version != null ? version : '') + "/";
      this.SetToken(false);
    }

    RestAPI.prototype.GetPrefix = function() {
      return this.route_prefix;
    };

    RestAPI.prototype.GetToken = function() {
      return this.token;
    };

    RestAPI.prototype.SetToken = function(token) {
      this.token = token;
    };

    RestAPI.prototype.D_Request = function(method, route, data, header_obj) {
      var status;
      status = {
        code: false,
        text: false,
        ok: false
      };
      return (m.request({
        background: true,
        method: method,
        url: this.route_prefix + route,
        data: data,
        config: function(xhr) {
          var nm, val, _ref;
          _ref = header_obj != null ? header_obj : {};
          for (nm in _ref) {
            val = _ref[nm];
            xhr.setRequestHeader(nm, val);
          }
        },
        unwrapSuccess: function(response) {
          return {
            status: status,
            data: response
          };
        },
        unwrapError: function(response) {
          return {
            status: status,
            data: response
          };
        },
        extract: function(xhr, options) {
          status.code = xhr.status;
          status.text = xhr.statusText;
          if (xhr.status === 200) {
            status.ok = true;
          }
          if (!xhr.responseText.length && xhr.readyState === 4) {
            status.text = 'NetworkError';
            return '{"error":"NETWORK_ERROR"}';
          }
          return xhr.responseText;
        }
      })).then(null, function(e_with_status_n_data) {
        return e_with_status_n_data;
      });
    };

    RestAPI.prototype.D_Get = function(route, data) {
      return this.D_RequestAuth('GET', route, data);
    };

    RestAPI.prototype.D_Post = function(route, data) {
      return this.D_RequestAuth('POST', route, data);
    };

    RestAPI.prototype.D_Del = function(route, data) {
      return this.D_RequestAuth('DEL', route, data);
    };

    RestAPI.prototype.D_Put = function(route, data) {
      return this.D_RequestAuth('PUT', route, data);
    };

    RestAPI.prototype.D_RequestAuth = function(method, route, data, header_obj) {
      var d, token,
        _this = this;
      token = this.GetToken();
      if (token === false) {
        setTimeout(function() {
          return E.action('Request.no_token');
        }, 0);
        d = new m.Deferred();
        d.resolve({
          status: {
            code: 401,
            text: 'NO_TOKEN',
            ok: false
          },
          data: {
            error: 'TOKEN'
          }
        });
        return d.promise;
      }
      if (header_obj == null) {
        header_obj = {};
      }
      header_obj.Authorization = "" + token.token_type + " " + token.access_token;
      return (this.D_Request(method, route, data, header_obj)).then(function(status_n_data) {
        if (status.code === 401) {
          setTimeout(function() {
            return E.action('Request.bad_token');
          }, 0);
          return {
            status: {
              code: 401,
              text: 'BAD_TOKEN',
              ok: false
            },
            data: {
              error: 'TOKEN'
            }
          };
        }
        return status_n_data;
      });
    };

    return RestAPI;

  })();

  E.Extra.RestAPI$Base = RestAPI;

}).call(this);

/*Base/Extra/RenderStrategy.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var ENTER_KEY, RenderStrategy$Base,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ENTER_KEY = 13;

  RenderStrategy$Base = (function() {

    function RenderStrategy$Base() {
      this.m_redraw = __bind(this.m_redraw, this);

      this.onPopState = __bind(this.onPopState, this);

      this.handleEvent = __bind(this.handleEvent, this);

      var baseDiv, modalDiv,
        _this = this;
      this.very_first = true;
      this.was_popped = false;
      this.was_modal = false;
      this.last_path = 'not_set';
      this.unloadMsgs = {};
      this.baseUrl = window.document.location.pathname;
      this.baseId = "epic-new-page";
      this.modalId = "epic-new-modal";
      baseDiv = document.createElement('div');
      baseDiv.id = this.baseId;
      document.body.appendChild(baseDiv);
      modalDiv = document.createElement('div');
      modalDiv.id = this.modalId;
      document.body.appendChild(modalDiv);
      setTimeout((function() {
        return _this.onPopState(true);
      }), 0);
      window.onpopstate = this.onPopState;
      this.redraw_guard = 0;
      m.redraw = this.m_redraw;
      this.init();
      true;
    }

    RenderStrategy$Base.prototype.handleEvent = function(event_obj) {
      var attrs, data_action, data_params, f, files, ix, nm, old_params, prevent, rec, target, type, val, _i, _ref, _ref1;
      f = 'on[data-e-action]';
      _log2(f, 'top', this.redraw_guard, (event_obj != null ? event_obj : window.event).type);
      if (event_obj == null) {
        event_obj = window.event;
      }
      type = event_obj.type;
      if (type === 'mousedown') {
        if (event_obj.which !== 1) {
          return;
        }
        type = 'click';
      }
      if (type === 'keyup' && event_obj.keyCode === 9) {
        return;
      }
      if (type === 'keyup' && event_obj.keyCode === ENTER_KEY) {
        type = 'enter';
      }
      target = event_obj.target;
      if (target === window) {
        return false;
      }
      while (target.tagName !== 'BODY' && !(data_action = target.getAttribute('data-e-action'))) {
        target = target.parentElement;
      }
      E.option.event(type, event_obj, target, data_action);
      if (!data_action) {
        return false;
      }
      data_params = {};
      attrs = target.attributes;
      for (ix = _i = 0, _ref = attrs.length; 0 <= _ref ? _i < _ref : _i > _ref; ix = 0 <= _ref ? ++_i : --_i) {
        if (!('data-e-' === attrs[ix].name.slice(0, 7))) {
          continue;
        }
        if ('action' === (nm = attrs[ix].name.slice(7))) {
          continue;
        }
        data_params[nm] = attrs[ix].value;
      }
      val = target.value;
      files = target.files;
      _log2(f, 'event', {
        type: type,
        data_action: data_action,
        data_params: data_params,
        val: val,
        files: files
      }, target);
      data_params.val = val;
      data_params._files = files;
      for (nm in event_obj) {
        val = event_obj[nm];
        if (nm === 'touches' || nm === 'changedTouches' || nm === 'targetTouches') {
          data_params[nm] = event_obj[nm];
        }
      }
      old_params = target.getAttribute('data-params');
      if (old_params) {
        _ref1 = JSON.parse(old_params);
        for (nm in _ref1) {
          rec = _ref1[nm];
          data_params[nm] = rec;
        }
      }
      prevent = E.Extra[E.option.dataAction](type, data_action, data_params);
      if (prevent) {
        event_obj.preventDefault();
      }
      return false;
    };

    RenderStrategy$Base.prototype.init = function() {
      var event_name, interesting, _i, _len, _results;
      interesting = ['mousedown', 'change', 'dblclick', 'keyup', 'blur', 'focus', 'touchstart', 'touchmove', 'touchend'];
      _results = [];
      for (_i = 0, _len = interesting.length; _i < _len; _i++) {
        event_name = interesting[_i];
        _results.push(document.body.addEventListener(event_name, this.handleEvent, true));
      }
      return _results;
    };

    RenderStrategy$Base.prototype.UnloadMessage = function(ix, msg) {
      var new_msg, nm, rec;
      if (msg) {
        this.unloadMsgs[ix] = msg;
      } else {
        delete this.unloadMsgs[ix];
      }
      new_msg = (function() {
        var _ref, _results;
        _ref = this.unloadMsgs;
        _results = [];
        for (nm in _ref) {
          rec = _ref[nm];
          _results.push(rec);
        }
        return _results;
      }).call(this);
      new_msg = new_msg.length ? new_msg.join("\n") : null;
      return window.onbeforeunload = function() {
        return new_msg;
      };
    };

    RenderStrategy$Base.prototype.onPopState = function(event) {
      var f;
      f = 'E:bootstrap.onPopState: ';
      _log2(f, {
        was_popped: this.was_popped,
        very_first: this.very_first
      }, true, {
        state: event === true ? 'X' : event.state
      });
      if (event === true || !event.state) {
        if (this.was_popped || !this.very_first) {
          return;
        }
      }
      this.was_popped = true;
      if (this.very_first) {
        E.action('browser_hash', {
          hash: location.hash.substr(1)
        });
      } else {
        if (event.state) {
          E.setModelState(event.state);
        }
        m.startComputation();
        m.endComputation();
      }
    };

    RenderStrategy$Base.prototype.m_redraw = function() {
      var f,
        _this = this;
      f = 'm_redraw';
      this.redraw_guard++;
      if (this.redraw_guard !== 1) {
        _log2(f, 'GUARD REDRAW', this.redraw_guard);
        return;
      }
      return E.View().run().then(function(modal_content) {
        var content, modal;
        modal = modal_content[0], content = modal_content[1];
        _log2('DEFER-R', 'RESULTS: modal, content', _this.redraw_guard, modal, content);
        _this.render(modal, content);
        _this.redraw_guard--;
        if (_this.redraw_guard !== 0) {
          _this.redraw_guard = 0;
          return setTimeout((function() {
            return _this.m_redraw();
          }), 16);
        }
      }).then(null, function(err) {
        return console.error('RenderStrategy$Base m_redraw', err);
      });
    };

    RenderStrategy$Base.prototype.render = function(modal, content) {
      var container, f, start;
      f = 'render';
      start = new Date().getTime();
      _log2(f, 'START RENDER', start, modal);
      if (modal) {
        m.render((container = document.getElementById(this.modalId)), content);
      } else {
        if (this.was_modal) {
          m.render(document.getElementById(this.modalId), []);
        }
        m.render((container = document.getElementById(this.baseId)), m('div', {}, content));
      }
      _log2(f, 'END RENDER', new Date().getTime() - start);
      if (!modal) {
        this.handleRenderState();
      }
      this.was_modal = modal;
      this.was_popped = false;
      this.very_first = false;
    };

    RenderStrategy$Base.prototype.handleRenderState = function() {
      var displayHash, f, history, model_state, new_hash, path, str_path, _base, _base1, _ref;
      path = E.App().getStepPath();
      str_path = path.join('/');
      history = str_path === this.last_path ? 'replace' : true;
      f = 'E:handleRenderState:' + history + ':' + str_path;
      _log2(f, {
        vf: this.very_first,
        wp: this.was_popped
      });
      if (!history) {
        return;
      }
      displayHash = '';
      new_hash = (_ref = E.appFindAttr(path[0], path[1], path[2], 'route')) != null ? _ref : false;
      if (new_hash !== false) {
        displayHash = new_hash;
      }
      model_state = E.getModelState();
      if (this.very_first || history === 'replace') {
        if (typeof (_base = window.history).replaceState === "function") {
          _base.replaceState(model_state, displayHash, '#' + displayHash);
        }
      } else if (!this.was_popped && history === true) {
        if (typeof (_base1 = window.history).pushState === "function") {
          _base1.pushState(model_state, displayHash, '#' + displayHash);
        }
        window.document.title = displayHash;
      }
      this.last_path = str_path;
    };

    return RenderStrategy$Base;

  })();

  E.Extra.RenderStrategy$Base = RenderStrategy$Base;

}).call(this);

E.view$Base={
Layout: {
"default":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([['page',{}]])}}}, Page: {
"default":{preloaded:1,can_componentize:true,defer:0,content:function(){return [{tag:'b',attrs:{},children:['A Base Page']}]}}}, Part: {
}};

/*Dev/app.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var err, warn,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  warn = function(str, o) {
    return console.warn("WARNING", str, o != null ? o : '');
  };

  err = function(str, o) {
    console.error("ERROR", str, o != null ? o : '');
    throw new Error("ERROR: " + str);
  };

  window.EpicMvc.app$Dev = {
    OPTIONS: {
      warn: warn,
      err: err,
      c1: function(inAction) {
        if (inAction !== false) {
          return warn("IN CLICK");
        }
      },
      a1: function(view_name, aModels) {
        if (view_name in aModels) {
          return;
        }
        err("Could not find model (" + view_name + ") in namespace E.Model", aModels);
      },
      a2: function(view_name, aModels, attribute) {
        if (attribute in aModels[view_name]) {
          return;
        }
        err("Could not find model (" + view_name + ") in namespace E.Model", aModels);
      },
      ap1: function(path, flow, t, s) {
        if ((path.replace(/[^\/]+/g, '')).length !== 2) {
          err("App 'path' (" + path + ") must have exactly two slashes");
        }
        if (!flow || !(flow in E.aFlows)) {
          err("App 'path' (" + path + ") did not result in a valid 'flow' (" + flow + ").", {
            path: path,
            flow: flow,
            t: t,
            s: s
          });
        }
        if (!t) {
          t = E.appStartT(flow);
        }
        if (!t || !(t in E.aFlows[flow].TRACKS)) {
          err("App 'path' (" + path + ") did not result in a valid 'track' (" + t + ").", {
            path: path,
            flow: flow,
            t: t,
            s: s
          });
        }
        if (!s) {
          s = E.appStartS(flow, t);
        }
        if (!s || !(s in E.aFlows[flow].TRACKS[t].STEPS)) {
          err("App 'path' (" + path + ") did not result in a valid 'step' (" + s + ").", {
            path: path,
            flow: flow,
            t: t,
            s: s
          });
        }
      },
      m1: function(view, model) {
        if (model["class"] in E.Model) {
          return;
        }
        err("Processing view (" + view + "), model-class (" + model["class"] + ") not in namespace E.Model", model);
      },
      m2: function(view_nm, act, parms) {
        err("Model (" + view_nm + ").action() didn't know action (" + act + ")");
      },
      m3: function(view_nm, tbl_nm, table) {
        if (tbl_nm in table) {
          return;
        }
        err("Model (" + view_nm + ").loadTable() didn't know table-name (" + tbl_nm + ")");
      },
      m4: function(view_nm, fistNm, row) {
        err("Model (" + view_nm + ").fistValidate() didn't know FIST (" + fistNm + ")");
      },
      m5: function(view_nm, fistNm, row) {
        err("Model (" + view_nm + ").fistGetValues() didn't know FIST (" + fistNm + ")");
      },
      m6: function(view_nm, fistNm, fieldNm, row) {
        err("Model (" + view_nm + ").fistGetChoices() did't know FIST-FIELD (" + fistNm + "-" + fieldNm + ")");
      },
      ca1: function(action_token, original_path, action_node) {
        if (action_node != null) {
          return;
        }
        warn("No app. entry for action_token (" + action_token + ") on path (" + original_path + ")");
      },
      ca2: function(action_token, original_path, nms, data, action_node) {
        var nm, _i, _len;
        for (_i = 0, _len = nms.length; _i < _len; _i++) {
          nm = nms[_i];
          if (!(nm in data)) {
            warn("Missing param (" + nm + ") for action (" + action_token + "), Path: " + original_path, {
              data: data,
              action_node: action_node
            });
          }
        }
      },
      ca3: function(action_token, original_path, action_node, aMacros) {
        if (action_node["do"] in aMacros) {
          return;
        }
        err("Missing (" + action_node["do"] + ") from MACROS; Action: (" + action_token + "), Path: (" + original_path + ")");
      },
      ca4: function(action_token, original_path, action_node, what) {
        if (action_node[what] in E.fistDef) {
          return;
        }
        err("Unknown Fist for '" + what + ":' " + action_node[what] + "); Action: (" + action_token + "), Path: (" + original_path + ")", {
          action_node: action_node
        });
      },
      fi1: function(fist) {
        var fieldNm, fistNm, model, _i, _len, _ref;
        fistNm = fist.nm;
        model = E.appFist(fistNm);
        if (!(model != null)) {
          err("FIST is missing: app.js requires MODELS: <model-name>: fists:[...,'" + fistNm + "']", {
            fist: fist
          });
        }
        if (!fist.sp.FIELDS) {
          err("FIELDS attribute missing from FIST definition");
        }
        _ref = fist.sp.FIELDS;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fieldNm = _ref[_i];
          if (!(fieldNm in E.fieldDef)) {
            err("No such FIELD (" + fieldNm + ") found for FIST (" + fistNm + ")", {
              fist: fist
            });
          }
        }
      },
      fi2: function(field, fist) {
        var attr, familiar_types, filt, filtList, filtNm, str, type, _i, _j, _len, _len1, _ref, _ref1, _ref2;
        str = "in FIELD (" + field.fieldNm + ") for FIST (" + field.fistNm + ")";
        _ref = ['h2h', 'd2h', 'h2d', 'validate'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attr = _ref[_i];
          if (!(attr in field)) {
            continue;
          }
          type = attr === 'validate' ? 'VAL' : attr.toUpperCase();
          filtList = attr === 'h2h' ? field[attr] : [field[attr]];
          for (_j = 0, _len1 = filtList.length; _j < _len1; _j++) {
            filtNm = filtList[_j];
            if (filtNm && !((filt = 'fist' + type + '$' + filtNm) in E)) {
              err("Missing Fist Filter (E." + filt + ") " + str, {
                field: field
              });
            }
          }
        }
        if (!('type' in field)) {
          err("'type' attribute missing " + str);
        }
        if (!('db_nm' in field)) {
          err("'db_nm' attribute missing " + str);
        }
        familiar_types = ['radio', 'pulldown', 'text', 'textarea', 'password', 'hidden', 'yesno'];
        if (_ref1 = (field.type.split(':'))[0], __indexOf.call(familiar_types, _ref1) < 0) {
          warn("Unfamiliar 'type' attribute " + str);
        }
        if (field.confirm != null) {
          if (_ref2 = field.confirm, __indexOf.call(fist.sp.FIELDS, _ref2) < 0) {
            err("Missing Confirm FIELD (" + field.confirm + ") in FIST FIELDS " + str);
          }
          if (!(field.confirm in E.fieldDef)) {
            err("No such Confirm FIELD (" + field.confirm + ") found " + str);
          }
        }
      },
      fi3: function(field, val) {
        if (val != null) {
          return;
        }
        warn("FIST field value is undefined in FIELD (" + field.fieldNm + ") for FIST (" + field.fistNm + ")", {
          field: field
        });
      },
      fi4: function(type, fist, field) {
        err("Unknown pulldown/radio option (" + type + ") in FIELD " + field.fieldNm + " for FIST " + field.fistNm + ".", {
          field: field
        });
      },
      v1: function(val, spec) {
        err("Unknown variable specification/filter (#" + spec + ")");
        return val != null ? val : '';
      },
      w1: function(wistNm) {
        if (wistNm in E.wistDef) {
          return;
        }
        err("Unknown Wist (" + wistNm + ").");
      }
    },
    SETTINGS: {
      frames: {
        MMM_Dev: 'bdevl'
      }
    },
    MODELS: {
      Devl: {
        "class": "Devl$Dev",
        inst: "iDev_Devl"
      },
      View: {
        "class": "View$Dev",
        inst: "iDev_View"
      }
    },
    ACTIONS: {
      dbg_toggle: {
        "do": 'Devl.toggle',
        pass: 'what'
      },
      dbg_refresh: {
        "do": 'Devl.clear_cache'
      },
      dbg_open_model: {
        "do": 'Devl.open_model',
        pass: 'name'
      },
      dbg_open_table: {
        "do": 'Devl.open_table',
        pass: 'name'
      },
      dbg_open_subtable: {
        "do": 'Devl.open_subtable',
        pass: 'name'
      },
      dbg_close_subtable: {
        "do": 'Devl.close_subtable'
      },
      dbg_table_left: {
        "do": 'Devl.table_left'
      },
      dbg_table_right: {
        "do": 'Devl.table_right'
      },
      dbg_table_col_set: {
        "do": 'Devl.table_col_set',
        pass: 'col'
      },
      dbg_table_by_row: {
        "do": 'Devl.table_row_set'
      }
    }
  };

}).call(this);

/*Dev/manifest.coffee*/// Generated by CoffeeScript 1.4.0
(function() {

  E.manifest$Dev = {
    Model: ['Devl', 'View'],
    Extra: ['ParseFile'],
    js: [],
    root: ['app']
  };

}).call(this);

/*Dev/Model/View.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = (function(_super) {

    __extends(View, _super);

    function View() {
      return View.__super__.constructor.apply(this, arguments);
    }

    View.prototype.run = function() {
      this.errors_cache = {
        _COUNT: 0
      };
      this.warn_cache = {};
      this.in_defer = false;
      return View.__super__.run.call(this);
    };

    View.prototype.Opts = function() {
      return E.Devl('Opts')[0];
    };

    View.prototype._Error = function(type, key, e) {
      var msg, prefix, _base, _ref;
      if ((_ref = (_base = this.errors_cache)[type]) == null) {
        _base[type] = {};
      }
      if (!(key in this.errors_cache[type])) {
        this.errors_cache[type][key] = e;
        this.errors_cache._COUNT++;
        if (this.errors_cache._COUNT < 5) {
          _log2('### _Error type/key/e', type, key, e);
          msg = ((("" + key + "\n\n" + e.message).replace(/&lt;/g, '<')).replace(/&gt;/g, '>')).replace(/&amp;/g, '&');
          prefix = type === 'v2' || type === 'v3' ? 'Variable reference' : 'Tag';
          return _log2("ERROR", "" + prefix + " error (" + type + "):\n\n" + msg);
        }
      }
    };

    View.prototype.invalidateTables = function(view_nm, tbl_list, deleted_tbl_nms) {
      if (deleted_tbl_nms.length) {
        E.Devl().tableChange(view_nm, tbl_list, deleted_tbl_nms);
      }
      return View.__super__.invalidateTables.call(this, view_nm, tbl_list, deleted_tbl_nms);
    };

    View.prototype.xT_defer = function(oPt) {
      var out;
      this.in_defer = true;
      out = View.__super__.xT_defer.call(this, oPt);
      this.in_defer = false;
      return out;
    };

    View.prototype.xT_debug = function(oPt) {
      var out, save;
      save = this.Opts;
      this.Opts = function() {
        return {};
      };
      out = this.viewExe.doAllParts(oPt.parts);
      this.Opts = save;
      return out;
    };

    View.prototype.my_accessModelTable = function(at_table, alias) {
      var err, i, i_info, k, lh, nm, rh, row, row_info, row_typ, _ref, _ref1;
      _ref = at_table.split('/'), lh = _ref[0], rh = _ref[1];
      if (lh in this.R) {
        row = this.R[lh];
        if (!(rh in row)) {
          row_info = (function() {
            switch (row_typ = E.type_oau(row)) {
              case 'O':
                row_info = ((function() {
                  var _results;
                  _results = [];
                  for (nm in row) {
                    _results.push(nm);
                  }
                  return _results;
                })()).join();
                if ('fieldNm' in row) {
                  return row_info += ' fieldNm:' + row.fieldNm;
                }
                break;
              default:
                return row_info = "Not a hash (" + row_typ + ")";
            }
          })();
          i = this.I[lh];
          i_info = '';
          _ref1 = {
            m: 'model',
            p: 'parent',
            c: 'count'
          };
          for (k in _ref1) {
            nm = _ref1[k];
            if (i[k] != null) {
              i_info += nm + ':' + i[k];
            }
          }
          err = "No such sub-table (" + rh + ") in (" + lh + ") R(" + row_info + ") I(" + i_info + "})";
          throw new Error(err);
        }
      } else if (!(lh in E)) {
        err = "No such Model (" + lh + ") for model/table (" + lh + "/" + rh + ")";
        throw new Error(err);
      }
    };

    View.prototype.xT_fist = function(oPt) {
      var c, g, inside, v, _ref, _ref1, _ref2;
      try {
        if (!oPt.attrs.form) {
          throw Error("Missing 'form' attribute");
        }
        g = this.Epic.getGroupNm();
        c = this.Epic.getFistGroupCache().getCanonicalFist(g, oPt.attrs.form);
        v = this.Epic.oAppConf.getFistView(g, c);
        if (!v) {
          throw Error("app.conf requires MODELS: ... forms=\"...," + c + "\"");
        }
        if (!('fistLoadData' in this.Epic.getInstance(v))) {
          throw Error("Your model (" + v + ") must have a method fistLoadData");
        }
      } catch (e) {
        _log2('##### Error in form-part', (_ref = oPt.attrs.part) != null ? _ref : 'fist_default', e, e.stack);
        this._Error('form', this._TagText(oPt, true), e);
        return this._Err('tag', 'fist', attrs, e);
      }
      try {
        inside = '';
        if (this.Opts().form === true) {
          return this._Div('tag', oPt, inside, View.__super__.xT_fist.call(this, oPt));
        }
        if (this.Opts().file === true) {
          return "<div class=\"dbg-part-box\" title=\"" + ((_ref1 = oPt.attrs.part) != null ? _ref1 : 'fist_default') + ".part.html (" + oPt.attrs.form + ")\">.</div>" + (View.__super__.xT_fist.call(this, oPt));
        }
        return View.__super__.xT_fist.call(this, oPt);
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in form-part', (_ref2 = oPt.attrs.part) != null ? _ref2 : 'fist_default', e, e.stack);
        this._Error('form_part', this._TagText(oPt, true), e);
        return this._Err('tag', 'fist', attrs, e);
      }
    };

    View.prototype.T_part = function(attrs) {
      try {
        if (this.Opts().file !== true) {
          return View.__super__.T_part.call(this, attrs);
        }
        return [
          m('div.dbg-part-box', {
            title: "Part/" + attrs.part + ".html"
          }, '.'), View.__super__.T_part.call(this, attrs)
        ];
      } catch (e) {
        _log2('##### Error in page-part', attrs.part, e);
        return m('pre', {}, ["<e-part part=\"Part/" + attrs.part + "\">", m('br'), e, m('br'), e.stack]);
      }
    };

    View.prototype.getLetTypPag = function() {
      var letter, nest, page, type;
      nest = this.frames.length - this.frame_inx;
      letter = (function() {
        switch (nest) {
          case 0:
            return 'P';
          case 1:
            return 'L';
          default:
            return 'F';
        }
      })();
      type = {
        P: 'Page',
        L: 'Layout',
        F: 'Frame'
      }[letter];
      page = (function() {
        switch (nest) {
          case 0:
            return this.page_name;
          default:
            return this.frames[this.frame_inx];
        }
      }).call(this);
      return [letter, type, page];
    };

    View.prototype.T_page = function(attrs) {
      var letter, page, type, _ref;
      try {
        if (this.Opts().file !== true) {
          return View.__super__.T_page.call(this, attrs);
        }
        _ref = this.getLetTypPag(), letter = _ref[0], type = _ref[1], page = _ref[2];
        return [
          {
            tag: 'div',
            attrs: {
              className: "dbg-part-box",
              title: "" + type + "/" + page + ".html"
            },
            children: letter
          }, View.__super__.T_page.call(this, attrs)
        ];
      } catch (e) {
        _log2('##### Error in T_page', attrs, e);
        this._Error('page', this._TagText({
          tag: 'page',
          attrs: attrs
        }, true), e);
        return this._Err('page', 'page', attrs, e);
      }
    };

    View.prototype.v3 = function(view_nm, tbl_nm, col_nm, format_spec, custom_spec, give_error) {
      var key, t_custom_spec, t_format_spec, val;
      try {
        val = View.__super__.v3.call(this, view_nm, tbl_nm, col_nm, format_spec, custom_spec);
        if (val === void 0) {
          t_format_spec = format_spec || custom_spec ? '#' + format_spec : '';
          t_custom_spec = custom_spec ? '#' + custom_spec : '';
          key = '&' + view_nm + '/' + tbl_nm + '/' + col_nm + t_format_spec + t_custom_spec + ';';
          if (!this.warn_cache[key]) {
            E.option.warn('v3', "Undefined result: (" + key + ").");
            this.warn_cache[key] = true;
          }
        }
      } catch (e) {
        t_format_spec = format_spec || custom_spec ? '#' + format_spec : '';
        t_custom_spec = custom_spec ? '#' + custom_spec : '';
        key = '&' + view_nm + '/' + tbl_nm + '/' + col_nm + t_format_spec + t_custom_spec + ';';
        _log2('##### Error in v3 key=', key, e);
        this._Error('v3', key, e);
        throw e;
      }
      return val;
    };

    View.prototype.v2 = function(tbl_nm, col_nm, format_spec, custom_spec, sub_nm, give_error) {
      var key, t_custom_spec, t_format_spec, val;
      if (!(tbl_nm in this.R)) {
        t_format_spec = format_spec || custom_spec ? '#' + format_spec : '';
        t_custom_spec = custom_spec ? '#' + custom_spec : '';
        key = '&' + tbl_nm + '/' + col_nm + t_format_spec + t_custom_spec + ';';
        throw new Error("No such Table (" + tbl_nm + ") evaluating " + key);
      }
      try {
        val = View.__super__.v2.call(this, tbl_nm, col_nm, format_spec, custom_spec, sub_nm);
      } catch (e) {
        _log2('##### v2', "&" + tbl_nm + "/" + col_nm + ";", e, e.stack);
        val = "&" + tbl_nm + "/" + col_nm + ";[" + e.message + "] <pre>" + e.stack + "</pre>";
      }
      if (val === void 0) {
        t_format_spec = format_spec || custom_spec ? '#' + format_spec : '';
        t_custom_spec = custom_spec ? '#' + custom_spec : '';
        key = '&' + tbl_nm + '/' + col_nm + t_format_spec + t_custom_spec + ';';
        if (!this.warn_cache[key]) {
          E.option.warn('v2', "Undefined result: (" + key + ").");
          this.warn_cache[key] = true;
        }
      }
      return val;
    };

    View.prototype.xT_if = function(oPt) {
      var inside;
      try {
        if (this.Opts().tag2 !== true || this.in_defer) {
          return View.__super__.xT_if.call(this, oPt);
        }
        inside = '';
        return this._Div('tag', oPt, inside, View.__super__.xT_if.call(this, oPt));
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        this._Error('if', this._TagText(oPt, true), e);
        return this._Err('tag', 'if', attrs, e);
      }
    };

    View.prototype.T_foreach = function(attrs, children) {
      var inside;
      try {
        if (!(attrs.table != null)) {
          throw new Error('Missing table="<model>/<table>"');
        }
        this.my_accessModelTable(attrs.table);
        if (this.Opts().tag !== true || this.in_defer) {
          return View.__super__.T_foreach.call(this, attrs, children);
        }
        /*
        			if tbl?.length
        				inside= ['len:'+tbl.length]
        				cols=( nm for nm of tbl[0 ])
        				inside.push m 'span', title: "#{cols.join ', '} Cols:#{cols.length}"
        			else inside='empty'
        */

        inside = '';
        return this._Div('tag', attrs, inside, View.__super__.T_foreach.call(this, attrs, children));
      } catch (e) {
        return this._Err('tag', 'foreach', attrs, e);
      }
    };

    View.prototype.T_fist = function(attrs, children) {
      try {
        return View.__super__.T_fist.call(this, attrs, children);
      } catch (e) {
        return this._Err('tag', 'fist', attrs, e);
      }
    };

    View.prototype.xT_explain = function(oPt) {
      return JSON.stringify(this.Epic.getViewTable(oPt.attrs.table));
    };

    View.prototype._TagText = function(tag, attrs, asError) {
      var attrs_array, key, letter, page, type, val, _ref;
      _ref = this.getLetTypPag(), letter = _ref[0], type = _ref[1], page = _ref[2];
      attrs_array = [];
      for (key in attrs) {
        val = attrs[key];
        attrs_array.push("" + key + "=\"" + val + "\"");
      }
      return "<e-" + tag + " " + (attrs_array.join(' ')) + ">";
    };

    View.prototype._Div = function(type, attrs, inside, after) {
      if (after == null) {
        after = '';
      }
      return [
        m('div', {
          className: "dbg-" + type + "-box"
        }, "" + (this._TagText(attrs)) + inside), after
      ];
    };

    View.prototype._Err = function(type, tag, attrs, e) {
      var stack, title;
      _log2('### _Err type/tag/attrs/e', type, tag, attrs, {
        e: e,
        m: e.message,
        s: e.stack
      }, (e.stack.split('\n'))[1]);
      title = (e.stack.split('\n'))[1];
      stack = this.Opts().stack ? m('pre', {}, "\n" + e.stack) : title;
      return {
        tag: 'div',
        attrs: {
          className: "dbg-" + type + "-error-box clearLeft"
        },
        children: [
          this._TagText(tag, attrs, true), m('br'), m('div', {
            className: "dbg-" + type + "-error-msg",
            title: e.stack
          }, e.message), stack
        ]
      };
    };

    return View;

  })(E.Model.View$Base);

  E.Model.View$Dev = View;

}).call(this);

/*Dev/Model/Devl.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  var Devl,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Devl = (function(_super) {

    __extends(Devl, _super);

    function Devl(view_nm, options) {
      Devl.__super__.constructor.call(this, view_nm, options);
      this.opts = {
        file: false,
        tag: false,
        tag2: false,
        form: false,
        model: false,
        stack: false
      };
      this.open_model = '';
      this.open_table = '';
      this.open_table_stack = [];
      this.table_row_cnt = 0;
      this.table_by_col = false;
      this.table_col = false;
      this.timer = false;
    }

    Devl.prototype.tableChange = function(view_nm, tbls) {
      var _this = this;
      if (view_nm === this.view_nm) {
        return;
      }
      if (this.timer !== false) {
        return;
      }
      return this.timer = setTimeout((function() {
        _this.timer = false;
        return _this.invalidateTables(['Model']);
      }), 10);
    };

    Devl.prototype.action = function(ctx, act, p) {
      var dummy, f, incr, _ref;
      f = 'dM:Devl(' + act + ')';
      switch (act) {
        case 'toggle':
          return this.opts[p.what] = !this.opts[p.what];
        case 'clear_cache':
          return E.oLoader.clearCache();
        case 'open_model':
          if (this.open_model !== p.name) {
            this.open_model = p.name;
            this.open_table = '';
            this.open_table_stack = [];
          } else {
            this.open_model = '';
          }
          return this.invalidateTables(['Model']);
        case 'close_subtable':
          if (!this.open_table_stack.length) {
            return;
          }
          _ref = this.open_table_stack.pop(), dummy = _ref[0], this.table_row_cnt = _ref[1], this.table_by_col = _ref[2], this.table_col = _ref[3];
          return this.invalidateTables(['Model']);
        case 'open_subtable':
          this.open_table_stack.push([p.name, this.table_row_cnt, this.table_by_col, this.table_col]);
          this.table_row_cnt = 0;
          this.table_by_col = false;
          this.table_col = false;
          return this.invalidateTables(['Model']);
        case 'open_table':
          if (this.open_table !== p.name) {
            this.table_row_cnt = 0;
            this.table_by_col = false;
            this.table_col = false;
            this.open_table = p.name;
            this.open_table_stack = [];
          } else {
            this.open_table = '';
          }
          return this.invalidateTables(['Model']);
        case 'table_row_set':
          this.table_by_col = false;
          if (p.row != null) {
            this.table_row_cnt = p.row;
          }
          return this.invalidateTables(['Model']);
        case 'table_col_set':
          this.table_col = p.col;
          this.table_by_col = true;
          return this.invalidateTables(['Model']);
        case 'table_left':
        case 'table_right':
          incr = act === 'table_left' ? -1 : 1;
          _log2(f, act, incr, this.table_row_cnt);
          this.table_row_cnt += incr;
          return this.invalidateTables(['Model']);
        default:
          return Devl.__super__.action.call(this, ctx, act, p);
      }
    };

    Devl.prototype.loadTable = function(tbl_nm) {
      var cols, f, inst, is_sub, len, nm, open, rcol, rec, rec_s, row, row_inx, rrow, rval, sub_tnm, table, tnm, tnm_s, tref, trow, _i, _len, _ref, _ref1;
      f = 'dM:Devl.loadTable(' + tbl_nm + ')';
      switch (tbl_nm) {
        case 'Opts':
          return this.Table[tbl_nm] = [this.opts];
        case 'Model':
          table = [];
          for (inst in E.oModel) {
            nm = E.oModel[inst].view_nm;
            if (nm === this.view_nm) {
              continue;
            }
            row = E.merge({
              is_open: '',
              Table: []
            }, {
              inst: inst,
              name: nm
            });
            if (nm === this.open_model) {
              row.is_open = 'yes';
            }
            _ref = E.oModel[inst].Table;
            for (tnm in _ref) {
              rec = _ref[tnm];
              tnm_s = tnm;
              rec_s = rec;
              open = false;
              is_sub = false;
              if (row.is_open === 'yes' && tnm === this.open_table) {
                open = true;
                if (this.open_table_stack.length) {
                  _ref1 = this.open_table_stack;
                  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                    tref = _ref1[_i];
                    sub_tnm = tref[0], row_inx = tref[1];
                    if (!(row_inx in rec_s) || !(sub_tnm in rec_s[row_inx])) {
                      break;
                    }
                    is_sub = true;
                    rec_s = rec_s[row_inx][sub_tnm];
                    tnm_s += ',' + sub_tnm;
                  }
                }
              }
              len = rec_s.length;
              trow = {
                is_open: open,
                is_sub: is_sub,
                name: tnm_s,
                rows: len,
                Cols: [],
                row_cnt: 0,
                col: '',
                curr_col: this.table_col,
                by_col: this.table_by_col
              };
              if (open) {
                if (this.table_row_cnt < 0) {
                  this.table_row_cnt = len - 1;
                }
                if (this.table_row_cnt > len - 1) {
                  this.table_row_cnt = 0;
                }
                trow.row_cnt = this.table_row_cnt;
              }
              if (len) {
                cols = (function() {
                  var _results;
                  _results = [];
                  for (rcol in rec_s[0]) {
                    _results.push(rcol);
                  }
                  return _results;
                })();
              } else {
                cols = [];
              }
              trow.cols = len ? cols.join(', ') : 'no rows';
              if (len && open) {
                if (!this.table_by_col) {
                  trow.Cols = (function() {
                    var _ref2, _results;
                    _ref2 = rec_s[this.table_row_cnt];
                    _results = [];
                    for (rcol in _ref2) {
                      rval = _ref2[rcol];
                      _results.push({
                        type: (rval === null ? 'Null' : typeof rval),
                        col_ix: cols.indexOf(rcol),
                        col: rcol,
                        len: rval != null ? rval.length : void 0,
                        val: rval != null ? rval : '???'
                      });
                    }
                    return _results;
                  }).call(this);
                } else {
                  trow.Rows = (function() {
                    var _ref2, _ref3, _results;
                    _results = [];
                    for (rrow in rec_s) {
                      _results.push({
                        row: rrow,
                        len: (_ref2 = rec_s[rrow][this.table_col]) != null ? _ref2.length : void 0,
                        type: (rec_s[rrow][this.table_col] === null ? 'Null' : typeof rec_s[rrow][this.table_col]),
                        val: (_ref3 = rec_s[rrow][this.table_col]) != null ? _ref3 : '???'
                      });
                    }
                    return _results;
                  }).call(this);
                }
              }
              row.Table.push(trow);
            }
            row.tables = row.Table.length;
            table.push(row);
            table.sort(function(a, b) {
              if (a.inst === b.inst) {
                return 0;
              } else if (a.inst > b.inst) {
                return 1;
              } else {
                return -1;
              }
            });
          }
          _log2(f, 'final', table);
          return this.Table[tbl_nm] = table;
        default:
          return Devl.__super__.loadTable.call(this, tbl_nm);
      }
    };

    return Devl;

  })(E.ModelJS);

  E.Model.Devl$Dev = Devl;

}).call(this);

/*Dev/Extra/ParseFile.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var E, FindAttrVal, FindAttrs, ParseFile, camelCase, doError, entities, findStyleVal, findStyles, findVars, mkNm, mkObj, nm_map, sq, _log2,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  E = {};

  _log2 = function() {};

  camelCase = function(input) {
    return input.toLowerCase().replace(/-(.)/g, function(match, group1) {
      return group1.toUpperCase();
    });
  };

  mkNm = function(nm) {
    if (nm.match(/^[a-zA-Z_]*$/)) {
      return nm;
    } else {
      return sq(nm);
    }
  };

  mkObj = function(obj) {
    var nm, val;
    return '{' + ((function() {
      var _results;
      _results = [];
      for (nm in obj) {
        val = obj[nm];
        _results.push((mkNm(nm)) + ':' + val);
      }
      return _results;
    })()).join() + '}';
  };

  sq = function(text) {
    return "'" + (text.replace(/'/gm, '\\\'')).replace(/\r?\n/gm, '\\n') + "'";
  };

  findStyleVal = function(i, a) {
    var nm, p, parts, s, start, str, top;
    s = 'findStyleVal:';
    top = i;
    start = i;
    while (i < a.length) {
      if ((p = a[i++].trim()) !== '') {
        break;
      }
    }
    if (p === '') {
      return [false];
    }
    if (!(i < a.length)) {
      return [s + 'name', start, i];
    }
    nm = camelCase(p);
    start = i;
    while (i < a.length) {
      if ((p = a[i++].trim()) !== '') {
        break;
      }
    }
    if (!(i < a.length && p === ':')) {
      return [s + 'colon', start, i, nm];
    }
    start = i;
    parts = [];
    while (i < a.length) {
      if ((p = a[i++]) === ';') {
        break;
      }
      parts.push(p);
    }
    if (!(p === ';' || i >= a.length)) {
      return [s + 'semi-colon', start, i, nm];
    }
    str = (parts.join('')).trim();
    return [true, top, i, nm, str];
  };

  findStyles = function(file_info, parts) {
    var good, i, nm, start, str, styles, _ref;
    styles = {};
    i = 0;
    while (i < parts.length) {
      _ref = findStyleVal(i, parts), good = _ref[0], start = _ref[1], i = _ref[2], nm = _ref[3], str = _ref[4];
      if (good === false) {
        break;
      }
      if (good !== true) {
        console.error('STYLE-ERROR - parse:', {
          file_info: file_info,
          parts: parts,
          good: good,
          start: start,
          i: i,
          nm: nm,
          str: str
        });
        continue;
      }
      styles[nm] = (findVars(str)).join('+');
    }
    return styles;
  };

  nm_map = {
    'class': 'className',
    'for': 'htmlFor',
    defaultvalue: 'defaultValue',
    defaultchecked: 'defaultChecked',
    colspan: 'colSpan',
    cellpadding: 'cellPadding',
    cellspacing: 'cellSpacing',
    maxlength: 'maxLength',
    tabindex: 'tabIndex'
  };

  FindAttrVal = function(i, a) {
    var nm, p, parts, quo, start, top, _ref;
    top = start = i;
    while (i < a.length) {
      if ((p = a[i++].trim()) !== '') {
        break;
      }
    }
    if (!(i < a.length)) {
      return [false];
    }
    if (p === '') {
      return ['attr-name', start, i];
    }
    p.toLowerCase();
    nm = (_ref = nm_map[p]) != null ? _ref : p;
    start = i;
    while (i < a.length) {
      if ((p = a[i++].trim()) !== '') {
        break;
      }
    }
    if (p !== '=') {
      if (nm === 'selected' || nm === 'autofocus') {
        return [true, start, i - 1, nm, '=', '"', ['false']];
      }
      return ['equals', start, i, nm];
    }
    start = i;
    while (i < a.length) {
      if ((p = a[i++].trim()) !== '') {
        break;
      }
    }
    if (!(p === '"' || p === "'")) {
      return ['open-quote', start, i, nm, '='];
    }
    quo = p;
    start = i;
    parts = [];
    while (i < a.length) {
      if ((p = a[i++]) === quo) {
        break;
      }
      parts.push(p);
    }
    if (p !== quo) {
      return ['close-quote', start, i, nm, '=', quo];
    }
    return [true, top, i, nm, '=', quo, parts];
  };

  FindAttrs = function(file_info, str) {
    var attr_obj, attr_split, attrs_need_cleaning, className, data_e_action, empty, eq, event_attrs_shortcuts, f, good, grp, i, nm, pane, parts, quo, start, style_obj, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
    f = ':parse.FindAttrs:';
    event_attrs_shortcuts = ['data-e-click', 'data-e-change', 'data-e-dblclick', 'data-e-enter', 'data-e-keyup', 'data-e-focus', 'data-e-blur', 'data-e-event'];
    str = ' ' + str;
    str = str.replace(/\se-/gm, ' data-e-');
    str = str.replace(/\sex-/gm, ' data-ex-');
    attr_split = str.trim().split(/([\s="':;])/);
    empty = attr_split[attr_split.length - 1] === '/' ? '/' : '';
    attrs_need_cleaning = false;
    if (empty === '/') {
      attr_split.pop();
    }
    attr_obj = {};
    className = [];
    data_e_action = [];
    i = 0;
    while (i < attr_split.length) {
      _ref = FindAttrVal(i, attr_split), good = _ref[0], start = _ref[1], i = _ref[2], nm = _ref[3], eq = _ref[4], quo = _ref[5], parts = _ref[6];
      if (good === false) {
        break;
      }
      if (good !== true) {
        console.error('ERROR - parse:', {
          file_info: file_info,
          good: good,
          start: start,
          i: i,
          nm: nm,
          eq: eq,
          quo: quo,
          parts: parts,
          str: str
        });
        continue;
      }
      if (__indexOf.call(event_attrs_shortcuts, nm) >= 0) {
        data_e_action.push((nm.slice(7)) + ':' + parts.join(''));
        continue;
      }
      if (nm === 'data-e-action') {
        data_e_action.push(parts.join(''));
        continue;
      }
      if (nm === 'config') {
        attr_obj[nm] = parts.join('');
        continue;
      }
      if (nm === 'style') {
        style_obj = findStyles(file_info, parts);
        attr_obj[nm] = mkObj(style_obj);
        continue;
      }
      if (nm === 'data-e-tab') {
        _ref1 = (parts.join('')).split(':'), grp = _ref1[0], pane = _ref1[1];
        className.push("&Tab/" + grp + "/" + pane + "#?active;");
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click");
        continue;
      }
      if (nm === 'data-e-tab-pane') {
        _ref2 = (parts.join('')).split(':'), grp = _ref2[0], pane = _ref2[1];
        className.push("&Tab/" + grp + "/" + pane + "#?active;");
        continue;
      }
      if (nm === 'data-e-collapse') {
        _ref3 = (parts.join('')).split(':'), grp = _ref3[0], pane = _ref3[1];
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click");
        continue;
      }
      if (nm === 'data-e-collapse-pane') {
        _ref4 = (parts.join('')).split(':'), grp = _ref4[0], pane = _ref4[1];
        className.push("&Tab/" + grp + "/" + pane + "#?in;");
        attr_obj['data-ex-collapse'] = "'" + grp + ":" + pane + "'";
        attr_obj.config = 'oE.ex';
        continue;
      }
      if (nm === 'data-e-drop-pane') {
        _ref5 = ['Drop', parts.join('')], grp = _ref5[0], pane = _ref5[1];
        className.push("&Tab/" + grp + "/" + pane + "#?open;");
      }
      if (nm === 'data-e-drop') {
        _ref6 = ['Drop', parts.join('')], grp = _ref6[0], pane = _ref6[1];
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click-enter");
        continue;
      }
      if (nm === 'data-e-modal-pane') {
        _ref7 = ['Modal', parts.join('')], grp = _ref7[0], pane = _ref7[1];
        className.push("&Tab/" + grp + "/" + pane + "#?in?hide;");
      }
      if (nm === 'data-e-modal') {
        _ref8 = ['Modal', parts.join('')], grp = _ref8[0], pane = _ref8[1];
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click-enter");
        continue;
      }
      if ('data-ex-' === nm.slice(0, 8)) {
        attr_obj.config = 'oE.ex';
      }
      if (nm === 'className') {
        className.push(parts.join(''));
        continue;
      }
      if (nm[0] === '?') {
        attrs_need_cleaning = true;
      }
      attr_obj[nm] = (findVars(parts.join(''))).join('+');
    }
    if (className.length) {
      attr_obj.className = (findVars(className.join(' '))).join('+');
    }
    if (data_e_action.length) {
      attr_obj['data-e-action'] = (findVars(data_e_action.join())).join('+');
    }
    return [mkObj(attr_obj), empty, attrs_need_cleaning];
  };

  entities = function(text) {
    var dom_entity_map;
    dom_entity_map = {
      nbsp: '\u00A0',
      reg: '\u00AE',
      copy: '\u00A9',
      times: '\u22A0',
      lt: '\u003C',
      gt: '\u003E',
      amp: '\u0026',
      quot: '\u0022'
    };
    return text = text.replace(/&([a-z]+);/gm, function(m, p1) {
      if (p1 in dom_entity_map) {
        return dom_entity_map[p1];
      } else {
        return '&' + p1 + 'BROKEN;';
      }
    });
  };

  findVars = function(text) {
    var ans, args, custom_hash_part, hash_part, i, last, parts, results, _ref;
    parts = text.split(/&([a-zA-Z0-9_]+\/[^;]{1,60});?/gm);
    results = [];
    if (parts.length === 1) {
      return [entities(sq(parts[0]))];
    }
    i = 0;
    while (i < parts.length - 1) {
      if (parts[i].length) {
        results.push(entities(sq(parts[i])));
      }
      args = parts[i + 1].split('/');
      last = args.length - 1;
      if (last !== 1 && last !== 2) {
        console.error('ERROR VarGet:', parts[i + 1]);
        continue;
      }
      _ref = args[last].split('#'), args[last] = _ref[0], hash_part = _ref[1], custom_hash_part = _ref[2];
      ans = last === 1 ? "oE.v2(" + (sq(args[0])) + "," + (sq(args[1])) : "oE.v3(" + (sq(args[0])) + "," + (sq(args[1])) + "," + (sq(args[2]));
      if (hash_part) {
        ans += "," + (sq(hash_part));
      } else {
        if (custom_hash_part) {
          ans += ",''," + (sq(custom_hash_part));
        }
      }
      ans += ')';
      results.push(ans);
      i += 2;
    }
    if (parts[parts.length - 1]) {
      results.push(entities(sq(parts[parts.length - 1])));
    }
    return results;
  };

  doError = function(file_stats, text) {
    console.error('ERROR', file_stats, text);
    throw Error(text + ' in ' + file_stats);
  };

  ParseFile = function(file_stats, file_contents) {
    var T_EPIC, T_M1, T_M2, T_STYLE, T_TEXT, after, after_comment, after_script, attr_clean, attrs, base_nm, children, content, counter, doChildren, dom_close, dom_nms, dom_pre_tags, empty, etags, f, flavor, i, nextCounter, oi, parts, pre_count, prev_children, stats, t, tag_names_for_debugger, tag_wait, text, whole_tag, _ref, _ref1;
    f = ':Dev.E/ParseFile.ParseFile~' + file_stats;
    counter = 0;
    nextCounter = function() {
      return ++counter;
    };
    etags = ['page', 'part', 'if', 'if_true', 'if_false', 'foreach', 'fist', 'defer', 'comment'];
    T_EPIC = 0;
    T_M1 = 1;
    T_M2 = 2;
    T_STYLE = 3;
    T_TEXT = 4;
    stats = {
      text: 0,
      dom: 0,
      epic: 0,
      defer: 0
    };
    dom_pre_tags = ['pre', 'code'];
    dom_nms = ['style', 'section', 'header', 'nav', 'article', 'aside', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'address', 'main', 'hgroup', 'div', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr', 'ins', 'del', 'img', 'iframe', 'embed', 'oject', 'param', 'video', 'audio', 'source', 'track', 'canvas', 'map', 'area', 'svg', 'math', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col', 'form', 'fieldset', 'legend', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'keygen', 'output', 'progress', 'meter', 'details', 'summary', 'menuitem', 'menu'];
    dom_close = ['img', 'br', 'input', 'hr'];
    after_comment = file_contents.replace(/-->/gm, '\x02').replace(/<!--[^\x02]*\x02/gm, function(m) {
      return m.replace(/[^\n]+/gm, '');
    });
    after_script = after_comment.replace(/<\/script>/gm, '\x02').replace(/<script[^\x02]*\x02/gm, '');
    after = after_script;
    after = after.replace(/<epic:/g, '<e-');
    after = after.replace(/<\/epic:/g, '</e-');
    after = after.replace(/<e-page_part/g, '<e-part');
    after = after.replace(/<e-form_part/g, '<e-fist');
    after = after.replace(/<e-dyno_form/g, '<e-fist');
    after = after.replace(/form="/g, 'fist="');
    after = after.replace(/\sp:/g, ' e-');
    after = after.replace(/Tag\/If/g, 'View/If');
    after = after.replace(/Tag\/Part/g, 'View/Part');
    after = after.replace(/\ size="/g, ' ?size="');
    after = after.replace(/data-action=/g, 'e-action=');
    after = after.replace(/Pageflow\//g, 'App/');
    after = after.replace(/\saction=/g, ' e-action=');
    after = after.replace(/e-link_action/g, 'a');
    after = after.replace(/e-form_action/g, 'button');
    after = after.replace(/(&(?:[^\/;#]+\/){1,2}[^\/;#]+#)[.]/g, '$1?');
    parts = after.split(/<(\/?)([:a-z_0-9-]+)([^>]*)>/);
    pre_count = 0;
    i = 0;
    tag_wait = [];
    children = [];
    while (i < parts.length - 1) {
      if (tag_wait.length && tag_wait[tag_wait.length - 1][1] === 'defer') {
        children.push([T_TEXT, (findVars(parts[i])).join('+')]);
      } else {
        text = parts[i];
        if (pre_count === 0) {
          text = text.replace(/^\s+|\s+$/gm, ' ');
        }
        if (text.length && text !== ' ' && text !== '  ') {
          if (tag_wait.length) {
            children.push([T_TEXT, (findVars(text)).join('+')]);
          } else {
            children.push([T_M1, 'span', {}, (findVars(text)).join('+')]);
          }
          if (!tag_wait.length) {
            stats.text++;
          }
        }
      }
      if (parts[i + 1] === '/') {
        if (!tag_wait.length) {
          doError(file_stats, "Close tag found when none expected close=" + parts[i + 2]);
        }
        _ref = tag_wait.pop(), oi = _ref[0], base_nm = _ref[1], attrs = _ref[2], prev_children = _ref[3], flavor = _ref[4];
        if (__indexOf.call(dom_pre_tags, base_nm) >= 0) {
          pre_count--;
        }
        if (base_nm === 'defer') {
          stats.defer++;
        }
        if (parts[i + 2] !== parts[oi + 2]) {
          tag_names_for_debugger = {
            open: parts[oi + 2],
            close: parts[i + 2]
          };
          doError(file_stats, "Mismatched tags open=" + parts[oi + 2] + ", close=" + parts[i + 2]);
        }
        if (children.length === 0) {
          whole_tag = [flavor, base_nm, attrs, []];
        } else if (flavor === T_EPIC) {
          whole_tag = [flavor, base_nm, attrs, children];
          if (!tag_wait.length) {
            stats.epic++;
          }
        } else if (base_nm === 'style') {
          flavor = T_STYLE;
          whole_tag = [flavor, base_nm, attrs, children];
        } else {
          whole_tag = [flavor, base_nm, attrs, children];
          if (!tag_wait.length) {
            stats.dom++;
          }
        }
        children = prev_children;
        children.push(whole_tag);
      } else {
        empty = '';
        attrs = '{}';
        attr_clean = false;
        flavor = 'e-' === parts[i + 2].slice(0, 2) ? T_EPIC : T_M1;
        if (parts[i + 3].length > 0) {
          _ref1 = FindAttrs(file_stats, parts[i + 3]), attrs = _ref1[0], empty = _ref1[1], attr_clean = _ref1[2];
        }
        if (flavor === T_EPIC) {
          base_nm = parts[i + 2].slice(2);
          if (base_nm === 'page' || base_nm === 'part') {
            empty = '/';
          }
          if (__indexOf.call(etags, base_nm) < 0) {
            doError(file_stats, "UNKNONW EPIC TAG (" + base_nm + ") : Expected one of " + (etags.join()));
          }
        } else {
          base_nm = parts[i + 2];
          if (base_nm === 'img' || base_nm === 'br' || base_nm === 'input' || base_nm === 'hr') {
            empty = '/';
          }
          if (__indexOf.call(dom_nms, base_nm) < 0) {
            doError(file_stats, 'Unknown tag name "' + base_nm + '" in ' + file_stats);
          }
          if (attr_clean) {
            flavor = T_M2;
          }
        }
        if (empty === '/') {
          if (base_nm === 'defer') {
            stats.defer++;
          }
          whole_tag = [flavor, base_nm, attrs, []];
          children.push(whole_tag);
          if (!tag_wait.length) {
            if (flavor === T_EPIC) {
              stats.epic++;
            } else {
              stats.dom++;
            }
          }
        } else {
          tag_wait.push([i, base_nm, attrs, children, flavor]);
          children = [];
          if (__indexOf.call(dom_pre_tags, base_nm) >= 0) {
            pre_count++;
          }
        }
      }
      i += 4;
    }
    if (tag_wait.length) {
      doError(file_stats, "Missing closing tags " + (((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = tag_wait.length; _i < _len; _i++) {
          t = tag_wait[_i][0];
          _results.push(parts[t + 2]);
        }
        return _results;
      })()).join(', ')));
    }
    text = parts[i].replace(/^\s+|\s+$/g, ' ');
    if (text.length && text !== ' ' && text !== '  ') {
      children.push([T_M1, 'span', {}, (findVars(text)).join('+')]);
      stats.text++;
    }
    doChildren = function(child_array, fwrap) {
      var attr, has_epic, ix, kids, out, stuff, tag, _i, _len, _ref2;
      if ('A' !== E.type_oau(child_array)) {
        GLOBWUP();
      }
      out = [];
      has_epic = false;
      for (ix = _i = 0, _len = child_array.length; _i < _len; ix = ++_i) {
        _ref2 = child_array[ix], flavor = _ref2[0], tag = _ref2[1], attr = _ref2[2], kids = _ref2[3];
        switch (flavor) {
          case T_EPIC:
            has_epic = true;
            out.push("['" + tag + "'," + attr + (doChildren(kids, true)) + "]");
            break;
          case T_M1:
            out.push("{tag:'" + tag + "',attrs:" + attr + ",children:" + (doChildren(kids)) + "}");
            break;
          case T_M2:
            out.push("{tag:'" + tag + "',attrs:oE.weed(" + attr + "),children:" + (doChildren(kids)) + "}");
            break;
          case T_STYLE:
            if (kids.length !== 1) {
              GLOWUP();
            }
            if (kids[0][0] !== T_TEXT) {
              BLOWUP();
            }
            out.push("{tag:'" + tag + "',attrs:" + attr + ",children:m.trust(" + kids[0][1] + ")}");
            break;
          case T_TEXT:
            out.push(tag);
            break;
          default:
            BLOWUP_FLAVOR_NOT_KNOWN();
        }
      }
      stuff = '[' + out.join() + ']';
      if (has_epic) {
        stuff = 'oE.kids(' + stuff + ')';
      }
      if (fwrap) {
        stuff = ',function(){return ' + stuff + '}';
        if (child_array.length === 0) {
          stuff = '';
        }
      }
      return stuff;
    };
    content = 'return ' + doChildren(children);
    return {
      content: content,
      defer: stats.defer,
      can_componentize: children.length === 1 && stats.epic === 0
    };
  };

  if (typeof window !== "undefined" && window !== null) {
    _log2 = window._log2;
    E = window.E;
    E.Extra.ParseFile = ParseFile;
  } else {
    module.exports = function(w) {
      _log2 = w._log2;
      E = w.E;
      return E.Extra.ParseFile = ParseFile;
    };
  }

}).call(this);

/*Dev/Extra/LoadStrategy.coffee*/// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var LoadStrategy;

  LoadStrategy = (function() {

    function LoadStrategy(appconfs) {
      var i;
      this.appconfs = appconfs;
      this.clearCache();
      this.cache_local_flag = true;
      this.reverse_packages = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = _ref = this.appconfs.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
          _results.push(this.appconfs[i]);
        }
        return _results;
      }).call(this);
    }

    LoadStrategy.prototype.clearCache = function() {
      this.cache = {};
      return this.refresh_stamp = (new Date).valueOf();
    };

    LoadStrategy.prototype.makePkgDir = function(pkg) {
      return E.option.loadDirs[pkg] + ((E.option.loadDirs[pkg].slice(-1)) === '/' ? pkg : '');
    };

    LoadStrategy.prototype.D_loadAsync = function() {
      var def, el, f, file, file_list, next, pkg, promise, sub, type, url, work, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
      f = 'Dev:E/LoadStragegy.loadAsync';
      _ref = this.appconfs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pkg = _ref[_i];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        _ref2 = (_ref1 = E['manifest$' + pkg]) != null ? _ref1 : {};
        for (type in _ref2) {
          file_list = _ref2[type];
          if (type === 'css') {
            for (_j = 0, _len1 = file_list.length; _j < _len1; _j++) {
              file = file_list[_j];
              url = (this.makePkgDir(pkg)) + '/css/' + file + '.css';
              el = document.createElement('link');
              el.setAttribute('rel', 'stylesheet');
              el.setAttribute('type', 'text/css');
              el.setAttribute('href', url);
              document.head.appendChild(el);
            }
          }
        }
      }
      work = [];
      def = new m.Deferred();
      promise = def.promise;
      _ref3 = this.appconfs;
      for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
        pkg = _ref3[_k];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        _ref5 = (_ref4 = E['manifest$' + pkg]) != null ? _ref4 : {};
        for (type in _ref5) {
          file_list = _ref5[type];
          if (type !== 'css') {
            for (_l = 0, _len3 = file_list.length; _l < _len3; _l++) {
              file = file_list[_l];
              sub = type === 'root' ? '' : type + '/';
              url = (this.makePkgDir(pkg)) + '/' + sub + file + '.js';
              work.push(url);
            }
          }
        }
      }
      next = function(ix) {
        if (ix >= work.length) {
          _log2(f, ix, 'done.');
          def.resolve(null);
          return;
        }
        _log2(f, 'doing', ix, work[ix]);
        el = document.createElement('script');
        el.setAttribute('type', 'text/javascript');
        el.setAttribute('src', work[ix]);
        el.onload = function() {
          return next(ix + 1);
        };
        document.head.appendChild(el);
      };
      next(0);
      return promise;
    };

    LoadStrategy.prototype.inline = function(type, nm) {
      var el, f, id;
      f = 'inline';
      el = document.getElementById(id = 'view-' + type + '-' + nm);
      if (el) {
        return el.innerHTML;
      }
      return null;
    };

    LoadStrategy.prototype.preLoaded = function(pkg, type, nm) {
      var f, r, _ref, _ref1;
      f = 'preLoaded';
      r = (_ref = E['view$' + pkg]) != null ? (_ref1 = _ref[type]) != null ? _ref1[nm] : void 0 : void 0;
      return r;
    };

    LoadStrategy.prototype.compile = function(name, uncompiled) {
      var parsed;
      parsed = E.Extra.ParseFile(name, uncompiled);
      parsed.content = new Function(parsed.content);
      if (this.cache_local_flag) {
        this.cache[name] = parsed;
      }
      return parsed;
    };

    LoadStrategy.prototype.d_get = function(type, nm) {
      var def, f, full_nm, full_nm_alt, pkg, promise, type_alt, uncompiled, _fn, _i, _j, _len, _len1, _ref, _ref1,
        _this = this;
      f = 'd_get';
      full_nm = type + '/' + nm + '.html';
      if (this.cache[full_nm] != null) {
        return this.cache[full_nm];
      }
      if (uncompiled = this.inline(type, nm)) {
        return this.compile(full_nm, uncompiled);
      }
      def = new m.Deferred();
      def.resolve(false);
      promise = def.promise;
      type_alt = type === 'Layout' ? 'tmpl' : type.toLowerCase();
      full_nm_alt = type + '/' + nm + '.' + type_alt + '.html';
      if (E.option.compat_path) {
        _ref = this.reverse_packages;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          pkg = _ref[_i];
          if ((pkg !== 'Base' && pkg !== 'Dev' && pkg !== 'Proto') && type !== 'Layout') {
            (function(pkg) {
              return promise = promise.then(function(result) {
                if (result !== false) {
                  return result;
                }
                if (!(pkg in E.option.loadDirs)) {
                  return false;
                }
                return _this.D_getFile(pkg, full_nm_alt);
              });
            })(pkg);
          }
        }
      }
      _ref1 = this.reverse_packages;
      _fn = function(pkg) {
        return promise = promise.then(function(result) {
          var compiled;
          if (result !== false) {
            return result;
          }
          if (compiled = _this.preLoaded(pkg, type, nm)) {
            return compiled;
          }
          if (!(pkg in E.option.loadDirs)) {
            return false;
          }
          return _this.D_getFile(pkg, full_nm);
        });
      };
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        pkg = _ref1[_j];
        _fn(pkg);
      }
      promise = promise.then(function(result) {
        var parsed;
        if (result !== false) {
          if (result != null ? result.preloaded : void 0) {
            return result;
          }
          parsed = _this.compile(full_nm, result);
        } else {
          throw new Error("Unable to locate View file (" + full_nm + ").");
          console.error('ERROR', 'NO FILE FOUND! ', full_nm);
          parsed = false;
        }
        _this.cache[full_nm] = parsed;
        return parsed;
      });
      promise.then(null, function(error) {
        throw error;
      });
      this.cache[full_nm] = promise;
      return promise;
    };

    LoadStrategy.prototype.D_getFile = function(pkg, nm) {
      var path;
      path = (this.makePkgDir(pkg)) + '/';
      return (m.request({
        background: true,
        method: 'GET',
        url: path + nm,
        data: {
          _: (new Date).valueOf()
        },
        config: function(xhr, options) {
          xhr.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
          return xhr;
        },
        deserialize: function(x) {
          return x;
        }
      })).then(null, function(error) {
        return false;
      });
    };

    LoadStrategy.prototype.d_layout = function(nm) {
      return this.d_get('Layout', nm);
    };

    LoadStrategy.prototype.d_page = function(nm) {
      return this.d_get('Page', nm);
    };

    LoadStrategy.prototype.d_part = function(nm) {
      return this.d_get('Part', nm);
    };

    return LoadStrategy;

  })();

  E.Extra.LoadStrategy$Dev = LoadStrategy;

  E.opt({
    loader: 'LoadStrategy$Dev'
  });

}).call(this);

E.view$Dev={
Layout: {
"bdevl":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([{tag:'style',attrs:{},children:m.trust(' .dbg-part { border: solid 8px #888; }\n.dbg-tag-error-box { border: solid 2px #C44; font-weight: bold;}\n.dbg-tag-error-msg { color: red; }\n.dbg-tag-box { border: solid 2px #44C; }\n.dbg-part-box { font-size: .5em;\n -webkit-box-shadow: 10px 10px 5px #888;\n padding: 5px 5px 5px 15px;\n width: 10px;\n height: 10px;\n z-index: 99999;\n}\n.red { color: red; }\n.btn-group { background-color: #CCC; border-radius: 6px; }\n.dbg-toolbar .btn { padding: 6px 2px; }\n.dbg-toolbar:hover {\n top: -7px;\n}\n.dbg-toolbar {\n overflow-y: hidden;\n top: -46px;\n transition-property: top;\n transition-duration: .5s;\n} ')},{tag:'div',attrs:{style:{position:'fixed',zIndex:'9999',backgroundColor:'#484848',fontSize:'10px',padding:'10px 10px 0 10px',right:'0'},className:'dbg-toolbar'},children:[{tag:'div',attrs:{className:'btn-toolbar'},children:[{tag:'div',attrs:{className:'btn-group'},children:[{tag:'a',attrs:{'data-e-what':'file',className:'btn btn-mini','data-e-action':'click:dbg_refresh'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-repeat icon-repeat'},children:[]}]},{tag:'a',attrs:{'data-e-what':'file',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-file icon-file '+oE.v3('Devl','Opts','file','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'tag',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-chevron-left icon-chevron-left '+oE.v3('Devl','Opts','tag','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'tag2',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-chevron-right icon-chevron-right '+oE.v3('Devl','Opts','tag2','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'form',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-edit icon-edit '+oE.v3('Devl','Opts','form','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'model',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-list-alt icon-list-alt '+oE.v3('Devl','Opts','model','?red')},children:[]}]}]}]},{tag:'div',attrs:{style:{textAlign:'center',color:'#FFF',letterSpacing:'5px',fontSize:'10px',height:'18px',paddingLeft:'4px',marginTop:'-3px'}},children:['EPIC']}]},['if',{set:oE.v3('Devl','Opts','model')},function(){return [{tag:'table',attrs:{width:'100%'},children:[{tag:'tr',attrs:{},children:[{tag:'td',attrs:{width:'20%',style:{backgroundColor:'#90C0FF',verticalAlign:'top',paddingTop:'75px',paddingBottom:'20px'}},children:oE.kids([['part',{part:'dbg_model',dynamic:'div'}]])},{tag:'td',attrs:{width:'100%',style:{verticalAlign:'top',position:'relative'}},children:oE.kids([['page',{}]])}]}]}]}],['if',{not_set:oE.v3('Devl','Opts','model')},function(){return oE.kids([['page',{}]])}]])}},
"BaseDevl":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([{tag:'h5',attrs:{},children:['I\'m an \'outer\' template']},['page',{}]])}}}, Page: {
}, Part: {
"dbg_model":{preloaded:1,can_componentize:false,defer:0,content:function(){return [{tag:'style',attrs:{},children:m.trust(' ul.dbg-model.nav, ul.dbg-model.nav ul { margin-bottom: 0; border: 0; }\nul.dbg-model.nav li a, ul.dbg-model.nav ul li a { padding: 0; border: 0; }\nul.dbg-model.nav ul li a { padding-left: 15px; } ')},{tag:'ul',attrs:{className:'dbg-model nav nav-tabs nav-stacked'},children:oE.kids([['foreach',{table:'Devl/Model'},function(){return [{tag:'li',attrs:{},children:oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Model','name'),'data-e-action':'click:dbg_open_model'},children:[' ['+oE.v2('Model','tables')+'] '+oE.v2('Model','name')+' ('+oE.v2('Model','inst')+') ']},['if',{set:oE.v2('Model','is_open')},function(){return [{tag:'ul',attrs:{className:'nav nav-tabs nav-stacked'},children:oE.kids([['foreach',{table:'Model/Table'},function(){return [{tag:'li',attrs:{},children:oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Table','name'),'data-e-action':'click:dbg_open_table'},children:[{tag:'span',attrs:{title:oE.v2('Table','cols')},children:['['+oE.v2('Table','rows')+'] '+oE.v2('Table','name')]}]},['if',{set:oE.v2('Table','is_open')},function(){return [{tag:'table',attrs:{border:'1',style:{fontSize:'8pt',lineHeight:'1'}},children:[{tag:'tbody',attrs:{},children:oE.kids([{tag:'tr',attrs:{},children:[{tag:'th',attrs:{},children:oE.kids([['if',{set:oE.v2('Table','by_col')},function(){return [{tag:'a',attrs:{'data-e-action':'click:dbg_table_by_row'},children:[' Row ']}]}],['if',{not_set:oE.v2('Table','by_col')},function(){return oE.kids([' Column ',['if',{set:oE.v2('Table','is_sub')},function(){return [{tag:'a',attrs:{style:{padding:'0'},'data-e-action':'click:dbg_close_subtable'},children:['^']}]}]])}]])},{tag:'th',attrs:{},children:['T']},{tag:'th',attrs:{},children:oE.kids([['if',{val:oE.v2('Table','rows'),eq:'1'},function(){return [' Value ']}],['if',{val:oE.v2('Table','rows'),ne:'1'},function(){return oE.kids([['if',{set:oE.v2('Table','by_col')},function(){return ['   '+oE.v2('Table','curr_col')+'   ']}],['if',{not_set:oE.v2('Table','by_col')},function(){return [{tag:'a',attrs:{'data-e-action':'click:dbg_table_left'},children:['<']},'   Value (row '+oE.v2('Table','row_cnt')+')   ',{tag:'a',attrs:{'data-e-action':'click:dbg_table_right'},children:['>']}]}]])}]])}]},['if',{not_set:oE.v2('Table','by_col')},function(){return oE.kids([['foreach',{table:'Table/Cols'},function(){return [{tag:'tr',attrs:{},children:oE.kids([{tag:'th',attrs:{},children:oE.kids([['if',{val:oE.v2('Table','rows'),eq:'1'},function(){return [' '+oE.v2('Cols','col')+' ']}],['if',{val:oE.v2('Table','rows'),ne:'1'},function(){return [{tag:'a',attrs:{'data-e-col':oE.v2('Cols','col'),'data-e-action':'click:dbg_table_col_set'},children:[oE.v2('Cols','col')]}]}]])},['if',{set:oE.v2('Cols','val')},function(){return [{tag:'td',attrs:{style:{color:'green'}},children:[oE.v2('Cols','type','1')]}]}],['if',{not_set:oE.v2('Cols','val')},function(){return [{tag:'td',attrs:{style:{color:'red'}},children:[oE.v2('Cols','type','1')]}]}],{tag:'td',attrs:{title:oE.v2('Cols','type')},children:oE.kids([['if',{val:oE.v2('Cols','type'),eq:'object'},function(){return oE.kids([['if',{not_set:oE.v2('Cols','len')},function(){return [' Table [ empty ]']}],['if',{set:oE.v2('Cols','len')},function(){return oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Cols','col'),style:{padding:'0'},'data-e-action':'click:dbg_open_subtable'},children:['Table']},' ['+oE.v2('Cols','len')+' row',['if',{val:oE.v2('Cols','len'),ne:'1'},function(){return ['s']}],'] '])}]])}],['if',{val:oE.v2('Cols','type'),ne:'object'},function(){return [' '+oE.v2('Cols','val')+' ']}]])}])}]}]])}],['if',{set:oE.v2('Table','by_col')},function(){return oE.kids([['foreach',{table:'Table/Rows'},function(){return [{tag:'tr',attrs:{},children:oE.kids([{tag:'th',attrs:{},children:[oE.v2('Rows','row')]},['if',{set:oE.v2('Rows','val')},function(){return [{tag:'td',attrs:{style:{color:'green'}},children:[oE.v2('Rows','type','1')]}]}],['if',{not_set:oE.v2('Rows','val')},function(){return [{tag:'td',attrs:{style:{color:'red'}},children:[oE.v2('Rows','type','1')]}]}],{tag:'td',attrs:{title:oE.v2('Rows','type')},children:oE.kids([['if',{val:oE.v2('Rows','type'),eq:'object'},function(){return oE.kids(['Table [ ',['if',{set:oE.v2('Rows','len')},function(){return oE.kids([oE.v2('Rows','len')+' row',['if',{val:oE.v2('Rows','len'),ne:'1'},function(){return ['s']}]])}],['if',{not_set:oE.v2('Rows','len')},function(){return ['empty']}],' ]'])}],['if',{val:oE.v2('Rows','type'),ne:'object'},function(){return [' '+oE.v2('Rows','val')+' ']}]])}])}]}]])}]])}]}]}]])}]}]])}]}]])}]}]])}]}}}};

