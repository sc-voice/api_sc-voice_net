#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

if [ "$EMAIL" == "" ]; then
  read -p "$SCRIPT => Enter admin email (required): " EMAIL
  if [ "$EMAIL" == "" ]; then
      echo -e "$SCRIPT: admin email is required (ERROR)"
      exit 1
  fi
fi
echo -e "$SCRIPT: EMAIL is $EMAIL"

if type snap >& /dev/null; then
  echo $SCRIPT: snapd is installed
else
  echo $SCRIPT: installing snapd 
  sudo apt install snapd -y
  sudo snap install core
  sudo snap install hello-world
  hash -r
  hello-world
fi

if type certbot >& /dev/null; then
  echo $SCRIPT: certbot is installed
else
  echo $SCRIPT: installing certbot

  sudo snap install --classic certbot
  sudo ln -s /snap/bin/certbot /usr/bin/certbot
fi

if [ "$SERVERNAME" == "" ]; then
  HOSTNAME=`hostname`
  read -p "$SCRIPT => Enter server_name ($HOSTNAME): " SERVERNAME
  if [ "$SERVERNAME" == "" ]; then
      export SERVERNAME=$HOSTNAME
  fi
fi
echo -e "$SCRIPT: SERVERNAME is $SERVERNAME"

if [ "$SERVERNAME" == "localhost" ]; then
  echo -e "$SCRIPT: setting up temporary SSL certificate"
  CERTDIR=$LOCALDIR/certbot
  mkdir -p $CERTDIR
  certbot \
    --config-dir $CERTDIR \
    --work-dir $CERTDIR \
    --logs-dir $CERTDIR \
    --agree-tos \
    -m $EMAIL \
  certonly --manual
else
  sudo certbot --nginx -d $SERVERNAME --agree-tos -m $EMAIL 
fi

echo -e "${SCRIPT}: END `date`"
