#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

set -e

if [ "$SERVERNAME" == "" ]; then
  read -p "$SCRIPT => Enter server_name (localhost): " SERVERNAME
  if [ "$SERVERNAME" == "" ]; then
      export SERVERNAME=localhost
  fi
fi

echo -e "$SCRIPT: SERVERNAME is $SERVERNAME"
DOCKER_VOLUME=nodejs_scv-local
echo -e "$SCRIPT: linking to $DOCKER_VOLUME as ./local" 
ln -s -f /var/lib/docker/volumes/$DOCKER_VOLUME/_data local

echo -e "$SCRIPT: sudo docker compose up -d"
sudo docker compose up -d

echo -e "$SCRIPT: sudo cat local/scv.log"
sudo cat local/scv.log

URLPATH=scv/play/segment/thig1.1/en/sujato/thig1.1%3A1.1/Amy
echo -e "$SCRIPT: testing localhost:8080..."
curl http://localhost:8080/$URLPATH;
echo
echo -e "$SCRIPT: scv-server docker container is running (OK)"

echo -e "$SCRIPT: testing https://$SERVERNAME..."
curl https://$SERVERNAME/$URLPATH
echo
echo -e "$SCRIPT: reverse proxy => scv-server docker container (OK)"

echo -e "${SCRIPT}: END `date`"
