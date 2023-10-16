#!/bin/bash
DIR=`dirname $0`; 
pushd $DIR/..
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
echo -e "${SCRIPT}: BEGIN `date`"

# get token to be able to talk to Docker Hub
TOKEN=$(curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'${DKR_USER}'", "password": "'${DKR_PWD}'"}' https://hub.docker.com/v2/users/login/ | jq -r .token)
REPO=api_sc-voice_net
AGO="8 hours ago"


IMAGE_TAGS=$(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/${DKR_USER}/${REPO}/tags/?page_size=10000 | jq -r '.results|.[]|.name')

echo -e "$SCRIPT: scanning DockerHub ${DKR_USER}/${REPO}"
for TAG in ${IMAGE_TAGS}
do
  IMAGE="${DKR_USER}/${REPO}:${TAG}"
  UPDATED=$(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/${DKR_USER}/${REPO}/tags/${TAG}/?page_size=10000 | jq -r '.last_updated')
  UPDATEDSECS=$(date --date "$UPDATED" +'%s')
  AGOSECS=$(date --date "$AGO" +'%s')
  if [ $UPDATEDSECS -gt $AGOSECS ]; then
    echo -e "$SCRIPT: keeping current image $IMAGE ${UPDATEDSECS}"
  else 
    echo -e "$SCRIPT: deleting old image $IMAGE ${UPDATEDSECS}"
    curl -s  -X DELETE  -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/${DKR_USER}/${REPO}/tags/${TAG}/
  fi
done

echo -e "$SCRIPT: removing local docker images"
docker image ls $REPO 
docker image ls $REPO -q | xargs docker image rm -f  
docker image ls scvoice/$REPO 
docker image ls scvoice/$REPO -q | xargs docker image rm -f  

echo -e "$SCRIPT: building new local image for Dockerhub"
npm run build:docker
docker image ls

echo -e "$SCRIPT: pushing new image to Dockerhub"
docker login -u $DKR_USER -p $DKR_PWD
docker image push -a scvoice/$REPO

echo -e "${SCRIPT}: END `date`"
