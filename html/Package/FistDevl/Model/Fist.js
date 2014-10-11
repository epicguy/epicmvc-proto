// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var Fist, field_template, fist_template,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fist_template = {
    state: 'new',
    focusFieldNm: false,
    FIELDS: {}
  };

  field_template = {
    issue: false
  };

  E.fistD2H = {};

  E.fistD2H.sliceIt = function(val, expr) {
    return (String(val)).slice(expr[0], expr[1]);
  };

  Fist = (function(_super) {

    __extends(Fist, _super);

    function Fist(view_nm, options) {
      this.fist = {};
      Fist.__super__.constructor.call(this, view_nm, options);
    }

    Fist.prototype._dbMap = function(fistVal) {
      var fieldDef, fieldNm, rec, _ref, _results;
      if (fistVal.dbMap) {
        return;
      }
      fistVal.FIELDSdb = {};
      _ref = fistVal.FIELDS;
      _results = [];
      for (fieldNm in _ref) {
        rec = _ref[fieldNm];
        fieldDef = E.fieldDef[fieldNm];
        _results.push(fistVal.FIELDSdb[fieldDef.db_nm] = rec);
      }
      return _results;
    };

    Fist.prototype._db2html = function(fistDef, fistVal, dbvals) {
      var f, fieldDef, fieldVal, nm, val, _results;
      f = '_db2html';
      this._dbMap(fistVal);
      _log2(f, fistVal.FIELDSdb, dbvals);
      _results = [];
      for (nm in dbvals) {
        val = dbvals[nm];
        fieldVal = fistVal.FIELDSdb[nm];
        fieldDef = fieldVal.fieldDef;
        _results.push(fieldVal.html = fieldDef.d2h ? E.fistD2H[fieldDef.d2h](fieldDef.d2h_expr) : val);
      }
      return _results;
    };

    Fist.prototype.action = function(ctx, act, p) {
      var db_value_hash, f, fieldDef, fieldNm, fieldVal, fistDef, fistNm, fistVal, i, m, nm, r, _i, _len, _ref, _ref1;
      f = 'action:' + act + '-' + p.fist + '/' + p.field;
      _log2(f, p);
      if (ctx) {
        r = ctx.r, i = ctx.i, m = ctx.m;
      }
      if (p.fist) {
        fistDef = E.fistDef[p.fist];
        fistNm = fistDef.fistNm;
        if (p.row != null) {
          fistNm += ':' + p.row;
        }
        fistVal = (_ref = this.fist[fistNm]) != null ? _ref : E.merge({}, fist_template);
        _log2(f, 'got p.fist', {
          fistDef: fistDef,
          fistNm: fistNm,
          fistVal: fistVal
        });
        if (p.field) {
          fieldDef = E.fieldDef[p.field];
          fieldNm = fieldDef.fieldNm;
          fieldVal = fistVal.FIELDS[fieldNm];
          _log2(f, 'Got p.field', {
            fieldDef: fieldDef,
            fieldNm: fieldNm,
            fieldVal: fieldVal
          });
        }
      }
      switch (act) {
        case 'F$start':
          if (fistVal.state !== 'new') {
            return;
          }
          db_value_hash = E[E.appFist(fistNm)]().fistGetValues(fistNm);
          _ref1 = fistDef.FIELDS;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            nm = _ref1[_i];
            fieldDef = E.fieldDef[nm];
            fistVal.FIELDS[fieldDef.fieldNm] = E.merge({
              fieldDef: fieldDef
            }, field_template);
          }
          this._db2html(fistDef, fistVal, db_value_hash);
          fistVal.state = 'loaded';
          this.fist[fistNm] = fistVal;
          if (ctx === false) {
            return delete this.Table[fistNm];
          } else {
            return this.invalidateTables([fistNm]);
          }
          break;
        case 'F$keyup':
        case 'F$change':
          if (fieldVal.html !== p.val) {
            fieldVal.html = p.val;
            if (fieldVal.html.length !== 3) {
              fieldVal.issue = E.Issue.Make(this.view_nm, 'NOT_3');
            } else {
              fieldVal.issue = false;
            }
            return this.invalidateTables([fistNm]);
          }
          break;
        case 'F$focus':
          return fistVal.focusFieldNm = fieldNm;
        case 'F$validate':
          return BROKEN();
        default:
          return Fist.__super__.action.call(this, ctx, act, p);
      }
    };

    Fist.prototype.loadTable = function(tbl_nm) {
      var Control, Field, any_req, baseFistNm, fieldDef, fieldNm, fistDef, fistVal, ix, row, _i, _len, _ref, _ref1;
      _ref = tbl_nm.split(':'), baseFistNm = _ref[0], row = _ref[1];
      fistDef = E.fistDef[baseFistNm];
      fistVal = this.fist[tbl_nm];
      Field = {};
      Control = [];
      any_req = false;
      _ref1 = fistDef.FIELDS;
      for (ix = _i = 0, _len = _ref1.length; _i < _len; ix = ++_i) {
        fieldNm = _ref1[ix];
        fieldDef = E.fieldDef[fieldNm];
        row = this._makeField(fistDef, fieldDef, ix);
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

    Fist.prototype._makeField = function(fistDef, fieldDef, ix, row) {
      var choices, defaults, f, fieldNm, fieldVal, fistNm, fistVal, fl, rows, s, _i, _ref, _ref1, _ref2;
      f = '_makeField';
      fistVal = this.fist[fistNm = fistDef.fistNm];
      fieldNm = fieldDef.fieldNm;
      fieldVal = fistVal != null ? fistVal.FIELDS[fieldNm] : void 0;
      _log2(f, {
        fistVal: fistVal,
        fieldNm: fieldNm,
        fieldVal: fieldVal
      });
      defaults = {
        is_first: ix === 0,
        focus: (fistVal != null ? fistVal.focusFieldNm : void 0) === fieldDef.fieldNm,
        yes_val: 'X',
        "default": '',
        width: '',
        size: '',
        issue: '',
        value: '',
        selected: false,
        name: fieldNm,
        fistNm: fistNm
      };
      fl = E.merge(defaults, fieldDef);
      if (fl.type === 'yesno') {
        fl.yes_val = String((_ref = fl.cdata) != null ? _ref : '1');
      }
      fl.type = (fl.type.split(':'))[0];
      fl.id = 'U' + E.nextCounter();
      if (fieldVal) {
        fl.value = (_ref1 = fieldVal.html) != null ? _ref1 : fl["default"];
        fl.selected = fl.type === 'yesno' && fl.value === fl.yes_val;
        if (fieldVal.issue) {
          fl.issue = fieldVal.issue.asTable()[0].issue;
        }
      } else {
        fl.value = fl["default"];
      }
      if (fl.type === 'radio' || fl.type === 'pulldown') {
        choices = _getChoices(fistDef, fieldDef);
        rows = [];
        s = '';
        for (ix = _i = 0, _ref2 = choices.options.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; ix = 0 <= _ref2 ? ++_i : --_i) {
          if (fieldVal) {
            s = choices.values[ix] === (String(fl.value));
          }
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

    return Fist;

  })(E.ModelJS);

  E.Model.Fist$FistDevl = Fist;

}).call(this);
