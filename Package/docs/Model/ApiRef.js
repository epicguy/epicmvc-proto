// Generated by CoffeeScript 1.4.0
var ApiRef, ref_data,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ApiRef = (function(_super) {

  __extends(ApiRef, _super);

  function ApiRef(view_nm, opts) {
    ApiRef.__super__.constructor.call(this, view_nm, opts);
    this.ref = ref_data;
  }

  ApiRef.prototype.loadTable = function(tbl_nm) {
    var desc, f, func;
    f = "ApiRef:loadTable:" + tbl_nm;
    console.log(f);
    return this.Table[tbl_nm] = (function() {
      var _ref, _results;
      _ref = this.ref[tbl_nm];
      _results = [];
      for (func in _ref) {
        desc = _ref[func];
        _results.push(desc);
      }
      return _results;
    }).call(this);
  };

  return ApiRef;

})(E.ModelJS);

E.Model.ApiRef = ApiRef;

ref_data = {
  Fist: {
    getFistNm: {
      func_name: 'getFistNm',
      signature: 'getFistNm()',
      description: 'Grabs the name of the fist',
      Argument: [],
      Return: [
        {
          type: 'string',
          details: 'The name defined in fist.coffee'
        }
      ]
    },
    getFieldsDefs: {
      func_name: 'getFieldDefs',
      signature: 'getFieldDefs()',
      description: 'Grabs all field definitions for a Fist. Field definitions are defined in the applications fist file, under the FIELDS key.',
      Argument: [],
      Return: [
        {
          type: 'object',
          details: 'Hashed by the HTML field names definied in fist.coffee'
        }
      ]
    },
    getFieldAttributes: {
      func_name: 'getFieldAttributes',
      signature: 'getFieldAttributes(field_name)',
      description: 'Grabs the field definition for a particular field defined in fist.coffee',
      Argument: [
        {
          param: 'field_name',
          type: 'string',
          details: 'Name of the field'
        }
      ],
      Return: [
        {
          type: 'object',
          details: 'Hashed by attribute names'
        }
      ]
    },
    getHtmlFieldValues: {
      func_name: 'getHtmlFieldValues',
      signature: 'getHtmlFieldValues()',
      description: 'Grabs all of the HTML values for a Fist.',
      Argument: [],
      Return: [
        {
          type: 'object',
          details: 'Hashed by the HTML field names; null if field is empty.'
        }
      ]
    },
    getHtmlFieldValue: {
      func_name: 'getHtmlFieldValue',
      signature: 'getHtmlFieldValue(html_field_name)',
      description: 'Grabs the HTML value for a particular field by using the HTML field name',
      Argument: [
        {
          param: 'html_field_name',
          type: 'string',
          details: 'Name of the HTML field'
        }
      ],
      Return: [
        {
          type: 'string|number|null',
          details: 'The HTML value for a field'
        }
      ]
    },
    getDbFieldValues: {
      func_name: 'getDbFieldValues',
      signature: 'getDbFieldValues()',
      description: 'Grabs all of the DB values for a Fist.',
      Argument: [],
      Return: [
        {
          type: 'object',
          details: 'Hashed by the DB field names; null or empty string if a field is empty. Will return an empty object if no fields are populated'
        }
      ]
    },
    getDbFieldValue: {
      func_name: 'getDbFieldValue',
      signature: 'getDbFieldValue(db_field_name)',
      description: 'Grabs DB value for a particular field',
      Argument: [
        {
          param: 'db_field_name',
          type: 'string',
          details: 'The db_nm of a field defined in fist.coffee'
        }
      ],
      Return: [
        {
          type: 'string|number|null|undefined',
          details: 'The db value of a field'
        }
      ]
    },
    setFromDbValues: {
      func_name: 'setFromDbValues',
      signature: 'setFromDbValues(data)',
      description: 'Sets the Fist field values based on the DB names provided in the data object.',
      Argument: [
        {
          param: 'data',
          type: 'object',
          details: 'Data hash where all the keys are the db_nm of a field defined in fist.coffee'
        }
      ],
      Return: []
    },
    setFromHtmlValues: {
      func_name: 'setFromHtmlValues',
      signature: 'setFromHtmlValues(data)',
      description: 'Sets the Fist field values based on the HTML names provided in the data object.',
      Argument: [
        {
          param: 'data',
          type: 'object',
          details: 'Data hash where all the keys are the HTML names of a field defined in fist.coffee'
        }
      ],
      Return: []
    },
    clearValues: {
      func_name: 'clearValues',
      signature: 'clearValues()',
      description: 'Clears all DB and HTML values stored in the FIST.',
      Argument: [],
      Return: []
    },
    fieldLevelValidate: {
      func_name: 'fieldLevelValidate',
      signature: 'fieldLevelValidate(data, fist_name, clear_issues)',
      description: 'Validates HTML field values and populates the DB side of the Fist. Will run HTML to HTML filters and then HTML to DB filters. Validation will return an issues object with any issues found',
      Argument: [
        {
          param: 'data',
          type: 'object',
          details: 'Data hash where all the keys are the HTML names of a field defined in fist.coffee'
        }, {
          param: 'fist_name',
          type: 'string',
          details: '(optional) The name of the Fist defined in fist.coffee'
        }, {
          param: 'clear_issues',
          type: 'bool',
          details: '(optional) Clear issues related to a fist before validating'
        }
      ],
      Return: [
        {
          type: 'object',
          details: 'Returns an Issue object containing an issues_list'
        }
      ]
    }
  }
};
