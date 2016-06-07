'use strict'
# Copyright 2007-2012 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

class FistGroupCache
	constructor: (@Epic,@loadStrategy) ->
		@cacheByGrp= [] # Cache starts empty
	getFistGroup: (grp_nm) ->
		if not @cacheByGrp[grp_nm]?= @loadStrategy.fist grp_nm
			throw 'Could not locate window.EpicMvc.fist$'+ grp_nm
		@cacheByGrp[grp_nm]
	getFistDef: (grp_nm, flist_nm) -> # NOT cannonical
		g= @getFistGroup grp_nm
		if not g.FISTS[flist_nm]
			throw "Could not locate window.EpicMvc.fist$#{grp_nm}.#{flist_nm}"
		g.FISTS[flist_nm]
	getFieldDefsForGroup: (grp_nm) -> @getFistGroup( grp_nm).FIELDS # Maintenance
	getFistDefsForGroup: (grp_nm) -> @getFistGroup( grp_nm).FISTS # Maintenance
	getFieldDefsForFist: (grp_nm, flist_nm) ->
		g= @getFistGroup grp_nm # Shortcut into cache for this 'group'
		f= @getFistDef grp_nm, flist_nm
		fieldDef= {}
		for nm in f
			if not (nm of g.FIELDS)
				throw "Fist #{grp_nm}:#{flist_nm} contains unknown field #{nm}"
			fieldDef[nm]= g.FIELDS[nm]
		fieldDef
	getCanonicalFist: (grp_nm, flist_nm) -> (flist_nm.split '_')[ 0]

window.EpicMvc.FistGroupCache= FistGroupCache # Pubilc API
