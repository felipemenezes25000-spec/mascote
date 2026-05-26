# Integração Unity iOS — Mascote mobile

## Status (atualizado 2026-05-25)

Integração iOS agora tem **bridge nativo Swift completo + lifecycle helper + config plugin que copia tudo no prebuild**. Requer **Mac + Xcode + Unity Editor** apenas pra:
1. Gerar `ios/` via `expo prebuild --platform ios`
2. Exportar UnityFramework do Unity Editor
3. Embed framework no Xcode + configurar bridging header
4. Patcheia `AppDelegate.swift` com lifecycle delegation (snippet documentado)

Toda a parte de código nativo (Swift + ObjC) **já está pronta** em `app/mobile/plugins/ios-unity-source/` e é copiada automaticamente pra `ios/Mascote/Unity/` durante o prebuild.

## Arquitetura espelhada (Android)

```
RN (UnityMascotBridge.ts)
  ↔ NativeModule iOS (futuro: UnityMascotModule.m/.swift)
  ↔ UnityFramework
  ↔ ReactNativeBridge.cs (GameObject MascotUnityBridge)
```

Interface de mensagens idêntica à Android — ver `UNITY_BRIDGE_CONTRACT.md`.

## Passo a passo (Mac)

### 1. Export Unity iOS

1. Unity **6000.4.8f1** (Unity 6) — mesma versão do `ProjectVersion.txt`
2. **File  Build Settings → iOS**
3. Export para pasta fora do repo ou `ios/UnityExport/`
4. Gera `UnityFramework.framework`

### 2. Expo prebuild iOS

```bash
cd app/mobile
npx expo prebuild --platform ios
```

Plugin `plugins/withUnityIOS.js` adiciona comentário no Podfile para:

```ruby
# pod 'UnityFramework', :path => '../UnityExport'
```

### 3. Xcode

1. Arraste `UnityFramework.framework` para o projeto Xcode
2. **Embed & Sign**
3. Configure **Build Phases → Run Script** se necessário para IL2CPP
4. `Info.plist`: permissões de câmera/microfone se mini-games futuros

### 4. Bridge nativa iOS — JÁ PRONTA (slice 2026-05-25)

Templates Swift/ObjC em `app/mobile/plugins/ios-unity-source/`:
- `UnityMascotModule.swift` — bridge RN ↔ Unity (espelha `UnityMascotModule.kt`)
- `UnityMascotModule.m` — `RCT_EXTERN_MODULE` registro
- `UnityPlayerHelper.swift` — lifecycle reflection-safe (espelha `UnityPlayerActivityHelper.kt`)
- `Mascote-Bridging-Header.h` — bridging header template

`withUnityIOS.js` (config plugin) copia tudo pra `ios/Mascote/Unity/` no prebuild.

**Setup adicional no Xcode (one-time):**

1. **Build Settings → Swift Compiler - General → Objective-C Bridging Header:**
   `Mascote/Unity/Mascote-Bridging-Header.h`

2. **Embed UnityFramework.framework** (após export Unity):
   General → Frameworks → Drag & Embed & Sign

3. **Descomentar `@import UnityFramework;`** em `Mascote-Bridging-Header.h`

4. **Patchear `AppDelegate.swift`** (snippet completo):
   ```swift
   override func applicationWillResignActive(_ application: UIApplication) {
       super.applicationWillResignActive(application)
       UnityPlayerHelper.applicationWillResignActive()
   }
   override func applicationDidEnterBackground(_ application: UIApplication) {
       super.applicationDidEnterBackground(application)
       UnityPlayerHelper.applicationDidEnterBackground()
   }
   override func applicationWillEnterForeground(_ application: UIApplication) {
       super.applicationWillEnterForeground(application)
       UnityPlayerHelper.applicationWillEnterForeground()
   }
   override func applicationDidBecomeActive(_ application: UIApplication) {
       super.applicationDidBecomeActive(application)
       UnityPlayerHelper.applicationDidBecomeActive()
   }
   override func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
       super.applicationDidReceiveMemoryWarning(application)
       UnityPlayerHelper.applicationDidReceiveMemoryWarning()
   }
   ```

Unity C# chama RN via:

```csharp
#if UNITY_IOS
[DllImport("__Internal")]
private static extern void onUnityMessage(string json);

// No ReactNativeBridge.cs:
onUnityMessage(jsonString);
#endif
```

### 5. Lifecycle

| Evento | Comportamento esperado |
|--------|------------------------|
| App background | `Application.pause = true` no Unity |
| App foreground | Reenviar `state.update` com seq++ |
| Logout | Destruir Unity player, limpar listeners RN |
| Memory warning | `MascotQualityController` → preset `low` |
| Crash Unity | `error` recoverable → fallback Three.js |

### 6. TestFlight

1. Profile EAS `production` com Unity embutido
2. Incrementar `ios.buildNumber`
3. Validar tamanho IPA (~150–250 MB com Unity)
4. Testar em device físico (simulador Unity limitado)

## Variáveis de ambiente

Mesmas da Android:

```env
EXPO_PUBLIC_MASCOT_RENDERER=unity
EXPO_PUBLIC_UNITY_ENABLED=true
```

## Limitações

- Pasta `ios/` gerada apenas após `expo prebuild` no Mac
- Sem UnityFramework no repo — export manual
- Plugin `withUnityIOS.js` é stub (comentários Podfile)
- Testes E2E Unity iOS impossíveis no CI Linux atual

## Próximos passos

1. ✅ `UnityMascotModule.swift` espelhando Kotlin (slice 2026-05-25)
2. ✅ `UnityPlayerHelper.swift` espelhando Kotlin (slice 2026-05-25)
3. ✅ Config plugin copia tudo no prebuild (slice 2026-05-25)
4. 🟡 Mac dev: export UnityFramework
5. 🟡 Xcode: configurar bridging header + embed framework + AppDelegate patch
6. 🟡 Substituir placeholder `UnityMascotView` por `UIView` Unity nativo
7. 🟡 TestFlight beta com `EXPO_PUBLIC_UNITY_DEBUG_PANEL=true`

## Validação status (slice 2026-05-25)

⚠️ **Não testado em Mac/device físico** — implementação seguiu specs oficiais
de UnityFramework + RN Bridge espelhando 1:1 o Android (que já testamos
parcialmente). Bugs prováveis em:

- Configuração do bridging header (paths)
- Embed do framework (Code Signing)
- Init do `UnityAppController` integration (não está no escopo do helper —
  precisa setup manual no Xcode)
- Lifecycle race conditions (iOS scenes vs UIApplication)

**Primeiro Mac/device deve seguir o checklist em
`app/mobile/plugins/ios-unity-source/README.md` e reportar issues.**
