/* Copyright 2007-2016 by James Shelby, shelby (at:) dtsol.com; All rights reserved. */
/*Proto/js/jquery-dnd-events.js*/if( typeof jQuery != "undefined") { (function ($) {

	//hooks for drag and drop events, like $.event.keyHooks and $.event.mouseHooks, but for drag and drop
	var dndHooks = {
		//importing to the event object all the properties like in a regular mouse event,
		//also importing the dataTransfer property
		props: $.event.mouseHooks.props.concat('dataTransfer'),

		//since no new filtering to the imported props is needed, we only need the same filtering as in normal
		//mouse events
		filter: $.event.mouseHooks.filter
	};

	//make the drag and drop events like every other event, this is almost the same as the end of /src/event.js
	$.each(['dragstart', 'dragenter', 'dragover', 'dragleave', 'drag', 'drop', 'dragend'], function (i, name) {
		$.fn[name] = function (data, fn) {
			if (!fn) {
				fn = data;
				data = null;
			}
			return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
		};

		if ($.attrFn) {
			$.attrFn[name] = true;
		}

		$.event.fixHooks[name] = dndHooks;
	});

}(jQuery));
}

/*Proto/app.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  E.app$Proto = {
    ACTIONS: {
      a_clear: {
        "do": 'App.clear'
      }
    }
  };

}).call(this);

/*Proto/Extra/Fist.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  'use strict';
  E.fistH2H$pre = function(field, val) {
    return val.replace(/[<>]/g, '');
  };

  E.fistH2H$trim = function(field, val) {
    return (String(val)).trim();
  };

  E.fistH2H$lower = function(field, val) {
    return (String(val)).toLowerCase();
  };

  E.fistH2H$upper = function(field, val) {
    return (String(val)).toUpperCase();
  };

  E.fistH2H$zero = function(field, val) {
    return val != null ? val : 0;
  };

  E.fistH2H$null = function(field, val) {
    return val != null ? val : null;
  };

  E.fistH2H$empty = function(field, val) {
    return val != null ? val : '';
  };

  E.fistH2H$digits = function(field, val) {
    return val.replace(/[^0-9]/g, '');
  };

  E.fistH2H$chars = function(field, val) {
    return val.replace(/[^a-z]/ig, '');
  };

  E.fistH2D$zero = function(field, val) {
    return val != null ? val : 0;
  };

  E.fistH2D$upper = function(field, val) {
    return (String(val)).toUpperCase();
  };

  E.fistD2H$sliceIt = function(field, val) {
    var expr;
    expr = field.d2h_expr;
    return (String(val)).slice(expr[0], expr[1]);
  };

  E.fistVAL$test = function(field, val) {
    var re;
    re = field.validate_expr;
    if (typeof re === 'string') {
      re = new RegExp(re);
    }
    return re.test(val);
  };

  E.fistVAL$email = function(field, val) {
    var few, most, re, some;
    most = '[A-Z0-9._+%-]';
    some = '[A-Z0-9.-]';
    few = '[A-Z]';
    re = new RegExp("^" + most + "+@" + some + "+[.]" + few + "{2,4}$", 'i');
    if (val.match(re)) {
      return true;
    } else {
      return false;
    }
  };

}).call(this);

/*Proto/Extra/GlobalDrag.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  var GlobalDrag,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  GlobalDrag = (function() {
    function GlobalDrag(pre_flight) {
      this.pre_flight = pre_flight;
      this.data = bind(this.data, this);
      this.check = bind(this.check, this);
      this.target_drop = bind(this.target_drop, this);
      this.target_dragleave = bind(this.target_dragleave, this);
      this.target_dragenter = bind(this.target_dragenter, this);
      this.target_dragover = bind(this.target_dragover, this);
      this.source_dragend = bind(this.source_dragend, this);
      this.source_dragstart = bind(this.source_dragstart, this);
      this.update = bind(this.update, this);
      this.handleDragLeave = bind(this.handleDragLeave, this);
      this.handleDragEnter = bind(this.handleDragEnter, this);
      this.handleDragOver = bind(this.handleDragOver, this);
      this.log3 = function() {};
      this.count_enter = 0;
      this.count_leave = 0;
      this.count_target = 0;
      this.src_elem = false;
      this.src_data = false;
      this.drag_type = false;
      console.error('GlobalDrag needs help.');

      /*
      		$ => $(document)
      			.dragenter( @handleDragEnter)
      			.dragleave( @handleDragLeave)
      			.dragover( @handleDragOver)
       */
    }

    GlobalDrag.prototype.get_type = function(t) {
      this.log3('get_type', typeof t, t);
      if (t === null || t === void 0) {
        return 'BROKEN';
      }
      if (t && typeof t === 'object' && indexOf.call(t, 'Files') >= 0) {
        t = 'Files';
      }
      if (typeof t !== 'string' || t === 'Text' || -1 !== t.indexOf('/')) {
        return false;
      }
      return t;
    };

    GlobalDrag.prototype.handleDragOver = function(evt) {
      if (this.drag_type === false) {
        return true;
      }
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'none';
      return false;
    };

    GlobalDrag.prototype.handleDragEnter = function(evt) {
      return this.light(evt, 'global');
    };

    GlobalDrag.prototype.handleDragLeave = function(evt) {
      return this.unlight(evt, 'global');
    };

    GlobalDrag.prototype.update = function(selector) {
      var container;
      container = $(selector);
      $('.data-drag', container).each((function(_this) {
        return function(ix, el) {
          return $(el).attr('draggable', 'true').dragstart(_this.source_dragstart).dragend(_this.source_dragend);
        };
      })(this));
      return $('.data-drop', container).each((function(_this) {
        return function(ix, el) {
          return $(el).dragover(_this.target_dragover).drop(_this.target_drop).dragenter(_this.target_dragenter).dragleave(_this.target_dragleave);
        };
      })(this));
    };

    GlobalDrag.prototype.source_dragstart = function(e) {
      var $e;
      $e = this.find(e, 'data-drag', false);
      if ($e === false) {
        return false;
      }
      this.src_start($e);
      e.dataTransfer.setData($e.attr('data-drag-type'), $e.attr('data-drag-data'));
      this.log3('start:type/data/$e', $e.attr('data-drag-type'), $e.attr('data-drag-data'), $e);
      return $e.addClass('active-source');
    };

    GlobalDrag.prototype.source_dragend = function(e) {
      var $e;
      $e = $(e.target);
      $e.removeClass('active-source');
      return this.src_end();
    };

    GlobalDrag.prototype.target_dragover = function(e) {
      var $e;
      if (this.drag_type === false) {
        return;
      }
      $e = this.find(e, 'active-target');
      if ($e === false) {
        e.dataTransfer.dropEffect = 'none';
        return true;
      }
      e.preventDefault();
      return false;
    };

    GlobalDrag.prototype.target_dragenter = function(e) {
      var $e;
      this.light(e, 'target');
      $e = this.find(e, 'active-target');
      if ($e === false) {
        return;
      }
      this.count_target += 1;
      return $e.addClass('active-drop');
    };

    GlobalDrag.prototype.target_dragleave = function(e) {
      var $e;
      this.unlight(e, 'target');
      $e = this.find(e, 'active-target');
      if ($e === false) {
        return;
      }
      this.count_target -= 1;
      if (this.count_target === 0) {
        return $e.removeClass('active-drop');
      }
    };

    GlobalDrag.prototype.target_drop = function(e) {
      var $e, action, drag_type, drop_data, params;
      if (this.drag_type === false) {
        return true;
      }
      e.stopPropagation();
      e.preventDefault();
      $e = this.find(e, 'active-target');
      if ($e === false) {
        return true;
      }
      drag_type = this.drag_type;
      action = $e.attr('data-drop-' + drag_type);
      drop_data = this.data($e, 'drop');
      params = $.extend({}, this.src_data, drop_data, {
        event: e
      });
      this.src_end();
      window.EpicMvc.Epic.makeClick(false, action, params, true);
      return false;
    };

    GlobalDrag.prototype.src_start = function($e) {
      this.drag_type = this.get_type($e.attr('data-drag-type'));
      this.log3('src_start drag_type/$e', this.drag_type, $e);
      if (this.drag_type === false) {
        return;
      }
      this.src_elem = $e;
      this.src_data = this.data($e, 'drag');
      this.log3('src_start src_data', this.src_data);
    };

    GlobalDrag.prototype.src_end = function() {
      $('.active-target').removeClass('active-target');
      this.count_target = 0;
      this.count_enter = 0;
      this.count_leave = 0;
      this.src_data = false;
      this.src_elem = false;
      this.drag_type = false;
    };

    GlobalDrag.prototype.light = function(evt, src) {
      var Data, Pre_flight, src_data, type;
      if (this.count_enter === 0) {
        this.count_enter = 1;
        if (this.drag_type === false) {
          this.drag_type = this.get_type(evt.dataTransfer.types);
        }
        type = this.drag_type;
        src_data = this.src_data;
        Data = this.data;
        Pre_flight = this.pre_flight;
        this.log3('light0,type/src/src_data', type, src, src_data);
        $('[data-drop-' + type + ']').not('.active-source').filter(function() {
          if (src_data === false) {
            return true;
          }
          return Pre_flight($(this).attr('data-drop-' + type), $.extend({}, src_data, Data($(this), 'drop')));
        }).addClass('active-target');
        return this.check(false);
      } else {
        return this.count_enter += 1;
      }
    };

    GlobalDrag.prototype.unlight = function(evt, src) {
      return this.count_leave += 1;
    };

    GlobalDrag.prototype.check = function(enter, leave) {
      var current_enter, current_leave;
      if (enter === 0) {
        return;
      }
      if (enter && enter === leave && enter === this.count_enter && leave === this.count_leave) {
        $('.active-target').removeClass('active-target');
        this.count_enter = 0;
        this.count_leave = 0;
        return;
      }
      current_enter = this.count_enter;
      current_leave = this.count_leave;
      return (function(_this) {
        return function(current_enter, current_leave) {
          return setTimeout((function() {
            return _this.check(current_enter, current_leave);
          }), 200);
        };
      })(this)(current_enter, current_leave);
    };

    GlobalDrag.prototype.data = function($e, drag_or_drop) {
      var data;
      data = $e === false ? drag_or_drop : $e.attr('data-' + drag_or_drop + '-data');
      if (data && data.length) {
        return JSON.parse(data);
      }
      return {};
    };

    GlobalDrag.prototype.find = function(evt, class_nm, traverse) {
      var $e, $e_parent;
      class_nm = '.' + class_nm;
      $e = $(evt.target);
      if ($e.is(class_nm)) {
        return $e;
      }
      if (traverse !== false) {
        $e_parent = $e.parent(class_nm);
        if ($e_parent.is(class_nm)) {
          return $e_parent;
        }
      }
      return false;
    };

    return GlobalDrag;

  })();

  E.Extra.GlobalDrag = GlobalDrag;

}).call(this);

