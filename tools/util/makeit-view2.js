// Generated by CoffeeScript 1.4.0
(function() {
  var E, MockLoadStrategy, dev_dir, doIt, doObj, epic_path, fs, window, _log;

  window = {};

  _log = function() {};

  window._log2 = function() {};

  fs = require('fs');

  dev_dir = '../' + process.argv[3];

  epic_path = '../' + process.argv[2];

  window.E = require(epic_path + '/EpicCore.js');

  E = window.E;

  (require(epic_path + '/Dev/Extra/ParseFile.js'))(window);

  MockLoadStrategy = (function() {

    function MockLoadStrategy(dev_dir, pkg_nm) {
      this.path = dev_dir + '/' + pkg_nm + '/';
    }

    MockLoadStrategy.prototype.getLayoNm = function(nm) {
      return this.path + 'Layout/' + nm + '.html';
    };

    MockLoadStrategy.prototype.getPageNm = function(nm) {
      return this.path + 'Page/' + nm + '.html';
    };

    MockLoadStrategy.prototype.getPartNm = function(nm) {
      return this.path + 'Part/' + nm + '.html';
    };

    MockLoadStrategy.prototype.getFile = function(nm) {
      var results;
      results = 'bad request?';
      results = fs.readFileSync(nm);
      return String(results);
    };

    MockLoadStrategy.prototype.layout = function(nm) {
      var full_nm, out;
      _log("layout: " + nm);
      full_nm = this.getLayoNm(nm);
      out = E.Extra.ParseFile(full_nm, this.getFile(full_nm));
      return out;
    };

    MockLoadStrategy.prototype.page = function(nm) {
      var full_nm, out;
      _log("page: " + nm);
      full_nm = this.getPageNm(nm);
      out = E.Extra.ParseFile(full_nm, this.getFile(full_nm));
      return out;
    };

    MockLoadStrategy.prototype.part = function(nm) {
      var full_nm;
      _log("part: " + nm);
      full_nm = this.getPartNm(nm);
      return E.Extra.ParseFile(full_nm, this.getFile(full_nm));
    };

    MockLoadStrategy.prototype.readdir = function(type) {
      var f, files, p, path_part, _i, _len, _ref, _results;
      f = 'MockLoadStrategy.readdir';
      _log(f, '>', type);
      path_part = type;
      _log(f, '@path path_part', this.path, path_part);
      if (!fs.existsSync(this.path + path_part)) {
        return [];
      }
      files = fs.readdirSync(this.path + path_part);
      _ref = (function() {
        var _j, _len, _results1;
        _results1 = [];
        for (_j = 0, _len = files.length; _j < _len; _j++) {
          p = files[_j];
          _results1.push(p.split('.'));
        }
        return _results1;
      })();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        _results.push(f[0]);
      }
      return _results;
    };

    return MockLoadStrategy;

  })();

  doObj = function(obj) {
    var content;
    content = "function(){" + obj.content + "}";
    return "{preloaded:1,can_componentize:" + obj.can_componentize + ",defer:" + obj.defer + ",content:" + content + "}";
  };

  doIt = function(dev_dir, pkg_nm) {
    var end, f, fnm, load, out, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
    f = 'doIt';
    _log(f, 'args', dev_dir, pkg_nm);
    out = 'E.view$' + pkg_nm + '={\n';
    load = new MockLoadStrategy(dev_dir, pkg_nm);
    out += 'Layout: {\n';
    end = '';
    _ref = load.readdir('Layout');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fnm = _ref[_i];
      out += end + ("\"" + fnm + "\":" + (doObj(load.layout(fnm))));
      end = ",\n";
    }
    out += '}, Page: {\n';
    end = '';
    _ref1 = load.readdir('Page');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      fnm = _ref1[_j];
      out += end + ("\"" + fnm + "\":" + (doObj(load.page(fnm))));
      end = ",\n";
    }
    out += '}, Part: {\n';
    end = '';
    _ref2 = load.readdir('Part');
    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
      fnm = _ref2[_k];
      out += end + ("\"" + fnm + "\":" + (doObj(load.part(fnm))));
      end = ",\n";
    }
    out += '}};\n';
    return console.log('' + out);
  };

  doIt(dev_dir, process.argv[4]);

}).call(this);
