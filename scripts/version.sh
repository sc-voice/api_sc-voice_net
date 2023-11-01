#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APP=$DIR/..
set -e

npm run build:dist
VERSION=`$APPDIR/linode/bookworm/version.sh`
sed -i -e "s/APISCV.*/APISCV=$VERSION/" $APPDIR/Dockerfile
