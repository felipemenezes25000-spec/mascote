# scripts/

Automação do repositório Mascote: **QA do app** (raiz desta pasta) e **operações locais** (`ops/`).

## Organização (padrão ITIL)

| Área | Pasta | Quando usar |
|---|---|---|
| QA / smoke Android | `scripts/` (`android-smoke.ps1`, `maestro/`) | Validar build e fluxos do app |
| Blender / pipeline 3D | `scripts/blender/` | Shape keys e geração de GLBs |
| VM / rede / drivers | [`scripts/ops/`](ops/README.md) | Kali, VirtualBox, Wi-Fi — **não** faz parte do produto |

**Regras:** scripts novos em `kebab-case`; nada solto na raiz do repo; artefatos grandes em `scripts/ops/network/artifacts/` (gitignored).

---

## TL;DR (QA Android)

```powershell
# 1. Smoke test só com screenshots (não precisa Maestro)
pwsh -File scripts/android-smoke.ps1

# 2. Smoke test completo (com asserções, requer Maestro)
pwsh -File scripts/android-smoke.ps1 -Maestro
```

Resultado vai em `test-screenshots/android-<timestamp>/` com `report.md` listando todas as capturas.

---

## Conteúdo

| Arquivo | O que faz |
|---|---|
| `android-smoke.ps1` | Valida SDK → sobe AVD → garante Expo no ar → instala app via `expo --android` → captura screenshots em 5 pontos. Falha rápido com mensagens acionáveis. |
| `maestro/smoke.yaml` | Fluxo declarativo (Maestro) auxiliar para `android-smoke.ps1`. Flows canônicos do app ficam em `app/mobile/.maestro/`. |
| `maestro/premium-onboarding.yaml` | Rascunho/experimento; preferir flows em `app/mobile/.maestro/`. |

---

## Pré-requisitos

### Sistema

- **Windows 10/11**
- **PowerShell 5+** (built-in) ou **PowerShell 7** (`pwsh`)
- **Node 20+** (para Expo)
- **Android Studio** instalado (qualquer versão recente — usamos só o JBR + GUI fallback)

### Android SDK

O script espera o SDK em `~\AppData\Local\Android\Sdk`. Se não estiver lá, define `$env:ANDROID_HOME` apontando pro path real antes de rodar.

**Componentes mínimos:**

- `platform-tools` (contém `adb.exe`)
- `emulator`
- `platforms;android-33`
- `system-images;android-33;google_apis_playstore;x86_64`
- 1 AVD criado (`Pixel_5_API_33` é o default; o script cria se não existir)

Instalar via Android Studio:

```
Tools → SDK Manager → marcar componentes → Apply (espera ~1GB download)
Tools → AVD Manager → Create Virtual Device → Pixel 5 → API 33 → Finish
```

Instalar via CLI (se o `sdkmanager` resolver o repo remoto — **ver troubleshooting Avast abaixo**):

```powershell
# Depois de baixar e extrair commandlinetools-win-*.zip:
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses  # aceitar 10
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" `
    "platform-tools" "platforms;android-33" "emulator" `
    "system-images;android-33;google_apis_playstore;x86_64"
```

### Maestro (opcional, só pra `-Maestro`)

Maestro = ferramenta YAML pra testes E2E mobile cross-platform.

```powershell
# Windows nativo
iex (iwr https://get.maestro.mobile.dev -UseBasicParsing).Content

# Ou WSL/git-bash
curl -Ls https://get.maestro.mobile.dev | bash
```

Verificar: `maestro --version`

---

## Como rodar

### Smoke com screenshots (~3min)

```powershell
cd C:\Users\Felipe\Documents\mascote
pwsh -File scripts/android-smoke.ps1
```

O script vai:

1. ✓ Validar SDK + adb + emulator + JBR
2. ✓ Listar AVDs; criar `Pixel_5_API_33` se não existir
3. ✓ Iniciar emulador (até 3min de boot)
4. ✓ Garantir Expo dev server no ar (sobe em `--offline` se faltar)
5. ✓ `adb reverse tcp:8081` pro emulador ver o Metro do host
6. ✓ `npx expo start --android` instala + abre o app
7. ✓ Captura screenshots em `test-screenshots/android-<timestamp>/`
8. ✓ Gera `report.md` listando as imagens

### Smoke completo com Maestro (~5min)

```powershell
pwsh -File scripts/android-smoke.ps1 -Maestro
```

O Maestro vai:

1. Apertar "Começar" → preencher "Felipe" → "Continuar"
2. Avançar 5 telas de onboarding clicando "Continuar"/"Próximo"/"Permitir"
3. Abrir tab "Conversar" → enviar 3 mensagens (greet, ansiedade, hábito)
4. Voltar pra home → check-in (4 passos)
5. Tentar uma missão se houver botão "Bora"
6. **Safety:** digitar "estou pensando em me machucar" → assertVisible "188" (CVV)

Cada passo grava uma screenshot.

### Pular boot (emulador já aberto)

Se você já abriu pelo Android Studio:

```powershell
pwsh -File scripts/android-smoke.ps1 -SkipBoot
```

### AVD customizado

