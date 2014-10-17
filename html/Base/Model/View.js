// Generated by CoffeeScript 1.4.0
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
        _log2(f, 'START RUN', this.frames, this.start = new Date().getTime());
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
        return this.defer_it.resolve(this.defer_content);
      }
    };

    View$Base.prototype.run = function() {
      var f, flow, layout, step, track, who, _ref, _ref1;
      f = 'run';
      who = 'R';
      _ref = E.App().getStepPath(), flow = _ref[0], track = _ref[1], step = _ref[2];
      layout = E.appGetSetting('layout', flow, track, step);
      this.page_name = (_ref1 = (E.appGetS(flow, track, step)).page) != null ? _ref1 : step;
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
      this.info_foreach = {};
      this.info_parts = [{}];
      this.info_if_nms = {};
      return this.info_defer = [[]];
    };

    View$Base.prototype.saveInfo = function() {
      var dyn, f, nm, rec, row_num, saved_info, _ref;
      f = 'saveInfo';
      dyn = {};
      row_num = {};
      _ref = this.info_foreach;
      for (nm in _ref) {
        rec = _ref[nm];
        dyn[nm] = rec.dyn;
        row_num[nm] = rec.count;
      }
      saved_info = E.merge({}, {
        info_foreach: {
          dyn: dyn,
          row_num: row_num
        },
        info_parts: this.info_parts
      });
      return saved_info;
    };

    View$Base.prototype.restoreInfo = function(saved_info) {
      var dyn_list, dyn_list_orig, dyn_m, dyn_t, f, info_parts, nm, oM, prev_row, rec, rh, rh_alias, row, row_num, t_set, tbl, _i, _len, _ref, _results;
      f = 'restoreInfo';
      this.resetInfo();
      _ref = saved_info.info_foreach.dyn;
      _results = [];
      for (nm in _ref) {
        rec = _ref[nm];
        dyn_m = rec[0], dyn_t = rec[1], dyn_list_orig = rec[2];
        _log2(f, nm, 'loop top', dyn_list_orig.length, {
          dyn_m: dyn_m,
          dyn_t: dyn_t
        });
        dyn_list = [];
        oM = E[dyn_m]();
        for (_i = 0, _len = dyn_list_orig.length; _i < _len; _i++) {
          t_set = dyn_list_orig[_i];
          rh = t_set[0], rh_alias = t_set[1];
          dyn_list.push(t_set);
          if (!(rh_alias in this.info_foreach)) {
            if (dyn_list.length === 1) {
              tbl = oM.getTable(rh);
            } else {
              tbl = prev_row[rh];
            }
            row_num = saved_info.info_foreach.row_num[rh_alias];
            row = E.merge({}, tbl[row_num]);
            this.info_foreach[rh_alias] = {
              dyn: [dyn_m, dyn_t, dyn_list],
              row: row,
              count: row_num
            };
            prev_row = row;
          } else {
            prev_row = this.info_foreach[rh_alias].row;
          }
        }
        info_parts = E.merge([], saved_info.info_parts);
        _results.push(_log2(f, 'info_parts', this.info_parts));
      }
      return _results;
    };

    View$Base.prototype.getTable = function(nm) {
      var f;
      f = 'Base:M/View.getTable:' + nm;
      switch (nm) {
        case 'If':
          return [this.info_if_nms];
        case 'Part':
          return this.info_parts.slice(-1);
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
      var inside,
        _this = this;
      inside = {
        defer: defer
      };
      attrs.config = function(el, isInit, context) {
        var f, _i, _len, _ref, _results;
        f = 'Base:M/View..config:' + view;
        _ref = inside.defer;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          defer = _ref[_i];
          _log2(f, defer);
          _results.push(_this.doDefer(defer, el));
        }
        return _results;
      };
      attrs['data-part'] = view;
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

    View$Base.prototype.doDefer = function(defer_obj, el) {
      var _this = this;
      if ('A' === E.type_oau(defer_obj.defer)) {
        _log2('WARNING', 'Got an array for defer', defer_obj.defer);
        return 'WAS-ARRAY';
      }
      if (defer_obj.func) {
        return defer_obj.func(el, defer_obj.attrs);
      }
      return defer_obj.defer.then(function(f_content) {
        defer_obj.func = new Function('el', 'attrs', f_content);
        _this.doDefer(defer_obj, el);
      });
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
      var left, right, str, _base, _ref;
      switch (spec) {
        case void 0:
          return val;
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
        case 'esc':
          return window.EpicMvc.escape_html(val);
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
            return val;
          }
      }
    };

    View$Base.prototype.v3 = function(view_nm, tbl_nm, key, format_spec, custom_spec) {
      var row;
      row = (E[view_nm](tbl_nm))[0];
      return this.formatFromSpec(row[key], format_spec, custom_spec);
    };

    View$Base.prototype.v2 = function(table_ref, col_nm, format_spec, custom_spec, sub_nm) {
      var ans;
      ans = this.info_foreach[table_ref].row[col_nm];
      if (sub_nm != null) {
        ans = ans[sub_nm];
      }
      return this.formatFromSpec(ans, format_spec, custom_spec);
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
      _log2(f, clean_attrs);
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
        view = (this.frame_inx < this.frames.length ? 'frame' : 'layout') + '/' + name;
      } else {
        d_load = E.oLoader.d_page(name = this.page_name);
        view = 'page/' + name;
      }
      return this.piece_handle(view, attrs != null ? attrs : {}, d_load);
    };

    View$Base.prototype.T_part = function(attrs) {
      var d_load, f, view;
      view = attrs.part;
      f = 'T_part:' + view;
      d_load = E.oLoader.d_part(view);
      return this.piece_handle(view, attrs, d_load, true);
    };

    View$Base.prototype.piece_handle = function(view, attrs, obj, is_part) {
      var can_componentize, content, defer, f, result;
      f = 'piece_handle';
      if (obj != null ? obj.then : void 0) {
        return this.D_piece(view, attrs, obj, is_part);
      }
      _log2(f, view);
      content = obj.content, can_componentize = obj.can_componentize;
      this.info_parts.push(this.loadPartAttrs(attrs));
      this.info_defer.push([]);
      content = this.handleIt(content);
      defer = this.info_defer.pop();
      if (can_componentize || attrs.dynamic || defer.length || !is_part) {
        if (defer.length && !can_componentize && !attrs.dynamic) {
          _log2("WARNING: DEFER logic in (" + view + "); wrapping DIV tag.");
        }
        result = this.wrap(view, attrs, content, defer, can_componentize);
      } else {
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
        _log2(f, 'THEN', obj);
        if (obj != null ? obj.then : void 0) {
          BLOWUP();
        }
        _this.restoreInfo(saved_info);
        result = _this.piece_handle(view, attrs, obj, is_part);
        _this.nest_dn(who + view);
        return result;
      });
      return d_result;
    };

    View$Base.prototype.T_defer = function(attrs, content) {
      var f, f_content;
      f = 'Base:M/View.T_defer:';
      f_content = this.handleIt(content);
      this.info_defer[this.info_defer.length - 1].push({
        attrs: attrs,
        func: new Function('el', 'attrs', f_content)
      });
      return '';
    };

    View$Base.prototype.T_if_true = function(attrs, content) {
      if (this.info_if_nms[attrs.name]) {
        return this.handleIt(content());
      } else {
        return '';
      }
    };

    View$Base.prototype.T_if_false = function(attrs, content) {
      if (this.info_if_nms[attrs.name]) {
        return '';
      } else {
        return this.handleIt(content);
      }
    };

    View$Base.prototype.T_if = function(attrs, content) {
      var is_true, issue, lh, rh, tbl, val, _ref, _ref1;
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
        } else if ('in_list' in attrs) {
          if (_ref = attrs.val, __indexOf.call(attrs.in_list.split(','), _ref) >= 0) {
            is_true = true;
          }
        } else {
          issue = true;
        }
      } else if ('set' in attrs) {
        is_true = attrs.set ? true : false;
      } else if ('not_set' in attrs) {
        is_true = attrs.not_set ? false : true;
      } else if ('table_is_not_empty' in attrs) {
        val = attrs.table_is_not_empty;
        _ref1 = val.split('/'), lh = _ref1[0], rh = _ref1[1];
        tbl = this._accessModelTable(val, false)[0];
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
        this.info_if_nms[attrs.name] = is_true;
      }
      if (is_true && content) {
        return this.handleIt(content);
      } else {
        return '';
      }
    };

    View$Base.prototype._accessModelTable = function(at_table, alias) {
      var dyn_list, dyn_m, dyn_t, lh, oM, rh, rh_alias, tbl, _ref, _ref1, _ref2;
      _ref = at_table.split('/'), lh = _ref[0], rh = _ref[1];
      if (lh in this.info_foreach) {
        tbl = this.info_foreach[lh].row[rh];
        _ref1 = this.info_foreach[lh].dyn, dyn_m = _ref1[0], dyn_t = _ref1[1], dyn_list = _ref1[2];
      } else {
        oM = E[lh]();
        tbl = oM.getTable(rh);
        _ref2 = [lh, rh, []], dyn_m = _ref2[0], dyn_t = _ref2[1], dyn_list = _ref2[2];
      }
      if (tbl.length === 0) {
        return [tbl, rh, lh, rh, oM];
      }
      rh_alias = rh;
      if (alias) {
        rh_alias = alias;
      }
      dyn_list.push([rh, rh_alias]);
      this.info_foreach[rh_alias] = {
        dyn: [dyn_m, dyn_t, dyn_list]
      };
      return [tbl, rh_alias, lh, rh, oM];
    };

    View$Base.prototype.T_foreach = function(attrs, content_f) {
      var count, f, limit, result, rh_alias, row, tbl, _i, _len, _ref;
      f = 'T_foreach';
      _log2(f, attrs);
      _ref = this._accessModelTable(attrs.table, attrs.alias), tbl = _ref[0], rh_alias = _ref[1];
      if (tbl.length === 0) {
        return '';
      }
      result = [];
      limit = 'limit' in attrs ? Number(attrs.limit) - 1 : tbl.length;
      for (count = _i = 0, _len = tbl.length; _i < _len; count = ++_i) {
        row = tbl[count];
        row = tbl[count];
        this.info_foreach[rh_alias].row = row;
        this.info_foreach[rh_alias].count = count;
        result.push(this.handleIt(content_f));
      }
      delete this.info_foreach[rh_alias];
      return result;
    };

    View$Base.prototype.T_fist = function(attrs, content_f) {
      var f, model, rh_alias, table, tbl, _ref, _ref1, _ref2, _ref3;
      f = 'T_fist';
      _log2(f, attrs, content_f);
      model = (_ref = E.fistDef[attrs.fist].event) != null ? _ref : 'Fist';
      table = attrs.fist + (attrs.row != null ? ':' + attrs.row : '');
      _ref1 = this._accessModelTable(model + '/' + table, attrs.alias), tbl = _ref1[0], rh_alias = _ref1[1];
      this.info_foreach[rh_alias].row = tbl[0];
      this.info_foreach[rh_alias].count = 0;
      if (content_f) {
        return this.handleIt(content_f);
      } else {
        if ((_ref2 = attrs.part) == null) {
          attrs.part = (_ref3 = E.fistDef[attrs.fist].part) != null ? _ref3 : 'fist_default';
        }
        return this.T_part(attrs);
      }
    };

    return View$Base;

  })(E.ModelJS);

  E.Model.View$Base = View$Base;

}).call(this);
