
# Build single version of all of EpicMvc w/o uglify

ECHO() {
  echo $*
  $*
}

EpicDir=../../html
# OneEpic=../EpicMvc-One-0.0.0-%MD5_EPICMVC%.js
OneEpic=../EpicMvc-One-0.0.0-latest.js
EnvPkg=bootstrap

cat copyright.js > $OneEpic
./makeit2 DevEpic/EpicMvc $OneEpic

PKG=Base
echo "Building:    Package/$PKG"
./makeit-pkg2 ../html/Package/$PKG $OneEpic
echo "Compressing: Package/$PKG/view"
 ./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

PKG=$EnvPkg
echo "Building:    Package/$PKG (the EnvPkg)"
./makeit-pkg2 ../html/Package/$EnvPkg $OneEpic
echo "Compressing: Package/$PKG/view"
./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

PKG=BaseDevl
echo "Building:    Package/$PKG"
./makeit-pkg2 ../html/Package/$PKG $OneEpic
echo "Compressing: Package/$PKG/view"
 ./makeit-view $EpicDir $EpicDir $PKG >> $OneEpic

KEY=%MD5_EPICMVC%
FILE=$OneEpic
MD5=`md5sum $FILE | cut -c1-5`
ECHO mv $FILE `echo $FILE | awk "{print gensub(\"$KEY\",\"$MD5\",1)}"`
