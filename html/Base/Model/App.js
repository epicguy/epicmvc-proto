// Generated by CoffeeScript 1.9.2
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
      f = 'BM/App.goTo';
      was = this.f + "/" + this.t + "/" + this.s;
      this.f = flow;
      this.t = t;
      this.s = s;
      E.log(f, {
        was: was,
        is: this.f + "/" + this.t + "/" + this.s
      });
      if (was !== (this.f + "/" + this.t + "/" + this.s)) {
        return this.invalidateTables(['V']);
      }
    };

    App$Base.prototype.go = function(path) {
      var f, flow, ref, s, t;
      f = 'BM/App.go:' + path;
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
      E.log(f, {
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
      f = "BM/App.action:" + act;
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
