#!/bin/bash
DIR=`dirname $0`; 
pushd $DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

EMAIL=$1
if [ "$EMAIL" == "" ]; then
  echo $SCRIPT: expected email address
  exit 1
fi

if type certbot >& /dev/null; then
  echo $SCRIPT: certbot is installed
else
  echo $SCRIPT: installing certbot
  sudo apt-get install -y certbot
fi

CERTDIR=./local/certbot
mkdir -p $CERTDIR
certbot \
  --config-dir $CERTDIR \
  --work-dir $CERTDIR \
  --logs-dir $CERTDIR \
  --agree-tos \
  -m $EMAIL \
  certonly --manual

echo -e "${SCRIPT}: END `date`"
