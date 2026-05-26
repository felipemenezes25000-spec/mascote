#!/bin/bash
set -euo pipefail
KVER_TARGET="${KVER_TARGET:-6.19.14+kali-amd64}"
KSRC="/usr/src/linux-headers-${KVER_TARGET}"
WORKDIR="/tmp/8188fu"
echo "blacklist rtl8xxxu" | sudo tee /etc/modprobe.d/blacklist-rtl8xxxu.conf >/dev/null
if ! grep -q ccflags-y "$WORKDIR/Makefile" 2>/dev/null; then
  printf '\nccflags-y += -I$(src)/include -I$(src)/hal/phydm\n' | sudo tee -a "$WORKDIR/Makefile" >/dev/null
fi
cd "$WORKDIR"
make clean || true
make -j"$(nproc)" KVER="$KVER_TARGET" KSRC="$KSRC"
sudo make install KVER="$KVER_TARGET" KSRC="$KSRC"
sudo depmod -a "$KVER_TARGET"
