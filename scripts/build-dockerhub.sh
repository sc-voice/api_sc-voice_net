#!/bin/bash
DIR=`dirname $0`; 
pushd $DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

REPO=api_sc-voice_net

echo -e "$SCRIPT: removing local docker images"
docker image ls $REPO 
docker image ls $REPO -q | xargs docker image rm -f  
docker image ls scvoice/$REPO 
docker image ls scvoice/$REPO -q | xargs docker image rm -f  

echo -e "$SCRIPT: building new local image for Dockerhub"
npm run build:docker || { echo -e "$SCRIPT: ERROR build failed, not pushing"; exit 1; }
docker image ls

echo -e "$SCRIPT: pushing new image to Dockerhub"
docker login -u $DKR_USER -p $DKR_PWD
docker image push -a scvoice/$REPO || { echo -e "$SCRIPT: ERROR push failed, not pruning"; exit 1; }

# keep the newest $KEEP version tags on Dockerhub; latest is never deleted
KEEP=5
echo -e "$SCRIPT: pruning Dockerhub, keeping newest $KEEP version tags"
TOKEN=$(curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'${DKR_USER}'", "password": "'${DKR_PWD}'"}' https://hub.docker.com/v2/users/login/ | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "$SCRIPT: ERROR cannot log in to Dockerhub, skipping prune"
  exit 1
fi
VERSION_TAGS=$(curl -s -H "Authorization: JWT ${TOKEN}" "https://hub.docker.com/v2/repositories/${DKR_USER}/${REPO}/tags/?page_size=10000" \
  | jq -r '.results[].name' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V)
OLD_TAGS=$(echo "$VERSION_TAGS" | head -n -$KEEP)
for TAG in $OLD_TAGS
do
  echo -e "$SCRIPT: deleting old version tag $TAG"
  curl -s -f -X DELETE -H "Authorization: JWT ${TOKEN}" "https://hub.docker.com/v2/repositories/${DKR_USER}/${REPO}/tags/${TAG}/" \
    || echo -e "$SCRIPT: WARNING could not delete $TAG"
done

echo -e "${SCRIPT}: END `date`"
