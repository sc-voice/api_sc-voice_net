#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APP=$DIR/..
set -e

VERSION=`$DIR/git-version.sh`
echo Dockerfile $VERSION
sed -e "s/APISCV_VERSION.*/APISCV_VERSION=$VERSION/" -i.bak $APPDIR/Dockerfile
git add Dockerfile 
git commit -m "Dockerfile APISCV_VERSION=$VERSION"

npm run build:dist
