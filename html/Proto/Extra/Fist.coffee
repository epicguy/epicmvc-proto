'use strict'
# Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

E.fistH2H$pre= (val) -> val.replace /[<>]/g, ''

E.fistH2H$trim=  (val) -> (String val).trim()
E.fistH2H$lower= (val) -> (String val).toLowerCase()
E.fistH2H$upper= (val) -> (String val).toUpperCase()
E.fistH2H$zero=  (val) -> val ? 0
E.fistH2H$null=  (val) -> val ? null
E.fistH2H$empty= (val) -> val ? ''
E.fistH2H$digits=(val) -> val.replace /[^0-9]/g, ''
E.fistH2H$chars=(val) -> val.replace /[^a-z]/ig, ''

E.fistH2D$zero= (field,val) -> val ? 0
E.fistH2D$upper= (field,val) -> (String val).toUpperCase()

E.fistD2H$sliceIt= (field, val) -> expr= field.d2h_expr; (String val).slice expr[ 0], expr[ 1]

E.fistVAL$test= (field, val) ->
	re= field.validate_expr
	re= new RegExp re if typeof re is 'string'
	re.test val
