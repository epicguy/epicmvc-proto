#!/bin/bash -e

# Build single version of all of EpicMvc w/ uglify
# Note: to prep, you want to do e.g. ln ../html DevEpic
NM=make_min.sh.....
ECHO() {
  echo '----: ' $*
  $*
}

EpicDir=../html
# OneEpic=../EpicMvc-One-2.0.0-%MD5_EPICMVC%.js
OneEpic=$EpicDir/EpicMvc-Base-latest-min.js

echo $NM "Copyright..."
cat copyright.js > $OneEpic
echo $NM "makeit..."
./makeit DevEpic $OneEpic

PKG=Base
echo $NM "Building:    $PKG"
./makeit-pkg2 $EpicDir/$PKG $OneEpic
echo $NM "Compressing: $PKG/view" "... USING: ./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic"
./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

#KEY=%MD5_EPICMVC%
#FILE=$OneEpic
#MD5=`md5sum $FILE | cut -c1-5`
#ECHO mv $FILE `echo $FILE | awk "{print gensub(\"$KEY\",\"$MD5\",1)}"`
