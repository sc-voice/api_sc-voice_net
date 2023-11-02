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
elif [ "$1" == "--minor" ]; then
  echo $VERSION | sed -e 's/\.[0-9]*$//'
else
  echo $VERSION
fi
