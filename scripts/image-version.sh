#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APP=$DIR/..
set -e

IMAGE='docker image history scvoice/api_sc-voice_net'
VERSION=`$IMAGE | grep APISCV | sed -e "s/.*=//" | sed -e "s/ .*//"`

if [ "$1" == "--major" ]; then
  echo $VERSION | sed -e 's/\..*//'
elif [ "$1" == "--minor" ]; then
  echo $VERSION | sed -e 's/\.[0-9]*$//'
else
  echo $VERSION
fi
