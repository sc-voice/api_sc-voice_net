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

echo -e "$SCRIPT: checking Dockerhub for scvoice/api.sc-voice.net:latest..."
VERLOCAL=`sudo /usr/bin/docker image ls scvoice/api.sc-voice.net:latest -q`
sudo /usr/bin/docker pull -q scvoice/api.sc-voice.net:latest
VERDOCKERHUB=`sudo /usr/bin/docker image ls scvoice/api.sc-voice.net:latest -q`
if [ "$VERLOCAL" == "$VERDOCKERHUB" ]; then
  echo -e "$SCRIPT: scvoice/api.sc-voice.net:latest $VERLOCAL is latest"
else
  echo -e "$SCRIPT: scvoice/api.sc-voice.net:latest updated $VERLOCAL => $VERDOCKERHUB"
  echo -e "$SCRIPT: shutting down api.sc-voice.net Docker container..."
  sudo docker compose down
  echo -e "$SCRIPT: starting updated api.sc-voice.net Docker container..."
  sudo docker compose up -d
fi

if sudo docker ps | grep api.sc-voice.net; then
  echo -e "$SCRIPT: api.sc-voice.net Docker container is running"
else
  echo -e "$SCRIPT: WARNING: api.sc-voice.net Docker container not found (RESTARTING)..."
  sudo docker compose up -d
fi

echo -e "${SCRIPT}: END `date`"
