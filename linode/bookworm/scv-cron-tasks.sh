#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
CONTAINER=api_sc-voice_net
echo -e "${SCRIPT}: BEGIN `date`"

#set -e

echo -e "$SCRIPT: updating SSL certificate"
sudo /usr/bin/certbot renew --quiet 

echo -e "$SCRIPT: docker system prune"
sudo /usr/bin/docker system prune -f

VERLOCAL=`sudo /usr/bin/docker image ls scvoice/$CONTAINER:latest -q`

GITVERSION=`$APPDIR/scripts/git-version.sh`
$APPDIR/scripts/can-release.sh; RC=$?
if [ "$RC" == "0" ]; then
  echo -e "$SCRIPT: release $GITVERSION in progress..."
  echo -e "$SCRIPT: checking Dockerhub for scvoice/$CONTAINER:latest..."
  sudo /usr/bin/docker pull -q scvoice/$CONTAINER:latest
else
  echo -e "$SCRIPT: release $GITVERSION blocked..."
fi

VERDOCKERHUB=`sudo /usr/bin/docker image ls scvoice/$CONTAINER:latest -q`
if [ "$VERLOCAL" == "$VERDOCKERHUB" ]; then
  echo -e "$SCRIPT: local scvoice/$CONTAINER:latest $VERLOCAL is unchanged"
else
  echo -e "$SCRIPT: local scvoice/$CONTAINER:latest updated $VERLOCAL=>$VERDOCKERHUB"
  echo -e "$SCRIPT: shutting down $CONTAINER Docker container..."
  sudo docker compose down
  echo -e "$SCRIPT: starting updated $CONTAINER Docker container..."
  sudo docker compose up -d
fi

if sudo docker ps | grep $CONTAINER; then
  echo -e "$SCRIPT: $CONTAINER Docker container is running"
else
  echo -e "$SCRIPT: WARNING: $CONTAINER Docker container not found (RESTARTING)..."
  sudo docker compose up -d
fi

echo -e "${SCRIPT}: END `date`"
