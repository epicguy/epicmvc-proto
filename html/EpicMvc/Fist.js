// Generated by CoffeeScript 1.8.0
(function() {
  'use strict';
  var Fist;

  Fist = (function() {
    function Fist(Epic, grp_nm, flist_nm, view_nm) {
      var oG;
      this.Epic = Epic;
      this.grp_nm = grp_nm;
      this.view_nm = view_nm;
      oG = this.Epic.getFistGroupCache();
      flist_nm = oG.getCanonicalFist(grp_nm, flist_nm);
      this.fist_nm = flist_nm;
      this.oM = this.Epic.getInstance(this.view_nm);
      this.form_state = 'empty';
      this.fistDef = oG.getFistDef(grp_nm, this.fist_nm);
      this.cache_field_choice = [];
      this.filt = window.EpicMvc.FistFilt;
      this.Fb_ClearValues();
      this.upload_todo = [];
      this.upload_fl = {};
      this.eventLastPath = this.Epic.getPageflowPath();
    }

    Fist.prototype.getGroupNm = function() {
      return this.grp_nm;
    };

    Fist.prototype.getFistNm = function() {
      return this.fist_nm;
    };

    Fist.prototype.loadFieldDefs = function() {
      return this.fieldDef != null ? this.fieldDef : this.fieldDef = this.Epic.getFistGroupCache().getFieldDefsForFist(this.grp_nm, this.fist_nm);
    };

    Fist.prototype.getFieldsDefs = function() {
      return this.loadFieldDefs();
    };

    Fist.prototype.loadFieldChoices = function(fl) {
      var ct, final_obj, json, k, rec, split, v, wist, wist_grp, wist_nm, _i, _len, _ref;
      final_obj = {
        options: [],
        values: []
      };
      if (true) {
        this.loadFieldDefs();
        ct = this.fieldDef[fl].type.split(':');
        switch (ct[1]) {
          case 'custom':
            final_obj = this.oM.fistGetFieldChoices(this, fl);
            break;
          case 'array':
            _ref = this.fieldDef[fl].cdata;
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
            break;
          case 'json_like':
            json = this.fieldDef[fl].cdata.replace(/'/g, '"').replace(/"""/g, "'");
            json = $.parseJSON(json);
            for (k in json) {
              v = json[k];
              final_obj.options.push(k);
              final_obj.values.push(v);
            }
            break;
          case 'use_word_list':
            split = this.fieldDef[fl].cdata.split(':');
            if (split.length === 2) {
              wist_grp = split[0], wist_nm = split[1];
            } else if (split[0] != null) {
              wist_grp = this.grp_nm;
              wist_nm = split[0];
            } else {
              wist_grp = this.grp_nm;
              wist_nm = fl;
            }
            wist = this.Epic.getViewTable('Wist/' + wist_nm);
            for (k in wist) {
              v = wist[k];
              final_obj.options.push(v.text);
              final_obj.valules.push(v.word);
            }
        }
        this.cache_field_choice[fl] = final_obj;
      }
    };

    Fist.prototype.getHtmlPostedFieldsList = function(flist_nm) {
      var fistDef;
      fistDef = this.fistDef;
      if ((flist_nm != null) && flist_nm !== this.fist_nm) {
        fistDef = this.Epic.getFistGroupCache().getFistDef(this.grp_nm, flist_nm);
      }
      return fistDef;
    };

    Fist.prototype.getFieldAttributes = function(fl_nm) {
      this.loadFieldDefs();
      return this.fieldDef[fl_nm];
    };

    Fist.prototype.getHtmlFieldValue = function(fl_nm) {
      this.loadData();
      return this.fb_HTML[fl_nm];
    };

    Fist.prototype.getDbFieldValue = function(fl_nm) {
      this.loadData();
      return this.fb_DB[fl_nm];
    };

    Fist.prototype.getDbFieldValues = function() {
      this.loadData();
      return this.fb_DB;
    };

    Fist.prototype.getFieldIssues = function() {
      return this.fb_issues;
    };

    Fist.prototype.getChoices = function(fl_nm) {
      this.loadFieldChoices(fl_nm);
      return this.cache_field_choice[fl_nm];
    };

    Fist.prototype.fieldLevelValidate = function(data, flist_nm) {
      this.form_state = 'posted';
      return this.Fb_FistValidate(data, flist_nm != null ? flist_nm : this.fist_nm);
    };

    Fist.prototype.loadData = function(data) {
      if (this.form_state === 'empty') {
        this.oM.fistLoadData(this);
        return this.form_state = 'loaded';
      }
    };

    Fist.prototype.setFromDbValues = function(data) {
      this.Fb_SetHtmlValuesFromDb(data);
      this.form_state = 'loaded';
    };

    Fist.prototype.eventNewRequest = function() {
      var path;
      path = this.Epic.getPageflowPath();
      if (this.eventLastPath !== path) {
        this.clearValues();
        this.upload_todo = [];
        this.uploaded_fl = {};
      }
      this.eventLastPath = path;
    };

    Fist.prototype.clearValues = function() {
      if (this.form_state !== 'empty') {
        this.Fb_ClearValues();
        this.form_state = 'empty';
      }
    };

    Fist.prototype.getUploadedMsg = function(fl, val) {
      return this.oM.fistGetUploadedMsg(this, fl, val);
    };

    Fist.prototype.haveUpload = function(fl, from_id, to_id, btn_id, msg_id, now) {
      var details, uploader;
      details = {
        fl: fl,
        from_id: from_id,
        to_id: to_id,
        btn_id: btn_id,
        msg_id: msg_id
      };
      if (now !== true) {
        this.upload_todo.push(details);
        return;
      }
      uploader = new qq.FileUploaderBasic($.extend({
        element: document.getElementById(from_id),
        button: document.getElementById(btn_id),
        debug: true,
        multiple: false,
        allowedExtensions: ['jpg', 'jpeg'],
        onComplete: (function(_this) {
          return function(id, fileName, responseJSON) {
            return _this.uploadComplete(fl, id, fileName, responseJSON);
          };
        })(this)
      }, this.oM.fistGetUploadOptions(this, fl, from_id, to_id)));
      this.upload_fl[fl] = details;
    };

    Fist.prototype.uploadComplete = function(fl, the_id, fileName, responseJSON) {
      var form_value;
      form_value = this.oM.fistHandleUploadResponse(this, fl, responseJSON);
      if (form_value === false) {
        $('#' + this.upload_fl[fl].msg_id).text(' File failed to load, try again?');
      } else {
        $('#' + this.upload_fl[fl].msg_id).text(' ' + this.oM.fistGetUploadedMsg(this, fl, form_value) + '  uploaded.');
        $('#' + this.upload_fl[fl].to_id).val(form_value);
      }
    };

    Fist.prototype.eventInitializePage = function() {
      var v, _i, _len, _ref;
      _ref = this.upload_todo;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        this.haveUpload(v.fl, v.from_id, v.to_id, v.btn_id, v.msg_id, true);
      }
    };

    Fist.prototype.Fb_SetHtmlValuesFromDb = function(data) {
      var dbnms, k, _i, _len;
      dbnms = this.Fb_DbNames();
      for (_i = 0, _len = dbnms.length; _i < _len; _i++) {
        k = dbnms[_i];
        if (k in data) {
          this.fb_DB[k] = data[k];
        }
      }
      return this.Fb_Db2Html();
    };

    Fist.prototype.Fb_ClearValues = function() {
      this.fb_DB = {};
      this.fb_HTML = {};
      return this.fb_issues = {};
    };

    Fist.prototype.Fb_FistValidate = function(data, flist_nm) {
      var issues;
      this.Fb_Html2Html(data, flist_nm);
      issues = new window.EpicMvc.Issue(this.Epic);
      issues.call(this.Fb_Check(flist_nm));
      if (issues.count() === 0) {
        this.Fb_Html2Db(flist_nm);
      }
      return issues;
    };

    Fist.prototype.Fb_DbNames = function(flist_nm) {
      var db_nm, nm, rec, _ref;
      if ((flist_nm != null) && flist_nm !== this.fist_nm) {
        return (function() {
          var _i, _len, _ref, _results;
          _ref = this.getHtmlPostedFieldsList(flist_nm);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            nm = _ref[_i];
            _results.push(this.fieldDef[nm].db_nm);
          }
          return _results;
        }).call(this);
      }
      if (this.fb_DB_names == null) {
        this.loadFieldDefs();
        this.dbNm2HtmlNm = {};
        _ref = this.fieldDef;
        for (nm in _ref) {
          rec = _ref[nm];
          this.dbNm2HtmlNm[rec.db_nm] = nm;
        }
        if (this.fb_DB_names == null) {
          this.fb_DB_names = (function() {
            var _results;
            _results = [];
            for (db_nm in this.dbNm2HtmlNm) {
              _results.push(db_nm);
            }
            return _results;
          }).call(this);
        }
      }
      return this.fb_DB_names;
    };

    Fist.prototype.Fb_Make = function(main_issue, field, token_data) {
      var f;
      f = 'Fist.Fb_Make:' + field;
      if (token_data === true) {
        return false;
      }
      if (this.issue_inline == null) {
        this.issue_inline = this.Epic.appConf().getShowIssues() === 'inline';
      }
      this.Epic.log2(f, field, token_data, {
        inline: this.issue_inline
      });
      if (this.issue_inline) {
        this.fb_issues[field] = window.EpicMvc.Issue.Make(this.Epic, this.view_nm, token_data[0], token_data[1]);
        if (main_issue.count() === 0) {
          main_issue.add('FORM_ERRORS', [this.fistName]);
        }
      } else {
        main_issue.add(token_data[0], token_data[1]);
      }
      return true;
    };

    Fist.prototype.Fb_Html2Html = function(p, flist_nm) {
      var f, nm, value, _i, _len, _ref;
      f = 'Fist.Fb_Html2Html';
      this.loadFieldDefs();
      _ref = this.getHtmlPostedFieldsList(flist_nm);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nm = _ref[_i];
        value = p[nm];
        if ('H2H_prefilter' in this.filt) {
          value = this.filt.H2H_prefilter(nm, this.fieldDef[nm].h2h, value);
        }
        this.fb_HTML[nm] = this.filt.H2H_generic(nm, this.fieldDef[nm].h2h, value);
      }
    };

    Fist.prototype.Fb_Check = function(flist_nm) {
      var db_nm, f, field, issue, issue_count, nm, p_nm, _i, _j, _len, _len1, _ref, _ref1;
      f = 'Fist.Fb_Check:' + flist_nm;
      issue = new window.EpicMvc.Issue(this.Epic);
      _ref = this.Fb_DbNames(flist_nm);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        db_nm = _ref[_i];
        nm = this.dbNm2HtmlNm[db_nm];
        field = this.fieldDef[nm];
        if (field.type !== 'psuedo') {
          this.Fb_Make(issue, nm, this.Fb_Validate(nm, this.fb_HTML[nm]));
        } else {
          issue_count = 0;
          _ref1 = field.cdata;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            p_nm = _ref1[_j];
            if (this.Fb_Make(issue, nm, this.Fb_Validate(p_nm, this.fb_HTML[nm + '-' + p_nm]))) {
              issue_cnt += 1;
            }
          }
          if (issue_cnt === 0) {
            BROKEN('_DB[] not populated yet; send array like h2d gets?');
            issue.call(this.Fb_Validate(nm, this.fb_DB[db_nm]));
          }
        }
      }
      return issue;
    };

    Fist.prototype.Fb_Validate = function(fieldName, value) {
      var f, field;
      f = 'Fist.Fb_Validate:' + fieldName;
      this.loadFieldDefs();
      field = this.fieldDef[fieldName];
      if ((value == null) || value.length === 0) {
        if (field.req === true) {
          if (field.req_text) {
            return ['FIELD_EMPTY_TEXT', [fieldName, field.label, field.req_text]];
          } else {
            return ['FIELD_EMPTY', [fieldName, field.label]];
          }
        }
        return true;
      }
      if (field.max_len > 0 && value.length > field.max_len) {
        return ['FIELD_OVER_MAX', [fieldName, field.label, field.max_len]];
      }
      if (!this.filt['CHECK_' + field.validate](fieldName, field.validate_expr, value, this)) {
        if (field.issue_text) {
          return ['FIELD_ISSUE_TEXT', [fieldName, field.label, field.issue_text]];
        } else {
          return ['FIELD_ISSUE', [fieldName, field.label]];
        }
      }
      return true;
    };

    Fist.prototype.Fb_Html2Db = function(flist_nm) {
      var f, field, nm, p_nm, psuedo_prefix, value, _i, _len, _ref;
      f = 'Fist.Fb_Html2Db';
      this.loadFieldDefs();
      _ref = this.getHtmlPostedFieldsList(flist_nm);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        nm = _ref[_i];
        field = this.fieldDef[nm];
        psuedo_prefix = "";
        if (field.type !== 'psuedo') {
          value = this.fb_HTML[nm];
        } else {
          psuedo_prefix = '_psuedo';
          value = (function() {
            var _j, _len1, _ref1, _results;
            _ref1 = field.cdata;
            _results = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              p_nm = _ref1[_j];
              _results.push(this.fb_HTML[nm + '-' + p_nm]);
            }
            return _results;
          }).call(this);
        }
        this.fb_DB[field.db_nm] = this.filt['H2D_' + field.h2d + psuedo_prefix](nm, field.h2d_expr, value);
      }
    };

    Fist.prototype.Fb_Db2Html = function() {
      var db_nm, field, i, list, nm, p_nm, psuedo_fl, psuedo_prefix, subfield, value, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = this.Fb_DbNames();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        db_nm = _ref[_i];
        nm = this.dbNm2HtmlNm[db_nm];
        field = this.fieldDef[nm];
        psuedo_fl = (field != null ? field.type : void 0) === 'psuedo' ? true : false;
        if (!(db_nm in this.fb_DB)) {
          if (!psuedo_fl) {
            delete this.fb_HTML[nm];
          } else {
            _ref1 = field.cdata;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              subfield = _ref1[_j];
              delete this.fb_HTML[subfield];
            }
          }
          continue;
        }
        value = this.fb_DB[db_nm];
        psuedo_prefix = "";
        if (!psuedo_fl) {
          _results.push(this.fb_HTML[nm] = this.filt['D2H_' + field.d2h](db_nm + '%' + nm, field.d2h_expr, value));
        } else {
          switch (field.cdata.length) {
            case 0:
              throw 'Requires cdata with psuedo: ' + db_nm + '%' + nm;
              break;
            case 1:
              _results.push(BROKEN());
              break;
            default:
              list = this.filt['D2H_' + field.d2h + '_psuedo'](db_nm + '%' + nm, field.d2h_expr, value);
              _results.push((function() {
                var _k, _len2, _ref2, _results1;
                _ref2 = field.cdata;
                _results1 = [];
                for (i = _k = 0, _len2 = _ref2.length; _k < _len2; i = ++_k) {
                  p_nm = _ref2[i];
                  _results1.push(this.fb_HTML[nm + '-' + p_nm] = list[i]);
                }
                return _results1;
              }).call(this));
          }
        }
      }
      return _results;
    };

    return Fist;

  })();

  window.EpicMvc.Fist = Fist;

}).call(this);
