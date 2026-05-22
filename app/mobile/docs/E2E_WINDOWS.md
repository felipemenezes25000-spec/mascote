# Testes E2E no Windows (Maestro + emulador)

## Instalação automática (uma vez)

```powershell
cd app\mobile
npm run setup:e2e:win
```

Instala: JDK 17, Android SDK, emulador `mascote_api34`, Maestro CLI e variáveis `JAVA_HOME` / `ANDROID_HOME`.

**Reabra o terminal** depois da instalação para carregar o PATH.

## Rodar o app no emulador

```powershell
cd app\mobile
npm run emulator:start    # sobe o AVD (primeira vez pode levar ~2 min)
npm run android           # build + instala app.meumascote.dev (~10 min na 1ª vez)
```

Em outro terminal:

```powershell
cd app\mobile
npm run start             # Metro bundler
```

## Rodar testes Maestro

```powershell
npm run test:e2e:critical   # onboarding + checkin + chat crise
npm run test:e2e            # todos os flows
npm run test:e2e:win        # emulador + critical (atalho)
```

## Node.js

Use **Node 20 LTS** (Expo 51 + RN 0.74 quebram no Node 22 com Metro).

```powershell
winget install OpenJS.NodeJS.LTS
# ou fnm/nvm: fnm install 20 && fnm use 20
```

Depois: `npx expo start --clear` antes dos testes Maestro (o dev client precisa do bundler).

## Requisitos de hardware

- Virtualização ativa (BIOS: Intel VT-x / AMD-V)
- Windows: recurso **Hyper-V** ou **Windows Hypervisor Platform** habilitado
- ~8 GB RAM livre para o emulador

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `adb` não encontrado | Reabra o terminal ou rode `npm run setup:e2e:win` |
| Emulador não boota | `npm run emulator:start` e aguarde; verifique virtualização |
| Maestro não acha app | Instale com `npm run android` antes dos flows |
| Crash `ExponentGLObjectManager` na tela do mascote | APK antigo sem expo-gl: rode `npm run android` de novo; o app usa 2D automaticamente se o módulo faltar |
| Licenças SDK | Rode de novo `npm run setup:e2e:win` |
