#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

set -e

if [ "$ACCESS_KEY_ID" == "" ]; then
  read -p "$SCRIPT => Enter AWS Access Key Id: " ACCESS_KEY_ID
  if [ "$ACCESS_KEY_ID" == "" ]; then
    echo -e "$SCRIPT: ACCESS_KEY_ID is required"
    exit 1
  fi
fi
if [ "$SECRET_ACCESS_KEY" == "" ]; then
  read -p "$SCRIPT => Enter AWS Secret Access Key: " SECRET_ACCESS_KEY
  if [ "$ACCESS_KEY_ID" == "" ]; then
    echo -e "$SCRIPT: SECRET_ACCESS_KEY is required"
    exit 1
  fi
fi

CREDS_DIR=/var/lib/docker/volumes/nodejs_scv-local/_data
if sudo docker volume create nodejs_scv-local; then
  echo -e "$SCRIPT: created Docker volume $CREDS_DIR"
else
  echo -e "$SCRIPT: using existing Docker volume $CREDS_DIR"
fi
sudo chown unroot:unroot $CREDS_DIR
CREDS_FILE=aws-creds.json
echo -e "$SCRIPT: creating $CREDS_FILE"
cat > /tmp/$CREDS_FILE <<CREDS_HEREDOC
{
  "Bucket": "sc-voice-vsm",
  "s3": {
    "apiVersion": "2006-03-01",
    "endpoint": "https://s3.us-west-1.amazonaws.com",
    "region": "us-west-1"
  },
  "polly": {
    "region": "us-west-1",
    "signatureVersion": "v4",
    "apiVersion": "2016-06-10"
  },
  "sayAgain": {
    "Bucket": "say-again.sc-voice"
  },
  "region": "us-west-1",
  "secretAccessKey": "$SECRET_ACCESS_KEY",
  "accessKeyId": "$ACCESS_KEY_ID"
}
CREDS_HEREDOC
sudo mv /tmp/$CREDS_FILE $CREDS_DIR/$CREDS_FILE
sudo chown unroot:unroot $CREDS_DIR/$CREDS_FILE

echo -e "${SCRIPT}: END `date`"
