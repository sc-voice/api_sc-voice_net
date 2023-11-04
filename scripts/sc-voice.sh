#!/bin/bash

SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
SCRIPT_DIR=`realpath \`dirname $0\``
APP_DIR=`realpath $SCRIPT_DIR/..`
echo -e "$SCRIPT: USER=`whoami` APP_DIR=$APP_DIR"
LOGDIR="${APP_DIR}/local/logs"
mkdir -p ${LOGDIR}
LOGFILE="${LOGDIR}/scv-%Y%m%d.log"
SCVLOG="${APP_DIR}/local/scv.log" 
INDEXLOCK="${APP_DIR}/local/ebt-data/.git/index.lock"
echo -e "$SCRIPT: logging to SCVLOG and $LOGDIR"
rm -f $SCVLOG

if [ -e $INDEXLOCK ]; then
  echo -e "$SCRIPT: removing $INDEXLOCK" | tee -a ${SCVLOG}
  rm -f $INDEXLOCK
fi

node ${SCRIPT_DIR}/sc-voice.mjs $* 2>&1 | rotatelogs -L ${SCVLOG} -f ${LOGFILE} 86400

tail -100 ${SCVLOG}
echo -e "`date` EXIT sc-voice" | tee -a ${SCVLOG}
