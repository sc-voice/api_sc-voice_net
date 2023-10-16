#!/bin/bash
DIR=`dirname $0`
VER=`node $DIR/version.cjs`
echo api_sc-voice_net-$VER
DOCKER_BUILDKIT=1 docker build .\
  -t api_sc-voice_net\
  -t scvoice/api_sc-voice_net:$VER\
  -t scvoice/api_sc-voice_net:latest
