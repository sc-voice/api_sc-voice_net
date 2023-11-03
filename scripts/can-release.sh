#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..

cd $APPDIR
DKRMINOR=`scripts/image-version.sh --minor`
DKRMAJOR=`echo $DKRMINOR | sed -e "s/\..*$//"`
GITMAJOR=`scripts/git-version.sh --major`
GITMINOR=`scripts/git-version.sh --minor`

echo DKRMINOR=$DKRMINOR DKRMAJOR=$DKRMAJOR
echo GITMINOR=$GITMINOR GITMAJOR=$GITMAJOR

HOSTNAME=`hostname`

if [ `echo $HOSTNAME | grep -i -e "staging"` ]; then
  echo "Staging server => always release"
  exit 0
fi

HOSTNAME=`hostname | grep -i staging`

if [ "$DKRMINOR" == "$GITMINOR" ]; then
  echo "DKRMINOR==GITMINOR => release (content only))"
elif (( $DKRMAJOR < $GITMAJOR )); then
  echo "DKRMAJOR<GITMAJOR => release (software+content)"
else
  echo "DKRMAJOR>GITMAJOR => release blocked on major version"
  exit 1
fi

exit 0
