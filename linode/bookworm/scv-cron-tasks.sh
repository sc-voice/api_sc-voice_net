#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

#set -e

echo -e "$SCRIPT: updating SSL certificate"
sudo /usr/bin/certbot renew --quiet 

echo -e "$SCRIPT: docker system prune"
sudo /usr/bin/docker system prune -f

echo -e "$SCRIPT: checking Dockerhub for scvoice/scv-server:latest..."
VERLOCAL=`sudo /usr/bin/docker image ls scvoice/scv-server:latest -q`
sudo /usr/bin/docker pull -q scvoice/scv-server:latest
VERDOCKERHUB=`sudo /usr/bin/docker image ls scvoice/scv-server:latest -q`
if [ "$VERLOCAL" == "$VERDOCKERHUB" ]; then
  echo -e "$SCRIPT: scvoice/scv-server:latest $VERLOCAL is latest"
else
  echo -e "$SCRIPT: scvoice/scv-server:latest updated $VERLOCAL => $VERDOCKERHUB"
  echo -e "$SCRIPT: shutting down scv-server Docker container..."
  sudo docker compose down
  echo -e "$SCRIPT: starting updated scv-server Docker container..."
  sudo docker compose up -d
fi

if sudo docker ps | grep scv-server; then
  echo -e "$SCRIPT: scv-server Docker container is running"
else
  echo -e "$SCRIPT: WARNING: scv-server Docker container not found (RESTARTING)..."
  sudo docker compose up -d
fi

echo -e "${SCRIPT}: END `date`"
