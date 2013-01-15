// Generated by CoffeeScript 1.3.3
(function() {
  'use strict';

  var ModelJS;

  ModelJS = (function() {

    function ModelJS(Epic, view_nm) {
      this.Epic = Epic;
      this.view_nm = view_nm;
      this.Table = {};
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

    return ModelJS;

  })();

  window.EpicMvc.ModelJS = ModelJS;

}).call(this);
