#!/bin/bash
DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APPDIR=`realpath $DIR/../..`
LOCALDIR=$APPDIR/local

echo $SCRIPT: BEGIN `date`

if [ "$SERVERNAME" == "" ]; then
  read -p "$SCRIPT => Enter server_name (localhost): " SERVERNAME
  if [ "$SERVERNAME" == "" ]; then
      export SERVERNAME=localhost
  fi
fi
echo -e "$SCRIPT: SERVERNAME is $SERVERNAME"

echo $SCRIPT: END `date`
