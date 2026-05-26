#!/bin/bash
# Auditoria Wi-Fi Fluxion - Kali 2026.1
# Uso: sudo bash ~/fluxion_audit.sh [prepare|check|run]

set -euo pipefail

LOG="/home/kali/fluxion_audit.log"
FLUXION_DIR="/home/kali/fluxion"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Execute com: sudo bash $0 $*"
    exit 1
  fi
}

prepare() {
  require_root prepare
  log "=== PREPARE: dependencias e Fluxion ==="

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y | tee -a "$LOG"
  apt-get install -y \
    git hostapd dnsmasq lighttpd php-cgi php-cli curl xterm \
    aircrack-ng mdk4 macchanger openssl nmap \
    bully cowpatty hashcat hcxtools hcxdumptool reaver \
    | tee -a "$LOG"

  if [[ ! -d "$FLUXION_DIR/.git" ]]; then
    log "Clonando Fluxion..."
    git clone https://github.com/FluxionNetwork/fluxion.git "$FLUXION_DIR" | tee -a "$LOG"
  else
    log "Atualizando Fluxion..."
    git -C "$FLUXION_DIR" pull --ff-only | tee -a "$LOG" || true
  fi

  chmod +x "$FLUXION_DIR/fluxion.sh"
  chown -R kali:kali "$FLUXION_DIR" /home/kali/fluxion_audit.log 2>/dev/null || true
  log "Prepare concluido."
}

check_wifi() {
  require_root check
  log "=== CHECK: interface Wi-Fi e AP mode ==="

  echo
  echo "--- ip link / iw dev ---"
  ip link show | tee -a "$LOG"
  iw dev 2>&1 | tee -a "$LOG" || true

  echo
  echo "--- USB Realtek ---"
  lsusb | grep -i realtek | tee -a "$LOG" || log "AVISO: adaptador Realtek nao visto no lsusb"

  IFACE="$(iw dev 2>/dev/null | awk '/Interface/{print $2; exit}')"
  if [[ -z "${IFACE:-}" ]]; then
    log "ERRO: nenhuma interface wireless (wlan0). Repasse USB no VirtualBox: Dispositivos > USB > Realtek"
    echo
    echo "Tentando recarregar driver rtl8xxxu..."
    modprobe -r rtl8xxxu 2>/dev/null || true
    modprobe rtl8xxxu 2>/dev/null || true
    sleep 2
    IFACE="$(iw dev 2>/dev/null | awk '/Interface/{print $2; exit}')"
    if [[ -z "${IFACE:-}" ]]; then
      log "Ainda sem wlan0. Acao manual necessaria."
      return 1
    fi
  fi

  log "Interface detectada: $IFACE"

  echo
  echo "--- AP mode (iw list) ---"
  if iw list | grep -A 10 "Supported interface modes" | tee -a "$LOG" | grep -q "^\s*\* AP"; then
    log "AP mode: SUPORTADO"
  else
    log "AVISO: AP mode pode nao estar disponivel - Fluxion pode falhar"
  fi

  echo
  echo "--- Parando conflitos de rede ---"
  airmon-ng check kill 2>&1 | tee -a "$LOG" || true
  systemctl stop NetworkManager 2>/dev/null || true
  systemctl stop wpa_supplicant 2>/dev/null || true

  log "Check concluido. Interface pronta: $IFACE"
}

run_fluxion() {
  require_root run
  log "=== RUN: iniciando Fluxion (interativo) ==="

  if [[ ! -x "$FLUXION_DIR/fluxion.sh" ]]; then
    log "Fluxion nao instalado. Rodando prepare..."
    prepare
  fi

  check_wifi || {
    log "Abortando: wlan0 ausente."
    exit 1
  }

  log "Iniciando Fluxion TUI..."
  echo
  echo "No menu Fluxion escolha:"
  echo "  1) Idioma"
  echo "  2) Interface: wlan0"
  echo "  3) Canal da rede alvo (ex: 1 para ACOMACSP)"
  echo "  4) Rede alvo (ESSID)"
  echo "  5) Ataque: Captive Portal"
  echo

  cd "$FLUXION_DIR"
  exec ./fluxion.sh
}

case "${1:-prepare}" in
  prepare) prepare ;;
  check)   check_wifi ;;
  run)     run_fluxion ;;
  all)
    prepare
    check_wifi
    run_fluxion
    ;;
  *)
    echo "Uso: sudo bash $0 {prepare|check|run|all}"
    exit 1
    ;;
esac
