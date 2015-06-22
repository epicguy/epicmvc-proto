// Generated by CoffeeScript 1.4.0
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
    _ref = ['c1', 'a1', 'a2', 'ap1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'ca1', 'ca2', 'ca3', 'ca4', 'fi1', 'fi2', 'fi3', 'fi4', 'v1', 'v2', 'w1', 'ex1'];
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
      _log2(f, tbl_nms, not_tbl_names);
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

    ModelJS.prototype.route = function(options) {
      return E.option.m7(this.view_nm, options);
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
