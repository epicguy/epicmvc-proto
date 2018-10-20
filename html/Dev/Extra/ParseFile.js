// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var E, FindAttrVal, FindAttrs, FindStyles, ParseFile, doError, entities, findStyleVal, findVars, mkNm, mkObj, nm_map, sq,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  E = typeof exports !== "undefined" && exports !== null ? require('E') : window.E;

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

  FindStyles = function(file_info, parts) {
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
    f = 'DE/ParseFile.FindAttrs:';
    event_attrs_shortcuts = ['data-e-click', 'data-e-rclick', 'data-e-change', 'data-e-dblclick', 'data-e-enter', 'data-e-escape', 'data-e-keyup', 'data-e-focus', 'data-e-blur', 'data-e-event'];
    str = ' ' + str;
    str = str.replace(/\se-/gm, ' data-e-');
    str = str.replace(/\sex-/gm, ' data-ex-');
    attr_split = str.trim().split(/([\s="':;])/);
    empty = attr_split[attr_split.length - 1] === '/' ? '/' : '';
    if (empty === '/') {
      attr_split.pop();
    }
    attrs_need_cleaning = false;
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
        style_obj = FindStyles(file_info, parts);
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
    var T_EPIC, T_M1, T_M2, T_STYLE, T_TEXT, after, after_comment, after_script, attr_clean, attrs, base_nm, children, content, doChildren, dom_close, dom_nms, dom_pre_tags, empty, etags, f, flavor, i, oi, parts, pre_count, prev_children, ref, ref1, stats, t, tag_names_for_debugger, tag_wait, text, whole_tag;
    f = 'DE/ParseFile:' + file_stats;
    etags = ['page', 'part', 'if', 'if_true', 'if_false', 'foreach', 'fist'];
    T_EPIC = 0;
    T_M1 = 1;
    T_M2 = 2;
    T_STYLE = 3;
    T_TEXT = 4;
    stats = {
      text: 0,
      dom: 0,
      epic: 0
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
      if (parts[i + 1] === '/') {
        if (!tag_wait.length) {
          doError(file_stats, "Close tag found when none expected close=" + parts[i + 2]);
        }
        ref = tag_wait.pop(), oi = ref[0], base_nm = ref[1], attrs = ref[2], prev_children = ref[3], flavor = ref[4];
        if (indexOf.call(dom_pre_tags, base_nm) >= 0) {
          pre_count--;
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
          if (indexOf.call(dom_close, base_nm) >= 0) {
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
      content: content
    };
  };

  E.Extra.ParseFile = ParseFile;

}).call(this);
