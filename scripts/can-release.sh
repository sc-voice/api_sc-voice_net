#!/bin/bash
DIR=`dirname $0`
APPDIR=$DIR/..

cd $APPDIR
DKRMINOR=`./scripts/image-version.sh --minor`
DKRMAJOR=`echo $1 | sed -e "s/\..*//"`
GITMAJOR=`$APPDIR/linode/bookworm/version.sh --major`
GITMINOR=`$APPDIR/linode/bookworm/version.sh --minor`

echo DKRMINOR=$DKRMINOR DKRMAJOR=$DKRMAJOR
echo GITMINOR=$GITMINOR GITMAJOR=$GITMAJOR

HOSTNAME=`hostname`

if [ `echo $HOSTNAME | grep -i -e "staging"` ]; then
  echo "Staging server => always release"
  exit 0
fi

HOSTNAME=`hostname | grep -i staging`

if [ "$DKRMINOR" == "$GITMINOR" ]; then
  echo "DKRMINOR==GITMINOR => staging+production"
elif (( $DKRMAJOR < $GITMAJOR )); then
  echo "DKRMAJOR<GITMAJOR => staging+production"
else
  echo "DKRMAJOR>GITMAJOR => Release blocked on major version"
  exit 1
fi

exit 0
