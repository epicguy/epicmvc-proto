// Generated by CoffeeScript 1.4.0
(function() {
  'use strict';

  var TagExe,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  TagExe = (function(_super) {

    __extends(TagExe, _super);

    function TagExe() {
      return TagExe.__super__.constructor.apply(this, arguments);
    }

    TagExe.prototype.resetForNextRequest = function(state) {
      TagExe.__super__.resetForNextRequest.call(this, state);
      this.bd_template = this.viewExe.template;
      return this.bd_page = this.viewExe.page;
    };

    TagExe.prototype.Opts = function() {
      return (this.Epic.getViewTable('Devl/Opts'))[0];
    };

    TagExe.prototype.Tag_form_part = function(oPt) {
      var _ref, _ref1, _ref2;
      try {
        if (this.Opts().file === false) {
          return TagExe.__super__.Tag_form_part.call(this, oPt);
        }
        return "<span class=\"dbg-part-box\" title=\"" + ((_ref = oPt.attrs.part) != null ? _ref : 'fist_default') + ".part.html (" + oPt.attrs.form + ")\">.</span>" + (TagExe.__super__.Tag_form_part.call(this, oPt));
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in form-part', (_ref1 = oPt.attrs.part) != null ? _ref1 : 'fist_default', e, e.stack);
        return "<pre>&lt;epic:form_part form=\"" + oPt.attrs.form + "\" part=\"" + ((_ref2 = oPt.attrs.part) != null ? _ref2 : 'fist_default') + "&gt;<br>" + e + "<br>" + e.stack + "</pre>";
      }
    };

    TagExe.prototype.Tag_page_part = function(oPt) {
      try {
        if (this.Opts().file === false) {
          return TagExe.__super__.Tag_page_part.call(this, oPt);
        }
        return "<span class=\"dbg-part-box\" title=\"" + oPt.attrs.part + ".part.html\">.</span>" + (TagExe.__super__.Tag_page_part.call(this, oPt));
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in page-part', oPt.attrs.part, e, e.stack);
        return "<pre>&lt;epic:page_part part=\"" + oPt.attrs.part + "\"&gt;<br>" + e + "<br>" + e.stack + "</pre>";
      }
    };

    TagExe.prototype.Tag_page = function(oPt) {
      try {
        if (this.Opts().file === false) {
          return TagExe.__super__.Tag_page.call(this, oPt);
        }
        return "<span class=\"dbg-part-box\" title=\"" + this.bd_template + ".tmpl.html\">T</span>\n<span class=\"dbg-part-box\" title=\"" + this.bd_page + ".page.html\">P</span>\n" + (TagExe.__super__.Tag_page.call(this, oPt));
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in page', this.bd_page, e, e.stack);
        return "<pre>&lt;epic:page page:" + this.bd_page + "&gt;<br>" + e + "<br>" + e.stack + "</pre>";
      }
    };

    TagExe.prototype.varGet3 = function(view_nm, tbl_nm, col_nm, format_spec, custom_spec) {
      var val;
      try {
        val = TagExe.__super__.varGet3.call(this, view_nm, tbl_nm, col_nm, format_spec, custom_spec);
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        _log2('##### Error in varGet3', "&amp;" + view_nm + "/" + tbl_nm + "/" + col_nm + ";", e, e.stack);
        val = "&amp;" + view_nm + "/" + tbl_nm + "/" + col_nm + ";[" + e.message + "] <pre>" + e.stack + "</pre>";
      }
      if (val === void 0) {
        val = "&amp;" + view_nm + "/" + tbl_nm + "/" + col_nm + ";";
      }
      return val;
    };

    TagExe.prototype.varGet2 = function(tbl_nm, col_nm, format_spec, custom_spec, sub_nm) {
      var spec, val;
      try {
        val = TagExe.__super__.varGet2.call(this, tbl_nm, col_nm, format_spec, custom_spec, sub_nm);
      } catch (e) {
        _log2('##### varGet2', "&" + tbl_nm + "/" + col_nm + ";", e, e.stack);
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        val = "&amp;" + tbl_nm + "/" + col_nm + ";[" + e.message + "] <pre>" + e.stack + "</pre>";
      }
      if (val === void 0) {
        spec = format_spec && format_spec.length > 0 ? '#' + format_spec : custom_spec && custom_spec.length > 0 ? '##' + custom_spec : '';
        window.alert("Undefined: &" + tbl_nm + "/" + col_nm + spec + ";");
        val = "&amp;" + tbl_nm + "/" + col_nm + ";";
      }
      return val;
    };

    TagExe.prototype.Tag_foreach = function(oPt) {
      try {
        return TagExe.__super__.Tag_foreach.call(this, oPt);
      } catch (e) {
        if (this.Epic.isSecurityError(e)) {
          throw e;
        }
        return '&lt;epic:foreach table="' + oPt.attrs.table + '"&gt; - ' + e.message + '<pre>\n' + e.stack + '</pre>';
      }
    };

    TagExe.prototype.Tag_explain = function(oPt) {
      return JSON.stringify(this.Epic.getViewTable(oPt.attrs.table));
    };

    return TagExe;

  })(window.EpicMvc.Model.TagExe$Base);

  window.EpicMvc.Model.TagExe$BaseDevl = TagExe;

}).call(this);
