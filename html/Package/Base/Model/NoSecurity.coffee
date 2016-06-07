'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class NoSecurity extends window.EpicMvc.ModelJS
	constructor: (epic, view_nm) -> super epic, view_nm
	loginValid: -> false
	checkSession: -> 'LoginNone'

window.EpicMvc.Model.NoSecurity$Base= NoSecurity
