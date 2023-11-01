#!/bin/bash
DIR=`dirname $0`
APPDIR=`realpath $DIR/../..`
VERSION=`cat $APPDIR/package.json\
| grep version\
| head -1\
| sed -e 's/.*: "//'\
| sed -e 's/".*//'`

if [ "$1" == "--major" ]; then
  echo $VERSION | sed -e 's/\..*//'
else
  echo $VERSION
fi
