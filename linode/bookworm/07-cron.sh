#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

set -e

crontab -l > /tmp/mycron
if grep scv-cron /tmp/mycron; then
  echo -e "$SCRIPT: scv-cron.sh job already configured"
  echo -e "${SCRIPT}: END `date`"
  exit
fi

echo -e "$SCRIPT: adding scv-cron.sh to cron "
cat <<CRON_HEREDOC >> /tmp/mycron
0 4,12,20 * * * /home/unroot/scv-server/linode/bullseye/scv-cron.sh >> /home/unroot/scv-cron.log 2>&1
CRON_HEREDOC

crontab /tmp/mycron

echo -e "${SCRIPT}: END `date`"
