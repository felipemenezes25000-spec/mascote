# Unity iOS Integration Runbook

Passo-a-passo pra ativar o renderer Unity no iOS. Requer Mac + Xcode.

## Pre-requisitos

- macOS 13+ com Xcode 15+ instalado.
- Unity Editor 6.0 (mesma versao do projeto Android).
- Apple Developer account ativa.
- Repo clonado: `git clone https://github.com/.../mascote.git`.

## Passo 1: Prebuild Expo nativo iOS

```bash
cd app/mobile
npx expo prebuild --platform ios
```

Isso gera `ios/` com Podfile + xcworkspace. Esse passo eh idempotente —
roda quantas vezes precisar.

## Passo 2: Build Unity → iOS Framework

No Unity Editor (Mac):

1. Abrir `unity/MascotUnityCore/` no Hub.
2. File → Build Settings → switch platform to **iOS**.
3. Player Settings → Other Settings:
   - Scripting Backend: **IL2CPP**.
   - Target Architecture: **ARM64**.
   - Target SDK: **Device SDK** (nao Simulator) pra produção.
4. Build Settings → "Build" — escolha pasta destino
   (ex: `app/mobile/ios/UnityFramework/`).
5. Aguardar Unity gerar UnityFramework Xcode project (~5-15min).

## Passo 3: Embed UnityFramework no app

No Xcode (`app/mobile/ios/mascote.xcworkspace`):

1. File → Add Files → adiciona `UnityFramework.xcodeproj` gerado pelo Unity.
2. Project Settings → General → Frameworks, Libraries, Embedded Content:
   - `+` → UnityFramework.framework → set "Embed & Sign".
3. Build Settings → Header Search Paths: adiciona
   `$(SRCROOT)/UnityFramework/UnityFramework/Classes/`.
4. Build Settings → Other Linker Flags: adiciona `-ObjC`.

## Passo 4: Apply AppDelegate patch

Edit `ios/mascote/AppDelegate.swift`:

```swift
import UnityFramework

// No didFinishLaunchingWithOptions, adicione:
UnityPlayerHelper.shared.setHostController(self.window?.rootViewController)
```

E adicione method de lifecycle delegate:

```swift
func applicationWillResignActive(_ application: UIApplication) {
  UnityPlayerHelper.shared.pause()
}
func applicationDidBecomeActive(_ application: UIApplication) {
  UnityPlayerHelper.shared.resume()
}
```

(Templates Swift completos estao em `app/mobile/plugins/ios-unity-source/`.)

## Passo 5: Pod install + build

```bash
cd ios
pod install
cd ..
EXPO_PUBLIC_UNITY_ENABLED=true npx expo run:ios --device
```

## Passo 6: Smoke test

1. App abre → tela Home renderiza placeholder antes do Unity carregar.
2. Apos ~2s, Unity boot → mascote 3D Unity aparece.
3. Background → foreground → Unity continua sem crash.
4. Trocar de personality → mascote anima morphInfluences.

Se algum desses falhar:
- Logs no Xcode Console (filter "Unity" e "RCTBridge").
- `[UnityPlayerHelper]` prefix indica issue na ponte iOS.
- Tentar build sem Unity primeiro pra isolar:
  `EXPO_PUBLIC_UNITY_ENABLED=false npx expo run:ios`.

## Passo 7: TestFlight beta

```bash
eas build --profile preview-unity --platform ios
eas submit --profile preview --platform ios
```

Beta testers via App Store Connect → TestFlight.

## Custos

- Apple Developer: USD 99/ano.
- Mac on EAS Cloud: USD 4/build (vs USD 0 Linux). Workflow iOS CI eh
  manual-trigger por padrao pra evitar custo acumulado.

## Troubleshooting

| Sintoma | Causa provavel | Fix |
|---|---|---|
| `UnityFramework.h not found` | Header path nao configurado | Passo 3.3 |
| `Symbol not found: _Unity*` | -ObjC flag ausente | Passo 3.4 |
| Mascote nao aparece | Cena nao incluida no build | Unity → Build Settings, add MascotRoom |
| App trava ao background | Lifecycle delegate ausente | Passo 4 (applicationWillResignActive) |
| Build Unity 30+min | IL2CPP cold cache | Normal first time; subsequents ~5min |

## Checklist final pre-TestFlight

- [ ] App roda sem Unity (`EXPO_PUBLIC_UNITY_ENABLED=false`).
- [ ] App roda COM Unity (`EXPO_PUBLIC_UNITY_ENABLED=true`).
- [ ] Background/foreground 5x sem crash.
- [ ] Performance: pelo menos 30fps em iPhone 12+.
- [ ] Memory: <250MB steady-state.
- [ ] Tested in real device (Simulator nao roda Unity por padrao).
