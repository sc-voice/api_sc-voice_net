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

if type certbot >& /dev/null; then
  echo $SCRIPT: certbot is installed
else
  echo $SCRIPT: installing certbot
  sudo apt-get install -y certbot
  sudo apt-get install python3-certbot-nginx
fi


if [ "$SERVERNAME" == "" ]; then
  read -p "$SCRIPT => Enter server_name (localhost): " SERVERNAME
  if [ "$SERVERNAME" == "" ]; then
      export SERVERNAME=localhost
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
  echo -e "$SCRIPT: To renew SSL certificate automatically,"
  echo -e "$SCRIPT: run \"crontab -e\" and add following line"
  echo -e "0 12 * * * sudo /usr/bin/certbot renew --quiet"
fi

echo -e "${SCRIPT}: END `date`"
