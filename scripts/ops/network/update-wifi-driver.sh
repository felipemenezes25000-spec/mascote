#!/bin/bash
# Atualiza firmware/pacotes e tenta driver rtl8188fu para RTL8188FTV (0bda:f179)
# Repo morrownr/8188fu-20220816 nao existe mais; usa lwfinger/rtl8188fu como fallback.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
KVER="$(uname -r)"
KSRC="/lib/modules/${KVER}/build"
WORKDIR="/tmp/8188fu"
TAR="/tmp/rtl8188fu.tar"
REPO="https://github.com/lwfinger/rtl8188fu.git"

echo "=== Diagnostico ==="
uname -r
lsusb | grep -i realtek || true
iw dev 2>/dev/null || true
lsmod | grep rtl || true
dmesg | grep -iE 'rtl8xxxu|8188|Failed power' | tail -10 || true

echo "=== Pacotes ==="
sudo apt-get update
sudo apt-get install -y build-essential dkms git firmware-realtek bc linux-headers-"$KVER" || \
  sudo apt-get install -y linux-headers-amd64 linux-image-amd64

if [[ ! -d "$KSRC" ]]; then
  echo "ERRO: headers ausentes em $KSRC. Instale linux-headers-$(uname -r) e reinicie."
  exit 1
fi

echo "=== Fonte do driver ==="
sudo rm -rf "$WORKDIR"
if git clone --depth 1 "$REPO" "$WORKDIR" 2>/dev/null; then
  echo "Clonado de $REPO"
elif [[ -f "$TAR" ]]; then
  mkdir -p "$WORKDIR" && tar -xf "$TAR" -C "$WORKDIR"
  echo "Extraido de $TAR"
else
  echo "Sem rede e sem $TAR. Copie rtl8188fu.tar para /tmp no host."
  exit 1
fi

if ! grep -q 'ccflags-y' "$WORKDIR/Makefile"; then
  printf '\nccflags-y += -I$(src)/include -I$(src)/hal/phydm\n' | sudo tee -a "$WORKDIR/Makefile" >/dev/null
fi

echo "=== Compilar (pode falhar em kernels muito novos, ex. 6.19+) ==="
cd "$WORKDIR"
make clean || true
if ! make -j"$(nproc)" KVER="$KVER" KSRC="$KSRC"; then
  echo "AVISO: compilacao falhou neste kernel. Mantendo rtl8xxxu + firmware-realtek."
  echo "Reinicie a VM e reconecte o USB no VirtualBox se vir 'Failed power on'."
  exit 2
fi

sudo make install KVER="$KVER" KSRC="$KSRC"
sudo depmod -a
echo "blacklist rtl8xxxu" | sudo tee /etc/modprobe.d/blacklist-rtl8xxxu.conf >/dev/null

echo "=== Driver instalado. REINICIE antes de trocar modulos. ==="
echo "Depois do reboot:"
echo "  sudo modprobe rtl8188fu"
echo "  iw dev"
