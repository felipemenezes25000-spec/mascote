#!/bin/bash
echo kali | sudo -S tee /etc/modprobe.d/blacklist-rtl8xxxu.conf <<EOF
blacklist rtl8xxxu
EOF
cat /etc/modprobe.d/blacklist-rtl8xxxu.conf
KVER=$(uname -r)
KSRC=/lib/modules/$KVER/build
cd /tmp/8188fu
make clean
make -j$(nproc) KVER=$KVER KSRC=$KSRC
echo kali | sudo -S make install KVER=$KVER KSRC=$KSRC
echo kali | sudo -S depmod -a
