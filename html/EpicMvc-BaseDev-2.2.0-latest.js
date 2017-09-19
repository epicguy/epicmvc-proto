/* Copyright 2007-2017 by James Shelby, shelby (at:) dtsol.com; All rights reserved. */
// JCS: Version http://lhorie.github.io/mithril/archive/v0.2.0/

var m = (function app(window, undefined) {
	var OBJECT = "[object Object]", ARRAY = "[object Array]", STRING = "[object String]", FUNCTION = "function";
	var type = {}.toString;
	var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/;
	var voidElements = /^(AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR)$/;
	var noop = function() {}

	// caching commonly used variables
	var $document, $location, $requestAnimationFrame, $cancelAnimationFrame;

	// self invoking function needed because of the way mocks work
	function initialize(window){
		$document = window.document;
		$location = window.location;
		$cancelAnimationFrame = window.cancelAnimationFrame || window.clearTimeout;
		$requestAnimationFrame = window.requestAnimationFrame || window.setTimeout;
	}

	initialize(window);


	/**
	 * @typedef {String} Tag
	 * A string that looks like -> div.classname#id[param=one][param2=two]
	 * Which describes a DOM node
	 */

	/**
	 *
	 * @param {Tag} The DOM node tag
	 * @param {Object=[]} optional key-value pairs to be mapped to DOM attrs
	 * @param {...mNode=[]} Zero or more Mithril child nodes. Can be an array, or splat (optional)
	 *
	 */
	function m() {
		var args = [].slice.call(arguments);
		var hasAttrs = args[1] != null && type.call(args[1]) === OBJECT && !("tag" in args[1] || "view" in args[1]) && !("subtree" in args[1]);
		var attrs = hasAttrs ? args[1] : {};
		var classAttrName = "class" in attrs ? "class" : "className";
		var cell = {tag: "div", attrs: {}};
		var match, classes = [];
		if (type.call(args[0]) != STRING) throw new Error("selector in m(selector, attrs, children) should be a string")
		while (match = parser.exec(args[0])) {
			if (match[1] === "" && match[2]) cell.tag = match[2];
			else if (match[1] === "#") cell.attrs.id = match[2];
			else if (match[1] === ".") classes.push(match[2]);
			else if (match[3][0] === "[") {
				var pair = attrParser.exec(match[3]);
				cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true)
			}
		}

		var children = hasAttrs ? args.slice(2) : args.slice(1);
		if (children.length === 1 && type.call(children[0]) === ARRAY) {
			cell.children = children[0]
		}
		else {
			cell.children = children
		}
		
		for (var attrName in attrs) {
			if (attrs.hasOwnProperty(attrName)) {
				if (attrName === classAttrName && attrs[attrName] != null && attrs[attrName] !== "") {
					classes.push(attrs[attrName])
					cell.attrs[attrName] = "" //create key in correct iteration order
				}
				else cell.attrs[attrName] = attrs[attrName]
			}
		}
		if (classes.length > 0) cell.attrs[classAttrName] = classes.join(" ");
		
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
		//- this prevents lifecycle surprises from procedural helpers that mix implicit and explicit return statements (e.g. function foo() {if (cond) return m("div")}
		//- it simplifies diffing code
		//data.toString() might throw or return null if data is the return value of Console.log in Firefox (behavior depends on version)
		try {if (data == null || data.toString() == null) data = "";} catch (e) {data = ""}
		if (data.subtree === "retain") return cached;
		var cachedType = type.call(cached), dataType = type.call(data);
		if (cached == null || cachedType !== dataType) {
			if (cached != null) {
				if (parentCache && parentCache.nodes) {
					var offset = index - parentIndex;
					var end = offset + (dataType === ARRAY ? data : cached.nodes).length;
					clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end))
				}
				else if (cached.nodes) clear(cached.nodes, cached)
			}
			cached = new data.constructor;
			if (cached.tag) cached = {}; //if constructor creates a virtual dom element, use a blank object as the base cached node instead of copying the virtual el (#277)
			cached.nodes = []
		}

		if (dataType === ARRAY) {
			//recursively flatten array
			for (var i = 0, len = data.length; i < len; i++) {
				if (type.call(data[i]) === ARRAY) {
					data = data.concat.apply([], data);
					i-- //check current index again and flatten until there are no more nested arrays at that index
					len = data.length
				}
			}
			
			var nodes = [], intact = cached.length === data.length, subArrayCount = 0;

			//keys algorithm: sort elements without recreating them if keys are present
			//1) create a map of all existing keys, and mark all for deletion
			//2) add new keys to map and mark them for addition
			//3) if key exists in new list, change action from deletion to a move
			//4) for each key, handle its corresponding action as marked in previous steps
			var DELETION = 1, INSERTION = 2 , MOVE = 3;
			var existing = {}, shouldMaintainIdentities = false;
			for (var i = 0; i < cached.length; i++) {
				if (cached[i] && cached[i].attrs && cached[i].attrs.key != null) {
					shouldMaintainIdentities = true;
					existing[cached[i].attrs.key] = {action: DELETION, index: i}
				}
			}
			
			var guid = 0
			for (var i = 0, len = data.length; i < len; i++) {
				if (data[i] && data[i].attrs && data[i].attrs.key != null) {
					for (var j = 0, len = data.length; j < len; j++) {
						if (data[j] && data[j].attrs && data[j].attrs.key == null) data[j].attrs.key = "__mithril__" + guid++
					}
					break
				}
			}
			
			if (shouldMaintainIdentities) {
				var keysDiffer = false
				if (data.length != cached.length) keysDiffer = true
				else for (var i = 0, cachedCell, dataCell; cachedCell = cached[i], dataCell = data[i]; i++) {
					if (cachedCell.attrs && dataCell.attrs && cachedCell.attrs.key != dataCell.attrs.key) {
						keysDiffer = true
						break
					}
				}
				
				if (keysDiffer) {
					for (var i = 0, len = data.length; i < len; i++) {
						if (data[i] && data[i].attrs) {
							if (data[i].attrs.key != null) {
								var key = data[i].attrs.key;
								if (!existing[key]) existing[key] = {action: INSERTION, index: i};
								else existing[key] = {
									action: MOVE,
									index: i,
									from: existing[key].index,
									element: cached.nodes[existing[key].index] || $document.createElement("div")
								}
							}
						}
					}
					var actions = []
					for (var prop in existing) actions.push(existing[prop])
					var changes = actions.sort(sortChanges);
					var newCached = new Array(cached.length)
					newCached.nodes = cached.nodes.slice()

					for (var i = 0, change; change = changes[i]; i++) {
						if (change.action === DELETION) {
							clear(cached[change.index].nodes, cached[change.index]);
							newCached.splice(change.index, 1)
						}
						if (change.action === INSERTION) {
							var dummy = $document.createElement("div");
							dummy.key = data[change.index].attrs.key;
							parentElement.insertBefore(dummy, parentElement.childNodes[change.index] || null);
							newCached.splice(change.index, 0, {attrs: {key: data[change.index].attrs.key}, nodes: [dummy]})
							newCached.nodes[change.index] = dummy
						}

						if (change.action === MOVE) {
							if (parentElement.childNodes[change.index] !== change.element && change.element !== null) {
								parentElement.insertBefore(change.element, parentElement.childNodes[change.index] || null)
							}
							newCached[change.index] = cached[change.from]
							newCached.nodes[change.index] = change.element
						}
					}
					cached = newCached;
				}
			}
			//end key algorithm

			for (var i = 0, cacheCount = 0, len = data.length; i < len; i++) {
				//diff each item in the array
				var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs);
				if (item === undefined) continue;
				if (!item.nodes.intact) intact = false;
				if (item.$trusted) {
					//fix offset of next element if item was a trusted string w/ more than one html element
					//the first clause in the regexp matches elements
					//the second clause (after the pipe) matches text nodes
					subArrayCount += (item.match(/<[^\/]|\>\s*[^<]/g) || [0]).length
				}
				else subArrayCount += type.call(item) === ARRAY ? item.length : 1;
				cached[cacheCount++] = item
			}
			if (!intact) {
				//diff the array itself
				
				//update the list of DOM nodes by collecting the nodes from each item
				for (var i = 0, len = data.length; i < len; i++) {
					if (cached[i] != null) nodes.push.apply(nodes, cached[i].nodes)
				}
				//remove items from the end of the array if the new array is shorter than the old one
				//if errors ever happen here, the issue is most likely a bug in the construction of the `cached` data structure somewhere earlier in the program
				for (var i = 0, node; node = cached.nodes[i]; i++) {
					if (node.parentNode != null && nodes.indexOf(node) < 0) clear([node], [cached[i]])
				}
				if (data.length < cached.length) cached.length = data.length;
				cached.nodes = nodes
			}
		}
		else if (data != null && dataType === OBJECT) {
			var views = [], controllers = []
			while (data.view) {
				var view = data.view.$original || data.view
				var controllerIndex = m.redraw.strategy() == "diff" && cached.views ? cached.views.indexOf(view) : -1
				var controller = controllerIndex > -1 ? cached.controllers[controllerIndex] : new (data.controller || noop)
				var key = data && data.attrs && data.attrs.key
				data = pendingRequests == 0 || (cached && cached.controllers && cached.controllers.indexOf(controller) > -1) ? data.view(controller) : {tag: "placeholder"}
				if (data.subtree === "retain") return cached;
				if (key) {
					if (!data.attrs) data.attrs = {}
					data.attrs.key = key
				}
				if (controller.onunload) unloaders.push({controller: controller, handler: controller.onunload})
				views.push(view)
				controllers.push(controller)
			}
			if (!data.tag && controllers.length) throw new Error("Component template must return a virtual element, not an array, string, etc.")
			if (!data.attrs) data.attrs = {};
			if (!cached.attrs) cached.attrs = {};

			var dataAttrKeys = Object.keys(data.attrs)
			var hasKeys = dataAttrKeys.length > ("key" in data.attrs ? 1 : 0)
			//if an element is different enough from the one in cache, recreate it
			if (data.tag != cached.tag || dataAttrKeys.sort().join() != Object.keys(cached.attrs).sort().join() || data.attrs.id != cached.attrs.id || data.attrs.key != cached.attrs.key || (m.redraw.strategy() == "all" && (!cached.configContext || cached.configContext.retain !== true)) || (m.redraw.strategy() == "diff" && cached.configContext && cached.configContext.retain === false)) {
				if (cached.nodes.length) clear(cached.nodes);
				if (cached.configContext && typeof cached.configContext.onunload === FUNCTION) cached.configContext.onunload()
				if (cached.controllers) {
					for (var i = 0, controller; controller = cached.controllers[i]; i++) {
						if (typeof controller.onunload === FUNCTION) controller.onunload({preventDefault: noop})
					}
				}
			}
			if (type.call(data.tag) != STRING) return;

			var node, isNew = cached.nodes.length === 0;
			if (data.attrs.xmlns) namespace = data.attrs.xmlns;
			else if (data.tag === "svg") namespace = "http://www.w3.org/2000/svg";
			else if (data.tag === "math") namespace = "http://www.w3.org/1998/Math/MathML";
			
			if (isNew) {
				if (data.attrs.is) node = namespace === undefined ? $document.createElement(data.tag, data.attrs.is) : $document.createElementNS(namespace, data.tag, data.attrs.is);
				else node = namespace === undefined ? $document.createElement(data.tag) : $document.createElementNS(namespace, data.tag);
				cached = {
					tag: data.tag,
					//set attributes first, then create children
					attrs: hasKeys ? setAttributes(node, data.tag, data.attrs, {}, namespace) : data.attrs,
					children: data.children != null && data.children.length > 0 ?
						build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs) :
						data.children,
					nodes: [node]
				};
				if (controllers.length) {
					cached.views = views
					cached.controllers = controllers
					for (var i = 0, controller; controller = controllers[i]; i++) {
						if (controller.onunload && controller.onunload.$old) controller.onunload = controller.onunload.$old
						if (pendingRequests && controller.onunload) {
							var onunload = controller.onunload
							controller.onunload = noop
							controller.onunload.$old = onunload
						}
					}
				}
				
				if (cached.children && !cached.children.nodes) cached.children.nodes = [];
				//edge case: setting value on <select> doesn't work before children exist, so set it again after children have been created
				if (data.tag === "select" && "value" in data.attrs) setAttributes(node, data.tag, {value: data.attrs.value}, {}, namespace);
				parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			else {
				node = cached.nodes[0];
				if (hasKeys) setAttributes(node, data.tag, data.attrs, cached.attrs, namespace);
				cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs);
				cached.nodes.intact = true;
				if (controllers.length) {
					cached.views = views
					cached.controllers = controllers
				}
				if (shouldReattach === true && node != null) parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			//schedule configs to be called. They are called after `build` finishes running
			if (typeof data.attrs["config"] === FUNCTION) {
				var context = cached.configContext = cached.configContext || {};

				// bind
				var callback = function(data, args) {
					return function() {
						return data.attrs["config"].apply(data, args)
					}
				};
				configs.push(callback(data, [node, !isNew, context, cached]))
			}
		}
		else if (typeof data != FUNCTION) {
			//handle text nodes
			var nodes;
			if (cached.nodes.length === 0) {
				if (data.$trusted) {
					nodes = injectHTML(parentElement, index, data)
				}
				else {
					nodes = [$document.createTextNode(data)];
					if (!parentElement.nodeName.match(voidElements)) parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
				}
				cached = "string number boolean".indexOf(typeof data) > -1 ? new data.constructor(data) : data;
				cached.nodes = nodes
			}
			else if (cached.valueOf() !== data.valueOf() || shouldReattach === true) {
				nodes = cached.nodes;
				if (!editable || editable !== $document.activeElement) {
					if (data.$trusted) {
						clear(nodes, cached);
						nodes = injectHTML(parentElement, index, data)
					}
					else {
						//corner case: replacing the nodeValue of a text node that is a child of a textarea/contenteditable doesn't work
						//we need to update the value property of the parent textarea or the innerHTML of the contenteditable element instead
						if (parentTag === "textarea") parentElement.value = data;
						else if (editable) editable.innerHTML = data;
						else {
							if (nodes[0].nodeType === 1 || nodes.length > 1) { //was a trusted string
								clear(cached.nodes, cached);
								nodes = [$document.createTextNode(data)]
							}
							parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null);
							nodes[0].nodeValue = data
						}
					}
				}
				cached = new data.constructor(data);
				cached.nodes = nodes
			}
			else cached.nodes.intact = true
		}

		return cached
	}
	function sortChanges(a, b) {return a.action - b.action || a.index - b.index}
	function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
		for (var attrName in dataAttrs) {
			var dataAttr = dataAttrs[attrName];
			var cachedAttr = cachedAttrs[attrName];
			if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr)) {
				cachedAttrs[attrName] = dataAttr;
				try {
					//`config` isn't a real attributes, so ignore it
					if (attrName === "config" || attrName == "key") continue;
					//hook event handlers to the auto-redrawing system
					else if (typeof dataAttr === FUNCTION && attrName.indexOf("on") === 0) {
						node[attrName] = autoredraw(dataAttr, node)
					}
					//handle `style: {...}`
					else if (attrName === "style" && dataAttr != null && type.call(dataAttr) === OBJECT) {
						for (var rule in dataAttr) {
							if (cachedAttr == null || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule]
						}
						for (var rule in cachedAttr) {
							if (!(rule in dataAttr)) node.style[rule] = ""
						}
					}
					//handle SVG
					else if (namespace != null) {
						if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr);
						else if (attrName === "className") node.setAttribute("class", dataAttr);
						else node.setAttribute(attrName, dataAttr)
					}
					//handle cases that are properties (but ignore cases where we should use setAttribute instead)
					//- list and form are typically used as strings, but are DOM element references in js
					//- when using CSS selectors (e.g. `m("[style='']")`), style is used as a string, but it's an object in js
					else if (attrName in node && !(attrName === "list" || attrName === "style" || attrName === "form" || attrName === "type" || attrName === "width" || attrName === "height")) {
						//#348 don't set the value if not needed otherwise cursor placement breaks in Chrome
						if (tag !== "input" || node[attrName] !== dataAttr) node[attrName] = dataAttr
					}
					else node.setAttribute(attrName, dataAttr)
				}
				catch (e) {
					//swallow IE's invalid argument errors to mimic HTML's fallback-to-doing-nothing-on-invalid-attributes behavior
					if (e.message.indexOf("Invalid argument") < 0) throw e
				}
			}
			//#348 dataAttr may not be a string, so use loose comparison (double equal) instead of strict (triple equal)
			else if (attrName === "value" && tag === "input" && node.value != dataAttr) {
				node.value = dataAttr
			}
		}
		return cachedAttrs
	}
	function clear(nodes, cached) {
		for (var i = nodes.length - 1; i > -1; i--) {
			if (nodes[i] && nodes[i].parentNode) {
				try {nodes[i].parentNode.removeChild(nodes[i])}
				catch (e) {} //ignore if this fails due to order of events (see http://stackoverflow.com/questions/21926083/failed-to-execute-removechild-on-node)
				cached = [].concat(cached);
				if (cached[i]) unload(cached[i])
			}
		}
		if (nodes.length != 0) nodes.length = 0
	}
	function unload(cached) {
		if (cached.configContext && typeof cached.configContext.onunload === FUNCTION) {
			cached.configContext.onunload();
			cached.configContext.onunload = null
		}
		if (cached.controllers) {
			for (var i = 0, controller; controller = cached.controllers[i]; i++) {
				if (typeof controller.onunload === FUNCTION) controller.onunload({preventDefault: noop});
			}
		}
		if (cached.children) {
			if (type.call(cached.children) === ARRAY) {
				for (var i = 0, child; child = cached.children[i]; i++) unload(child)
			}
			else if (cached.children.tag) unload(cached.children)
		}
	}
	function injectHTML(parentElement, index, data) {
		var nextSibling = parentElement.childNodes[index];
		if (nextSibling) {
			var isElement = nextSibling.nodeType != 1;
			var placeholder = $document.createElement("span");
			if (isElement) {
				parentElement.insertBefore(placeholder, nextSibling || null);
				placeholder.insertAdjacentHTML("beforebegin", data);
				parentElement.removeChild(placeholder)
			}
			else nextSibling.insertAdjacentHTML("beforebegin", data)
		}
		else parentElement.insertAdjacentHTML("beforeend", data);
		var nodes = [];
		while (parentElement.childNodes[index] !== nextSibling) {
			nodes.push(parentElement.childNodes[index]);
			index++
		}
		return nodes
	}
	function autoredraw(callback, object) {
		return function(e) {
			e = e || event;
			m.redraw.strategy("diff");
			m.startComputation();
			try {return callback.call(object, e)}
			finally {
				endFirstComputation()
			}
		}
	}

	var html;
	var documentNode = {
		appendChild: function(node) {
			if (html === undefined) html = $document.createElement("html");
			if ($document.documentElement && $document.documentElement !== node) {
				$document.replaceChild(node, $document.documentElement)
			}
			else $document.appendChild(node);
			this.childNodes = $document.childNodes
		},
		insertBefore: function(node) {
			this.appendChild(node)
		},
		childNodes: []
	};
	var nodeCache = [], cellCache = {};
	m.render = function(root, cell, forceRecreation) {
		var configs = [];
		if (!root) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.");
		var id = getCellCacheKey(root);
		var isDocumentRoot = root === $document;
		var node = isDocumentRoot || root === $document.documentElement ? documentNode : root;
		if (isDocumentRoot && cell.tag != "html") cell = {tag: "html", attrs: {}, children: cell};
		if (cellCache[id] === undefined) clear(node.childNodes);
		if (forceRecreation === true) reset(root);
		cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs);
		for (var i = 0, len = configs.length; i < len; i++) configs[i]()
	};

	m.trust = function(value) {
		value = new String(value);
		value.$trusted = true;
		return value
	};

	function getCellCacheKey(element) {
		var index = nodeCache.indexOf(element);
		return index < 0 ? nodeCache.push(element) - 1 : index
	}

	function gettersetter(store) {
		var prop = function() {
			if (arguments.length) store = arguments[0];
			return store
		};

		prop.toJSON = function() {
			return store
		};

		return prop
	}

	m.prop = gettersetter

	var roots = [], components = [], controllers = [], lastRedrawId = null, lastRedrawCallTime = 0, computePreRedrawHook = null, computePostRedrawHook = null, prevented = false, topComponent, unloaders = [];
	m.redraw = function(force) {}
	m.redraw.strategy = m.prop();

	var pendingRequests = 0;
	m.startComputation = function() {pendingRequests++};
	m.endComputation = function() {
		pendingRequests = Math.max(pendingRequests - 1, 0);
		if (pendingRequests === 0) m.redraw()
	};
	var endFirstComputation = function() {
		if (m.redraw.strategy() == "none") {
			pendingRequests--
			m.redraw.strategy("diff")
		}
		else m.endComputation();
	}

	function reset(root) {
		var cacheKey = getCellCacheKey(root);
		clear(root.childNodes, cellCache[cacheKey]);
		cellCache[cacheKey] = undefined
	}

	return m
})(typeof window != "undefined" ? window : {});

