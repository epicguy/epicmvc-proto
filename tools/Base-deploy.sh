#!/bin/sh
# Sample how to create a minimized deploy html dir from development

# Assume our project is called $HERE, with one Package '$PKG', and using 'bootstrap', and development is at htmlroot/EpicMvc

HtmlRoot='/var/www/html'
HERE='Base'
PKG='Base'
DEV='EpicMvc'

echo HtmlRoot=$HtmlRoot
echo HERE=$HERE
echo PKG=$PKG
echo DEV=$DEV

# Leaving these as an exersize for the user, manually
#echo 'Removing all of $HtmlRoot/$HERE'
#rm -Ir $HtmlRoot/$HERE

echo Creating links EpicMvc, DevHtml, DeployHtml
rm EpicMvc DevHtml DeployHtml
ln -s $HtmlRoot/$DEV/EpicMvc .
ln -s $HtmlRoot/$DEV DevHtml
ln -s $HtmlRoot/$HERE DeployHtml

mkdir $HtmlRoot/$HERE
ls -l DeployHtml

echo Building: EpicMvc
./makeit
echo Building: Package/Base
./makeit-pkg Base
echo Building: Package/bootstrap
./makeit-pkg bootstrap
#echo Building: Package/$PKG
#./makeit-pkg $PKG
echo Compressing: Package/$PKG/view
./makeit-view $PKG > DeployHtml/Package/$PKG/view-min.js

# Extra assets specific to our module
cp $PKG-index.html DeployHtml/index.html

# Clean-up specific to our module
rm DevHtml/Package/bootstrap/css/bootstrap-responsive.css
rm DevHtml/Package/bootstrap/js/*.js
