#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

#set -e

echo -e "$SCRIPT: updating $DIR"
cd $DIR
git pull

$DIR/scv-cron-tasks.sh 

echo -e "${SCRIPT}: END `date`" 