if (typeof module != "undefined" && module !== null && module.exports) module.exports = m;
else if (typeof define === "function" && define.amd) define(function() {return m});


/*EpicCore*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var Issue, ModelJS, app, klass, nm, ref, w,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  app = function(window, undef) {
    var E, Extra, Model, _d_doAction, aActions, aFists, aFlows, aMacros, aModels, aSetting, action, appFindAction, appFindAttr, appFindNode, appFist, appGetF, appGetS, appGetSetting, appGetT, appGetVars, appInit, appLoadFormsIf, appModel, appSearchAttr, appStartS, appStartT, appconfs, counter, fieldDef, finish_logout, fistDef, fistInit, getModelState, inAction, issueInit, issueMap, j, len, make_model_functions, merge, modelState, nm, oModel, obj, option, ref, ref1, setModelState, type_oau, wistDef, wistInit;
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
    ref = ['c1', 'a1', 'a2', 'ap1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'ca1', 'ca2', 'ca3', 'ca4', 'fi1', 'fi2', 'fi3', 'fi4', 'v1', 'v2', 'w1', 'ex1'];
    for (j = 0, len = ref.length; j < len; j++) {
      nm = ref[j];
      option[nm] = (function() {});
    }
    E = {};
    E.nextCounter = function() {
      return ++counter;
    };
    E.opt = function(object) {
      return merge(option, object);
    };
    E.camelCase = function(input, char) {
      if (char == null) {
        char = '-';
      }
      return input.toLowerCase().replace(new RegExp(char + '(.)', 'g'), function(match, group1) {
        return group1.toUpperCase();
      });
    };
    type_oau = function(obj) {
      return {}.toString.call(obj)[8];
    };
    merge = function() {
      var atype, depth, dest, dup, f, func, l, len1, otype, source, sources, stype, utype;
      dest = arguments[0], sources = 2 <= arguments.length ? slice.call(arguments, 1) : [];
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
        var ans, f, inx, l, len1, s;
        f = 'func:A';
        if ((type_oau(source)) !== atype) {
          return undef;
        }
        for (inx = l = 0, len1 = source.length; l < len1; inx = ++l) {
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
      for (l = 0, len1 = sources.length; l < len1; l++) {
        source = sources[l];
        f = ':merge:source-loop';
        dup(dest, source);
      }
      return dest;
    };
    E.login = function() {
      var f, k, o, results;
      f = ':login';
      _log2(f, oModel);
      results = [];
      for (k in oModel) {
        o = oModel[k];
        results.push(typeof o.eventLogin === "function" ? o.eventLogin() : void 0);
      }
      return results;
    };
    E.logout = function(action_event, action_data) {
      if (inAction !== false) {
        setTimeout(((function(_this) {
          return function() {
            return E.logout(action_event, action_data);
          };
        })(this)), 100);
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
      var k, o, results;
      results = [];
      for (k in oModel) {
        o = oModel[k];
        if (!(typeof o.eventLogout === "function" ? o.eventLogout() : void 0)) {
          continue;
        }
        delete modelState[k];
        results.push(delete oModel[k]);
      }
      return results;
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
      var base, f, inst_nm, results;
      f = ':setModelState';
      if (s != null) {
        modelState = s;
      }
      results = [];
      for (inst_nm in oModel) {
        results.push(typeof (base = oModel[inst_nm]).restoreState === "function" ? base.restoreState(modelState[inst_nm]) : void 0);
      }
      return results;
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
      var form_nm, hash, l, len1, len2, n, node, obj, ref1, ref2, view_nm;
      for (l = 0, len1 = appconfs.length; l < len1; l++) {
        nm = appconfs[l];
        app = (ref1 = E['app$' + nm]) != null ? ref1 : {};
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
          ref2 = node.fists;
          for (n = 0, len2 = ref2.length; n < len2; n++) {
            form_nm = ref2[n];
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
      var ncat, nf, ns, nt, ref1, ref2, ref3, ref4, ref5;
      nf = aFlows[flow];
      if (nf) {
        if (t && ((nt = (ref1 = nf.TRACKS) != null ? ref1[t] : void 0) != null)) {
          if (s && ((ns = (ref2 = nt.STEPS) != null ? ref2[s] : void 0) != null)) {
            if ((ncat = (ref3 = ns[cat]) != null ? ref3[nm] : void 0) != null) {
              return ncat;
            }
          }
          if ((ncat = (ref4 = nt[cat]) != null ? ref4[nm] : void 0) != null) {
            return ncat;
          }
        }
        if ((ncat = (ref5 = nf[cat]) != null ? ref5[nm] : void 0) != null) {
          return ncat;
        }
      }
      return null;
    };
    appFindAttr = function(flow, t, s, attr) {
      var nattr, nf, ns, nt, ref1, ref2;
      nf = aFlows[flow];
      if (nf) {
        if (t && ((nt = (ref1 = nf.TRACKS) != null ? ref1[t] : void 0) != null)) {
          if (s && ((ns = (ref2 = nt.STEPS) != null ? ref2[s] : void 0) != null)) {
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
      var ref1;
      return (ref1 = appFindNode(path[0], path[1], path[2], 'ACTIONS', action_token)) != null ? ref1 : aActions[action_token];
    };
    appGetSetting = function(setting_name, flow, track, step) {
      var ref1;
      if (!flow) {
        return aSetting[setting_name];
      }
      return (ref1 = appFindAttr(flow, track, step != null ? step : false, setting_name)) != null ? ref1 : aSetting[setting_name];
    };
    appGetVars = function(flow, track, step) {
      var f, vars;
      f = ':appGetVars';
      vars = merge({}, aFlows[flow].v, aFlows[flow].TRACKS[track].v, aFlows[flow].TRACKS[track].STEPS[step].v);
      return vars;
    };
    appSearchAttr = function(attrNm, val) {
      var flow, flowNm, ref1, ref2, step, stepNm, track, trackNm;
      for (flowNm in aFlows) {
        flow = aFlows[flowNm];
        ref1 = flow.TRACKS;
        for (trackNm in ref1) {
          track = ref1[trackNm];
          ref2 = track.STEPS;
          for (stepNm in ref2) {
            step = ref2[stepNm];
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
      var model, results, view;
      results = [];
      for (view in aModels) {
        model = aModels[view];
        results.push((function(view, model) {
          return E[view] = function(table_or_ctx, act_if_action, data) {
            var inst_nm, oM;
            inst_nm = model.inst;
            if (!(inst_nm in oModel)) {
              option.m1(view, model);
              oModel[inst_nm] = new E.Model[model["class"]](view, model.options);
              if (inst_nm in modelState) {
                oModel[inst_nm].restoreState(modelState[inst_nm]);
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
      return results;
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
      if (action_node == null) {
        return [master_issue, master_message];
      }
      d_doLeftSide = function(action_node) {
        var ans, copy_to, ctx, d_cb, fist, fist_model, i, is_macro, ix, l, len1, len2, mg, n, name, nms, p, r, ref1, ref2, ref3, ref4, ref5, val, view_act, view_nm, what;
        ref1 = ['fist', 'clear'];
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          what = ref1[l];
          if (!(what in action_node)) {
            continue;
          }
          option.ca4(action_token, original_path, action_node, what);
          fist = action_node[what];
          fist_model = (ref2 = E.fistDef[fist].event) != null ? ref2 : 'Fist';
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
        for (ix = n = 0, len2 = nms.length; n < len2; ix = ++n) {
          nm = nms[ix];
          if (!((nm.indexOf(':')) > -1)) {
            continue;
          }
          ref3 = nm.split(':'), name = ref3[0], copy_to = ref3[1];
          master_data[copy_to] = master_data[name];
          nms[ix] = name;
        }
        option.ca2(action_token, original_path, nms, data, action_node);
        ref4 = action_node.set;
        for (nm in ref4) {
          val = ref4[nm];
          master_data[nm] = val;
        }
        if (action_node["do"] != null) {
          is_macro = (action_node["do"].indexOf('.')) < 0;
          if (is_macro) {
            option.ca3(action_token, original_path, action_node, aMacros);
            return d_doActionNode(aMacros[action_node["do"]]);
          }
          ref5 = action_node["do"].split('.'), view_nm = ref5[0], view_act = ref5[1];
          view_act = view_act ? view_act : action_token;
          p = Promise.resolve();
          r = {};
          i = new E.Issue(view_nm, view_act);
          mg = new E.Issue(view_nm, view_act);
          ctx = {
            p: p,
            r: r,
            i: i,
            m: mg
          };
          ans = E[view_nm](ctx, view_act, master_data);
          d_cb = function() {
            var ref6;
            ref6 = ctx.r;
            for (nm in ref6) {
              val = ref6[nm];
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
        var choice, k, l, len1, matches, next_node, ref1, ref2, ref3, val;
        if (action_node.go != null) {
          E.App().go(action_node.go);
        }
        next_node = null;
        if (action_node.next == null) {
          action_node.next = [];
        }
        if ('A' !== type_oau(action_node.next)) {
          action_node.next = [action_node.next];
        }
        ref1 = action_node.next;
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          choice = ref1[l];
          if (!('when' in choice)) {
            next_node = choice;
            break;
          }
          if (choice.when === 'default') {
            next_node = choice;
            break;
          }
          if ((typeof choice.when) === 'string' && choice.when === ((ref2 = master_data.success) != null ? ref2 : master_data.ok)) {
            next_node = choice;
            break;
          }
          matches = true;
          ref3 = choice.when;
          for (k in ref3) {
            val = ref3[k];
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
      var fist, l, len1, rec, ref1, results;
      for (l = 0, len1 = appconfs.length; l < len1; l++) {
        nm = appconfs[l];
        fist = (ref1 = E['fist$' + nm]) != null ? ref1 : {};
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
      results = [];
      for (nm in fieldDef) {
        rec = fieldDef[nm];
        results.push(rec.fieldNm = nm);
      }
      return results;
    };
    issueMap = {};
    issueInit = function() {
      var issues, l, len1, ref1, results;
      results = [];
      for (l = 0, len1 = appconfs.length; l < len1; l++) {
        nm = appconfs[l];
        issues = (ref1 = E['issues$' + nm]) != null ? ref1 : {};
        results.push(merge(issueMap, issues));
      }
      return results;
    };
    wistDef = {};
    wistInit = function() {
      var l, len1, ref1, results, wists;
      results = [];
      for (l = 0, len1 = appconfs.length; l < len1; l++) {
        nm = appconfs[l];
        wists = (ref1 = E['wist$' + nm]) != null ? ref1 : {};
        results.push(merge(wistDef, wists));
      }
      return results;
    };
    ref1 = {
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
    for (nm in ref1) {
      obj = ref1[nm];
      E[nm] = obj;
    }
    return E;
  };

  Issue = (function() {
    function Issue(t_view1, t_action1) {
      this.t_view = t_view1;
      this.t_action = t_action1;
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
      var f, issue, j, len, new_issue, ref;
      f = ':Issue.addObj:' + this.t_view + '#' + this.t_action;
      if (typeof issue_obj !== 'object' || !('issue_list' in issue_obj)) {
        return;
      }
      ref = issue_obj.issue_list;
      for (j = 0, len = ref.length; j < len; j++) {
        issue = ref[j];
        new_issue = E.merge({}, issue);
        if (new_issue.t_view == null) {
          new_issue.t_view = this.t_view;
        }
        if (new_issue.t_action == null) {
          new_issue.t_action = this.t_action;
        }
        this.issue_list.push(new_issue);
      }
    };

    Issue.prototype.count = function() {
      return this.issue_list.length;
    };

    Issue.prototype.asTable = function() {
      var final, issue, j, len, ref;
      final = [];
      ref = this.issue_list;
      for (j = 0, len = ref.length; j < len; j++) {
        issue = ref[j];
        final.push({
          view: issue.t_view,
          action: issue.t_action,
          token: issue.token,
          title: issue.t_view + "#" + issue.t_action + "#" + issue.token + "#" + (issue.more.join(',')),
          issue: this.map(issue.t_view, issue.t_action, issue.token, issue.more)
        });
      }
      return final;
    };

    Issue.prototype.map = function(t_view, t_action, token, more) {
      var j, l, len, len1, map, map_list, ref, spec, sub_map;
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
      for (j = 0, len = map_list.length; j < len; j++) {
        sub_map = map_list[j];
        ref = sub_map || [];
        for (l = 0, len1 = ref.length; l < len1; l++) {
          spec = ref[l];
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
    function ModelJS(view_nm1, options1, ss) {
      this.view_nm = view_nm1;
      this.options = options1;
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
      var deleted_tbl_nms, f, j, len, nm;
      f = ':ModelJS.invalidateTables~' + this.view_nm;
      if (not_tbl_names == null) {
        not_tbl_names = [];
      }
      if (tbl_nms === true) {
        tbl_nms = (function() {
          var results;
          results = [];
          for (nm in this.Table) {
            if (!(indexOf.call(not_tbl_names, nm) >= 0)) {
              results.push(nm);
            }
          }
          return results;
        }).call(this);
      }
      deleted_tbl_nms = [];
      for (j = 0, len = tbl_nms.length; j < len; j++) {
        nm = tbl_nms[j];
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

    ModelJS.prototype.route = function(options) {
      return E.option.m7(this.view_nm, options);
    };

    return ModelJS;

  })();

  w = typeof window !== "undefined" ? window : {};

  w.EpicMvc = w.E = new app(w);

  ref = {
    Issue: Issue,
    ModelJS: ModelJS
  };
  for (nm in ref) {
    klass = ref[nm];
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

/*Base/app.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
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

/*Base/Model/App.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var App$Base,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  App$Base = (function(superClass) {
    extend(App$Base, superClass);

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
      var ref, ref1;
      if (((ref = this.issues) != null ? ref.count : void 0) !== 0) {
        this.issues = new E.Issue(this.view_nm);
        this.invalidateTables(['Issue']);
      }
      if (((ref1 = this.messages) != null ? ref1.count : void 0) !== 0) {
        this.messages = new E.Issue(this.view_nm);
        return this.invalidateTables(['Message']);
      }
    };

    App$Base.prototype.goTo = function(flow, t, s) {
      var f, was;
      f = 'goTo';
      was = this.f + "/" + this.t + "/" + this.s;
      this.f = flow;
      this.t = t;
      this.s = s;
      _log2(f, {
        was: was,
        is: this.f + "/" + this.t + "/" + this.s
      });
      if (was !== (this.f + "/" + this.t + "/" + this.s)) {
        return this.invalidateTables(['V']);
      }
    };

    App$Base.prototype.go = function(path) {
      var f, flow, ref, s, t;
      f = 'go:' + path;
      ref = path.split('/'), flow = ref[0], t = ref[1], s = ref[2];
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
      var code, f, i, m, path, q, r, ref, route;
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
          ref = p.hash.split('~'), route = ref[0], code = ref[1];
          if (code != null) {
            return E.merge(r, {
              type: 'code',
              route: route,
              code: code
            });
          } else {
            path = E.appSearchAttr('route', route);
            if (path === false) {
              r.success = 'FAIL';
              return E.merge(r, {
                type: 'route',
                route: route
              });
            } else {
              return E.merge(r, {
                type: 'path',
                route: route,
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

/*Base/Model/Fist.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var Fist,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Fist = (function(superClass) {
    extend(Fist, superClass);

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
            if (p.val === false) {
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
      var ref, token;
      token = check;
      if ('A' !== E.type_oau(token)) {
        token = [token, field.nm, (ref = field.label) != null ? ref : field.nm, field.issue_text];
      }
      field.issue = new E.Issue(field.fistNm, field.nm);
      return field.issue.add(token[0], token.slice(1));
    };

    Fist.prototype.fistClear = function(fistNm, row) {
      var rnm;
      rnm = fistNm + (row ? ':' + row : '');
      if (rnm in this.fist) {
        delete this.fist[rnm];
        return this.invalidateTables([rnm]);
      }
    };

    Fist.prototype.fistValidate = function(ctx, fistNm, row) {
      var ans, errors, f, field, fieldNm, fist, hval, invalidate, nm, r, ref, ref1, ref2;
      f = 'fistValidate:' + fistNm + (row != null ? ':' + row : '');
      _log2(f);
      r = ctx;
      fist = this._getFist(fistNm, row);
      errors = 0;
      ref = fist.ht;
      for (fieldNm in ref) {
        field = ref[fieldNm];
        hval = E.fistH2H(field, field.hval);
        if (hval !== field.hval) {
          field.hval = hval;
          invalidate = true;
        }
        if (true !== E.fistVAL(field, field.hval)) {
          errors++;
        }
      }
      ref1 = fist.ht;
      for (fieldNm in ref1) {
        field = ref1[fieldNm];
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
        ref2 = fist.db;
        for (nm in ref2) {
          field = ref2[nm];
          ans[nm] = E.fistH2D(field, field.hval);
        }
      }
      _log2(f, 'result', r, ans);
      if (invalidate === true) {
        this.invalidateTables([fist.rnm]);
      }
    };

    Fist.prototype.loadTable = function(tbl_nm) {
      var Control, Field, any_req, baseFistNm, field, fieldNm, fist, i, ix, len, ref, ref1, row;
      ref = tbl_nm.split(':'), baseFistNm = ref[0], row = ref[1];
      fist = this._getFist(baseFistNm, row);
      Field = {};
      Control = [];
      any_req = false;
      ref1 = fist.sp.FIELDS;
      for (ix = i = 0, len = ref1.length; i < len; ix = ++i) {
        fieldNm = ref1[ix];
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
      var choice_type, choices, defaults, f, fl, i, ref, ref1, rows, s;
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
      ref = fl.type.split(':'), fl.type = ref[0], choice_type = ref[1];
      fl.id = 'U' + E.nextCounter();
      fl.value = field.hval;
      if (fl.type === 'yesno') {
        if (fl.cdata == null) {
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
        for (ix = i = 0, ref1 = choices.options.length; 0 <= ref1 ? i < ref1 : i > ref1; ix = 0 <= ref1 ? ++i : --i) {
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
      var db_value_hash, f, field, fieldNm, fist, i, len, nm, rec, ref, ref1, ref2, ref3, rnm;
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
        ref = fist.sp.FIELDS;
        for (i = 0, len = ref.length; i < len; i++) {
          fieldNm = ref[i];
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
        ref1 = fist.ht;
        for (fieldNm in ref1) {
          rec = ref1[fieldNm];
          if (rec.confirm != null) {
            fist.ht[rec.confirm].confirm_src = fieldNm;
          }
        }
        this.fist[rnm] = fist;
      } else {
        fist = this.fist[rnm];
      }
      if (fist.st === 'new') {
        db_value_hash = (ref2 = E[E.appFist(p_fist)]().fistGetValues(p_fist, p_row)) != null ? ref2 : {};
        ref3 = fist.db;
        for (nm in ref3) {
          field = ref3[nm];
          field.hval = E.fistD2H(field, db_value_hash[nm]);
        }
        fist.st = 'loaded';
      }
      return fist;
    };

    Fist.prototype._getChoices = function(type, fist, field) {
      var i, j, len, len1, opt_col, options, rec, ref, ref1, ref2, row, val_col, values, wistNm;
      options = [];
      values = [];
      switch (type) {
        case 'array':
          ref = field.cdata;
          for (i = 0, len = ref.length; i < len; i++) {
            rec = ref[i];
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
          ref1 = field.cdata.split(':'), wistNm = ref1[0], val_col = ref1[1], opt_col = ref1[2];
          ref2 = E.Wist(wistNm);
          for (j = 0, len1 = ref2.length; j < len1; j++) {
            row = ref2[j];
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
    var i, len, ref, str;
    val = E.fistH2H$pre(field, val);
    ref = field.h2h;
    for (i = 0, len = ref.length; i < len; i++) {
      str = ref[i];
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
    var ref;
    if (field.d2h) {
      return E['fistD2H$' + field.d2h](field, val);
    } else {
      return (ref = val != null ? val : field["default"]) != null ? ref : '';
    }
  };

  E.fistVAL = function(field, val) {
    var check, ref, ref1, ref2, token;
    delete field.issue;
    check = true;
    E.option.fi3(field, val);
    if (val.length === 0) {
      if (field.req === true) {
        check = field.req_text ? ['FIELD_EMPTY_TEXT', field.nm, (ref = field.label) != null ? ref : field.nm, field.req_text] : ['FIELD_EMPTY', field.nm, (ref1 = field.label) != null ? ref1 : field.nm];
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
        token = [token, field.nm, (ref2 = field.label) != null ? ref2 : field.nm, field.issue_text];
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

/*Base/Model/Tab.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var Tab,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Tab = (function(superClass) {
    extend(Tab, superClass);

    function Tab(view_nm, options) {
      Tab.__super__.constructor.call(this, view_nm, options);
      this.tabs = E.merge({
        Modal: {
          backdrop: false
        }
      }, options);
    }

    Tab.prototype.event = function(name, type, groupNm, itemNm, data) {
      var changed, f, group, ref;
      f = 'event';
      _log2(f, {
        name: name,
        type: type,
        groupNm: groupNm,
        itemNm: itemNm,
        data: data
      });
      group = this._getTab(groupNm, itemNm);
      type = (ref = group.TYPE) != null ? ref : groupNm;
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
      var base, base1;
      if ((base = this.tabs)[groupNm] == null) {
        base[groupNm] = {};
      }
      if (itemNm != null) {
        if ((base1 = this.tabs[groupNm])[itemNm] == null) {
          base1[itemNm] = false;
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

  E.ex$collapse = function(el, isInit, ctx, val, p1, p2) {
    var f, g, height, i, ref;
    f = 'A_ex_collapse';
    ref = val.split(':'), g = ref[0], i = ref[1];
    _log2(f, {
      g: g,
      i: i,
      sH: el.scrollHeight,
      g_row: (E.Tab(g))[0]
    });
    height = (E.Tab(g))[0][i] ? el.scrollHeight : 0;
    return el.style.height = (String(height)) + 'px';
  };

}).call(this);

/*Base/Model/View.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var View$Base,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  View$Base = (function(superClass) {
    extend(View$Base, superClass);

    function View$Base(view_nm, options) {
      this.ex = bind(this.ex, this);
      this.T_if = bind(this.T_if, this);
      this.T_page = bind(this.T_page, this);
      this.handleIt = bind(this.handleIt, this);
      var frames, ix, nm;
      View$Base.__super__.constructor.call(this, view_nm, options);
      frames = E.appGetSetting('frames');
      this.frames = (function() {
        var i, len, ref, results;
        ref = ((function() {
          var results1;
          results1 = [];
          for (nm in frames) {
            results1.push(nm);
          }
          return results1;
        })()).sort();
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          ix = ref[i];
          results.push(frames[ix]);
        }
        return results;
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
        this.defer_it = {
          promise: null,
          resolve: null
        };
        this.defer_it.promise = new Promise((function(_this) {
          return function(resolve, reject) {
            return _this.defer_it.resolve = resolve;
          };
        })(this));
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
      var f, flow, layout, modal, ref, ref1, ref2, step, track, who;
      f = 'run';
      who = 'R';
      ref = E.App().getStepPath(), flow = ref[0], track = ref[1], step = ref[2];
      if (modal = E.appFindAttr(flow, track, step, 'modal')) {
        modal = (ref1 = (E.appGetSetting('modals'))[modal]) != null ? ref1 : modal;
      }
      layout = modal != null ? modal : E.appGetSetting('layout', flow, track, step);
      this.N = {};
      this.modal = modal ? true : false;
      this.page_name = (ref2 = (E.appGetS(flow, track, step)).page) != null ? ref2 : step;
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
      var f, nm, results;
      f = 'restoreInfo';
      this.resetInfo();
      this.P = saved_info.P;
      this.I = saved_info.I;
      results = [];
      for (nm in this.I) {
        if (!(nm in this.R)) {
          results.push(this.R[nm] = this._getMyRow(this.I[nm]));
        }
      }
      return results;
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
      var f, i, len, p, rVal, ref;
      f = 'Base:M/View.getTable:' + nm;
      switch (nm) {
        case 'If':
          return [this.N];
        case 'Part':
          rVal = {};
          ref = this.P;
          for (i = 0, len = ref.length; i < len; i++) {
            p = ref[i];
            E.merge(rVal, p);
          }
          return [rVal];
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


    /* JCS: TODO FIGURE OUT IF DYNAMIC OR DEFER IS REALLY EVER NEEDED AGAIN - MITHRIL MAKES EVERYTHING DYNAMIC, NO? AND DATA-EX-* ATTRS DO DEFER, YES?
    	#JCS:DEFER:DYNAMIC
    	 * Wraper for page/part content which needs special treatment (dyanmic='div', epic:defer's, etc.)
    	wrap: (view, attrs, content, defer, has_root)->
    		f= 'wrap'
    		if defer.length
    			inside= E.merge [], defer
    			attrs.config= (element, isInit, context) =>
    				f= 'Base:M/View..config:'+ view
    				for defer in inside
    					_log2 f, defer
    					@doDefer defer, element, isInit, context
    		if 'dynamic' of attrs # Always render the container, even if content is null
    			tag: attrs.dynamic, attrs: attrs, children: content
    		else
    			return '' unless content
    			if has_root
    				 * TODO WHAT IS GOING ON WITH attrs TO wrap IF CONTENT HAS ATTRS? (part=)
    				_log2 f, 'has-root-content', {view,attrs,content,defer,has_root}
    				BLOWUP() if 'A' isnt E.type_oau content
    				 * TODO E2 FIGURE OUT WHY I COMMENTED THIS OUT; ALSO, PLAN IS TO USE DATA-EX-* ATTRS PER ELEMENT, NOT <E-DEFER
    				#content[0].attrs.config= attrs.config # Pass the defer logic to the part's div
    				content
    			else
    				tag: 'div', attrs: attrs, children: content
    	doDefer: (defer_obj, element, isInit, context) =>
    		if 'A' is E.type_oau defer_obj.defer
    			_log2 'WARNING', 'Got an array for defer', defer_obj.defer
    			return 'WAS-ARRAY'
    		defer_obj.func element, isInit, context, defer_obj.attrs if defer_obj.func
    	T_defer: ( attrs, content) -> # TODO IMPLEMENT DEFER LOGIC ATTRS?
    		f= 'Base:M/View.T_defer:'
    		f_content= @handleIt content
    		#_log f, content, f_content
    		 * When epic tags are inside defer, you get nested arrays that need to be joined (w/o commas)
    		if 'A' is E.type_oau f_content
    			sep= ''
    			ans= ''
    			joiner= (a) ->
    				for e in a
    					if 'A' is E.type_oau e then joiner e else ans+= sep+ e
    			joiner f_content
    			#_log f, 'join', ans
    			f_content= ans
    		@D[ @D.length- 1].push {attrs, func: new Function 'element', 'isInit', 'context', 'attrs', f_content}
    		'' # No content to display for these
     */

    View$Base.prototype.handleIt = function(content) {
      var f;
      f = 'handleIt';
      if (typeof content === 'function') {
        content = content();
      }
      return content;
    };

    View$Base.prototype.formatFromSpec = function(val, spec, custom_spec) {
      var f, left, ref, right, str;
      f = 'formatFromSpec';
      switch (spec) {
        case '':
          if (custom_spec) {
            E.option.v2(val, custom_spec);
            return E.custom_filter(val, custom_spec);
          } else {
            return val;
          }
          break;
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
            ref = spec.slice(1).split('?'), left = ref[0], right = ref[1];
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
      var ans, f, i, ix, kid, len, out, who;
      f = 'kids';
      who = 'K';
      out = [];
      for (ix = i = 0, len = kids.length; i < len; ix = ++i) {
        kid = kids[ix];
        if ('A' === E.type_oau(kid)) {
          out.push(ix);
          ans = this['T_' + kid[0]](kid[1], kid[2]);
          if (ans != null ? ans.then : void 0) {
            this.nest_up(who);
            (function(_this) {
              return (function(ix) {
                return ans.then(function(result) {
                  out[ix] = result;
                  return _this.nest_dn(who);
                }, function(err) {
                  console.error('kids', err);
                  out[ix] = err.message;
                  return _this.nest_dn(who);
                });
              });
            })(this)(ix);
          } else {
            out[ix] = ans;
          }
        } else {
          out.push(kid);
        }
      }
      return out;
    };

    View$Base.prototype.loadPartAttrs = function(attrs, full) {
      var attr, f, result, val;
      f = 'Base:M/View.loadPartAttrs';
      result = {};
      for (attr in attrs) {
        val = attrs[attr];
        if ('data-e-' !== attr.slice(0, 7)) {
          continue;
        }
        result[full ? attr : attr.slice(7)] = val;
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
      var can_componentize, content, f, saved_info;
      f = 'piece_handle';
      if (obj != null ? obj.then : void 0) {
        return this.D_piece(view, attrs, obj, is_part);
      }
      content = obj.content, can_componentize = obj.can_componentize;
      saved_info = this.saveInfo();
      this.P.push(this.loadPartAttrs(attrs));
      content = this.handleIt(content);
      this.restoreInfo(saved_info);
      return content;

      /* JCS:DEFER:DYNAMIC 
      		defer= @D.pop()
      		#_log2 f, 'defer', view, defer
      		if can_componentize or not is_part or attrs.dynamic or defer.length
      			#_log2 f, 'defer YES', view, defer
      			if defer.length and not can_componentize and not attrs.dynamic
      				_log2 "WARNING: DEFER logic in (#{view}); wrapping DIV tag."
      			result= @wrap view, attrs, content, defer, can_componentize
      		else
      			#_log2 f, 'defer NO!', view, defer
      			result= content
      		result
       */
    };

    View$Base.prototype.D_piece = function(view, attrs, d_load, is_part) {
      var d_result, f, saved_info, who;
      f = 'D_piece';
      who = 'P';
      this.nest_up(who + view);
      saved_info = this.saveInfo();
      d_result = d_load.then((function(_this) {
        return function(obj) {
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
        };
      })(this), (function(_this) {
        return function(err) {
          console.error('D_piece', err);
          _this.nest_dn(who + view + ' IN-ERROR');
          return typeof _this._Err === "function" ? _this._Err('tag', 'page/part', attrs, err) : void 0;
          throw err;
        };
      })(this));
      return d_result;
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
      var is_true, issue, ref, ref1, tbl;
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
          if (ref = attrs.val, indexOf.call(attrs.in_list.split(','), ref) >= 0) {
            is_true = true;
          }
        } else if ('not_in_list' in attrs) {
          if (ref1 = attrs.val, indexOf.call(attrs.not_in_list.split(','), ref1) < 0) {
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
      var lh, ref, rh, rh_alias, root, tbl;
      ref = at_table.split('/'), lh = ref[0], rh = ref[1];
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
      var count, f, i, len, limit, ref, result, rh_alias, row, tbl;
      f = 'T_foreach';
      ref = this._accessModelTable(attrs.table, attrs.alias), tbl = ref[0], rh_alias = ref[1];
      if (tbl.length === 0) {
        return '';
      }
      result = [];
      limit = 'limit' in attrs ? Number(attrs.limit) - 1 : tbl.length;
      for (count = i = 0, len = tbl.length; i < len; count = ++i) {
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
      var ans, content, f, fist, foreach_attrs, masterAlias, model, part, ref, ref1, ref2, ref3, ref4, ref5, ref6, rh_1, rh_alias, subTable, table, tbl;
      f = 'T_fist';
      _log2(f, attrs, content_f);
      fist = E.fistDef[attrs.fist];
      model = (ref = fist.event) != null ? ref : 'Fist';
      table = attrs.fist + (attrs.row != null ? ':' + attrs.row : '');
      subTable = (ref1 = (ref2 = attrs.via) != null ? ref2 : fist.via) != null ? ref1 : 'Control';
      masterAlias = 'Fist';
      ref3 = this._accessModelTable(model + '/' + table, masterAlias), tbl = ref3[0], rh_alias = ref3[1];
      _log2(f, 'tbl,rh_alias (master)', tbl, rh_alias);
      this.R[rh_alias] = tbl[0];
      this.I[rh_alias].c = 0;
      rh_1 = rh_alias;
      content = content_f ? content_f : (part = (ref4 = (ref5 = attrs.part) != null ? ref5 : fist.part) != null ? ref4 : 'fist_default', attrs.part != null ? attrs.part : attrs.part = (ref6 = fist.part) != null ? ref6 : 'fist_default', (function(_this) {
        return function() {
          return _this.kids([
            [
              'part', E.merge({
                part: part
              }, _this.loadPartAttrs(attrs, true))
            ]
          ]);
        };
      })(this));
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

    View$Base.prototype.ex = function(el, isInit, ctx) {
      var attrs, d, e, f, i, ix, nm, p1, p2, ref, ref1, results, val;
      f = 'ex';
      attrs = el.attributes;
      results = [];
      for (ix = i = 0, ref = attrs.length; 0 <= ref ? i < ref : i > ref; ix = 0 <= ref ? ++i : --i) {
        if (!('data-ex-' === attrs[ix].name.slice(0, 8))) {
          continue;
        }
        ref1 = attrs[ix].name.split('-'), d = ref1[0], e = ref1[1], nm = ref1[2], p1 = ref1[3], p2 = ref1[4];
        val = attrs[ix].value;
        _log2(f, attrs[ix].name, val, p1, p2);
        E.option.ex1(nm, attrs[ix].name);
        results.push(E['ex$' + nm](el, isInit, ctx, val, p1, p2));
      }
      return results;
    };

    return View$Base;

  })(E.ModelJS);

  E.Model.View$Base = View$Base;

}).call(this);

/*Base/Model/Wist.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var Wist,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Wist = (function(superClass) {
    extend(Wist, superClass);

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

/*Base/Extra/dataAction.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var dataAction,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  dataAction = function(type, data_action, data_params) {
    var action_specs, base, do_action, f, group, i, interesting, item, len, one_spec, prevent, ref, spec_action, spec_type;
    f = 'Base:E/dataAction:on[data-e-action]' + type;
    if (typeof (base = E.option).activity === "function") {
      base.activity(type);
    }
    action_specs = data_action.split(',');
    do_action = true;
    prevent = false;
    for (i = 0, len = action_specs.length; i < len; i++) {
      one_spec = action_specs[i];
      ref = one_spec.split(':'), spec_type = ref[0], spec_action = ref[1], group = ref[2], item = ref[3], interesting = ref[4];
      if (!spec_action) {
        spec_action = spec_type;
        spec_type = 'click';
      }
      _log2(f, 'check', spec_type, type, spec_type === type ? 'YES' : 'NO');
      if (spec_type === 'event') {
        E.event(spec_action, type, group, item, interesting, data_params);
      }
      if (do_action && spec_type === type) {
        if (spec_type === 'click' || spec_type === 'rclick') {
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
    var event_names, ref;
    if (interesting !== 'all') {
      event_names = interesting.split('-');
      if (indexOf.call(event_names, type) < 0) {
        return;
      }
    }
    if (name === 'Fist') {
      name = (ref = E.fistDef[group].event) != null ? ref : name;
    }
    return E[name]().event(name, type, group, item, params);
  };

}).call(this);

/*Base/Extra/LoadStrategy.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var LoadStrategy$Base;

  LoadStrategy$Base = (function() {
    function LoadStrategy$Base(appconfs) {
      var i;
      this.reverse_packages = (function() {
        var j, ref, results1;
        results1 = [];
        for (i = j = ref = appconfs.length - 1; ref <= 0 ? j <= 0 : j >= 0; i = ref <= 0 ? ++j : --j) {
          results1.push(appconfs[i]);
        }
        return results1;
      })();
    }

    LoadStrategy$Base.prototype.getArtifact = function(nm, type) {
      var j, len, pkg, ref, ref1, ref2, ref3, results;
      results = false;
      ref = this.reverse_packages;
      for (j = 0, len = ref.length; j < len; j++) {
        pkg = ref[j];
        results = (ref1 = (ref2 = E['view$' + pkg]) != null ? (ref3 = ref2[type]) != null ? ref3[nm] : void 0 : void 0) != null ? ref1 : false;
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
      return Promise.resolve();
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

/*Base/Extra/RenderStrategy.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var ENTER_KEY, ESCAPE_KEY, RenderStrategy$Base,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ENTER_KEY = 13;

  ESCAPE_KEY = 27;

  RenderStrategy$Base = (function() {
    function RenderStrategy$Base() {
      this.m_redraw = bind(this.m_redraw, this);
      this.onPopState = bind(this.onPopState, this);
      this.handleEvent = bind(this.handleEvent, this);
      var baseDiv, modalDiv, s;
      this.very_first = true;
      this.was_popped = false;
      this.was_modal = false;
      this.touchEndIsClick = false;
      this.touchBoundary = 10;
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
      setTimeout(((function(_this) {
        return function() {
          return _this.onPopState(true);
        };
      })(this)), 0);
      window.onpopstate = this.onPopState;
      this.redraw_guard = 0;
      s = m.redraw.strategy;
      m.redraw = this.m_redraw;
      m.redraw.strategy = s;
      this.init();
      true;
    }

    RenderStrategy$Base.prototype.handleEvent = function(event_obj) {
      var attrs, data_action, data_params, f, files, i, ix, j, len, nm, old_params, prevent, rec, ref, ref1, ref2, ref3, target, touch, type, val, x, y;
      f = 'E/RenderStrategy.handleEvent: ';
      _log2(f, 'top', this.redraw_guard, (event_obj != null ? event_obj : window.event).type);
      if (event_obj == null) {
        event_obj = window.event;
      }
      type = event_obj.type;
      if (type === 'input') {
        type = 'change';
      }
      if (type === 'mousedown') {
        if (event_obj.which === 1 || event_obj.button === 1) {
          type = 'click';
        } else if (event_obj.which === 3 || event_obj.button === 2) {
          type = 'rclick';
        } else {
          return;
        }
      }
      if (type === 'keyup' && event_obj.keyCode === 9) {
        return;
      }
      switch (type) {
        case 'keyup':
          switch (event_obj.keyCode) {
            case ENTER_KEY:
              type = 'enter';
              break;
            case ESCAPE_KEY:
              type = 'escape';
          }
          break;
        case 'touchstart':
          touch = event.targetTouches[0];
          this.touchEndIsClick = [touch.pageX, touch.pageY];
          return true;
        case 'touchmove':
          if (this.touchEndIsClick !== false) {
            ref = this.touchEndIsClick, x = ref[0], y = ref[1];
            touch = event.targetTouches[0];
            if ((Math.abs(touch.pageX - x)) > this.touchBoundary || (Math.abs(touch.pageY - y)) > this.touchBoundary) {
              this.touchEndIsClick = false;
            }
          }
          return true;
        case 'touchend':
          if (this.touchEndIsClick !== false) {
            type = 'click';
          }
          this.touchEndIsClick = false;
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
      for (ix = i = 0, ref1 = attrs.length; 0 <= ref1 ? i < ref1 : i > ref1; ix = 0 <= ref1 ? ++i : --i) {
        if (!('data-e-' === attrs[ix].name.slice(0, 7))) {
          continue;
        }
        if ('action' === (nm = attrs[ix].name.slice(7))) {
          continue;
        }
        data_params[nm] = attrs[ix].value;
      }
      val = target.value;
      if (target.type === 'checkbox' && target.checked === false) {
        val = false;
      }
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
      ref2 = ['touches', 'changedTouches', 'targetTouches'];
      for (j = 0, len = ref2.length; j < len; j++) {
        nm = ref2[j];
        if (nm in event_obj) {
          data_params[nm] = event_obj[nm];
        }
      }
      old_params = target.getAttribute('data-params');
      if (old_params) {
        ref3 = JSON.parse(old_params);
        for (nm in ref3) {
          rec = ref3[nm];
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
      var event_name, i, interesting, len, results;
      interesting = ['mousedown', 'dblclick', 'keyup', 'blur', 'focus', 'change', 'input', 'touchstart', 'touchmove', 'touchend'];
      results = [];
      for (i = 0, len = interesting.length; i < len; i++) {
        event_name = interesting[i];
        results.push(document.body.addEventListener(event_name, this.handleEvent, true));
      }
      return results;
    };

    RenderStrategy$Base.prototype.UnloadMessage = function(ix, msg) {
      var new_msg, nm, rec;
      if (msg) {
        this.unloadMsgs[ix] = msg;
      } else {
        delete this.unloadMsgs[ix];
      }
      new_msg = (function() {
        var ref, results;
        ref = this.unloadMsgs;
        results = [];
        for (nm in ref) {
          rec = ref[nm];
          results.push(rec);
        }
        return results;
      }).call(this);
      new_msg = new_msg.length ? new_msg.join("\n") : null;
      return window.onbeforeunload = function() {
        return new_msg;
      };
    };

    RenderStrategy$Base.prototype.onPopState = function(event) {
      var f;
      f = 'E/RenderStrategy.onPopState: ';
      _log2(f, {
        was_popped: this.was_popped,
        very_first: this.very_first
      }, true, {
        state: event === true ? 'X' : event.state
      });
      if (event === true || !event.state) {
        if (this.was_popped || !this.very_first) {
          E.action('browser_rehash', {
            hash: location.hash.substr(1)
          });
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
        E.action('browser_navhash', {
          hash: location.hash.substr(1)
        });
      }
    };

    RenderStrategy$Base.prototype.m_redraw = function() {
      var f;
      f = 'E/RenderStrategy.m_redraw: ';
      this.redraw_guard++;
      if (this.redraw_guard !== 1) {
        _log2(f, 'GUARD REDRAW', this.redraw_guard);
        return;
      }
      return E.View().run().then((function(_this) {
        return function(modal_content) {
          var content, modal;
          modal = modal_content[0], content = modal_content[1];
          _log2(f, 'DEFER-R', 'RESULTS: modal, content', _this.redraw_guard, modal, content);
          _this.render(modal, content);
          _this.redraw_guard--;
          if (_this.redraw_guard !== 0) {
            _this.redraw_guard = 0;
            return setTimeout((function() {
              return _this.m_redraw();
            }), 16);
          }
        };
      })(this)).then(null, (function(_this) {
        return function(err) {
          return console.error('RenderStrategy$Base m_redraw', err);
        };
      })(this));
    };

    RenderStrategy$Base.prototype.render = function(modal, content) {
      var container, f, start;
      f = 'E/RenderStrategy.render: ';
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
      var base, base1, displayHash, f, history, model_state, new_hash, path, route, str_path;
      path = E.App().getStepPath();
      str_path = path.join('/');
      history = str_path === this.last_path ? 'replace' : true;
      f = 'E/RenderStrategy.handleRenderState:' + history + ':' + str_path;
      _log2(f, {
        vf: this.very_first,
        wp: this.was_popped
      });
      if (!history) {
        return;
      }
      displayHash = '';
      new_hash = false;
      route = E.appFindAttr(path[0], path[1], path[2], 'route');
      if ((E.type_oau(route)) === 'O' && 'model' in route) {
        new_hash = E[route.model]().route(route);
      }
      if (typeof route === 'string') {
        new_hash = route;
      }
      if (new_hash !== false) {
        displayHash = new_hash;
      }
      model_state = E.getModelState();
      if (window.location.protocol !== 'file:') {
        if (this.very_first || history === 'replace') {
          if (typeof (base = window.history).replaceState === "function") {
            base.replaceState(model_state, displayHash, '#' + displayHash);
          }
        } else if (!this.was_popped && history === true) {
          if (typeof (base1 = window.history).pushState === "function") {
            base1.pushState(model_state, displayHash, '#' + displayHash);
          }
          window.document.title = displayHash;
        }
      }
      this.last_path = str_path;
    };

    return RenderStrategy$Base;

  })();

  E.Extra.RenderStrategy$Base = RenderStrategy$Base;

}).call(this);

/*Base/Extra/RestAPI.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var RestAPI;

  RestAPI = (function() {
    function RestAPI(opts) {
      var nm, port, prefix, val, version;
      this.opts = {
        port: '',
        prefix: '',
        version: '',
        proto: '//',
        app_headers: {}
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
      this.route_prefix = "" + this.opts.proto + this.opts.host + (port != null ? port : '') + (prefix != null ? prefix : '') + (version != null ? version : '') + "/";
      this.SetToken(false);
    }

    RestAPI.prototype.GetPrefix = function() {
      return this.route_prefix;
    };

    RestAPI.prototype.GetToken = function() {
      return this.token;
    };

    RestAPI.prototype.SetToken = function(token1) {
      this.token = token1;
    };

    RestAPI.prototype.D_Request = function(method, route, data, header_obj_in) {
      var f, header_obj, promise, status;
      f = 'E/RestAPI$Base.D_Request';
      header_obj = E.merge({}, this.opts.app_headers, header_obj_in != null ? header_obj_in : {});
      status = {
        code: false,
        text: false,
        ok: false
      };
      promise = new Promise((function(_this) {
        return function(resolve, reject) {
          var formData, nm, val, xhr;
          xhr = new XMLHttpRequest();
          xhr.onloadend = function(event) {
            var jResponse, response;
            status.code = xhr.status;
            status.text = xhr.statusText;
            status.xhr = xhr;
            if (xhr.status === 200) {
              status.ok = true;
            }
            if (!xhr.responseText.length) {
              status.text = 'NetworkError';
              response = '{"error":"NETWORK_ERROR"}';
            } else {
              response = xhr.responseText;
            }
            jResponse = JSON.parse(response);
            return resolve({
              status: status,
              data: jResponse
            });
          };
          xhr.open(method, _this.route_prefix + route);
          for (nm in header_obj) {
            val = header_obj[nm];
            xhr.setRequestHeader(nm, val);
          }
          formData = new FormData();
          for (nm in data) {
            val = data[nm];
            formData.append(nm, val);
          }
          return xhr.send(formData);
        };
      })(this));
      return promise.then(function(result) {
        console.log(f, result);
        return result;
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

    RestAPI.prototype.D_RequestAuth = function(method, route, data, header_obj_in) {
      var header_obj, token;
      token = this.GetToken();
      if (token === false) {
        setTimeout(function() {
          return E.action('Request.no_token');
        }, 0);
        return Promise.resolve({
          status: {
            code: 401,
            text: 'NO_TOKEN',
            ok: false
          },
          data: {
            error: 'TOKEN'
          }
        });
      }
      header_obj = E.merge({}, this.opts.app_headers, header_obj_in != null ? header_obj_in : {});
      header_obj.Authorization = token.token_type + " " + token.access_token;
      return (this.D_Request(method, route, data, header_obj)).then((function(_this) {
        return function(status_n_data) {
          if (status_n_data.status.code === 401) {
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
        };
      })(this));
    };

    return RestAPI;

  })();

  E.Extra.RestAPI$Base = RestAPI;

}).call(this);

E.view$Base={
Layout: {
"default":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([['page',{}]])}}},
Page: {
"default":{preloaded:1,can_componentize:true,defer:0,content:function(){return [{tag:'b',attrs:{},children:['A Base Page']}]}}},
Part: {
}};

/*Dev/app.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var err, warn,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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
      m3: function(view_nm, tbl_nm) {
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
      m7: function(view_nm, options) {
        err("Model (" + view_nm + ").route() needs to be implemented.");
      },
      ca1: function(action_token, original_path, action_node) {
        if (action_node != null) {
          return;
        }
        warn("No app. entry for action_token (" + action_token + ") on path (" + original_path + ")");
      },
      ca2: function(action_token, original_path, nms, data, action_node) {
        var i, len, nm;
        for (i = 0, len = nms.length; i < len; i++) {
          nm = nms[i];
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
        var fieldNm, fistNm, i, len, model, ref;
        fistNm = fist.nm;
        model = E.appFist(fistNm);
        if (model == null) {
          err("FIST is missing: app.js requires MODELS: <model-name>: fists:[...,'" + fistNm + "']", {
            fist: fist
          });
        }
        if (!fist.sp.FIELDS) {
          err("FIELDS attribute missing from FIST definition");
        }
        ref = fist.sp.FIELDS;
        for (i = 0, len = ref.length; i < len; i++) {
          fieldNm = ref[i];
          if (!(fieldNm in E.fieldDef)) {
            err("No such FIELD (" + fieldNm + ") found for FIST (" + fistNm + ")", {
              fist: fist
            });
          }
        }
      },
      fi2: function(field, fist) {
        var attr, familiar_types, filt, filtList, filtNm, i, j, len, len1, ref, ref1, ref2, str, type;
        str = "in FIELD (" + field.fieldNm + ") for FIST (" + field.fistNm + ")";
        ref = ['h2h', 'd2h', 'h2d', 'validate'];
        for (i = 0, len = ref.length; i < len; i++) {
          attr = ref[i];
          if (!(attr in field)) {
            continue;
          }
          type = attr === 'validate' ? 'VAL' : attr.toUpperCase();
          filtList = attr === 'h2h' ? field[attr] : [field[attr]];
          for (j = 0, len1 = filtList.length; j < len1; j++) {
            filtNm = filtList[j];
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
        familiar_types = ['radio', 'pulldown', 'text', 'textarea', 'password', 'hidden', 'yesno', 'search', 'email', 'url', 'tel', 'number', 'range', 'color', 'date', 'month', 'week', 'datetime', 'datetime-local'];
        if (ref1 = (field.type.split(':'))[0], indexOf.call(familiar_types, ref1) < 0) {
          warn("Unfamiliar 'type' attribute " + str);
        }
        if (field.confirm != null) {
          if (ref2 = field.confirm, indexOf.call(fist.sp.FIELDS, ref2) < 0) {
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
        err("Unknown variable specification/filter (#" + spec + ") Note: custom specs use ##");
        return val != null ? val : '';
      },
      v2: function(val, custom_spec) {
        if (typeof E.custom_filter === 'function') {
          return;
        }
        return err("Unknown custom specification/filter (##" + custom_spec + "). Note: uses ## and requires function E.custom_spec");
      },
      w1: function(wistNm) {
        if (wistNm in E.wistDef) {
          return;
        }
        err("Unknown Wist (" + wistNm + ").");
      },
      ex1: function(nm, attr) {
        if ('ex$' + nm in E) {
          return;
        }
        err("Unknown Mithril extension function (E.ex$" + nm + ") using attribute: " + attr + ".");
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

/*Dev/Model/Devl.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var Devl,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Devl = (function(superClass) {
    extend(Devl, superClass);

    function Devl(view_nm, options) {
      Devl.__super__.constructor.call(this, view_nm, options);
      this.opts = E.merge({
        file: false,
        tag: false,
        tag2: false,
        form: false,
        model: false,
        stack: false
      }, options);
      this.open_model = '';
      this.open_table = '';
      this.open_table_stack = [];
      this.table_row_cnt = 0;
      this.table_by_col = false;
      this.table_col = false;
      this.timer = false;
    }

    Devl.prototype.tableChange = function(view_nm, tbls) {
      if (view_nm === this.view_nm) {
        return;
      }
      if (this.timer !== false) {
        return;
      }
      return this.timer = setTimeout(((function(_this) {
        return function() {
          _this.timer = false;
          return _this.invalidateTables(['Model']);
        };
      })(this)), 10);
    };

    Devl.prototype.action = function(ctx, act, p) {
      var dummy, f, incr, ref;
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
          ref = this.open_table_stack.pop(), dummy = ref[0], this.table_row_cnt = ref[1], this.table_by_col = ref[2], this.table_col = ref[3];
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
      var cols, f, i, inst, is_sub, len, len1, nm, open, rcol, rec, rec_s, ref, ref1, row, row_inx, rrow, rval, sub_tnm, table, tnm, tnm_s, tref, trow;
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
            ref = E.oModel[inst].Table;
            for (tnm in ref) {
              rec = ref[tnm];
              tnm_s = tnm;
              rec_s = rec;
              open = false;
              is_sub = false;
              if (row.is_open === 'yes' && tnm === this.open_table) {
                open = true;
                if (this.open_table_stack.length) {
                  ref1 = this.open_table_stack;
                  for (i = 0, len1 = ref1.length; i < len1; i++) {
                    tref = ref1[i];
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
                  var results;
                  results = [];
                  for (rcol in rec_s[0]) {
                    results.push(rcol);
                  }
                  return results;
                })();
              } else {
                cols = [];
              }
              trow.cols = len ? cols.join(', ') : 'no rows';
              if (len && open) {
                if (!this.table_by_col) {
                  trow.Cols = (function() {
                    var ref2, results;
                    ref2 = rec_s[this.table_row_cnt];
                    results = [];
                    for (rcol in ref2) {
                      rval = ref2[rcol];
                      results.push({
                        type: (rval === null ? 'Null' : typeof rval),
                        col_ix: cols.indexOf(rcol),
                        col: rcol,
                        len: rval != null ? rval.length : void 0,
                        val: rval != null ? rval : '???'
                      });
                    }
                    return results;
                  }).call(this);
                } else {
                  trow.Rows = (function() {
                    var ref2, ref3, results;
                    results = [];
                    for (rrow in rec_s) {
                      results.push({
                        row: rrow,
                        len: (ref2 = rec_s[rrow][this.table_col]) != null ? ref2.length : void 0,
                        type: (rec_s[rrow][this.table_col] === null ? 'Null' : typeof rec_s[rrow][this.table_col]),
                        val: (ref3 = rec_s[rrow][this.table_col]) != null ? ref3 : '???'
                      });
                    }
                    return results;
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

/*Dev/Model/View.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var View,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  View = (function(superClass) {
    extend(View, superClass);

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
      var base, msg, prefix;
      if ((base = this.errors_cache)[type] == null) {
        base[type] = {};
      }
      if (!(key in this.errors_cache[type])) {
        this.errors_cache[type][key] = e;
        this.errors_cache._COUNT++;
        if (this.errors_cache._COUNT < 5) {
          _log2('### _Error type/key/e', type, key, e);
          msg = (((key + "\n\n" + e.message).replace(/&lt;/g, '<')).replace(/&gt;/g, '>')).replace(/&amp;/g, '&');
          prefix = type === 'v2' || type === 'v3' ? 'Variable reference' : 'Tag';
          return _log2("ERROR", prefix + " error (" + type + "):\n\n" + msg);
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
      var err, i, i_info, k, lh, nm, ref, ref1, rh, row, row_info, row_typ;
      ref = at_table.split('/'), lh = ref[0], rh = ref[1];
      if (lh in this.R) {
        row = this.R[lh];
        if (!(rh in row)) {
          row_info = (function() {
            switch (row_typ = E.type_oau(row)) {
              case 'O':
                row_info = ((function() {
                  var results;
                  results = [];
                  for (nm in row) {
                    results.push(nm);
                  }
                  return results;
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
          ref1 = {
            m: 'model',
            p: 'parent',
            c: 'count'
          };
          for (k in ref1) {
            nm = ref1[k];
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
      var c, e, g, inside, ref, ref1, ref2, v;
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
      } catch (_error) {
        e = _error;
        _log2('##### Error in form-part', (ref = oPt.attrs.part) != null ? ref : 'fist_default', e, e.stack);
        this._Error('form', this._TagText(oPt, true), e);
        return this._Err('tag', 'fist', attrs, e);
      }
      try {
        inside = '';
        if (this.Opts().form === true) {
          return this._Div('tag', oPt, inside, View.__super__.xT_fist.call(this, oPt));
        }
        if (this.Opts().file === true) {
          return "<div class=\"dbg-part-box\" title=\"" + ((ref1 = oPt.attrs.part) != null ? ref1 : 'fist_default') + ".part.html (" + oPt.attrs.form + ")\">.</div>" + (View.__super__.xT_fist.call(this, oPt));
        }
        return View.__super__.xT_fist.call(this, oPt);
      } catch (_error) {
        e = _error;
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in form-part', (ref2 = oPt.attrs.part) != null ? ref2 : 'fist_default', e, e.stack);
        this._Error('form_part', this._TagText(oPt, true), e);
        return this._Err('tag', 'fist', attrs, e);
      }
    };

    View.prototype.T_part = function(attrs) {
      var e;
      try {
        if (this.Opts().file !== true) {
          return View.__super__.T_part.call(this, attrs);
        }
        return [
          m('div.dbg-part-box', {
            title: "Part/" + attrs.part + ".html"
          }, '.'), View.__super__.T_part.call(this, attrs)
        ];
      } catch (_error) {
        e = _error;
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
      var e, letter, page, ref, type;
      try {
        if (this.Opts().file !== true) {
          return View.__super__.T_page.call(this, attrs);
        }
        ref = this.getLetTypPag(), letter = ref[0], type = ref[1], page = ref[2];
        return [
          {
            tag: 'div',
            attrs: {
              className: "dbg-part-box",
              title: type + "/" + page + ".html"
            },
            children: letter
          }, View.__super__.T_page.call(this, attrs)
        ];
      } catch (_error) {
        e = _error;
        _log2('##### Error in T_page', attrs, e);
        this._Error('page', this._TagText({
          tag: 'page',
          attrs: attrs
        }, true), e);
        return this._Err('page', 'page', attrs, e);
      }
    };

    View.prototype.v3 = function(view_nm, tbl_nm, col_nm, format_spec, custom_spec, give_error) {
      var e, key, t_custom_spec, t_format_spec, val;
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
      } catch (_error) {
        e = _error;
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
      var e, key, t_custom_spec, t_format_spec, val;
      if (!(tbl_nm in this.R)) {
        t_format_spec = format_spec || custom_spec ? '#' + format_spec : '';
        t_custom_spec = custom_spec ? '#' + custom_spec : '';
        key = '&' + tbl_nm + '/' + col_nm + t_format_spec + t_custom_spec + ';';
        throw new Error("No such Table (" + tbl_nm + ") evaluating " + key);
      }
      try {
        val = View.__super__.v2.call(this, tbl_nm, col_nm, format_spec, custom_spec, sub_nm);
      } catch (_error) {
        e = _error;
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
      var e, inside;
      try {
        if (this.Opts().tag2 !== true || this.in_defer) {
          return View.__super__.xT_if.call(this, oPt);
        }
        inside = '';
        return this._Div('tag', oPt, inside, View.__super__.xT_if.call(this, oPt));
      } catch (_error) {
        e = _error;
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        this._Error('if', this._TagText(oPt, true), e);
        return this._Err('tag', 'if', attrs, e);
      }
    };

    View.prototype.T_foreach = function(attrs, children) {
      var e, inside;
      try {
        if (attrs.table == null) {
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
      } catch (_error) {
        e = _error;
        return this._Err('tag', 'foreach', attrs, e);
      }
    };

    View.prototype.T_fist = function(attrs, children) {
      var e;
      try {
        return View.__super__.T_fist.call(this, attrs, children);
      } catch (_error) {
        e = _error;
        return this._Err('tag', 'fist', attrs, e);
      }
    };

    View.prototype.xT_explain = function(oPt) {
      return JSON.stringify(this.Epic.getViewTable(oPt.attrs.table));
    };

    View.prototype._TagText = function(tag, attrs, asError) {
      var attrs_array, key, letter, page, ref, type, val;
      ref = this.getLetTypPag(), letter = ref[0], type = ref[1], page = ref[2];
      attrs_array = [];
      for (key in attrs) {
        val = attrs[key];
        attrs_array.push(key + "=\"" + val + "\"");
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

/*Dev/Extra/LoadStrategy.coffee*/// Generated by CoffeeScript 1.9.2
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
        var j, ref, results;
        results = [];
        for (i = j = ref = this.appconfs.length - 1; ref <= 0 ? j <= 0 : j >= 0; i = ref <= 0 ? ++j : --j) {
          results.push(this.appconfs[i]);
        }
        return results;
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
      var el, f, file, file_list, j, k, l, len, len1, len2, len3, m, pkg, ref, ref1, ref2, ref3, ref4, ref5, sub, type, url, work;
      f = 'Dev:E/LoadStrategy.loadAsync';
      ref = this.appconfs;
      for (j = 0, len = ref.length; j < len; j++) {
        pkg = ref[j];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        ref2 = (ref1 = E['manifest$' + pkg]) != null ? ref1 : {};
        for (type in ref2) {
          file_list = ref2[type];
          if (type === 'css') {
            for (k = 0, len1 = file_list.length; k < len1; k++) {
              file = file_list[k];
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
      ref3 = this.appconfs;
      for (l = 0, len2 = ref3.length; l < len2; l++) {
        pkg = ref3[l];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        ref5 = (ref4 = E['manifest$' + pkg]) != null ? ref4 : {};
        for (type in ref5) {
          file_list = ref5[type];
          if (type !== 'css') {
            for (m = 0, len3 = file_list.length; m < len3; m++) {
              file = file_list[m];
              sub = type === 'root' ? '' : type + '/';
              url = (this.makePkgDir(pkg)) + '/' + sub + file + '.js';
              work.push(url);
            }
          }
        }
      }
      return new Promise(function(resolve, reject) {
        var next;
        next = function(ix) {
          if (ix >= work.length) {
            _log2(f, ix, 'done.');
            resolve(null);
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
        return next(0);
      });
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
      var f, r, ref, ref1;
      f = 'preLoaded';
      r = (ref = E['view$' + pkg]) != null ? (ref1 = ref[type]) != null ? ref1[nm] : void 0 : void 0;
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
      var f, fn, full_nm, full_nm_alt, j, k, len, len1, pkg, promise, ref, ref1, type_alt, uncompiled;
      f = 'd_get';
      full_nm = type + '/' + nm + '.html';
      if (this.cache[full_nm] != null) {
        return this.cache[full_nm];
      }
      if (uncompiled = this.inline(type, nm)) {
        return this.compile(full_nm, uncompiled);
      }
      promise = Promise.resolve(false);
      type_alt = type === 'Layout' ? 'tmpl' : type.toLowerCase();
      full_nm_alt = type + '/' + nm + '.' + type_alt + '.html';
      if (E.option.compat_path) {
        ref = this.reverse_packages;
        for (j = 0, len = ref.length; j < len; j++) {
          pkg = ref[j];
          if ((pkg !== 'Base' && pkg !== 'Dev' && pkg !== 'Proto') && type !== 'Layout') {
            (function(_this) {
              return (function(pkg) {
                return promise = promise.then(function(result) {
                  if (result !== false) {
                    return result;
                  }
                  if (!(pkg in E.option.loadDirs)) {
                    return false;
                  }
                  return _this.D_getFile(pkg, full_nm_alt);
                });
              });
            })(this)(pkg);
          }
        }
      }
      ref1 = this.reverse_packages;
      fn = (function(_this) {
        return function(pkg) {
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
      })(this);
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        pkg = ref1[k];
        fn(pkg);
      }
      promise = promise.then((function(_this) {
        return function(result) {
          var parsed;
          if (result !== false) {
            parsed = (result != null ? result.preloaded : void 0) ? result : _this.compile(full_nm, result);
          } else {
            throw new Error("Unable to locate View file (" + full_nm + ").");
            console.error('ERROR', 'NO FILE FOUND! ', full_nm);
            parsed = false;
          }
          _this.cache[full_nm] = parsed;
          return parsed;
        };
      })(this));
      promise.then(null, function(error) {
        throw error;
      });
      this.cache[full_nm] = promise;
      return promise;
    };

    LoadStrategy.prototype.D_getFile = function(pkg, nm) {
      var f, path;
      f = 'D_getFile';
      path = (this.makePkgDir(pkg)) + '/';
      return new Promise(function(resolve, reject) {
        var xhr;
        xhr = new XMLHttpRequest();
        xhr.onloadend = function(event) {
          if (xhr.status !== 200) {
            resolve(false);
          }
          return resolve(xhr.response);
        };
        xhr.open('GET', path + nm + '?_=' + new Date().valueOf());
        xhr.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
        return xhr.send();
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

/*Dev/Extra/ParseFile.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var E, FindAttrVal, FindAttrs, ParseFile, _log2, doError, entities, findStyleVal, findStyles, findVars, mkNm, mkObj, nm_map, sq,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  E = {};

  _log2 = function() {};

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
      var results1;
      results1 = [];
      for (nm in obj) {
        val = obj[nm];
        results1.push((mkNm(nm)) + ':' + val);
      }
      return results1;
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
    nm = E.camelCase(p);
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
    var good, i, nm, ref, start, str, styles;
    styles = {};
    i = 0;
    while (i < parts.length) {
      ref = findStyleVal(i, parts), good = ref[0], start = ref[1], i = ref[2], nm = ref[3], str = ref[4];
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
    var nm, p, parts, quo, ref, start, top;
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
    nm = (ref = nm_map[p]) != null ? ref : p;
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
    var attr_obj, attr_split, attrs_need_cleaning, className, data_e_action, empty, eq, event_attrs_shortcuts, f, good, grp, i, nm, pane, parts, quo, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, start, style_obj;
    f = ':parse.FindAttrs:';
    event_attrs_shortcuts = ['data-e-click', 'data-e-rclick', 'data-e-change', 'data-e-dblclick', 'data-e-enter', 'data-e-escape', 'data-e-keyup', 'data-e-focus', 'data-e-blur', 'data-e-event'];
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
      ref = FindAttrVal(i, attr_split), good = ref[0], start = ref[1], i = ref[2], nm = ref[3], eq = ref[4], quo = ref[5], parts = ref[6];
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
      if (indexOf.call(event_attrs_shortcuts, nm) >= 0) {
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
        ref1 = (parts.join('')).split(':'), grp = ref1[0], pane = ref1[1];
        className.push("&Tab/" + grp + "/" + pane + "#?active;");
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click");
        continue;
      }
      if (nm === 'data-e-tab-pane') {
        ref2 = (parts.join('')).split(':'), grp = ref2[0], pane = ref2[1];
        className.push("&Tab/" + grp + "/" + pane + "#?active;");
        continue;
      }
      if (nm === 'data-e-collapse') {
        ref3 = (parts.join('')).split(':'), grp = ref3[0], pane = ref3[1];
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click");
        continue;
      }
      if (nm === 'data-e-collapse-pane') {
        ref4 = (parts.join('')).split(':'), grp = ref4[0], pane = ref4[1];
        className.push("&Tab/" + grp + "/" + pane + "#?in;");
        attr_obj['data-ex-collapse'] = "'" + grp + ":" + pane + "'";
        attr_obj.config = 'oE.ex';
        continue;
      }
      if (nm === 'data-e-drop-pane') {
        ref5 = ['Drop', parts.join('')], grp = ref5[0], pane = ref5[1];
        className.push("&Tab/" + grp + "/" + pane + "#?open;");
      }
      if (nm === 'data-e-drop') {
        ref6 = ['Drop', parts.join('')], grp = ref6[0], pane = ref6[1];
        data_e_action.push("event:Tab:" + grp + ":" + pane + ":click-enter");
        continue;
      }
      if (nm === 'data-e-modal-pane') {
        ref7 = ['Modal', parts.join('')], grp = ref7[0], pane = ref7[1];
        className.push("&Tab/" + grp + "/" + pane + "#?in?hide;");
      }
      if (nm === 'data-e-modal') {
        ref8 = ['Modal', parts.join('')], grp = ref8[0], pane = ref8[1];
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
    var ans, args, custom_hash_part, hash_part, i, last, parts, ref, results;
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
      ref = args[last].split('#'), args[last] = ref[0], hash_part = ref[1], custom_hash_part = ref[2];
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
    var T_EPIC, T_M1, T_M2, T_STYLE, T_TEXT, after, after_comment, after_script, attr_clean, attrs, base_nm, children, content, counter, doChildren, dom_close, dom_nms, dom_pre_tags, empty, etags, f, flavor, i, nextCounter, oi, parts, pre_count, prev_children, ref, ref1, stats, t, tag_names_for_debugger, tag_wait, text, whole_tag;
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
    dom_nms = ['style', 'section', 'header', 'nav', 'article', 'aside', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'address', 'main', 'hgroup', 'div', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr', 'ins', 'del', 'img', 'iframe', 'embed', 'oject', 'param', 'video', 'audio', 'source', 'track', 'canvas', 'map', 'area', 'svg', 'math', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col', 'form', 'fieldset', 'legend', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'keygen', 'output', 'progress', 'meter', 'details', 'summary', 'menuitem', 'menu', 'g', 'title', 'defs', 'rect', 'tspan', 'line', 'ellipse', 'path', 'text', 'polygon', 'circle'];
    dom_close = ['img', 'br', 'input', 'hr'];
    after_comment = file_contents.replace(/-->/gm, '\x02').replace(/<!--[^\x02]*\x02/gm, function(m) {
      return m.replace(/[^\n]+/gm, '');
    });
    after_script = after_comment.replace(/<\/script>/gm, '\x02').replace(/<script[^\x02]*\x02/gm, '');
    after = after_script;
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
        ref = tag_wait.pop(), oi = ref[0], base_nm = ref[1], attrs = ref[2], prev_children = ref[3], flavor = ref[4];
        if (indexOf.call(dom_pre_tags, base_nm) >= 0) {
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
          ref1 = FindAttrs(file_stats, parts[i + 3]), attrs = ref1[0], empty = ref1[1], attr_clean = ref1[2];
        }
        if (flavor === T_EPIC) {
          base_nm = parts[i + 2].slice(2);
          if (base_nm === 'page' || base_nm === 'part') {
            empty = '/';
          }
          if (indexOf.call(etags, base_nm) < 0) {
            doError(file_stats, "UNKNONW EPIC TAG (" + base_nm + ") : Expected one of " + (etags.join()));
          }
        } else {
          base_nm = parts[i + 2];
          if (base_nm === 'img' || base_nm === 'br' || base_nm === 'input' || base_nm === 'hr') {
            empty = '/';
          }
          if (indexOf.call(dom_nms, base_nm) < 0) {
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
          if (indexOf.call(dom_pre_tags, base_nm) >= 0) {
            pre_count++;
          }
        }
      }
      i += 4;
    }
    if (tag_wait.length) {
      doError(file_stats, "Missing closing tags " + (((function() {
        var j, len, results1;
        results1 = [];
        for (j = 0, len = tag_wait.length; j < len; j++) {
          t = tag_wait[j][0];
          results1.push(parts[t + 2]);
        }
        return results1;
      })()).join(', ')));
    }
    text = parts[i].replace(/^\s+|\s+$/g, ' ');
    if (text.length && text !== ' ' && text !== '  ') {
      children.push([T_M1, 'span', {}, (findVars(text)).join('+')]);
      stats.text++;
    }
    doChildren = function(child_array, fwrap) {
      var attr, has_epic, ix, j, kids, len, out, ref2, stuff, tag;
      if ('A' !== E.type_oau(child_array)) {
        GLOBWUP();
      }
      out = [];
      has_epic = false;
      for (ix = j = 0, len = child_array.length; j < len; ix = ++j) {
        ref2 = child_array[ix], flavor = ref2[0], tag = ref2[1], attr = ref2[2], kids = ref2[3];
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

E.view$Dev={
Layout: {
"BaseDevl":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([{tag:'h5',attrs:{},children:['I\'m an \'outer\' template']},['page',{}]])}},
"bdevl":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([{tag:'style',attrs:{},children:m.trust(' .dbg-part { border: solid 8px #888; }\n.dbg-tag-error-box { border: solid 2px #C44; font-weight: bold;}\n.dbg-tag-error-msg { color: red; }\n.dbg-tag-box { border: solid 2px #44C; }\n.dbg-part-box { font-size: .5em;\n -webkit-box-shadow: 10px 10px 5px #888;\n padding: 5px 5px 5px 15px;\n width: 10px;\n height: 10px;\n z-index: 99999;\n}\n.red { color: red; }\n.btn-group { background-color: #CCC; border-radius: 6px; }\n.dbg-toolbar .btn { padding: 6px 2px; }\n.dbg-toolbar:hover {\n top: -7px;\n}\n.dbg-toolbar {\n overflow-y: hidden;\n top: -46px;\n transition-property: top;\n transition-duration: .5s;\n} ')},{tag:'div',attrs:{style:{position:'fixed',zIndex:'9999',backgroundColor:'#484848',fontSize:'10px',padding:'10px 10px 0 10px',right:'0'},className:'dbg-toolbar'},children:[{tag:'div',attrs:{className:'btn-toolbar'},children:[{tag:'div',attrs:{className:'btn-group'},children:[{tag:'a',attrs:{'data-e-what':'file',className:'btn btn-mini','data-e-action':'click:dbg_refresh'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-repeat icon-repeat'},children:[]}]},{tag:'a',attrs:{'data-e-what':'file',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-file icon-file '+oE.v3('Devl','Opts','file','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'tag',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-chevron-left icon-chevron-left '+oE.v3('Devl','Opts','tag','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'tag2',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-chevron-right icon-chevron-right '+oE.v3('Devl','Opts','tag2','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'form',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-edit icon-edit '+oE.v3('Devl','Opts','form','?red')},children:[]}]},{tag:'a',attrs:{'data-e-what':'model',className:'btn btn-mini','data-e-action':'click:dbg_toggle'},children:[{tag:'span',attrs:{className:'glyphicon glyphicon-list-alt icon-list-alt '+oE.v3('Devl','Opts','model','?red')},children:[]}]}]}]},{tag:'div',attrs:{style:{textAlign:'center',color:'#FFF',letterSpacing:'5px',fontSize:'10px',height:'18px',paddingLeft:'4px',marginTop:'-3px'}},children:['EPIC']}]},['if',{set:oE.v3('Devl','Opts','model')},function(){return [{tag:'table',attrs:{width:'100%'},children:[{tag:'tr',attrs:{},children:[{tag:'td',attrs:{width:'20%',style:{backgroundColor:'#90C0FF',verticalAlign:'top',paddingTop:'75px',paddingBottom:'20px'}},children:oE.kids([['part',{part:'dbg_model',dynamic:'div'}]])},{tag:'td',attrs:{width:'100%',style:{verticalAlign:'top',position:'relative'}},children:oE.kids([['page',{}]])}]}]}]}],['if',{not_set:oE.v3('Devl','Opts','model')},function(){return oE.kids([['page',{}]])}]])}}},
Page: {
},
Part: {
"dbg_model":{preloaded:1,can_componentize:false,defer:0,content:function(){return [{tag:'style',attrs:{},children:m.trust(' ul.dbg-model.nav, ul.dbg-model.nav ul { margin-bottom: 0; border: 0; }\nul.dbg-model.nav li a, ul.dbg-model.nav ul li a { padding: 0; border: 0; }\nul.dbg-model.nav ul li a { padding-left: 15px; } ')},{tag:'ul',attrs:{className:'dbg-model nav nav-tabs nav-stacked'},children:oE.kids([['foreach',{table:'Devl/Model'},function(){return [{tag:'li',attrs:{},children:oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Model','name'),'data-e-action':'click:dbg_open_model'},children:[' ['+oE.v2('Model','tables')+'] '+oE.v2('Model','name')+' ('+oE.v2('Model','inst')+') ']},['if',{set:oE.v2('Model','is_open')},function(){return [{tag:'ul',attrs:{className:'nav nav-tabs nav-stacked'},children:oE.kids([['foreach',{table:'Model/Table'},function(){return [{tag:'li',attrs:{},children:oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Table','name'),'data-e-action':'click:dbg_open_table'},children:[{tag:'span',attrs:{title:oE.v2('Table','cols')},children:['['+oE.v2('Table','rows')+'] '+oE.v2('Table','name')]}]},['if',{set:oE.v2('Table','is_open')},function(){return [{tag:'table',attrs:{border:'1',style:{fontSize:'8pt',lineHeight:'1'}},children:[{tag:'tbody',attrs:{},children:oE.kids([{tag:'tr',attrs:{},children:[{tag:'th',attrs:{},children:oE.kids([['if',{set:oE.v2('Table','by_col')},function(){return [{tag:'a',attrs:{'data-e-action':'click:dbg_table_by_row'},children:[' Row ']}]}],['if',{not_set:oE.v2('Table','by_col')},function(){return oE.kids([' Column ',['if',{set:oE.v2('Table','is_sub')},function(){return [{tag:'a',attrs:{style:{padding:'0'},'data-e-action':'click:dbg_close_subtable'},children:['^']}]}]])}]])},{tag:'th',attrs:{},children:['T']},{tag:'th',attrs:{},children:oE.kids([['if',{val:oE.v2('Table','rows'),eq:'1'},function(){return [' Value ']}],['if',{val:oE.v2('Table','rows'),ne:'1'},function(){return oE.kids([['if',{set:oE.v2('Table','by_col')},function(){return ['   '+oE.v2('Table','curr_col')+'   ']}],['if',{not_set:oE.v2('Table','by_col')},function(){return [{tag:'a',attrs:{'data-e-action':'click:dbg_table_left'},children:['<']},'   Value (row '+oE.v2('Table','row_cnt')+')   ',{tag:'a',attrs:{'data-e-action':'click:dbg_table_right'},children:['>']}]}]])}]])}]},['if',{not_set:oE.v2('Table','by_col')},function(){return oE.kids([['foreach',{table:'Table/Cols'},function(){return [{tag:'tr',attrs:{},children:oE.kids([{tag:'th',attrs:{},children:oE.kids([['if',{val:oE.v2('Table','rows'),eq:'1'},function(){return [' '+oE.v2('Cols','col')+' ']}],['if',{val:oE.v2('Table','rows'),ne:'1'},function(){return [{tag:'a',attrs:{'data-e-col':oE.v2('Cols','col'),'data-e-action':'click:dbg_table_col_set'},children:[oE.v2('Cols','col')]}]}]])},['if',{set:oE.v2('Cols','val')},function(){return [{tag:'td',attrs:{style:{color:'green'}},children:[oE.v2('Cols','type','1')]}]}],['if',{not_set:oE.v2('Cols','val')},function(){return [{tag:'td',attrs:{style:{color:'red'}},children:[oE.v2('Cols','type','1')]}]}],{tag:'td',attrs:{title:oE.v2('Cols','type')},children:oE.kids([['if',{val:oE.v2('Cols','type'),eq:'object'},function(){return oE.kids([['if',{not_set:oE.v2('Cols','len')},function(){return [' Table [ empty ]']}],['if',{set:oE.v2('Cols','len')},function(){return oE.kids([{tag:'a',attrs:{'data-e-name':oE.v2('Cols','col'),style:{padding:'0'},'data-e-action':'click:dbg_open_subtable'},children:['Table']},' ['+oE.v2('Cols','len')+' row',['if',{val:oE.v2('Cols','len'),ne:'1'},function(){return ['s']}],'] '])}]])}],['if',{val:oE.v2('Cols','type'),ne:'object'},function(){return [' '+oE.v2('Cols','val')+' ']}]])}])}]}]])}],['if',{set:oE.v2('Table','by_col')},function(){return oE.kids([['foreach',{table:'Table/Rows'},function(){return [{tag:'tr',attrs:{},children:oE.kids([{tag:'th',attrs:{},children:[oE.v2('Rows','row')]},['if',{set:oE.v2('Rows','val')},function(){return [{tag:'td',attrs:{style:{color:'green'}},children:[oE.v2('Rows','type','1')]}]}],['if',{not_set:oE.v2('Rows','val')},function(){return [{tag:'td',attrs:{style:{color:'red'}},children:[oE.v2('Rows','type','1')]}]}],{tag:'td',attrs:{title:oE.v2('Rows','type')},children:oE.kids([['if',{val:oE.v2('Rows','type'),eq:'object'},function(){return oE.kids(['Table [ ',['if',{set:oE.v2('Rows','len')},function(){return oE.kids([oE.v2('Rows','len')+' row',['if',{val:oE.v2('Rows','len'),ne:'1'},function(){return ['s']}]])}],['if',{not_set:oE.v2('Rows','len')},function(){return ['empty']}],' ]'])}],['if',{val:oE.v2('Rows','type'),ne:'object'},function(){return [' '+oE.v2('Rows','val')+' ']}]])}])}]}]])}]])}]}]}]])}]}]])}]}]])}]}]])}]}}}};

