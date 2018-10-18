#!/bin/bash -e

# Build single version of Optional stuff (extra packages) w/o uglify

ECHO() {
  echo $*
  $*
}

EpicDir=../html
# OneEpic=../EpicMvc-One-2.0.0-%MD5_EPICMVC%.js
OneEpic=$EpicDir/EpicMvc-Extra-latest.js

cat copyright.js > $OneEpic

PKG=Proto
echo "Building:    $PKG"
./makeit-pkg $EpicDir/$PKG $OneEpic
echo "Compressing: $PKG/view"
./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

#PKG=Dev
#echo "Building:    $PKG"
#./makeit-pkg $EpicDir/$PKG $OneEpic
#echo "Compressing: $PKG/view"
#./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

#KEY=%MD5_EPICMVC%
#FILE=$OneEpic
#MD5=`md5sum $FILE | cut -c1-5`
#ECHO mv $FILE `echo $FILE | awk "{print gensub(\"$KEY\",\"$MD5\",1)}"`
