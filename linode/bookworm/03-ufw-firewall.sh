#!/bin/bash
DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`

set -e

echo $SCRIPT: BEGIN `date`

echo $SCRIPT: configure port 80 HTTP
sudo ufw allow proto tcp from any to any port 80

echo $SCRIPT: configure port 443 SSL
sudo ufw allow proto tcp from any to any port 443

echo $SCRIPT: configure port 8000 HTTP for NGINX verification
sudo ufw allow proto tcp from any to any port 8000

echo $SCRIPT: Firewall status
sudo ufw status verbose numbered

echo $SCRIPT: END `date`
