epicmvc-proto (version 2)
=============

Copyright 2007-2014 by James Shelby, shelby (at:) dtsol.com; All rights reserved.

EpicMvc another JavaScript framework for web apps; Prototype version for existing clients.

Documentation is in the project: <Jamie, I can trade you github push rights for putting the docs in github>

You can actually run the 'hellow dude' app right out of git: https://rawgithub.com/epicguy/epicmvc-proto/master/html/world.html

## Changes from version 1

Added Mithril view rendering engine, and used other support from it to avoid jQuery dependence.
View layer is Async when loading frames, layouts, pages, and parts (used in dev mode)
Manifest in app..js allows loading all your code assests dynamicaly (just put your app.js in *html)
Fist handling is now 2-way binding by default
Model actions are now Async
Primary namespace is not 'E'
The Async logic is based on m.Deferred; Ajax uses m.request
Namespace for view *html files is now "e-", e.g. <e-page/> <e-part part="head" e-any="value">
For clickable actions: <h1 e-click="doIt" e-id="&M/id;">Do something</h1>
Model actions take an initial 'context' with a deferred, issue, message, and result object

##TODO

This project is under construction


## License

I will likely release it under the MIT License when I get it banged into shape
