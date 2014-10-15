// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var Fist,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  E.fistD2H = function(field, val) {
    if (field.d2h) {
      return E['fistD2H$' + field.d2h](field, val);
    } else {
      return val;
    }
  };

  E.fistD2H$sliceIt = function(field, val) {
    var expr;
    expr = field.d2h_expr;
    return (String(val)).slice(expr[0], expr[1]);
  };

  E.fistH2H = function(field, val) {
    var str, _i, _len, _ref, _ref1, _ref2;
    val = E.fistH2H$pre(val);
    _ref2 = (_ref = (_ref1 = field.h2h) != null ? _ref1.split(/[:,]/) : void 0) != null ? _ref : [];
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      str = _ref2[_i];
      val = E['fistH2H$' + str](val);
    }
    return val;
  };

  E.fistH2H$pre = function(val) {
    return val;
  };

  E.fistH2H$trim = function(val) {
    return (String(val)).trim();
  };

  E.fistH2H$lower = function(val) {
    return (String(val)).toLowerCase();
  };

  E.fistH2H$upper = function(val) {
    return (String(val)).toUpperCase();
  };

  E.fistH2H$zero = function(val) {
    return val != null ? val : 0;
  };

  E.fistH2H$null = function(val) {
    return val != null ? val : null;
  };

  E.fistH2H$empty = function(val) {
    return val != null ? val : '';
  };

  E.fistH2H$digits = function(val) {
    return val.replace(/[^0-9]/g, '');
  };

  E.fistH2H$chars = function(val) {
    return val.replace(/[^a-z]/ig, '');
  };

  E.fistVAL = function(field, val) {
    var check, token, _ref, _ref1, _ref2;
    delete field.issue;
    check = true;
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

  E.fistH2D = function(field) {
    if (field.h2d) {
      return E['fistH2D$' + field.h2d](field, field.hval);
    } else {
      return field.hval;
    }
  };

  E.fistH2D$zero = function(field, val) {
    return val != null ? val : 0;
  };

  E.fistH2D$upper = function(field, val) {
    return (String(val)).toUpperCase();
  };

  Fist = (function(_super) {

    __extends(Fist, _super);

    function Fist(view_nm, options) {
      this.fist = {};
      Fist.__super__.constructor.call(this, view_nm, options);
    }

    Fist.prototype.action = function(ctx, act, p) {
      var ans, errors, f, field, fieldNm, fist, had_issue, i, invalidate, m, nm, r, was_issue, was_val, _ref, _ref1;
      f = 'action:' + act + '-' + p.fist + '/' + p.field;
      _log2(f, p);
      if (ctx) {
        r = ctx.r, i = ctx.i, m = ctx.m;
      }
      fist = this._getFist(p.fist, p.row);
      if (p.field) {
        field = fist.ht[p.field];
      }
      switch (act) {
        case 'F$keyup':
        case 'F$change':
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
            E.fistVAL(field, field.hval);
            if (act === 'F$change' || had_issue !== field.issue) {
              invalidate = true;
            }
          }
          break;
        case 'F$blur':
          was_val = field.hval;
          field.hval = E.fistH2H(field, field.hval);
          was_issue = E.fistVAL(field, field.hval);
          if (was_val !== field.hval || was_issue) {
            invalidate = true;
          }
          break;
        case 'F$focus':
          if (fist.fnm !== p.field) {
            fist.fnm = p.field;
            invalidate = true;
          }
          break;
        case 'F$validate':
          errors = 0;
          _ref = fist.ht;
          for (fieldNm in _ref) {
            field = _ref[fieldNm];
            if (true !== E.fistVAL(field, field.hval)) {
              errors++;
            }
          }
          if (errors) {
            invalidate = true;
            r.success = 'FAIL';
            r.errors = errors;
          } else {
            r.success = 'SUCCESS';
            ans = r[fist.nm] = {};
            _ref1 = fist.db;
            for (nm in _ref1) {
              field = _ref1[nm];
              ans[nm] = E.fistH2D(field);
            }
          }
          break;
        default:
          return Fist.__super__.action.call(this, ctx, act, p);
      }
      if (invalidate) {
        if (p.async !== true) {
          this.invalidateTables([fist.rnm]);
        } else {
          delete this.Table[fist.rnm];
        }
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
      var choice_type, choices, defaults, f, fl, rows, s, _i, _ref, _ref1, _ref2, _ref3;
      f = '_makeField';
      _log2(f, {
        fist: fist,
        field: field,
        ix: ix
      });
      defaults = {
        is_first: ix === 0,
        focus: fist.fnm === field.nm,
        yes_val: 'X',
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
      fl.value = (_ref1 = field.hval) != null ? _ref1 : fl["default"];
      if (fl.type === 'yesno') {
        if ((_ref2 = fl.cdata) == null) {
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
        for (ix = _i = 0, _ref3 = choices.options.length; 0 <= _ref3 ? _i < _ref3 : _i > _ref3; ix = 0 <= _ref3 ? ++_i : --_i) {
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
      var db_value_hash, field, fieldNm, fist, nm, rnm, val, _i, _len, _ref;
      rnm = p_fist + (p_row ? ':' + p_row : '');
      if (!(rnm in this.fist)) {
        fist = this.fist[rnm] = {
          rnm: rnm,
          nm: p_fist,
          row: p_row,
          ht: {},
          db: {},
          st: 'new',
          sp: E.fistDef[p_fist]
        };
        _ref = fist.sp.FIELDS;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          fieldNm = _ref[_i];
          field = E.merge({}, E.fieldDef[fieldNm], {
            nm: fieldNm,
            fistNm: p_fist,
            row: p_row
          });
          fist.ht[fieldNm] = fist.db[field.db_nm] = field;
        }
      } else {
        fist = this.fist[rnm];
      }
      if (fist.st === 'new') {
        db_value_hash = E[E.appFist(p_fist)]().fistGetValues(p_fist, p_row);
        for (nm in db_value_hash) {
          val = db_value_hash[nm];
          field = fist.db[nm];
          field.hval = E.fistD2H(field, val);
        }
        fist.st = 'loaded';
      }
      return fist;
    };

    Fist.prototype._getChoices = function(type, fist, field) {
      var final_obj, rec, _i, _len, _ref;
      switch (type) {
        case 'array':
          final_obj = {
            options: [],
            values: []
          };
          _ref = field.cdata;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            rec = _ref[_i];
            if (typeof rec === 'object') {
              final_obj.options.push(String(rec[1]));
              final_obj.values.push(String(rec[0]));
            } else {
              final_obj.options.push(String(rec));
              final_obj.values.push(String(rec));
            }
          }
          return final_obj;
        case 'custom':
          return E[E.appFist(fist.nm)]().fistGetChoices(fist.nm, field.nm, fist.row);
        default:
          return BROKEN();
      }
    };

    return Fist;

  })(E.ModelJS);

  E.Model.Fist$FistDevl = Fist;

}).call(this);