/*Proto/Extra/misc.coffee*/// Generated by CoffeeScript 1.9.2
(function() {
  E.ex$timeago = function(el, isInit, ctx, val, p1, p2) {
    var doIt, re_doIt, un_doIt;
    un_doIt = function() {
      if (ctx.timer) {
        clearInterval(ctx.timer);
        return delete ctx.timer;
      }
    };
    doIt = function() {
      return el.textContent = $.timeago(val);
    };
    re_doIt = function() {
      un_doIt();
      return ctx.timer = setInterval(doIt, 60000);
    };
    doIt();
    re_doIt();
    if (isInit) {
      return ctx.onunload = un_doIt;
    }
  };

  E.ex$attr = function(el, beenHere, ctx, value, attr_nm, cast_to) {
    if (beenHere) {
      return;
    }
    attr_nm = E.camelCase(attr_nm, '_');
    switch (cast_to) {
      case 'func':
        value = new Function('p1', 'p2', 'p3', value);
        break;
      case 'int':
        value = parseInt(value);
    }
    _log2("ex$attr: attr_nm=", attr_nm, " cast_to=", cast_to, " value=", value);
    el[attr_nm] = value;
  };

  E.ex$scroll = function(el, isInit, ctx, val, p1, p2) {
    var direction, f;
    f = 'E.ex$scroll:';
    _log2(f, {
      isInit: isInit,
      val: val,
      p1: p1,
      p2: p2
    });
    direction = 'scroll' + val;
    return el[direction] = 0;
  };

}).call(this);