```powershell
pwsh -File scripts/android-smoke.ps1 -AvdName Pixel_6_Pro_API_34
```

---

## Troubleshooting

### ❌ `sdkmanager` fica em "Computing updates…" / "Failed to find package"

Causa: **Avast (ou outro AV) intercepta o handshake TLS com `dl.google.com`** e o Java não confia no cert do AV. Detectamos isso explicitamente na primeira tentativa de QA.

3 soluções na ordem:

**A. Use o SDK Manager do Android Studio** (GUI). A rota de download do Studio usa um download manager próprio que costuma passar pelo AV sem quebrar.

**B. Desligue HTTPS Scanning do Avast temporariamente:**

```
Avast → Settings → Protection → Core Shields →
Web Shield → Configure shield settings →
Enable HTTPS scanning: OFF
```

Rode o `sdkmanager`, depois ligue de novo. Tempo total ~10min.

**C. Importe o cert do Avast no Java keystore** (avançado):

```powershell
# Exportar cert do Avast
$cert = "C:\ProgramData\Avast\Setup\avastssl.cer"
# Importar pro keystore do JBR
& "$env:JAVA_HOME\bin\keytool.exe" -importcert -trustcacerts `
    -alias avast -file $cert `
    -keystore "$env:JAVA_HOME\lib\security\cacerts" `
    -storepass changeit -noprompt
```

### ❌ Emulador não dá boot em 3min

Causa comum: VT-x / Hyper-V conflito, ou GPU acelerada com driver problemático.

```powershell
# Listar HAXM (Intel) ou WHPX (Microsoft hypervisor)
sc query intelhaxm
bcdedit /enum | findstr hypervisorlaunchtype

# Forçar software rendering (mais lento, mas funciona)
& $env:ANDROID_HOME\emulator\emulator.exe -avd Pixel_5_API_33 -gpu swiftshader_indirect
```

### ❌ "App não abriu" mas o emulador subiu

```powershell
# Verificar se Metro está alcançável dentro do emulador
adb shell curl -s http://10.0.2.2:8081/status
# 10.0.2.2 é o gateway que o emulador usa pro host
adb reverse tcp:8081 tcp:8081  # alternativa

# Ver foreground activity
adb shell dumpsys window | findstr mCurrentFocus
```

Se o Metro está ok mas o Expo Go não abriu o bundle:

```powershell
# Abrir Expo Go manualmente
adb shell am start -n host.exp.exponent/host.exp.exponent.MainActivity
# Depois "Manually enter URL" e cole: exp://10.0.2.2:8081
```

### ❌ Maestro não acha elemento

Maestro casa por texto visível, e o RN Web rendera DIVs com texto literal. Se um `tapOn: "Continuar"` falhar:

```yaml
# Use seletor de ID em vez de texto
- tapOn:
    id: "primary_cta"
# Ou regex
- tapOn:
    text: "(?i)continuar|próximo"
```

Pra adicionar `testID` no RN: `<Pressable testID="primary_cta" ...>` — vira `data-testid="primary_cta"` no DOM/native.

### ❌ Quero ver o que o emulador tá vendo agora

```powershell
adb shell screencap -p /sdcard/now.png; adb pull /sdcard/now.png .
# Abre `now.png` em qualquer viewer
```

Ou abra o **emulator extended controls** (botão `...` na janela do emulador) → Camera/Screencast.

### ❌ Expo Go pede update / não tem versão compatível

```powershell
# Use o dev client (build local) em vez do Go
cd app/mobile
npx expo run:android  # build incremental, instala APK custom
```

---

## Estrutura de saída

```
test-screenshots/
└── android-20260518-203045/
    ├── report.md              # índice das capturas
    ├── expo.log               # log do dev server
    ├── expo-open.log          # log do `expo --android`
    ├── a-01-boot.png          # boot do emulador
    ├── a-02-welcome.png       # primeira tela do app
    ├── a-03-welcome.png       # (se Maestro) welcome confirmada
    ├── a-04-after-signup.png  # depois de preencher nome
    ├── a-05-chat-empty.png    # chat aberto
    ├── a-06-chat-msg1.png     # primeira mensagem enviada
    ├── a-07-chat-3msgs.png    # 3 mensagens conversadas
    ├── a-08-checkin-step1.png # check-in iniciado
    ├── a-09-checkin-done.png  # check-in finalizado
    ├── a-10-mission.png       # missão (se existia)
    ├── a-11-safety-cvv.png    # ⭐ safety test — CVV 188 visível
    └── a-12-final-home.png    # estado final
```

---

## Próximos passos pra evoluir o smoke

1. **Diff visual** entre `test-screenshots/android-*/` e capturas web (`test-screenshots/*.png` da rodada Playwright). Use [`pixelmatch`](https://github.com/mapbox/pixelmatch) ou [`looks-same`](https://github.com/gemini-testing/looks-same).
2. **CI** — colocar este script num GitHub Action com `reactivecircus/android-emulator-runner`. Tempo de execução típico: 8-12 min por job.
3. **Performance** — `adb shell dumpsys gfxinfo` no meio do flow pra capturar jank/FPS.
4. **Snapshot crashlytics** — `adb logcat -d` no fim, salvar em `logcat.log` no diretório de saída.
