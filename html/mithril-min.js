Mithril=m=new function e(t,n){function o(e){return{}.toString.call(e)}function u(e){return o(e)==r}function a(e){return o(e)==i}function f(e){return typeof e=="function"}function l(e){return o(e)==s}function d(){var e=Array.prototype.slice,t=e.call(arguments,0),n=t[1]!=null&&u(t[1])&&!("tag"in t[1])&&!("subtree"in t[1]),r=n?t[1]:{},i="class"in r?"class":"className",s={tag:"div",attrs:{}},f,l=[];while(f=c.exec(t[0]))if(f[1]=="")s.tag=f[2];else if(f[1]=="#")s.attrs.id=f[2];else if(f[1]==".")l.push(f[2]);else if(f[3][0]=="["){var p=h.exec(f[3]);s.attrs[p[1]]=p[3]||(p[2]?"":!0)}l.length>0&&(s.attrs[i]=l.join(" "));var d=n?t[2]:t[1];a(d)||o(d)=="[object Arguments]"?s.children=e.call(d,0):s.children=n?t.slice(2):t.slice(1);for(var v in r)v==i?s.attrs[v]=(s.attrs[v]||"")+" "+r[v]:s.attrs[v]=r[v];return s}function v(e,s,u,c,h,d,y,E,S,x,T){h==null&&(h="");if(h.subtree==="retain")return d;var N=o(d),C=o(h);if(d==null||N!=C){if(d!=null)if(u&&u.nodes){var k=E-c,L=k+(C==i?h:d.nodes).length;g(u.nodes.slice(k,L),u.slice(k,L))}else d.nodes&&g(d.nodes,d);d=new h.constructor,d.tag&&(d={}),d.nodes=[]}if(C==i){h=w(h);var A=[],O=d.length===h.length,M=0,_=1,D=2,P=3,H={},B=[],j=!1;for(var F=0;F<d.length;F++)d[F]&&d[F].attrs&&d[F].attrs.key!=null&&(j=!0,H[d[F].attrs.key]={action:_,index:F});if(j){for(var F=0;F<h.length;F++)if(h[F]&&h[F].attrs)if(h[F].attrs.key!=null){var I=h[F].attrs.key;H[I]?H[I]={action:P,index:F,from:H[I].index,element:e.childNodes[H[I].index]||t.document.createElement("div")}:H[I]={action:D,index:F}}else B.push({index:F,element:e.childNodes[F]||t.document.createElement("div")});var q=Object.keys(H).map(function(e){return H[e]}),R=q.sort(function(e,t){return e.action-t.action||e.index-t.index}),U=d.slice();for(var F=0,z;z=R[F];F++){z.action==_&&(g(d[z.index].nodes,d[z.index]),U.splice(z.index,1));if(z.action==D){var W=t.document.createElement("div");W.key=h[z.index].attrs.key,e.insertBefore(W,e.childNodes[z.index]),U.splice(z.index,0,{attrs:{key:h[z.index].attrs.key},nodes:[W]})}z.action==P&&(e.childNodes[z.index]!==z.element&&z.element!==null&&e.insertBefore(z.element,e.childNodes[z.index]),U[z.index]=d[z.from])}for(var F=0;F<B.length;F++){var z=B[F];e.insertBefore(z.element,e.childNodes[z.index]),U[z.index]=d[z.index]}d=U,d.nodes=[];for(var F=0,X;X=e.childNodes[F];F++)d.nodes.push(X)}for(var F=0,V=0;F<h.length;F++){var $=v(e,s,d,E,h[F],d[V],y,E+M||M,S,x,T);if($===n)continue;$.nodes.intact||(O=!1),M+=a($)?$.length:1,d[V++]=$}if(!O){for(var F=0;F<h.length;F++)d[F]!=null&&(A=A.concat(d[F].nodes));for(var F=0,J;J=d.nodes[F];F++)J.parentNode!=null&&A.indexOf(J)<0&&g([J],[d[F]]);for(var F=d.nodes.length,J;J=A[F];F++)J.parentNode==null&&e.appendChild(J);h.length<d.length&&(d.length=h.length),d.nodes=A}}else if(h!=null&&C==r){if(h.tag!=d.tag||Object.keys(h.attrs).join()!=Object.keys(d.attrs).join()||h.attrs.id!=d.attrs.id)g(d.nodes),d.configContext&&f(d.configContext.onunload)&&d.configContext.onunload();if(!l(h.tag))return;var J,K=d.nodes.length===0;h.attrs.xmlns?x=h.attrs.xmlns:h.tag==="svg"?x="http://www.w3.org/2000/svg":h.tag==="math"&&(x="http://www.w3.org/1998/Math/MathML"),K?(J=x===n?t.document.createElement(h.tag):t.document.createElementNS(x,h.tag),d={tag:h.tag,children:v(J,h.tag,n,n,h.children,d.children,!0,0,h.attrs.contenteditable?J:S,x,T),attrs:m(J,h.tag,h.attrs,{},x),nodes:[J]},e.insertBefore(J,e.childNodes[E]||null)):(J=d.nodes[0],m(J,h.tag,h.attrs,d.attrs,x),d.children=v(J,h.tag,n,n,h.children,d.children,!1,0,h.attrs.contenteditable?J:S,x,T),d.nodes.intact=!0,y===!0&&J!=null&&e.insertBefore(J,e.childNodes[E]||null));if(f(h.attrs.config)){var Q=d.configContext=d.configContext||{},G=function(e,t){return function(){return e.attrs.config.apply(e,t)}};T.push(G(h,[J,!K,Q,d]))}}else if(!f(C)){var A;if(d.nodes.length===0)h.$trusted?A=b(e,E,h):(A=[t.document.createTextNode(h)],e.nodeName.match(p)||e.insertBefore(A[0],e.childNodes[E]||null)),d="string number boolean".indexOf(typeof h)>-1?new h.constructor(h):h,d.nodes=A;else if(d.valueOf()!==h.valueOf()||y===!0){A=d.nodes;if(!S||S!==t.document.activeElement)if(h.$trusted)g(A,d),A=b(e,E,h);else if(s==="textarea")e.value=h;else if(S)S.innerHTML=h;else{if(A[0].nodeType==1||A.length>1)g(d.nodes,d),A=[t.document.createTextNode(h)];e.insertBefore(A[0],e.childNodes[E]||null),A[0].nodeValue=h}d=new h.constructor(h),d.nodes=A}else d.nodes.intact=!0}return d}function m(e,t,n,r,i){for(var s in n){var o=n[s],a=r[s];if(!(s in r)||a!==o){r[s]=o;try{if(s==="config")continue;if(f(o)&&s.indexOf("on")==0)e[s]=E(o,e);else if(s==="style"&&u(o)){for(var l in o)if(a==null||a[l]!==o[l])e.style[l]=o[l];for(var l in a)l in o||(e.style[l]="")}else i!=null?s==="href"?e.setAttributeNS("http://www.w3.org/1999/xlink","href",o):s==="className"?e.setAttribute("class",o):e.setAttribute(s,o):s in e&&s!="list"&&s!="style"&&s!="form"?e[s]=o:e.setAttribute(s,o)}catch(c){if(c.message.indexOf("Invalid argument")<0)throw c}}}return r}function g(e,t){for(var n=e.length-1;n>-1;n--)e[n]&&e[n].parentNode&&(e[n].parentNode.removeChild(e[n]),t=[].concat(t),t[n]&&y(t[n]));e.length!=0&&(e.length=0)}function y(e){e.configContext&&f(e.configContext.onunload)&&e.configContext.onunload();if(e.children)if(a(e.children))for(var t=0;t<e.children.length;t++)y(e.children[t]);else e.children.tag&&y(e.children)}function b(e,n,r){var i=e.childNodes[n];if(i){var s=i.nodeType!=1,o=t.document.createElement("span");s?(e.insertBefore(o,i),o.insertAdjacentHTML("beforebegin",r),e.removeChild(o)):i.insertAdjacentHTML("beforebegin",r)}else e.insertAdjacentHTML("beforeend",r);var u=[];while(e.childNodes[n]!==i)u.push(e.childNodes[n]),n++;return u}function w(e){var t=[];for(var n=0;n<e.length;n++){var r=e[n];a(r)?t.push.apply(t,w(r)):t.push(r)}return t}function E(e,t){return function(n){n=n||event,d.redraw.strategy("diff"),d.startComputation();try{return e.call(t,n)}finally{d.endComputation()}}}function C(e){var t=T.indexOf(e);return t<0?T.push(e)-1:t}function k(e){var t=function(){return arguments.length&&(e=arguments[0]),e};return t.toJSON=function(){return e},t}function B(){var e=d.redraw.strategy();for(var t=0;t<L.length;t++)O[t]&&e!="none"&&d.render(L[t],A[t].view(O[t]),e=="all");D&&(D(),D=null),M=null,_=new Date,d.redraw.strategy("diff")}function U(e){return e.slice(F[d.route.mode].length)}function z(e,t,n){q={};var r=n.indexOf("?");r!==-1&&(q=$(n.substr(r+1,n.length)),n=n.substr(0,r));for(var i in t){if(i==n)return d.module(e,t[i]),!0;var s=new RegExp("^"+i.replace(/:[^\/]+?\.{3}/g,"(.*?)").replace(/:[^\/]+/g,"([^\\/]+)")+"/?$");if(s.test(n))return n.replace(s,function(){var n=i.match(/:[^\/]+/g)||[],r=[].slice.call(arguments,1,-2);for(var s=0;s<n.length;s++)q[n[s].replace(/:|\./g,"")]=decodeURIComponent(r[s]);d.module(e,t[i])}),!0}}function W(e){e=e||event;if(e.ctrlKey||e.metaKey||e.which==2)return;e.preventDefault?e.preventDefault():e.returnValue=!1;var t=e.currentTarget||this;d.route(t[d.route.mode].slice(F[d.route.mode].length))}function X(){d.route.mode!="hash"&&t.location.hash?t.location.hash=t.location.hash:t.scrollTo(0,0)}function V(e,t){var n=[];for(var r in e){var i=t?t+"["+r+"]":r,s=e[r];n.push(u(s)?V(s,i):encodeURIComponent(i)+"="+encodeURIComponent(s))}return n.join("&")}function $(e){var t=e.split("&"),n={};for(var r=0;r<t.length;r++){var i=t[r].split("=");n[J(i[0])]=i[1]?J(i[1]):i.length===1?!0:""}return n}function J(e){return decodeURIComponent(e.replace(/\+/g," "))}function K(e){var t=C(e);g(e.childNodes,N[t]),N[t]=n}function Q(e){return prop=d.prop(),e.then(prop),prop.then=function(t,n){return Q(e.then(t,n))},prop}function G(e,t){function h(e){a=e||s,c.map(function(e){a==i&&e.resolve(l)||e.reject(l)})}function p(e,t,n,r){if((u(l)||f(l))&&f(e))try{var i=0;e.call(l,function(e){if(i++)return;l=e,t()},function(e){if(i++)return;l=e,n()})}catch(s){d.deferred.onerror(s),l=s,n()}else r()}function v(){var s;try{s=l&&l.then}catch(u){return d.deferred.onerror(u),l=u,a=r,v()}p(s,function(){a=n,v()},function(){a=r,v()},function(){try{a==n&&f(e)?l=e(l):a==r&&f(t)&&(l=t(l),a=n)}catch(u){return d.deferred.onerror(u),l=u,h()}l==o?(l=TypeError(),h()):p(s,function(){h(i)},h,function(){h(a==n&&i)})})}var n=1,r=2,i=3,s=4,o=this,a=0,l=0,c=[];o.promise={},o.resolve=function(e){return a||(l=e,a=n,v()),this},o.reject=function(e){return a||(l=e,a=r,v()),this},o.promise.then=function(e,t){var n=new G(e,t);return a==i?n.resolve(l):a==s?n.reject(l):c.push(n),n.promise}}function Y(e){return e}function Z(e){if(!e.dataType||e.dataType.toLowerCase()!=="jsonp"){var i=new t.XMLHttpRequest;i.open(e.method,e.url,!0,e.user,e.password),i.onreadystatechange=function(){i.readyState===4&&(i.status>=200&&i.status<300?e.onload({type:"load",target:i}):e.onerror({type:"error",target:i}))},e.serialize==JSON.stringify&&e.data&&e.method!="GET"&&i.setRequestHeader("Content-Type","application/json; charset=utf-8"),e.deserialize==JSON.parse&&i.setRequestHeader("Accept","application/json, text/*");if(f(e.config)){var s=e.config(i,e);s!=null&&(i=s)}return i.send(e.method=="GET"||!e.data?"":e.data),i}var n="mithril_callback_"+(new Date).getTime()+"_"+Math.round(Math.random()*1e16).toString(36),r=t.document.createElement("script");t[n]=function(i){delete t[n],t.document.body.removeChild(r),e.onload({type:"load",target:{responseText:i}})},r.onerror=function(i){return delete t[n],t.document.body.removeChild(r),e.onerror({type:"error",target:{status:500,responseText:JSON.stringify({error:"Error making jsonp request"})}}),!1},r.onload=function(e){return!1},r.src=e.url+(e.url.indexOf("?")>0?"&":"?")+(e.callbackKey?e.callbackKey:"callback")+"="+n+"&"+V(e.data||{}),t.document.body.appendChild(r)}function et(e,t,n){return t&&Object.keys(t).length>0&&(e.method=="GET"&&e.dataType!="jsonp"?e.url=e.url+(e.url.indexOf("?")<0?"?":"&")+V(t):e.data=n(t)),e}function tt(e,t){var n=e.match(/:[a-z]\w+/gi);if(n&&t)for(var r=0;r<n.length;r++){var i=n[r].slice(1);e=e.replace(n[r],t[i]),delete t[i]}return e}var r="[object Object]",i="[object Array]",s="[object String]",c=/(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g,h=/\[(.+?)(?:=("|'|)(.*?)\2)?\]/,p=/AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR/,S,x={appendChild:function(e){S===n&&(S=t.document.createElement("html")),t.document.documentElement&&t.document.documentElement!==e?t.document.replaceChild(e,t.document.documentElement):t.document.appendChild(e),this.childNodes=t.document.childNodes},insertBefore:function(e){this.appendChild(e)},childNodes:[]},T=[],N={};d.render=function(e,r,i){var s=[];if(!e)throw new Error("Please ensure the DOM element exists before rendering a template into it.");var o=C(e),u=e==t.document,a=u||e==t.document.documentElement?x:e;u&&r.tag!="html"&&(r={tag:"html",attrs:{},children:r}),N[o]===n&&g(a.childNodes),i===!0&&K(e),N[o]=v(a,null,n,n,r,N[o],!1,0,null,n,s);for(var f=0;f<s.length;f++)s[f]()},d.trust=function(e){return e=new String(e),e.$trusted=!0,e},d.prop=function(e){return(u(e)||f(e))&&e!==null&&f(e.then)?Q(e):k(e)};var L=[],A=[],O=[],M=null,_=0,D=null,P=!1,H=16;d.module=function(e,t){var n=L.indexOf(e);n<0&&(n=L.length);var r=!1;if(O[n]&&f(O[n].onunload)){var i={preventDefault:function(){r=!0}};O[n].onunload(i)}if(!r)return d.redraw.strategy("all"),d.startComputation(),L[n]=e,A[n]=t,O[n]=new t.controller,d.endComputation(),O[n]},d.redraw=function(e){var n=t.cancelAnimationFrame||t.clearTimeout,r=t.requestAnimationFrame||t.setTimeout;if(M&&e!==!0){if(new Date-_>H||r==t.requestAnimationFrame)M>0&&n(M),M=r(B,H)}else B(),M=r(function(){M=null},H)},d.redraw.strategy=d.prop();var j=0;d.startComputation=function(){j++},d.endComputation=function(){j=Math.max(j-1,0),j==0&&d.redraw()},d.withAttr=function(e,t){return function(n){n=n||event;var r=n.currentTarget||this;t(e in r?r[e]:r.getAttribute(e))}};var F={pathname:"",hash:"#",search:"?"},I=function(){},q={},R;return d.route=function(){if(arguments.length===0)return R;if(arguments.length===3&&l(arguments[1])){var e=arguments[0],n=arguments[1],r=arguments[2];I=function(t){var i=R=U(t);z(e,r,i)||d.route(n,!0)};var i=d.route.mode=="hash"?"onhashchange":"onpopstate";t[i]=function(){R!=U(t.location[d.route.mode])&&I(t.location[d.route.mode])},D=X,t[i]()}else if(arguments[0].addEventListener){var s=arguments[0],o=arguments[1],a=arguments[2];o||(a.href=s.getAttribute("href"),s.href=t.location.pathname+F[d.route.mode]+a.href,s.removeEventListener("click",W),s.addEventListener("click",W))}else if(l(arguments[0])){R=arguments[0];var f=u(arguments[1])?V(arguments[1]):null;f&&(R+=(R.indexOf("?")===-1?"?":"&")+f);var c=(arguments.length==3?arguments[2]:arguments[1])===!0;t.history.pushState?(D=function(){t.history[c?"replaceState":"pushState"](null,t.document.title,F[d.route.mode]+R),X()},I(F[d.route.mode]+R)):t.location[d.route.mode]=R}},d.route.param=function(e){return q[e]},d.route.mode="search",d.deferred=function(){var e=new G;return e.promise=Q(e.promise),e},d.deferred.onerror=function(e){if(o(e)=="[object Error]"&&!e.constructor.toString().match(/ Error/))throw e},d.sync=function(e){function n(e,n){return function(o){return s[e]=o,n||(t="reject"),--i==0&&(r.promise(s),r[t](s)),o}}var t="resolve",r=d.deferred(),i=e.length,s=new Array(i);if(e.length>0)for(var o=0;o<e.length;o++)e[o].then(n(o,!0),n(o,!1));else r.resolve();return r.promise},d.request=function(e){e.background!==!0&&d.startComputation();var t=d.deferred(),n=e.dataType&&e.dataType.toLowerCase()==="jsonp",r=e.serialize=n?Y:e.serialize||JSON.stringify,i=e.deserialize=n?Y:e.deserialize||JSON.parse,s=e.extract||function(e){return e.responseText.length===0&&i===JSON.parse?null:e.responseText};return e.url=tt(e.url,e.data),e=et(e,e.data,r),e.onload=e.onerror=function(n){try{n=n||event;var r=(n.type=="load"?e.unwrapSuccess:e.unwrapError)||Y,o=r(i(s(n.target,e)));if(n.type=="load")if(a(o)&&e.type)for(var u=0;u<o.length;u++)o[u]=new e.type(o[u]);else e.type&&(o=new e.type(o));t[n.type=="load"?"resolve":"reject"](o)}catch(n){d.deferred.onerror(n),t.reject(n)}e.background!==!0&&d.endComputation()},Z(e),t.promise},d.deps=function(e){return t=e},d.deps.factory=e,d.Deferred=G,d}(typeof window!="undefined"?window:{}),typeof module!="undefined"&&module!==null&&(module.exports=m),typeof define=="function"&&define.amd&&define(function(){return m});