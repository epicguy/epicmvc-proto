// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  var LoadStrategy;

  LoadStrategy = (function() {
    function LoadStrategy(appconfs) {
      var i;
      this.appconfs = appconfs;
      this.clearCache();
      this.cache_local_flag = true;
      this.reverse_packages = (function() {
        var j, ref, results;
        results = [];
        for (i = j = ref = this.appconfs.length - 1; ref <= 0 ? j <= 0 : j >= 0; i = ref <= 0 ? ++j : --j) {
          results.push(this.appconfs[i]);
        }
        return results;
      }).call(this);
    }

    LoadStrategy.prototype.clearCache = function() {
      this.cache = {};
      return this.refresh_stamp = (new Date).valueOf();
    };

    LoadStrategy.prototype.makePkgDir = function(pkg) {
      return E.option.loadDirs[pkg] + ((E.option.loadDirs[pkg].slice(-1)) === '/' ? pkg : '');
    };

    LoadStrategy.prototype.D_loadAsync = function() {
      var el, f, file, file_list, j, k, l, len, len1, len2, len3, m, pkg, ref, ref1, ref2, ref3, ref4, ref5, sub, type, url, work;
      f = 'DE/LoadStrategy.D_loadAsync';
      ref = this.appconfs;
      for (j = 0, len = ref.length; j < len; j++) {
        pkg = ref[j];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        ref2 = (ref1 = E['manifest$' + pkg]) != null ? ref1 : {};
        for (type in ref2) {
          file_list = ref2[type];
          if (type === 'css') {
            for (k = 0, len1 = file_list.length; k < len1; k++) {
              file = file_list[k];
              url = (this.makePkgDir(pkg)) + '/css/' + file + '.css';
              el = document.createElement('link');
              el.setAttribute('rel', 'stylesheet');
              el.setAttribute('type', 'text/css');
              el.setAttribute('href', url);
              document.head.appendChild(el);
            }
          }
        }
      }
      work = [];
      ref3 = this.appconfs;
      for (l = 0, len2 = ref3.length; l < len2; l++) {
        pkg = ref3[l];
        if (!(pkg in E.option.loadDirs)) {
          continue;
        }
        ref5 = (ref4 = E['manifest$' + pkg]) != null ? ref4 : {};
        for (type in ref5) {
          file_list = ref5[type];
          if (type !== 'css') {
            for (m = 0, len3 = file_list.length; m < len3; m++) {
              file = file_list[m];
              sub = type === 'root' ? '' : type + '/';
              url = (this.makePkgDir(pkg)) + '/' + sub + file + '.js';
              work.push(url);
            }
          }
        }
      }
      return new Promise(function(resolve, reject) {
        var next;
        next = function(ix) {
          if (ix >= work.length) {
            E.log(f, ix, 'done.');
            resolve(null);
            return;
          }
          E.log(f, 'doing', ix, work[ix]);
          el = document.createElement('script');
          el.setAttribute('type', 'text/javascript');
          el.setAttribute('src', work[ix]);
          el.onload = function() {
            return next(ix + 1);
          };
          document.head.appendChild(el);
        };
        return next(0);
      });
    };

    LoadStrategy.prototype.inline = function(type, nm) {
      var el, f, id;
      f = 'DE/LoadStrategy.inline';
      el = document.getElementById(id = 'view-' + type + '-' + nm);
      if (el) {
        return el.innerHTML;
      }
      return null;
    };

    LoadStrategy.prototype.preLoaded = function(pkg, type, nm) {
      var f, r, ref, ref1;
      f = 'DE/LoadStrategy.preLoaded';
      r = (ref = E['view$' + pkg]) != null ? (ref1 = ref[type]) != null ? ref1[nm] : void 0 : void 0;
      return r;
    };

    LoadStrategy.prototype.compile = function(name, uncompiled) {
      var parsed;
      parsed = E.Extra.ParseFile(name, uncompiled);
      parsed.content = new Function(parsed.content);
      if (this.cache_local_flag) {
        this.cache[name] = parsed;
      }
      return parsed;
    };

    LoadStrategy.prototype.d_get = function(type, nm) {
      var f, fn, full_nm, full_nm_alt, j, k, len, len1, pkg, promise, ref, ref1, type_alt, uncompiled;
      f = 'DE/LoadStrategy.d_get';
      full_nm = type + '/' + nm + '.html';
      if (this.cache[full_nm] != null) {
        return this.cache[full_nm];
      }
      if (uncompiled = this.inline(type, nm)) {
        return this.compile(full_nm, uncompiled);
      }
      promise = Promise.resolve(false);
      type_alt = type === 'Layout' ? 'tmpl' : type.toLowerCase();
      full_nm_alt = type + '/' + nm + '.' + type_alt + '.html';
      if (E.option.compat_path) {
        ref = this.reverse_packages;
        for (j = 0, len = ref.length; j < len; j++) {
          pkg = ref[j];
          if ((pkg !== 'Base' && pkg !== 'Dev' && pkg !== 'Proto') && type !== 'Layout') {
            (function(_this) {
              return (function(pkg) {
                return promise = promise.then(function(result) {
                  if (result !== false) {
                    return result;
                  }
                  if (!(pkg in E.option.loadDirs)) {
                    return false;
                  }
                  return _this.D_getFile(pkg, full_nm_alt);
                });
              });
            })(this)(pkg);
          }
        }
      }
      ref1 = this.reverse_packages;
      fn = (function(_this) {
        return function(pkg) {
          return promise = promise.then(function(result) {
            var compiled;
            if (result !== false) {
              return result;
            }
            if (compiled = _this.preLoaded(pkg, type, nm)) {
              return compiled;
            }
            if (!(pkg in E.option.loadDirs)) {
              return false;
            }
            return _this.D_getFile(pkg, full_nm);
          });
        };
      })(this);
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        pkg = ref1[k];
        fn(pkg);
      }
      promise = promise.then((function(_this) {
        return function(result) {
          var parsed;
          if (result !== false) {
            parsed = (result != null ? result.preloaded : void 0) ? result : _this.compile(full_nm, result);
          } else {
            throw new Error("Unable to locate View file (" + full_nm + ").");
            console.error('ERROR', 'NO FILE FOUND! ', full_nm);
            parsed = false;
          }
          _this.cache[full_nm] = parsed;
          return parsed;
        };
      })(this));
      promise.then(null, function(error) {
        throw error;
      });
      this.cache[full_nm] = promise;
      return promise;
    };

    LoadStrategy.prototype.D_getFile = function(pkg, nm) {
      var f, path;
      f = 'DE/LoadStrategy.D_getFile';
      path = (this.makePkgDir(pkg)) + '/';
      return new Promise(function(resolve, reject) {
        var xhr;
        xhr = new XMLHttpRequest();
        xhr.onloadend = function(event) {
          if (xhr.status !== 200) {
            resolve(false);
          }
          return resolve(xhr.response);
        };
        xhr.open('GET', path + nm + '?_=' + new Date().valueOf());
        xhr.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
        return xhr.send();
      });
    };

    LoadStrategy.prototype.d_layout = function(nm) {
      return this.d_get('Layout', nm);
    };

    LoadStrategy.prototype.d_page = function(nm) {
      return this.d_get('Page', nm);
    };

    LoadStrategy.prototype.d_part = function(nm) {
      return this.d_get('Part', nm);
    };

    return LoadStrategy;

  })();

  E.Extra.LoadStrategy$Dev = LoadStrategy;

  E.opt({
    loader: 'LoadStrategy$Dev'
  });

}).call(this);
