// Generated by CoffeeScript 1.4.0
(function() {
  var LoadStrategy$Base;

  LoadStrategy$Base = (function() {

    function LoadStrategy$Base(appconfs) {
      var i;
      this.reverse_packages = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = _ref = appconfs.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
          _results.push(appconfs[i]);
        }
        return _results;
      })();
    }

    LoadStrategy$Base.prototype.getArtifact = function(nm, type) {
      var pkg, results, _i, _len, _ref, _ref1, _ref2, _ref3;
      results = false;
      _ref = this.reverse_packages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pkg = _ref[_i];
        results = (_ref1 = (_ref2 = E['view$' + pkg]) != null ? (_ref3 = _ref2[type]) != null ? _ref3[nm] : void 0 : void 0) != null ? _ref1 : false;
        if (results !== false) {
          break;
        }
      }
      if (results === false) {
        console.log('NO FILE FOUND! ' + nm);
      }
      return results;
    };

    LoadStrategy$Base.prototype.D_loadAsync = function() {
      var def;
      def = new m.Deferred();
      def.resolve();
      return def.promise;
    };

    LoadStrategy$Base.prototype.d_layout = function(nm) {
      return this.getArtifact(nm, 'Layout');
    };

    LoadStrategy$Base.prototype.d_page = function(nm) {
      return this.getArtifact(nm, 'Page');
    };

    LoadStrategy$Base.prototype.d_part = function(nm) {
      return this.getArtifact(nm, 'Part');
    };

    return LoadStrategy$Base;

  })();

  E.Extra.LoadStrategy$Base = LoadStrategy$Base;

  E.opt({
    loader: 'LoadStrategy$Base'
  });

}).call(this);
