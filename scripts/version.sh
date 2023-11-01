#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APP=$DIR/..
set -e

npm run build:dist
VERSION=`$APPDIR/linode/bookworm/version.sh`
echo Dockerfile $VERSION
sed -e "s/APISCV_VERSION.*/APISCV_VERSION=$VERSION/" -i $APPDIR/Dockerfile