E.view$Proto={
Layout: {
},
Page: {
},
Part: {
"fist_default":{preloaded:1,can_componentize:false,defer:0,content:function(){return oE.kids([['if',{val:oE.v2('Control','type','lc'),eq:'hidden'},function(){return [{tag:'input',attrs:{type:oE.v2('Control','type','lc'),name:oE.v2('Control','name'),value:oE.v2('Control','value')},children:[]}]}],['if',{val:oE.v2('Control','type','lc'),ne:'hidden'},function(){return [{tag:'div',attrs:{className:'form-group '+oE.v2('Control','issue','?has-error')},children:oE.kids([['if',{val:oE.v2('Control','type','lc'),ne:'yesno'},function(){return [{tag:'label',attrs:{htmlFor:oE.v2('Control','name'),className:'control-label'},children:oE.kids([['if_true',{name:'req'},function(){return [{tag:'span',attrs:{className:'form-req'},children:['*']}]}],' '+oE.v2('Control','label')+' '])}]}],{tag:'div',attrs:{className:'controls'},children:oE.kids([['if',{val:oE.v2('Control','type'),eq:'textarea'},function(){return [{tag:'textarea',attrs:oE.weed({name:oE.v2('Control','name'),'?required':oE.v2('Control','req'),'data-e-action':'event:Fist:'+oE.v2('Control','fistNm')+':'+oE.v2('Control','fieldNm')+':keyup-focus-blur-change'}),children:[' '+oE.v2('Control','value')+' ']}]}],['if',{val:oE.v2('Control','type','lc'),eq:'text'},function(){return [{tag:'input',attrs:oE.weed({type:oE.v2('Control','type','lc'),name:oE.v2('Control','name'),value:oE.v2('Control','value'),size:oE.v2('Control','width'),'?required':oE.v2('Control','req'),className:'form-control','data-e-action':'event:Fist:'+oE.v2('Control','fistNm')+':'+oE.v2('Control','fieldNm')+':keyup-focus-blur-change'}),children:[]}]}],['if',{val:oE.v2('Control','type','lc'),eq:'password'},function(){return [{tag:'input',attrs:oE.weed({type:oE.v2('Control','type','lc'),name:oE.v2('Control','name'),value:oE.v2('Control','value'),size:oE.v2('Control','width'),'?required':oE.v2('Control','req'),className:'form-control','data-e-action':'event:Fist:'+oE.v2('Control','fistNm')+':'+oE.v2('Control','fieldNm')+':keyup-focus-blur-change'}),children:[]}]}],['if',{val:oE.v2('Control','type','lc'),eq:'yesno'},function(){return [{tag:'label',attrs:{htmlFor:oE.v2('Control','id'),className:'control-label'},children:oE.kids([{tag:'input',attrs:oE.weed({type:'checkbox',name:oE.v2('Control','name'),id:oE.v2('Control','id'),value:oE.v2('Control','yes_val'),'?checked':oE.v2('Control','selected')}),children:[]},['if_true',{name:'req'},function(){return [{tag:'span',attrs:{className:'form-req'},children:['*']}]}],' '+oE.v2('Control','label')+' '])}]}],['if',{val:oE.v2('Control','type'),eq:'radio'},function(){return oE.kids([['foreach',{table:'Control/Choice'},function(){return [{tag:'label',attrs:{htmlFor:oE.v2('Control','id')+'-'+oE.v2('Choice','option'),className:'control-sublabel'},children:[{tag:'input',attrs:oE.weed({type:'radio',name:oE.v2('Control','name'),id:oE.v2('Control','id')+'-'+oE.v2('Choice','option'),value:oE.v2('Choice','value'),'?checked':oE.v2('Choice','selected')}),children:[]},' '+oE.v2('Choice','option')+' ']}]}]])}],['if',{val:oE.v2('Control','type'),eq:'pulldown'},function(){return [{tag:'select',attrs:oE.weed({name:oE.v2('Control','name'),'?size':oE.v2('Control','size')}),children:oE.kids([['foreach',{table:'Control/Choice'},function(){return [{tag:'option',attrs:oE.weed({value:oE.v2('Choice','value'),'?selected':oE.v2('Choice','selected')}),children:[' '+oE.v2('Choice','option')+' ']}]}]])}]}],['if',{set:oE.v2('Control','issue')},function(){return [{tag:'span',attrs:{className:'help-block field-error'},children:[oE.v2('Control','issue')]}]}]])}])}]}]])}},
"issues":{preloaded:1,can_componentize:false,defer:0,content:function(){return [{tag:'style',attrs:{},children:m.trust(' .alert {\n text-align: left;\n padding: 10px 30px 8px 10px;\n width: 40%;\n border-width: 5px;\n font-weight: bold;\n box-shadow: 0px 4px 8px #999;\n position: absolute;\n z-index: 99999;\n margin-top: -1px;\n} ')},{tag:'div',attrs:{},children:oE.kids([['if',{table_is_not_empty:'App/Message'},function(){return [{tag:'div',attrs:{className:'alert alert-success alert-dismissable fade in'},children:oE.kids([{tag:'button',attrs:{type:'button',className:'close','data-e-action':'click:a_clear'},children:[{tag:'i',attrs:{className:'glyphicon glyphicon-remove'},children:[]}]},['foreach',{table:'App/Message'},function(){return [{tag:'p',attrs:{title:oE.v2('Message','title')},children:[oE.v2('Message','issue')]}]}]])}]}],['if',{table_is_not_empty:'App/Issue'},function(){return [{tag:'div',attrs:{className:'alert alert-danger alert-dismissable fade in'},children:oE.kids([{tag:'button',attrs:{type:'button',className:'close','data-e-action':'click:a_clear'},children:[{tag:'i',attrs:{className:'glyphicon glyphicon-remove'},children:[]}]},['foreach',{table:'App/Issue'},function(){return [{tag:'p',attrs:{title:oE.v2('Issue','title')},children:[oE.v2('Issue','issue')]}]}]])}]}]])}]}}}};
