// Generated by CoffeeScript 1.8.0
(function() {
  var LoadStrategy;

  LoadStrategy = (function() {
    function LoadStrategy(Epic) {
      this.Epic = Epic;
      this.path = 'Package/Base/view/';
      this.cache = {};
      this.cache_local_flag = true;
    }

    LoadStrategy.prototype.clearCache = function() {
      return this.cache = {};
    };

    LoadStrategy.prototype.getTmplNm = function(nm) {
      return nm + '.tmpl.html';
    };

    LoadStrategy.prototype.getPageNm = function(nm) {
      return 'page/' + nm + '.page.html';
    };

    LoadStrategy.prototype.getPartNm = function(nm) {
      return 'part/' + nm + '.part.html';
    };

    LoadStrategy.prototype.getFile = function(nm) {
      var i, path, pkg, results, _i, _len, _ref;
      if (this.cache[nm] != null) {
        return this.cache[nm];
      }
      results = false;
      if (this.reverse_packages == null) {
        this.reverse_packages = (function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = _ref = this.Epic.appconfs.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
            _results.push(this.Epic.appconfs[i]);
          }
          return _results;
        }).call(this);
      }
      _ref = this.reverse_packages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pkg = _ref[_i];
        path = "Package/" + pkg + "/view/";
        window.$.ajax({
          url: path + nm,
          async: false,
          cache: this.cache_local_flag ? false : true,
          dataType: 'text',
          success: function(data) {
            return results = data;
          },
          error: function(jqXHR, textStatus, errorThrown) {
            return console.log('AJAX ERROR ');
          }
        });
        if (results !== false) {
          break;
        }
      }
      if (results === false) {
        console.log('NO FILE FOUND! ' + nm);
      }
      if (this.cache_local_flag) {
        return this.cache[nm] = String(results);
      }
    };

    LoadStrategy.prototype.getCombinedAppConfs = function() {
      var pkg, result, _i, _len, _ref;
      result = {};
      _ref = this.Epic.appconfs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pkg = _ref[_i];
        window.$.extend(true, result, window.EpicMvc['app$' + pkg]);
      }
      return result;
    };

    LoadStrategy.prototype.template = function(nm) {
      var full_nm;
      full_nm = this.getTmplNm(nm);
      return window.EpicMvc.ParseFile(full_nm, this.getFile(full_nm));
    };

    LoadStrategy.prototype.page = function(nm) {
      var full_nm;
      full_nm = this.getPageNm(nm);
      return window.EpicMvc.ParseFile(full_nm, this.getFile(full_nm));
    };

    LoadStrategy.prototype.part = function(nm) {
      var full_nm;
      full_nm = this.getPartNm(nm);
      return window.EpicMvc.ParseFile(full_nm, this.getFile(full_nm));
    };

    LoadStrategy.prototype.fist = function(grp_nm) {
      return window.EpicMvc['fist$' + grp_nm];
    };

    return LoadStrategy;

  })();

  window.EpicMvc.Extras.LoadStrategy$BaseDevl = LoadStrategy;

}).call(this);
