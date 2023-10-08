#!/bin/bash
DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`

set -e

echo $SCRIPT: BEGIN `date`

# https://nginx.org/en/linux_packages.html#Debian

echo $SCRIPT: Install the prerequisites:
sudo apt install curl gnupg2 ca-certificates lsb-release debian-archive-keyring

echo $SCRIPT:  Import an official nginx signing key so apt could verify the packages authenticity. Fetch the key:
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

echo $SCRIPT: Verify that the downloaded file contains the proper key:
echo $SCRIPT: The output should contain the full fingerprint:
echo $SCRIPT:    pub   rsa2048 2011-08-19 [SC] [expires: 2024-06-14]
echo $SCRIPT:          573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62
echo $SCRIPT:    uid                      nginx signing key "<signing-key@nginx.com>"

gpg --dry-run --quiet --import --import-options import-show \
  /usr/share/keyrings/nginx-archive-keyring.gpg \
  | tee /tmp/nginxkey

if grep 573BFD6B3D8FBC641079A6ABABF5BD827BD9BF62 /tmp/nginxkey; then
  echo $SCRIPT: nginx package is valid
else
  echo $SCRIPT: REMOVE UNTRUSTED NGINX PACKAGE 
  echo $SCRIPT: /usr/share/keyrings/nginx-archive-keyring.gpg
  exit 1
fi

echo $SCRIPT: Set up the apt repository for stable nginx packages
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
http://nginx.org/packages/debian `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list

# If you would like to use mainline nginx packages, run the following command instead:
#   echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
#   http://nginx.org/packages/mainline/debian `lsb_release -cs` nginx" \
#      | sudo tee /etc/apt/sources.list.d/nginx.list

echo $SCRIPT: Set up repository pinning to prefer our packages over distribution-provided ones:
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
    | sudo tee /etc/apt/preferences.d/99nginx

echo $SCRIPT: installing nginx
sudo apt update
sudo apt install nginx

echo $SCRIPT: END `date`
