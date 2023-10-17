#!/bin/bash
DIR=`dirname $0`; 
APPDIR=`realpath $DIR/../..`
LOCALDIR=`realpath $APPDIR/local`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

set -e

if crontab -l > /tmp/mycron ; then
  echo -e $SCRIPT: saving existing crontab file
fi

if grep scv-cron /tmp/mycron; then
  echo -e "$SCRIPT: scv-cron.sh job already configured"
else
echo -e "$SCRIPT: adding scv-cron.sh to cron "
cat <<SCV_HEREDOC >> /tmp/mycron
0 4,12,20 * * * /home/unroot/api_sc-voice_net/linode/bookworm/scv-cron.sh >> /home/unroot/scv-cron.log 2>&1
SCV_HEREDOC
fi

crontab /tmp/mycron

echo -e "${SCRIPT}: END `date`"
