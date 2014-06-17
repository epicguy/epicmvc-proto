// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var FistFilt,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  FistFilt = (function() {

    function FistFilt() {}

    FistFilt.H2H_generic = function(fieldName, spec, value) {
      var k, new_value, one_spec, spec_ary, _base;
      new_value = value != null ? value : '';
      spec_ary = typeof (_base = spec != null ? spec : '').split === "function" ? _base.split(':') : void 0;
      for (k in spec_ary) {
        one_spec = spec_ary[k];
        new_value = (function() {
          switch (one_spec) {
            case '':
              return new_value;
            case 'trim_spaces':
              return $.trim(new_value);
            case 'digits_only':
              return new_value.replace(/[^0-9]/g, '');
            case 'lower_case':
              return new_value.toLowerCase();
            case 'upper_case':
              return new_value.toUpperCase();
            default:
              throw "Unknown H2H filter " + one_spec + " in field " + fieldName;
          }
        })();
      }
      return new_value;
    };

    FistFilt.CHECK_ = function(fieldName, validateExpr, value, oF) {
      return true;
    };

    FistFilt.CHECK_null = function(fieldName, validateExpr, value, oF) {
      return true;
    };

    FistFilt.CHECK_undefined = function(fieldName, validateExpr, value, oF) {
      return true;
    };

    FistFilt.CHECK_any = function(fieldName, validateExpr, value, oF) {
      return true;
    };

    FistFilt.CHECK_phone = function(fieldName, validateExpr, value, oF) {
      var check_pat, re;
      switch (validateExpr) {
        case void 0:
          check_pat = '[0-9]{10}';
          break;
        default:
          BROKE();
      }
      re = new RegExp('^' + check_pat + '$');
      if (value.match(re)) {
        return true;
      } else {
        return false;
      }
    };

    FistFilt.CHECK_zip = function(fieldName, validateExpr, value, oF) {
      switch (validateExpr) {
        case '5or9':
          if (!value.match(/^[0-9]{5}(|[0-9]{4})$/)) {
            return false;
          }
          break;
        default:
          BROKE();
      }
      return true;
    };

    FistFilt.CHECK_choice = function(fieldName, validateExpr, value, oF) {
      oF.Epic.log2('CHECK_choice:value/values', value, oF.getChoices(fieldName).values);
      if (__indexOf.call(oF.getChoices(fieldName).values, value) < 0) {
        return false;
      }
      if (validateExpr) {
        if (oF.getChoices(fieldName).values[0] === value) {
          return false;
        }
      }
      return true;
    };

    FistFilt.CHECK_email = function(fieldName, validateExpr, value, oF) {
      var few, most, re, some;
      most = '[A-Z0-9._+%-]';
      some = '[A-Z0-9.-]';
      few = '[A-Z]';
      re = new RegExp("^" + most + "+@" + some + "+[.]" + few + "{2,4}$", 'i');
      if (value.match(re)) {
        return true;
      } else {
        return false;
      }
    };

    FistFilt.CHECK_regexp = function(fieldName, validateExpr, value, oF) {
      var re;
      re = new RegExp("^" + validateExpr + "$");
      if (value.match(re)) {
        return true;
      } else {
        return false;
      }
    };

    FistFilt.CHECK_confirm = function(fieldName, validateExpr, value, oF) {
      var other_value;
      other_value = oF.getHtmlFieldValue(validateExpr);
      if (other_value !== value) {
        return false;
      }
      return true;
    };

    FistFilt.H2D_ = function(fieldName, filtExpr, value) {
      return value;
    };

    FistFilt.H2D_undefined = function() {
      return this.H2D_.apply(this, arguments);
    };

    FistFilt.H2D__psuedo = function(fieldName, filtExpr, value) {
      return value;
    };

    FistFilt.H2D_date_psuedo = function(fieldName, filtExpr, value) {
      var Y, d, m;
      m = value[0], d = value[1], Y = value[2];
      if (m.length === 1) {
        m = '0' + m;
      }
      if (d.length === 1) {
        d = '0' + d;
      }
      return "" + Y + "-" + m + "-" + d;
    };

    FistFilt.H2D_join_psuedo = function(fieldName, filtExpr, value) {
      return value.join(filtExpr);
    };

    FistFilt.H2D_phone = function(fieldName, filtExpr, value) {
      return value.replace(/[^0-9]/g, '');
    };

    FistFilt.H2D_zero_is_blank = function(fieldName, filtExpr, value) {
      if (value === 0 || value === '0') {
        return '';
      } else {
        return value;
      }
    };

    FistFilt.D2H_ = function(fieldName, filtExpr, value) {
      return value;
    };

    FistFilt.D2H_undefined = function() {
      return this.D2H_.apply(this, arguments);
    };

    FistFilt.D2H_null = function() {
      return this.D2H_.apply(this, arguments);
    };

    FistFilt.D2H_phone = function(fieldName, filtExpr, value) {
      return value.replace(/(...)(...)(...)/, '($1) $2-$3');
    };

    FistFilt.D2H_date = function(fieldName, filtExpr, value) {
      return this.D2H_date_psuedo(fieldName, filtExpr, value).join('/');
    };

    FistFilt.D2H_date_psuedo = function(fieldName, filtExpr, value) {
      var Y, d, m, _ref;
      _ref = value.split('-'), Y = _ref[0], m = _ref[1], d = _ref[2];
      return [(m != null ? m : '').replace(/^0/, ''), (d != null ? d : '').replace(/^0/, ''), Y];
    };

    FistFilt.D2H_blank_is_zero = function(fieldName, filtExpr, value) {
      if (value.length) {
        return value;
      } else {
        return '0';
      }
    };

    return FistFilt;

  })();

  window.EpicMvc.FistFilt = FistFilt;

}).call(this);
