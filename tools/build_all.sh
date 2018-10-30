#!/bin/bash -e

rm -rf DevEpic/
ln -s ../html DevEpic

./make_one_dev.sh

./make_min.sh
