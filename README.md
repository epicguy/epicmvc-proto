epicmvc-proto (version 2)
=============

Copyright 2007-2015 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

EpicMvc: a different kind of JavaScript framework for web apps

Documentation is in the project: {Jamie, I can trade you github push rights for putting the docs in github}

You can actually run the 'hello dude' app right out of git: http://cdn.rawgit.com/epicguy/epicmvc-proto/version2/html/world_dev.html

## Changes from version 1

* Added Mithril view rendering engine, and used other support from it to avoid jQuery dependence.
* View layer is Async when loading frames, layouts, pages, and parts (used in dev mode)
* Manifest in manifest.js allows loading all your code assests dynamicaly (put just your manifest.js in the index.html)
* Fist handling is now 2-way binding by default
* Primary namespace is now 'E'
* Model actions are now Async to allow e.g. server side testing
* The Async logic is based on Mithril m.Deferred; Ajax uses m.request
* Attribute namespace for *.html view files is now "e-", e.g. &lt;e-page/&gt; &lt;e-part part="head" e-any="value"&gt;
* For clickable actions any element will do: &lt;h1 e-click="doIt" e-id="&M/id;"&gt;Do something&lt;h1&gt;
* Model actions take an initial 'context' containing: deferred, issue, message, and result object

##TODO

This project is under construction

## License

I will likely release it under the MIT License when I get it banged into shape

## Requirement

Using Node JS 8.12.0

Jest for testing
