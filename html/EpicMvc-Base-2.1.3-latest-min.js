/* Copyright 2007-2016 by James Shelby, shelby (at:) dtsol.com; All rights reserved. */
var m=function app(window,undefined){var OBJECT="[object Object]",ARRAY="[object Array]",STRING="[object String]",FUNCTION="function";var type={}.toString;var parser=/(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g,attrParser=/\[(.+?)(?:=("|'|)(.*?)\2)?\]/;var voidElements=/^(AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR)$/;var noop=function(){};var $document,$location,$requestAnimationFrame,$cancelAnimationFrame;function initialize(window){$document=window.document;$location=window.location;$cancelAnimationFrame=window.cancelAnimationFrame||window.clearTimeout;$requestAnimationFrame=window.requestAnimationFrame||window.setTimeout}initialize(window);function m(){var args=[].slice.call(arguments);var hasAttrs=args[1]!=null&&type.call(args[1])===OBJECT&&!("tag"in args[1]||"view"in args[1])&&!("subtree"in args[1]);var attrs=hasAttrs?args[1]:{};var classAttrName="class"in attrs?"class":"className";var cell={tag:"div",attrs:{}};var match,classes=[];if(type.call(args[0])!=STRING)throw new Error("selector in m(selector, attrs, children) should be a string");while(match=parser.exec(args[0])){if(match[1]===""&&match[2])cell.tag=match[2];else if(match[1]==="#")cell.attrs.id=match[2];else if(match[1]===".")classes.push(match[2]);else if(match[3][0]==="["){var pair=attrParser.exec(match[3]);cell.attrs[pair[1]]=pair[3]||(pair[2]?"":true)}}var children=hasAttrs?args.slice(2):args.slice(1);if(children.length===1&&type.call(children[0])===ARRAY){cell.children=children[0]}else{cell.children=children}for(var attrName in attrs){if(attrs.hasOwnProperty(attrName)){if(attrName===classAttrName&&attrs[attrName]!=null&&attrs[attrName]!==""){classes.push(attrs[attrName]);cell.attrs[attrName]=""}else cell.attrs[attrName]=attrs[attrName]}}if(classes.length>0)cell.attrs[classAttrName]=classes.join(" ");return cell}function build(parentElement,parentTag,parentCache,parentIndex,data,cached,shouldReattach,index,editable,namespace,configs){try{if(data==null||data.toString()==null)data=""}catch(e){data=""}if(data.subtree==="retain")return cached;var cachedType=type.call(cached),dataType=type.call(data);if(cached==null||cachedType!==dataType){if(cached!=null){if(parentCache&&parentCache.nodes){var offset=index-parentIndex;var end=offset+(dataType===ARRAY?data:cached.nodes).length;clear(parentCache.nodes.slice(offset,end),parentCache.slice(offset,end))}else if(cached.nodes)clear(cached.nodes,cached)}cached=new data.constructor;if(cached.tag)cached={};cached.nodes=[]}if(dataType===ARRAY){for(var i=0,len=data.length;i<len;i++){if(type.call(data[i])===ARRAY){data=data.concat.apply([],data);i--;len=data.length}}var nodes=[],intact=cached.length===data.length,subArrayCount=0;var DELETION=1,INSERTION=2,MOVE=3;var existing={},shouldMaintainIdentities=false;for(var i=0;i<cached.length;i++){if(cached[i]&&cached[i].attrs&&cached[i].attrs.key!=null){shouldMaintainIdentities=true;existing[cached[i].attrs.key]={action:DELETION,index:i}}}var guid=0;for(var i=0,len=data.length;i<len;i++){if(data[i]&&data[i].attrs&&data[i].attrs.key!=null){for(var j=0,len=data.length;j<len;j++){if(data[j]&&data[j].attrs&&data[j].attrs.key==null)data[j].attrs.key="__mithril__"+guid++}break}}if(shouldMaintainIdentities){var keysDiffer=false;if(data.length!=cached.length)keysDiffer=true;else for(var i=0,cachedCell,dataCell;cachedCell=cached[i],dataCell=data[i];i++){if(cachedCell.attrs&&dataCell.attrs&&cachedCell.attrs.key!=dataCell.attrs.key){keysDiffer=true;break}}if(keysDiffer){for(var i=0,len=data.length;i<len;i++){if(data[i]&&data[i].attrs){if(data[i].attrs.key!=null){var key=data[i].attrs.key;if(!existing[key])existing[key]={action:INSERTION,index:i};else existing[key]={action:MOVE,index:i,from:existing[key].index,element:cached.nodes[existing[key].index]||$document.createElement("div")}}}}var actions=[];for(var prop in existing)actions.push(existing[prop]);var changes=actions.sort(sortChanges);var newCached=new Array(cached.length);newCached.nodes=cached.nodes.slice();for(var i=0,change;change=changes[i];i++){if(change.action===DELETION){clear(cached[change.index].nodes,cached[change.index]);newCached.splice(change.index,1)}if(change.action===INSERTION){var dummy=$document.createElement("div");dummy.key=data[change.index].attrs.key;parentElement.insertBefore(dummy,parentElement.childNodes[change.index]||null);newCached.splice(change.index,0,{attrs:{key:data[change.index].attrs.key},nodes:[dummy]});newCached.nodes[change.index]=dummy}if(change.action===MOVE){if(parentElement.childNodes[change.index]!==change.element&&change.element!==null){parentElement.insertBefore(change.element,parentElement.childNodes[change.index]||null)}newCached[change.index]=cached[change.from];newCached.nodes[change.index]=change.element}}cached=newCached}}for(var i=0,cacheCount=0,len=data.length;i<len;i++){var item=build(parentElement,parentTag,cached,index,data[i],cached[cacheCount],shouldReattach,index+subArrayCount||subArrayCount,editable,namespace,configs);if(item===undefined)continue;if(!item.nodes.intact)intact=false;if(item.$trusted){subArrayCount+=(item.match(/<[^\/]|\>\s*[^<]/g)||[0]).length}else subArrayCount+=type.call(item)===ARRAY?item.length:1;cached[cacheCount++]=item}if(!intact){for(var i=0,len=data.length;i<len;i++){if(cached[i]!=null)nodes.push.apply(nodes,cached[i].nodes)}for(var i=0,node;node=cached.nodes[i];i++){if(node.parentNode!=null&&nodes.indexOf(node)<0)clear([node],[cached[i]])}if(data.length<cached.length)cached.length=data.length;cached.nodes=nodes}}else if(data!=null&&dataType===OBJECT){var views=[],controllers=[];while(data.view){var view=data.view.$original||data.view;var controllerIndex=m.redraw.strategy()=="diff"&&cached.views?cached.views.indexOf(view):-1;var controller=controllerIndex>-1?cached.controllers[controllerIndex]:new(data.controller||noop);var key=data&&data.attrs&&data.attrs.key;data=pendingRequests==0||cached&&cached.controllers&&cached.controllers.indexOf(controller)>-1?data.view(controller):{tag:"placeholder"};if(data.subtree==="retain")return cached;if(key){if(!data.attrs)data.attrs={};data.attrs.key=key}if(controller.onunload)unloaders.push({controller:controller,handler:controller.onunload});views.push(view);controllers.push(controller)}if(!data.tag&&controllers.length)throw new Error("Component template must return a virtual element, not an array, string, etc.");if(!data.attrs)data.attrs={};if(!cached.attrs)cached.attrs={};var dataAttrKeys=Object.keys(data.attrs);var hasKeys=dataAttrKeys.length>("key"in data.attrs?1:0);if(data.tag!=cached.tag||dataAttrKeys.sort().join()!=Object.keys(cached.attrs).sort().join()||data.attrs.id!=cached.attrs.id||data.attrs.key!=cached.attrs.key||m.redraw.strategy()=="all"&&(!cached.configContext||cached.configContext.retain!==true)||m.redraw.strategy()=="diff"&&cached.configContext&&cached.configContext.retain===false){if(cached.nodes.length)clear(cached.nodes);if(cached.configContext&&typeof cached.configContext.onunload===FUNCTION)cached.configContext.onunload();if(cached.controllers){for(var i=0,controller;controller=cached.controllers[i];i++){if(typeof controller.onunload===FUNCTION)controller.onunload({preventDefault:noop})}}}if(type.call(data.tag)!=STRING)return;var node,isNew=cached.nodes.length===0;if(data.attrs.xmlns)namespace=data.attrs.xmlns;else if(data.tag==="svg")namespace="http://www.w3.org/2000/svg";else if(data.tag==="math")namespace="http://www.w3.org/1998/Math/MathML";if(isNew){if(data.attrs.is)node=namespace===undefined?$document.createElement(data.tag,data.attrs.is):$document.createElementNS(namespace,data.tag,data.attrs.is);else node=namespace===undefined?$document.createElement(data.tag):$document.createElementNS(namespace,data.tag);cached={tag:data.tag,attrs:hasKeys?setAttributes(node,data.tag,data.attrs,{},namespace):data.attrs,children:data.children!=null&&data.children.length>0?build(node,data.tag,undefined,undefined,data.children,cached.children,true,0,data.attrs.contenteditable?node:editable,namespace,configs):data.children,nodes:[node]};if(controllers.length){cached.views=views;cached.controllers=controllers;for(var i=0,controller;controller=controllers[i];i++){if(controller.onunload&&controller.onunload.$old)controller.onunload=controller.onunload.$old;if(pendingRequests&&controller.onunload){var onunload=controller.onunload;controller.onunload=noop;controller.onunload.$old=onunload}}}if(cached.children&&!cached.children.nodes)cached.children.nodes=[];if(data.tag==="select"&&"value"in data.attrs)setAttributes(node,data.tag,{value:data.attrs.value},{},namespace);parentElement.insertBefore(node,parentElement.childNodes[index]||null)}else{node=cached.nodes[0];if(hasKeys)setAttributes(node,data.tag,data.attrs,cached.attrs,namespace);cached.children=build(node,data.tag,undefined,undefined,data.children,cached.children,false,0,data.attrs.contenteditable?node:editable,namespace,configs);cached.nodes.intact=true;if(controllers.length){cached.views=views;cached.controllers=controllers}if(shouldReattach===true&&node!=null)parentElement.insertBefore(node,parentElement.childNodes[index]||null)}if(typeof data.attrs["config"]===FUNCTION){var context=cached.configContext=cached.configContext||{};var callback=function(data,args){return function(){return data.attrs["config"].apply(data,args)}};configs.push(callback(data,[node,!isNew,context,cached]))}}else if(typeof data!=FUNCTION){var nodes;if(cached.nodes.length===0){if(data.$trusted){nodes=injectHTML(parentElement,index,data)}else{nodes=[$document.createTextNode(data)];if(!parentElement.nodeName.match(voidElements))parentElement.insertBefore(nodes[0],parentElement.childNodes[index]||null)}cached="string number boolean".indexOf(typeof data)>-1?new data.constructor(data):data;cached.nodes=nodes}else if(cached.valueOf()!==data.valueOf()||shouldReattach===true){nodes=cached.nodes;if(!editable||editable!==$document.activeElement){if(data.$trusted){clear(nodes,cached);nodes=injectHTML(parentElement,index,data)}else{if(parentTag==="textarea")parentElement.value=data;else if(editable)editable.innerHTML=data;else{if(nodes[0].nodeType===1||nodes.length>1){clear(cached.nodes,cached);nodes=[$document.createTextNode(data)]}parentElement.insertBefore(nodes[0],parentElement.childNodes[index]||null);nodes[0].nodeValue=data}}}cached=new data.constructor(data);cached.nodes=nodes}else cached.nodes.intact=true}return cached}function sortChanges(a,b){return a.action-b.action||a.index-b.index}function setAttributes(node,tag,dataAttrs,cachedAttrs,namespace){for(var attrName in dataAttrs){var dataAttr=dataAttrs[attrName];var cachedAttr=cachedAttrs[attrName];if(!(attrName in cachedAttrs)||cachedAttr!==dataAttr){cachedAttrs[attrName]=dataAttr;try{if(attrName==="config"||attrName=="key")continue;else if(typeof dataAttr===FUNCTION&&attrName.indexOf("on")===0){node[attrName]=autoredraw(dataAttr,node)}else if(attrName==="style"&&dataAttr!=null&&type.call(dataAttr)===OBJECT){for(var rule in dataAttr){if(cachedAttr==null||cachedAttr[rule]!==dataAttr[rule])node.style[rule]=dataAttr[rule]}for(var rule in cachedAttr){if(!(rule in dataAttr))node.style[rule]=""}}else if(namespace!=null){if(attrName==="href")node.setAttributeNS("http://www.w3.org/1999/xlink","href",dataAttr);else if(attrName==="className")node.setAttribute("class",dataAttr);else node.setAttribute(attrName,dataAttr)}else if(attrName in node&&!(attrName==="list"||attrName==="style"||attrName==="form"||attrName==="type"||attrName==="width"||attrName==="height")){if(tag!=="input"||node[attrName]!==dataAttr)node[attrName]=dataAttr}else node.setAttribute(attrName,dataAttr)}catch(e){if(e.message.indexOf("Invalid argument")<0)throw e}}else if(attrName==="value"&&tag==="input"&&node.value!=dataAttr){node.value=dataAttr}}return cachedAttrs}function clear(nodes,cached){for(var i=nodes.length-1;i>-1;i--){if(nodes[i]&&nodes[i].parentNode){try{nodes[i].parentNode.removeChild(nodes[i])}catch(e){}cached=[].concat(cached);if(cached[i])unload(cached[i])}}if(nodes.length!=0)nodes.length=0}function unload(cached){if(cached.configContext&&typeof cached.configContext.onunload===FUNCTION){cached.configContext.onunload();cached.configContext.onunload=null}if(cached.controllers){for(var i=0,controller;controller=cached.controllers[i];i++){if(typeof controller.onunload===FUNCTION)controller.onunload({preventDefault:noop})}}if(cached.children){if(type.call(cached.children)===ARRAY){for(var i=0,child;child=cached.children[i];i++)unload(child)}else if(cached.children.tag)unload(cached.children)}}function injectHTML(parentElement,index,data){var nextSibling=parentElement.childNodes[index];if(nextSibling){var isElement=nextSibling.nodeType!=1;var placeholder=$document.createElement("span");if(isElement){parentElement.insertBefore(placeholder,nextSibling||null);placeholder.insertAdjacentHTML("beforebegin",data);parentElement.removeChild(placeholder)}else nextSibling.insertAdjacentHTML("beforebegin",data)}else parentElement.insertAdjacentHTML("beforeend",data);var nodes=[];while(parentElement.childNodes[index]!==nextSibling){nodes.push(parentElement.childNodes[index]);index++}return nodes}function autoredraw(callback,object){return function(e){e=e||event;m.redraw.strategy("diff");m.startComputation();try{return callback.call(object,e)}finally{endFirstComputation()}}}var html;var documentNode={appendChild:function(node){if(html===undefined)html=$document.createElement("html");if($document.documentElement&&$document.documentElement!==node){$document.replaceChild(node,$document.documentElement)}else $document.appendChild(node);this.childNodes=$document.childNodes},insertBefore:function(node){this.appendChild(node)},childNodes:[]};var nodeCache=[],cellCache={};m.render=function(root,cell,forceRecreation){var configs=[];if(!root)throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.");var id=getCellCacheKey(root);var isDocumentRoot=root===$document;var node=isDocumentRoot||root===$document.documentElement?documentNode:root;if(isDocumentRoot&&cell.tag!="html")cell={tag:"html",attrs:{},children:cell};if(cellCache[id]===undefined)clear(node.childNodes);if(forceRecreation===true)reset(root);cellCache[id]=build(node,null,undefined,undefined,cell,cellCache[id],false,0,null,undefined,configs);for(var i=0,len=configs.length;i<len;i++)configs[i]()};m.trust=function(value){value=new String(value);value.$trusted=true;return value};function getCellCacheKey(element){var index=nodeCache.indexOf(element);return index<0?nodeCache.push(element)-1:index}function gettersetter(store){var prop=function(){if(arguments.length)store=arguments[0];return store};prop.toJSON=function(){return store};return prop}m.prop=function(store){if((store!=null&&type.call(store)===OBJECT||typeof store===FUNCTION)&&typeof store.then===FUNCTION){return propify(store)}return gettersetter(store)};var roots=[],components=[],controllers=[],lastRedrawId=null,lastRedrawCallTime=0,computePreRedrawHook=null,computePostRedrawHook=null,prevented=false,topComponent,unloaders=[];m.redraw=function(force){};m.redraw.strategy=m.prop();var pendingRequests=0;m.startComputation=function(){pendingRequests++};m.endComputation=function(){pendingRequests=Math.max(pendingRequests-1,0);if(pendingRequests===0)m.redraw()};var endFirstComputation=function(){if(m.redraw.strategy()=="none"){pendingRequests--;m.redraw.strategy("diff")}else m.endComputation()};function buildQueryString(object,prefix){var duplicates={};var str=[];for(var prop in object){var key=prefix?prefix+"["+prop+"]":prop;var value=object[prop];var valueType=type.call(value);var pair=value===null?encodeURIComponent(key):valueType===OBJECT?buildQueryString(value,key):valueType===ARRAY?value.reduce(function(memo,item){if(!duplicates[key])duplicates[key]={};if(!duplicates[key][item]){duplicates[key][item]=true;return memo.concat(encodeURIComponent(key)+"="+encodeURIComponent(item))}return memo},[]).join("&"):encodeURIComponent(key)+"="+encodeURIComponent(value);if(value!==undefined)str.push(pair)}return str.join("&")}function parseQueryString(str){if(str.charAt(0)==="?")str=str.substring(1);var pairs=str.split("&"),params={};for(var i=0,len=pairs.length;i<len;i++){var pair=pairs[i].split("=");var key=decodeURIComponent(pair[0]);var value=pair.length==2?decodeURIComponent(pair[1]):null;if(params[key]!=null){if(type.call(params[key])!==ARRAY)params[key]=[params[key]];params[key].push(value)}else params[key]=value}return params}function reset(root){var cacheKey=getCellCacheKey(root);clear(root.childNodes,cellCache[cacheKey]);cellCache[cacheKey]=undefined}m.deferred=function(){var deferred=new Deferred;deferred.promise=propify(deferred.promise);return deferred};function propify(promise,initialValue){var prop=m.prop(initialValue);promise.then(prop);prop.then=function(resolve,reject){return propify(promise.then(resolve,reject),initialValue)};return prop}function Deferred(successCallback,failureCallback){var RESOLVING=1,REJECTING=2,RESOLVED=3,REJECTED=4;var self=this,state=0,promiseValue=0,next=[];self["promise"]={};self["resolve"]=function(value){if(!state){promiseValue=value;state=RESOLVING;fire()}return this};self["reject"]=function(value){if(!state){promiseValue=value;state=REJECTING;fire()}return this};self.promise["then"]=function(successCallback,failureCallback){var deferred=new Deferred(successCallback,failureCallback);if(state===RESOLVED){deferred.resolve(promiseValue)}else if(state===REJECTED){deferred.reject(promiseValue)}else{next.push(deferred)}return deferred.promise};function finish(type){state=type||REJECTED;next.map(function(deferred){state===RESOLVED&&deferred.resolve(promiseValue)||deferred.reject(promiseValue)})}function thennable(then,successCallback,failureCallback,notThennableCallback){if((promiseValue!=null&&type.call(promiseValue)===OBJECT||typeof promiseValue===FUNCTION)&&typeof then===FUNCTION){try{var count=0;then.call(promiseValue,function(value){if(count++)return;promiseValue=value;successCallback()},function(value){if(count++)return;promiseValue=value;failureCallback()})}catch(e){m.deferred.onerror(e);promiseValue=e;failureCallback()}}else{notThennableCallback()}}function fire(){var then;try{then=promiseValue&&promiseValue.then}catch(e){m.deferred.onerror(e);promiseValue=e;state=REJECTING;return fire()}thennable(then,function(){state=RESOLVING;fire()},function(){state=REJECTING;fire()},function(){try{if(state===RESOLVING&&typeof successCallback===FUNCTION){promiseValue=successCallback(promiseValue)}else if(state===REJECTING&&typeof failureCallback==="function"){promiseValue=failureCallback(promiseValue);state=RESOLVING}}catch(e){m.deferred.onerror(e);promiseValue=e;return finish()}if(promiseValue===self){promiseValue=TypeError();finish()}else{thennable(then,function(){finish(RESOLVED)},finish,function(){finish(state===RESOLVING&&RESOLVED)})}})}}m.deferred.onerror=function(e){if(type.call(e)==="[object Error]"&&!e.constructor.toString().match(/ Error/))throw e};function identity(value){return value}function ajax(options){if(options.dataType&&options.dataType.toLowerCase()==="jsonp"){var callbackKey="mithril_callback_"+(new Date).getTime()+"_"+Math.round(Math.random()*1e16).toString(36);var script=$document.createElement("script");window[callbackKey]=function(resp){script.parentNode.removeChild(script);options.onload({type:"load",target:{responseText:resp}});window[callbackKey]=undefined};script.onerror=function(e){script.parentNode.removeChild(script);options.onerror({type:"error",target:{status:500,responseText:JSON.stringify({error:"Error making jsonp request"})}});window[callbackKey]=undefined;return false};script.onload=function(e){return false};script.src=options.url+(options.url.indexOf("?")>0?"&":"?")+(options.callbackKey?options.callbackKey:"callback")+"="+callbackKey+"&"+buildQueryString(options.data||{});$document.body.appendChild(script)}else{var xhr=new window.XMLHttpRequest;xhr.open(options.method,options.url,true,options.user,options.password);xhr.onreadystatechange=function(){if(xhr.readyState===4){if(xhr.status>=200&&xhr.status<300)options.onload({type:"load",target:xhr});else options.onerror({type:"error",target:xhr})}};if(options.serialize===JSON.stringify&&options.data&&options.method!=="GET"){xhr.setRequestHeader("Content-Type","application/json; charset=utf-8")}if(options.deserialize===JSON.parse){xhr.setRequestHeader("Accept","application/json, text/*")}if(typeof options.config===FUNCTION){var maybeXhr=options.config(xhr,options);if(maybeXhr!=null)xhr=maybeXhr}var data=options.method==="GET"||!options.data?"":options.data;if(data&&(type.call(data)!=STRING&&data.constructor!=window.FormData)){throw"Request data should be either be a string or FormData. Check the `serialize` option in `m.request`"}xhr.send(data);return xhr}}function bindData(xhrOptions,data,serialize){if(xhrOptions.method==="GET"&&xhrOptions.dataType!="jsonp"){var prefix=xhrOptions.url.indexOf("?")<0?"?":"&";var querystring=buildQueryString(data);xhrOptions.url=xhrOptions.url+(querystring?prefix+querystring:"")}else xhrOptions.data=serialize(data);return xhrOptions}function parameterizeUrl(url,data){var tokens=url.match(/:[a-z]\w+/gi);if(tokens&&data){for(var i=0;i<tokens.length;i++){var key=tokens[i].slice(1);url=url.replace(tokens[i],data[key]);delete data[key]}}return url}m.request=function(xhrOptions){if(xhrOptions.background!==true)m.startComputation();var deferred=new Deferred;var isJSONP=xhrOptions.dataType&&xhrOptions.dataType.toLowerCase()==="jsonp";var serialize=xhrOptions.serialize=isJSONP?identity:xhrOptions.serialize||JSON.stringify;var deserialize=xhrOptions.deserialize=isJSONP?identity:xhrOptions.deserialize||JSON.parse;var extract=isJSONP?function(jsonp){return jsonp.responseText}:xhrOptions.extract||function(xhr){return xhr.responseText.length===0&&deserialize===JSON.parse?null:xhr.responseText};xhrOptions.method=(xhrOptions.method||"GET").toUpperCase();xhrOptions.url=parameterizeUrl(xhrOptions.url,xhrOptions.data);xhrOptions=bindData(xhrOptions,xhrOptions.data,serialize);xhrOptions.onload=xhrOptions.onerror=function(e){try{e=e||event;var unwrap=(e.type==="load"?xhrOptions.unwrapSuccess:xhrOptions.unwrapError)||identity;var response=unwrap(deserialize(extract(e.target,xhrOptions)),e.target);if(e.type==="load"){if(type.call(response)===ARRAY&&xhrOptions.type){for(var i=0;i<response.length;i++)response[i]=new xhrOptions.type(response[i])}else if(xhrOptions.type)response=new xhrOptions.type(response)}deferred[e.type==="load"?"resolve":"reject"](response)}catch(e){m.deferred.onerror(e);deferred.reject(e)}if(xhrOptions.background!==true)m.endComputation()};ajax(xhrOptions);deferred.promise=propify(deferred.promise,xhrOptions.initialValue);return deferred.promise};m.deps=function(mock){initialize(window=mock||window);return window};m.deps.factory=app;m.Deferred=Deferred;return m}(typeof window!="undefined"?window:{});if(typeof module!="undefined"&&module!==null&&module.exports)module.exports=m;else if(typeof define==="function"&&define.amd)define(function(){return m});
/*EpicCore*/(function(){"use strict";var Issue,ModelJS,app,klass,nm,ref,w,slice=[].slice,indexOf=[].indexOf||function(item){for(var i=0,l=this.length;l>i;i++)if(i in this&&this[i]===item)return i;return-1};app=function(window,undef){var E,Extra,Model,_d_doAction,aActions,aFists,aFlows,aMacros,aModels,aSetting,action,appFindAction,appFindAttr,appFindNode,appFist,appGetF,appGetS,appGetSetting,appGetT,appGetVars,appInit,appLoadFormsIf,appModel,appSearchAttr,appStartS,appStartT,appconfs,counter,fieldDef,finish_logout,fistDef,fistInit,getModelState,inAction,issueInit,issueMap,make_model_functions,merge,modelState,nm,oModel,obj,option,ref,setModelState,type_oau,wistDef,wistInit;inAction=!1,counter=0,Model={},Extra={},oModel={},modelState={},appconfs=[],option={event:function(){},loadDirs:{}},E={},E.nextCounter=function(){return++counter},E.opt=function(object){return merge(option,object)},E.camelCase=function(input,char){return null==char&&(char="-"),input.toLowerCase().replace(new RegExp(char+"(.)","g"),function(match,group1){return group1.toUpperCase()})},type_oau=function(obj){return{}.toString.call(obj)[8]},merge=function(){var atype,depth,dest,dup,func,j,len,otype,source,sources,stype,utype;dest=arguments[0],sources=2<=arguments.length?slice.call(arguments,1):[],otype="O",atype="A",utype="U",stype="S",depth=0,func={},func[otype]=function(dest,source){var ans,snm;if(type_oau(source)!==otype)return undef;for(snm in source)ans=dup(dest[snm],source[snm]),ans!==undef&&(dest[snm]=ans);return undef},func[atype]=function(dest,source){var ans,inx,j,len,s;if(type_oau(source)!==atype)return undef;for(inx=j=0,len=source.length;len>j;inx=++j)s=source[inx],ans=dup(dest[inx],s),ans!==undef&&(dest[inx]=ans);return undef},func[utype]=function(was,want){var become;switch(type_oau(want)){case otype:become={},func[otype](become,want);break;case atype:become=[],func[atype](become,want);break;default:become=want}return become},func[stype]=function(was,want){return type_oau(want)!==utype?want:was},dup=function(dest,source){var r,type;return depth++,type=type_oau(dest),type in func||(type=stype),r=func[type](dest,source),depth--,r};for(j=0,len=sources.length;len>j;j++)source=sources[j],dup(dest,source);return dest},E.login=function(){var k,o,results;results=[];for(k in oModel)o=oModel[k],results.push("function"==typeof o.eventLogin?o.eventLogin():void 0);return results},E.logout=function(action_event,action_data){return inAction!==!1?void setTimeout(function(){return function(){return E.logout(action_event,action_data)}}(this),100):action_event?action(action_event,action_data).then(function(){return finish_logout()}):finish_logout()},finish_logout=function(){var k,o,results;results=[];for(k in oModel)o=oModel[k],("function"==typeof o.eventLogout?o.eventLogout():void 0)&&(delete modelState[k],results.push(delete oModel[k]));return results},E.run=function(set_appconfs,more_options,init_func){var promise;appconfs=set_appconfs,merge(option,more_options),E.oLoader=new Extra[option.loader](appconfs),promise=E.oLoader.D_loadAsync(),promise.then(function(){return appInit(),merge(option,more_options),make_model_functions(),fistInit(),wistInit(),issueInit(),"function"==typeof init_func&&init_func(),E.App().go(aSetting.go),E.oRender=new Extra[option.render]})},setModelState=function(s){var base,inst_nm,results;null!=s&&(modelState=s),results=[];for(inst_nm in oModel)results.push("function"==typeof(base=oModel[inst_nm]).restoreState?base.restoreState(modelState[inst_nm]):void 0);return results},getModelState=function(){var k,o,ss;modelState={};for(k in oModel)o=oModel[k],null!=o.saveState&&(ss=o.saveState())&&(modelState[k]=ss);return modelState},aSetting={frames:{},modals:{},layout:"default",go:"default//"},aMacros={},aActions={},aFlows={"default":{start:"default",TRACKS:{"default":{start:"default",STEPS:{"default":{}}}}}},aModels={},aFists={},appLoadFormsIf=function(){},appInit=function(){var form_nm,hash,j,l,len,len1,nm,node,obj,ref,ref1,view_nm;for(j=0,len=appconfs.length;len>j;j++){nm=appconfs[j],app=null!=(ref=E["app$"+nm])?ref:{},app.STEPS&&merge(aFlows["default"].TRACKS["default"].STEPS,app.STEPS),app.TRACKS&&merge(aFlows["default"].TRACKS,app.TRACKS),hash={SETTINGS:aSetting,MACROS:aMacros,ACTIONS:aActions,FLOWS:aFlows,MODELS:aModels,OPTIONS:option};for(nm in hash)obj=hash[nm],merge(obj,app[nm])}for(view_nm in aModels)if(node=aModels[view_nm],node.fists)for(ref1=node.fists,l=0,len1=ref1.length;len1>l;l++)form_nm=ref1[l],aFists[form_nm]=view_nm},appModel=function(view_name,attribute){return aModels[view_name][attribute]},appFist=function(fist_nm){return aFists[fist_nm]},appFindNode=function(flow,t,s,cat,nm){var ncat,nf,ns,nt,ref,ref1,ref2,ref3,ref4;if(nf=aFlows[flow]){if(t&&null!=(nt=null!=(ref=nf.TRACKS)?ref[t]:void 0)){if(s&&null!=(ns=null!=(ref1=nt.STEPS)?ref1[s]:void 0)&&null!=(ncat=null!=(ref2=ns[cat])?ref2[nm]:void 0))return ncat;if(null!=(ncat=null!=(ref3=nt[cat])?ref3[nm]:void 0))return ncat}if(null!=(ncat=null!=(ref4=nf[cat])?ref4[nm]:void 0))return ncat}return null},appFindAttr=function(flow,t,s,attr){var nattr,nf,ns,nt,ref,ref1;if(nf=aFlows[flow]){if(t&&null!=(nt=null!=(ref=nf.TRACKS)?ref[t]:void 0)){if(s&&null!=(ns=null!=(ref1=nt.STEPS)?ref1[s]:void 0)&&null!=(nattr=ns[attr]))return nattr;if(null!=(nattr=nt[attr]))return nattr}if(null!=(nattr=nf[attr]))return nattr}return null},appGetF=function(flow){return aFlows[flow]},appGetT=function(flow,track){return aFlows[flow].TRACKS[track]},appGetS=function(flow,track,step){return aFlows[flow].TRACKS[track].STEPS[step]},appStartT=function(flow){return appGetF(flow).start},appStartS=function(flow,track){return appGetT(flow,track).start},appFindAction=function(path,action_token){var ref;return null!=(ref=appFindNode(path[0],path[1],path[2],"ACTIONS",action_token))?ref:aActions[action_token]},appGetSetting=function(setting_name,flow,track,step){var ref;return flow&&null!=(ref=appFindAttr(flow,track,null!=step?step:!1,setting_name))?ref:aSetting[setting_name]},appGetVars=function(flow,track,step){var vars;return vars=merge({},aFlows[flow].v,aFlows[flow].TRACKS[track].v,aFlows[flow].TRACKS[track].STEPS[step].v)},appSearchAttr=function(attrNm,val){var flow,flowNm,ref,ref1,step,stepNm,track,trackNm;for(flowNm in aFlows){flow=aFlows[flowNm],ref=flow.TRACKS;for(trackNm in ref){track=ref[trackNm],ref1=track.STEPS;for(stepNm in ref1)if(step=ref1[stepNm],step[attrNm]===val)return[flowNm,trackNm,stepNm];if(track[attrNm]===val)return[flowNm,trackNm,track.start]}if(flow[attrNm]===val)return[flowNm,flow.start,aFlows[flow.start].start]}return!1},make_model_functions=function(){var model,results,view;results=[];for(view in aModels)model=aModels[view],results.push(function(view,model){return E[view]=function(table_or_ctx,act_if_action,data){var inst_nm,oM;return inst_nm=model.inst,inst_nm in oModel||(oModel[inst_nm]=new E.Model[model["class"]](view,model.options),inst_nm in modelState&&oModel[inst_nm].restoreState(modelState[inst_nm])),oM=oModel[inst_nm],table_or_ctx===undef?oM:act_if_action===undef?oM.getTable(table_or_ctx):oM.action(table_or_ctx,act_if_action,data)}}(view,model));return results},action=function(action_token,data){var ans,final,more;inAction=action_token,m.startComputation(),final=function(){return m.endComputation()},more=function(action_result){return E.App().setIssues(action_result[0]),E.App().setMessages(action_result[1]),inAction=!1};try{ans=_d_doAction(action_token,data,E.App().getStepPath())}finally{null!=(null!=ans?ans.then:void 0)?ans.then(more).then(final,function(e){throw final(),e}):(setTimeout(final,0),null!=ans&&more(ans))}},_d_doAction=function(action_token,data,original_path){var action_node,ans,d_doActionNode,d_doLeftSide,d_doRightSide,done,err,master_data,master_issue,master_message;return master_issue=new Issue("App"),master_message=new Issue("App"),master_data=merge({},data),action_node=appFindAction(original_path,action_token),null==action_node?[master_issue,master_message]:(d_doLeftSide=function(action_node){var ans,copy_to,ctx,d,d_cb,fist,fist_model,i,is_macro,ix,j,l,len,len1,mg,name,nm,nms,r,ref,ref1,ref2,ref3,ref4,val,view_act,view_nm,what;for(ref=["fist","clear"],j=0,len=ref.length;len>j;j++)if(what=ref[j],what in action_node)if(fist=action_node[what],fist_model=null!=(ref1=E.fistDef[fist].event)?ref1:"Fist","clear"===what)E[fist_model]().fistClear(fist,master_data.row);else if(E[fist_model]().fistValidate(r={},fist,master_data.row),E.merge(master_data,r),"SUCCESS"!==r.fist$success)return;for(nms=function(){switch(type_oau(action_node.pass)){case"A":return action_node.pass;case"S":return action_node.pass.split(",");default:return[]}}(),ix=l=0,len1=nms.length;len1>l;ix=++l)nm=nms[ix],nm.indexOf(":")>-1&&(ref2=nm.split(":"),name=ref2[0],copy_to=ref2[1],master_data[copy_to]=master_data[name],nms[ix]=name);ref3=action_node.set;for(nm in ref3)val=ref3[nm],master_data[nm]=val;return null!=action_node["do"]?(is_macro=action_node["do"].indexOf(".")<0)?d_doActionNode(aMacros[action_node["do"]]):(ref4=action_node["do"].split("."),view_nm=ref4[0],view_act=ref4[1],view_act=view_act?view_act:action_token,d=new m.Deferred,r={},i=new E.Issue(view_nm,view_act),mg=new E.Issue(view_nm,view_act),ctx={d:d,r:r,i:i,m:mg},ans=E[view_nm](ctx,view_act,master_data),d_cb=function(){var ref5;ref5=ctx.r;for(nm in ref5)val=ref5[nm],master_data[nm]=val;return master_issue.addObj(ctx.i),master_message.addObj(ctx.m)},null!=(null!=ans?ans.then:void 0)?ans.then(d_cb):d_cb(ans)):void 0},d_doRightSide=function(action_node){var choice,j,k,len,matches,next_node,ref,ref1,ref2,val;for(null!=action_node.go&&E.App().go(action_node.go),next_node=null,null==action_node.next&&(action_node.next=[]),"A"!==type_oau(action_node.next)&&(action_node.next=[action_node.next]),ref=action_node.next,j=0,len=ref.length;len>j;j++){if(choice=ref[j],!("when"in choice)){next_node=choice;break}if("default"===choice.when){next_node=choice;break}if("string"==typeof choice.when&&choice.when===(null!=(ref1=master_data.success)?ref1:master_data.ok)){next_node=choice;break}matches=!0,ref2=choice.when;for(k in ref2)if(val=ref2[k],master_data[k]!==val){matches=!1;break}if(matches){next_node=choice;break}}return next_node?d_doActionNode(next_node):void 0},d_doActionNode=function(action_node){var ans,d_rsCb;return ans=d_doLeftSide(action_node),d_rsCb=function(){return d_doRightSide(action_node)},null!=(null!=ans?ans.then:void 0)?ans.then(d_rsCb):d_rsCb(ans)},ans=d_doActionNode(action_node),done=function(){return[master_issue,master_message]},err=function(err){throw new Error("BLOWUP:"+err.message)},null!=(null!=ans?ans.then:void 0)?ans.then(done,err):done(ans))},fieldDef={},fistDef={},fistInit=function(){var fist,j,len,nm,rec,ref,results;for(j=0,len=appconfs.length;len>j;j++)nm=appconfs[j],fist=null!=(ref=E["fist$"+nm])?ref:{},fist.FIELDS&&merge(fieldDef,fist.FIELDS),fist.FISTS&&merge(fistDef,fist.FISTS);for(nm in fistDef)rec=fistDef[nm],rec.fistNm=nm;results=[];for(nm in fieldDef)rec=fieldDef[nm],results.push(rec.fieldNm=nm);return results},issueMap={},issueInit=function(){var issues,j,len,nm,ref,results;for(results=[],j=0,len=appconfs.length;len>j;j++)nm=appconfs[j],issues=null!=(ref=E["issues$"+nm])?ref:{},results.push(merge(issueMap,issues));return results},wistDef={},wistInit=function(){var j,len,nm,ref,results,wists;for(results=[],j=0,len=appconfs.length;len>j;j++)nm=appconfs[j],wists=null!=(ref=E["wist$"+nm])?ref:{},results.push(merge(wistDef,wists));return results},ref={type_oau:type_oau,Model:Model,Extra:Extra,option:option,action:action,merge:merge,getModelState:getModelState,setModelState:setModelState,appGetF:appGetF,appGetT:appGetT,appGetS:appGetS,appStartT:appStartT,appStartS:appStartS,appFindAction:appFindAction,appGetSetting:appGetSetting,appGetVars:appGetVars,appFist:appFist,appFindAttr:appFindAttr,appSearchAttr:appSearchAttr,fieldDef:fieldDef,fistDef:fistDef,issueMap:issueMap,wistDef:wistDef};for(nm in ref)obj=ref[nm],E[nm]=obj;return E},Issue=function(){function Issue(t_view1,t_action1){this.t_view=t_view1,this.t_action=t_action1,this.issue_list=[]}return Issue.Make=function(view,token,value_list){var issue;return issue=new Issue(view),issue.add(token,value_list),issue},Issue.prototype.add=function(token,msgs){switch(typeof msgs){case"undefined":msgs=[];break;case"string":msgs=[msgs]}return this.issue_list.push({token:token,more:msgs,t_view:this.t_view,t_action:this.t_action})},Issue.prototype.addObj=function(issue_obj){var issue,j,len,new_issue,ref;if("object"==typeof issue_obj&&"issue_list"in issue_obj)for(ref=issue_obj.issue_list,j=0,len=ref.length;len>j;j++)issue=ref[j],new_issue=E.merge({},issue),null==new_issue.t_view&&(new_issue.t_view=this.t_view),null==new_issue.t_action&&(new_issue.t_action=this.t_action),this.issue_list.push(new_issue)},Issue.prototype.count=function(){return this.issue_list.length},Issue.prototype.asTable=function(){var final,issue,j,len,ref;for(final=[],ref=this.issue_list,j=0,len=ref.length;len>j;j++)issue=ref[j],final.push({token:issue.token,title:issue.t_view+"#"+issue.t_action+"#"+issue.token+"#"+issue.more.join(","),issue:this.map(issue.t_view,issue.t_action,issue.token,issue.more)});return final},Issue.prototype.map=function(t_view,t_action,token,more){var j,l,len,len1,map,map_list,ref,spec,sub_map;if(map=E.issueMap,"object"!=typeof map)return"(no map) "+t_view+"#"+t_action+"#"+token+"#"+more.join(",");map_list=[],t_view in map&&(t_action in map[t_view]&&map_list.push(map[t_view][t_action]),"default"in map[t_view]&&map_list.push(map[t_view]["default"])),"default"in map&&(t_action in map["default"]&&map_list.push(map["default"][t_action]),"default"in map["default"]&&map_list.push(map["default"]["default"]));for(j=0,len=map_list.length;len>j;j++)for(sub_map=map_list[j],ref=sub_map||[],l=0,len1=ref.length;len1>l;l++)if(spec=ref[l],token.match(spec[0]))return this.doMap(token,spec[1],more,token);return"(no match)"+t_view+"#"+t_action+"#"+token+"#"+more.join(",")},Issue.prototype.doMap=function(token,pattern,vals){var new_str;return new_str=pattern.replace(/%([0-9])(?::([0-9]))?%/g,function(str,i1,i2){return"0"===i1?token:i2?vals[i1-1]||vals[i2-1]||"":vals[i1-1]||""})},Issue}(),ModelJS=function(){function ModelJS(view_nm1,options,ss){this.view_nm=view_nm1,this.options=options,this._ModelJS={ss:ss||!1},this.restoreState(!1)}return ModelJS.prototype.getTable=function(tbl_nm){return this.loadTableIf(tbl_nm),this.Table[tbl_nm]},ModelJS.prototype.loadTableIf=function(tbl_nm){return tbl_nm in this.Table?void 0:this.loadTable(tbl_nm)},ModelJS.prototype.restoreState=function(copy_of_state){var key;if(null!=this._ModelJS.ss)for(key in this._ModelJS.ss)delete this[key];return null!=this._ModelJS.ss&&E.merge(this,this._ModelJS.ss),copy_of_state&&E.merge(this,copy_of_state),this.Table={}},ModelJS.prototype.saveState=function(){var nm,ss,st;if(ss=this._ModelJS.ss,!ss)return!1;st={};for(nm in ss)this[nm]!==ss[nm]&&(st[nm]=this[nm]);return E.merge({},st)},ModelJS.prototype.invalidateTables=function(tbl_nms,not_tbl_names){var deleted_tbl_nms,j,len,nm;for(null==not_tbl_names&&(not_tbl_names=[]),tbl_nms===!0&&(tbl_nms=function(){var results;results=[];for(nm in this.Table)indexOf.call(not_tbl_names,nm)>=0||results.push(nm);return results}.call(this)),deleted_tbl_nms=[],j=0,len=tbl_nms.length;len>j;j++)nm=tbl_nms[j],nm in this.Table&&(deleted_tbl_nms.push(nm),delete this.Table[nm]);return E.View().invalidateTables(this.view_nm,tbl_nms,deleted_tbl_nms)},ModelJS}(),w="undefined"!=typeof window?window:{},w.EpicMvc=w.E=new app(w),ref={Issue:Issue,ModelJS:ModelJS};for(nm in ref)klass=ref[nm],w.E[nm]=klass;w._log2=function(){}}).call(this);
/*Base/manifest.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  E.manifest$Base = {
    Extra: ['LoadStrategy', 'RenderStrategy', 'dataAction', 'RestAPI'],
    Model: ['App', 'View', 'Fist', 'Wist', 'Tab'],
    js: [],
    root: ['app']
  };

}).call(this);

/*Base/app.coffee*/// Generated by CoffeeScript 1.9.2
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

/*Base/Model/Tab.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
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
      var changed, group, ref;
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
    var g, height, i, ref;
    ref = val.split(':'), g = ref[0], i = ref[1];
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
      if (this.defer_it_cnt === 0) {
        if (this.in_run) {
          BLOWUP();
        }
        this.in_run = true;
        this.defer_it = new m.Deferred();
      }
      return this.defer_it_cnt++;
    };

    View$Base.prototype.nest_dn = function(who) {
      if (this.defer_it_cnt > 0) {
        this.defer_it_cnt--;
      }
      if (this.defer_it_cnt === 0) {
        this.in_run = false;
        return this.defer_it.resolve([this.modal, this.defer_content]);
      }
    };

    View$Base.prototype.run = function() {
      var flow, layout, modal, ref, ref1, ref2, step, track, who;
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
      var saved_info;
      saved_info = E.merge({}, {
        I: this.I,
        P: this.P
      });
      return saved_info;
    };

    View$Base.prototype.restoreInfo = function(saved_info) {
      var nm, results;
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
      var i, len, p, rVal, ref;
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
      if (!(this.did_run && deleted_tbl_nms.length)) {
        return;
      }
      m.startComputation();
      m.endComputation();
    };


    /* JCS: TODO FIGURE OUT IF DYNAMIC OR DEFER IS REALLY EVER NEEDED AGAIN - MITHRIL MAKES EVERYTHING DYNAMIC, NO? AND DATA-EX-* ATTRS DO DEFER, YES?
    	#JCS:DEFER:DYNAMIC
    	 * Wraper for page/part content which needs special treatment (dyanmic='div', epic:defer's, etc.)
    	wrap: (view, attrs, content, defer, has_root)->
    		if defer.length
    			inside= E.merge [], defer
    			attrs.config= (element, isInit, context) =>
    				for defer in inside
    					@doDefer defer, element, isInit, context
    		if 'dynamic' of attrs # Always render the container, even if content is null
    			tag: attrs.dynamic, attrs: attrs, children: content
    		else
    			return '' unless content
    			if has_root
    				 * TODO WHAT IS GOING ON WITH attrs TO wrap IF CONTENT HAS ATTRS? (part=)
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
      if (typeof content === 'function') {
        content = content();
      }
      return content;
    };

    View$Base.prototype.formatFromSpec = function(val, spec, custom_spec) {
      var left, ref, right, str;
      switch (spec) {
        case '':
          if (custom_spec) {
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
      var clean_attrs, nm, val;
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
      var ans, i, ix, kid, len, out, who;
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
      var attr, result, val;
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
      var d_load, name, view;
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
      var d_load, view;
      view = attrs.part;
      d_load = E.oLoader.d_part(view);
      return this.piece_handle('Part/' + view, attrs, d_load, true);
    };

    View$Base.prototype.piece_handle = function(view, attrs, obj, is_part) {
      var can_componentize, content, saved_info;
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
      		if can_componentize or not is_part or attrs.dynamic or defer.length
      			if defer.length and not can_componentize and not attrs.dynamic
      				_log2 "WARNING: DEFER logic in (#{view}); wrapping DIV tag."
      			result= @wrap view, attrs, content, defer, can_componentize
      		else
      			result= content
      		result
       */
    };

    View$Base.prototype.D_piece = function(view, attrs, d_load, is_part) {
      var d_result, saved_info, who;
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
      var count, i, len, limit, ref, result, rh_alias, row, tbl;
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
      var ans, content, fist, foreach_attrs, masterAlias, model, part, ref, ref1, ref2, ref3, ref4, ref5, ref6, rh_1, rh_alias, subTable, table, tbl;
      fist = E.fistDef[attrs.fist];
      model = (ref = fist.event) != null ? ref : 'Fist';
      table = attrs.fist + (attrs.row != null ? ':' + attrs.row : '');
      subTable = (ref1 = (ref2 = attrs.via) != null ? ref2 : fist.via) != null ? ref1 : 'Control';
      masterAlias = 'Fist';
      ref3 = this._accessModelTable(model + '/' + table, masterAlias), tbl = ref3[0], rh_alias = ref3[1];
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
      var attrs, d, e, i, ix, nm, p1, p2, ref, ref1, results, val;
      attrs = el.attributes;
      results = [];
      for (ix = i = 0, ref = attrs.length; 0 <= ref ? i < ref : i > ref; ix = 0 <= ref ? ++i : --i) {
        if (!('data-ex-' === attrs[ix].name.slice(0, 8))) {
          continue;
        }
        ref1 = attrs[ix].name.split('-'), d = ref1[0], e = ref1[1], nm = ref1[2], p1 = ref1[3], p2 = ref1[4];
        val = attrs[ix].value;
        results.push(E['ex$' + nm](el, isInit, ctx, val, p1, p2));
      }
      return results;
    };

    return View$Base;

  })(E.ModelJS);

  E.Model.View$Base = View$Base;

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
      var field, fist, had_issue, invalidate, invalidate2, tmp_val, was_issue, was_val;
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
      var ans, errors, field, fieldNm, fist, hval, invalidate, nm, r, ref, ref1, ref2;
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
      var choice_type, choices, defaults, fl, i, ref, ref1, rows, s;
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
      var db_value_hash, field, fieldNm, fist, i, len, nm, rec, ref, ref1, ref2, ref3, rnm;
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
      this.issues = new E.Issue(this.view_nm);
      this.messages = new E.Issue(this.view_nm);
      return this.invalidateTables(['Issue', 'Message']);
    };

    App$Base.prototype.goTo = function(flow, t, s) {
      var was;
      was = this.f + "/" + this.t + "/" + this.s;
      this.f = flow;
      this.t = t;
      this.s = s;
      if (was !== (this.f + "/" + this.t + "/" + this.s)) {
        return this.invalidateTables(['V']);
      }
    };

    App$Base.prototype.go = function(path) {
      var flow, ref, s, t;
      ref = path.split('/'), flow = ref[0], t = ref[1], s = ref[2];
      if (!flow) {
        flow = this.f;
        if (!t) {
          t = this.t;
        }
      }
      if (!t) {
        t = E.appStartT(flow);
      }
      if (!s) {
        s = E.appStartS(flow, t);
      }
      return this.goTo(flow, t, s);
    };

    App$Base.prototype.appGet = function(attr) {
      return E.appGetSetting(attr, this.f, this.t, this.s);
    };

    App$Base.prototype.getStepPath = function() {
      return [this.f, this.t, this.s];
    };

    App$Base.prototype.action = function(ctx, act, p) {
      var code, i, m, path, q, r, ref, route;
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

/*Base/Model/Wist.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
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
      var attrs, data_action, data_params, files, i, ix, j, len, nm, old_params, prevent, rec, ref, ref1, ref2, ref3, target, touch, type, val, x, y;
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
      }
    };

    RenderStrategy$Base.prototype.m_redraw = function() {
      this.redraw_guard++;
      if (this.redraw_guard !== 1) {
        return;
      }
      return E.View().run().then((function(_this) {
        return function(modal_content) {
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
        };
      })(this)).then(null, (function(_this) {
        return function(err) {
          return console.error('RenderStrategy$Base m_redraw', err);
        };
      })(this));
    };

    RenderStrategy$Base.prototype.render = function(modal, content) {
      var container;
      if (modal) {
        m.render((container = document.getElementById(this.modalId)), content);
      } else {
        if (this.was_modal) {
          m.render(document.getElementById(this.modalId), []);
        }
        m.render((container = document.getElementById(this.baseId)), m('div', {}, content));
      }
      if (!modal) {
        this.handleRenderState();
      }
      this.was_modal = modal;
      this.was_popped = false;
      this.very_first = false;
    };

    RenderStrategy$Base.prototype.handleRenderState = function() {
      var base, base1, displayHash, history, model_state, new_hash, path, route, str_path;
      path = E.App().getStepPath();
      str_path = path.join('/');
      history = str_path === this.last_path ? 'replace' : true;
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

/*Base/Extra/LoadStrategy.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
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
        proto: '//'
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
          var nm, ref, val;
          ref = header_obj != null ? header_obj : {};
          for (nm in ref) {
            val = ref[nm];
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
          status.xhr = xhr;
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
      var d, token;
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
      header_obj.Authorization = token.token_type + " " + token.access_token;
      return (this.D_Request(method, route, data, header_obj)).then((function(_this) {
        return function(status_n_data) {
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
        };
      })(this));
    };

    return RestAPI;

  })();

  E.Extra.RestAPI$Base = RestAPI;

}).call(this);

/*Base/Extra/dataAction.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  var dataAction,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  dataAction = function(type, data_action, data_params) {
    var action_specs, base, do_action, group, i, interesting, item, len, one_spec, prevent, ref, spec_action, spec_type;
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

E.view$Base={
Layout: {
"default":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([['page',{}]])}}},
Page: {
"default":{preloaded:1,can_componentize:true,defer:0,content:function(){return [{tag:'b',attrs:{},children:['A Base Page']}]}}},
Part: {
}};
