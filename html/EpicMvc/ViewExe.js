// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var $, ViewExe;

  $ = window.jQuery;

  ViewExe = (function() {

    function ViewExe(Epic, loadStrategy) {
      this.Epic = Epic;
      this.loadStrategy = loadStrategy;
      this.dynamicParts = [];
    }

    ViewExe.prototype.init = function(template, page) {
      var v;
      this.template = template;
      this.page = page;
      this.Epic.log2(':view T:' + this.template, 'P:' + page, ((function() {
        var _i, _len, _ref, _results;
        _ref = (this.Epic.getInstance('Pageflow')).getStepPath();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          _results.push(v);
        }
        return _results;
      }).call(this)).join('/'));
      this.instance = this.Epic.nextCounter();
      this.oTemplate = this.loadStrategy.template(this.template);
      this.oPage = this.loadStrategy.page(this.page);
      this.stack = [];
      this.TagExe = this.Epic.getInstance('Tag');
      this.TagExe.resetForNextRequest();
      this.current = null;
      this.dynamicParts = [
        {
          defer: [],
          parent: 0
        }
      ];
      this.dynamicMap = {};
      return this.activeDynamicPartIx = 0;
    };

    ViewExe.prototype.checkRefresh = function(tables) {
      alert('Epic: ViewExec.checkRefresh was disabled.');
      return false;
    };

    ViewExe.prototype.part = function(ix) {
      return this.dynamicParts[ix || this.activeDynamicPartIx];
    };

    ViewExe.prototype.doDynamicPart = function(ix, instance) {
      var old_dynamic_ix, part;
      if (instance !== this.instance) {
        return;
      }
      part = this.part(ix);
      if (part.pending === false) {
        return;
      }
      part.stamp = new Date().getTime();
      part.pending = false;
      part.defer = [];
      $('#' + part.id).html('Changing...');
      old_dynamic_ix = this.activeDynamicPartIx;
      this.activeDynamicPartIx = ix;
      this.TagExe.resetForNextRequest(part.state);
      $('#' + part.id).html(this.run(this.loadStrategy.part(part.name)));
      this.doDeferPart(part);
      return this.activeDynamicPartIx = old_dynamic_ix;
    };

    ViewExe.prototype.pushDefer = function(code) {
      return this.part().defer.push(code);
    };

    ViewExe.prototype.doDeferPart = function(part) {
      var v, _i, _len, _ref;
      _ref = part.defer;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        eval(v.code);
      }
      return true;
    };

    ViewExe.prototype.doDefer = function() {
      var part, _i, _len, _ref;
      _ref = this.dynamicParts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        this.doDeferPart(part);
      }
      return true;
    };

    ViewExe.prototype.haveTableRefrence = function(view_nm, tbl_nm) {
      var nm, _base, _ref;
      if (this.activeDynamicPartIx === 0) {
        return;
      }
      nm = (this.Epic.getInstanceNm(view_nm)) + ':' + tbl_nm;
      if ((_ref = (_base = this.dynamicMap)[nm]) == null) {
        _base[nm] = [];
      }
      return this.dynamicMap[nm].push(this.activeDynamicPartIx);
    };

    ViewExe.prototype.addDynamicPart = function(info) {
      var f;
      f = ':ViewExe.addDynamicPart';
      this.Epic.log2(f, info, this.activeDynamicPartIx, this.part());
      if (this.activeDynamicPartIx !== 0) {
        alert('Nested dynamic parts not really supported just now.');
      }
      this.dynamicParts.push({
        name: info.name,
        id: info.id,
        delay: info.delay,
        state: info.state,
        defer: [],
        parent: this.activeDynamicPartIx,
        pending: false,
        stamp: new Date().getTime()
      });
      return this.activeDynamicPartIx = this.dynamicParts.length - 1;
    };

    ViewExe.prototype.invalidateTables = function(view_nm, tbl_nms) {
      var delay, f, inst, ix, ix_list, nm, now, part, sched, sofar, tbl_nm, _i, _j, _len, _len1, _ref,
        _this = this;
      f = ':ViewExe.invalidateTables';
      this.Epic.log2(f, view_nm, tbl_nms, (this.Epic.inClick ? 'IN' : void 0), this.dynamicParts, this.dynamicMap);
      sched = [];
      if (this.dynamicParts.length === 1) {
        return 'no dynamic parts';
      }
      if (this.Epic.inClick) {
        return 'in click';
      }
      ix_list = {};
      inst = this.Epic.getInstanceNm(view_nm);
      for (_i = 0, _len = tbl_nms.length; _i < _len; _i++) {
        tbl_nm = tbl_nms[_i];
        nm = inst + ':' + tbl_nm;
        if (nm in this.dynamicMap) {
          _ref = this.dynamicMap[nm];
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            ix = _ref[_j];
            ix_list[ix] = true;
          }
        }
      }
      now = new Date().getTime();
      for (ix in ix_list) {
        part = this.part(ix);
        if (part.pending === false) {
          sofar = now - part.stamp;
          delay = sofar > part.delay ? 0 : part.delay - sofar;
          part.pending = window.setTimeout((function() {
            return _this.doDynamicPart(ix, _this.instance);
          }), delay);
          sched.push(ix);
        }
      }
      return sched;
    };

    ViewExe.prototype.run = function(current, dynoInfo) {
      var out, _ref;
      if (current == null) {
        current = this.oTemplate;
      }
      this.stack.push([this.current, this.activeDynamicPartIx]);
      this.current = current;
      if (dynoInfo) {
        this.addDynamicPart(dynoInfo);
      }
      out = this.doAllParts(0);
      _ref = this.stack.pop(), this.current = _ref[0], this.activeDynamicPartIx = _ref[1];
      return out;
    };

    ViewExe.prototype.includePage = function() {
      return this.run(this.oPage);
    };

    ViewExe.prototype.includePart = function(nm, dynoInfo) {
      dynoInfo.name = nm;
      return this.run(this.loadStrategy.part(nm), dynoInfo);
    };

    ViewExe.prototype.doAllParts = function(parts_inx) {
      var attr, first, out, tag, tag_self, _i, _len, _ref;
      parts_inx = Number(parts_inx);
      out = '';
      if (parts_inx === 0) {
        out += this.handleIt(this.current[0]);
        parts_inx = this.current.length - 1;
        first = false;
      } else {
        first = true;
        out += this.handleIt(this.current[parts_inx + 3]);
      }
      _ref = this.current[parts_inx];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        tag_self = _ref[_i];
        if (first) {
          first = false;
          continue;
        }
        tag = this.current[tag_self + 1];
        attr = this.current[tag_self + 2];
        out += this.TagExe['Tag_' + tag]({
          parts: tag_self,
          attrs: attr
        });
        out += this.handleIt(this.current[this.current[tag_self][0]]);
      }
      return out;
    };

    ViewExe.prototype.handleIt = function(text_n_vars) {
      var args, cmd, i, out, _i, _ref, _ref1;
      if (typeof text_n_vars === 'string') {
        return text_n_vars;
      }
      out = text_n_vars[0];
      for (i = _i = 1, _ref = text_n_vars.length; _i < _ref; i = _i += 2) {
        _ref1 = text_n_vars[i], cmd = _ref1[0], args = _ref1[1];
        out += this.TagExe[cmd].apply(this.TagExe, args);
        out += text_n_vars[i + 1];
      }
      return out;
    };

    return ViewExe;

  })();

  window.EpicMvc.ViewExe = ViewExe;

}).call(this);
