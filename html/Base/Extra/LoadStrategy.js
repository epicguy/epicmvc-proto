// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var LoadStrategy$Base;

  LoadStrategy$Base = (function() {
    function LoadStrategy$Base(appconfs) {
      var i;
      this.reverse_packages = (function() {
        var j, ref, results1;
        results1 = [];
        for (i = j = ref = appconfs.length - 1; ref <= 0 ? j <= 0 : j >= 0; i = ref <= 0 ? ++j : --j) {
          results1.push(appconfs[i]);
        }
        return results1;
      })();
    }

    LoadStrategy$Base.prototype.getArtifact = function(nm, type) {
      var j, len, pkg, ref, ref1, ref2, ref3, results;
      results = false;
      ref = this.reverse_packages;
      for (j = 0, len = ref.length; j < len; j++) {
        pkg = ref[j];
        results = (ref1 = (ref2 = E['view$' + pkg]) != null ? (ref3 = ref2[type]) != null ? ref3[nm] : void 0 : void 0) != null ? ref1 : false;
        if (results !== false) {
          break;
        }
      }
      if (results === false) {
        console.error('NO FILE FOUND! ' + nm);
      }
      return results;
    };

    LoadStrategy$Base.prototype.D_loadAsync = function() {
      return Promise.resolve();
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
