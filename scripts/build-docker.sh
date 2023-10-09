#!/bin/bash
DIR=`dirname $0`
VER=`node $DIR/version.cjs`
echo api.sc-voice.net-$VER
DOCKER_BUILDKIT=1 docker build .\
  -t api.sc-voice.net\
  -t scvoice/api.sc-voice.net:$VER\
  -t scvoice/api.sc-voice.net:latest
