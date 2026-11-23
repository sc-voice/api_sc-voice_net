#!/bin/bash
# Upgrade nginx on an existing Debian Bookworm server.
# Use 01-install-nginx.sh for a new server; this script is for hosts where nginx is already installed.

SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
KEYRING=/usr/share/keyrings/nginx-archive-keyring.gpg
NGINX_KEY_URL=https://nginx.org/keys/nginx_signing.key
# nginx.org signing key used for packages and repositories (2024-05-29)
NGINX_KEY_FPR=8540A6F18833A80E9C1653A42FD21310B49F6B46

set -e

echo $SCRIPT: BEGIN `date`

TMPDIR=`mktemp -d`
trap "rm -rf $TMPDIR" EXIT

echo $SCRIPT: check nginx.org apt source
if ! grep -q "nginx.org/packages/debian" /etc/apt/sources.list.d/nginx.list 2>/dev/null; then
  echo $SCRIPT: ERROR /etc/apt/sources.list.d/nginx.list does not point to nginx.org
  echo $SCRIPT: Run 01-install-nginx.sh first, or add the nginx.org source
  exit 1
fi

echo $SCRIPT: fetch nginx signing key
curl -sSL $NGINX_KEY_URL -o $TMPDIR/nginx_signing.key

echo $SCRIPT: verify key fingerprint
gpg --homedir $TMPDIR --batch --quiet --import $TMPDIR/nginx_signing.key
if ! gpg --homedir $TMPDIR --batch --with-colons --fingerprint 2>/dev/null \
    | grep -q "^fpr:::::::::$NGINX_KEY_FPR:"; then
  echo $SCRIPT: ERROR fingerprint $NGINX_KEY_FPR not found in $NGINX_KEY_URL
  exit 1
fi

echo $SCRIPT: update keyring $KEYRING
gpg --dearmor < $TMPDIR/nginx_signing.key | sudo tee $KEYRING >/dev/null

echo $SCRIPT: update package index
sudo apt update

echo $SCRIPT: upgrade nginx
sudo apt install -y --only-upgrade nginx

echo $SCRIPT: installed version
nginx -v
sudo nginx -t

echo $SCRIPT: END `date`
