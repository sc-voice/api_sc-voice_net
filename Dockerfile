# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim
LABEL maintainer="karl@firepick.org"
RUN apt-get update && apt-get upgrade -y
SHELL [ "/bin/bash", "-c" ]
ENV INSTALL="apt-get --no-install-recommends install -y "

RUN <<TOOLS
  $INSTALL sudo
  $INSTALL procps   # ps commmand
  $INSTALL ripgrep  # faster than grep
  $INSTALL git
  $INSTALL apache2-utils  # rotatelogs
  git config --global pull.rebase true 
  apt-get install -y --reinstall ca-certificates
  $INSTALL vim
TOOLS

RUN <<AUDIO
  $INSTALL opus-tools
  $INSTALL ffmpeg
AUDIO

ENV USER=node
USER $USER
ENV APPDIR=/home/$USER/api_sc-voice_net/
WORKDIR $APPDIR
COPY --link --chown=$USER package* $APPDIR
RUN <<SCV_SERVER
  mkdir -p $APPDIR/local
  cd $APPDIR
  npm install --production
  echo "cd $APPDIR" >> ~/.bashrc
SCV_SERVER
COPY --link --chown=$USER . $APPDIR

# Start application server
ENV APISCV_VERSION=29.0.30
ENV START=start:8080
EXPOSE 8080
CMD npm run $START
