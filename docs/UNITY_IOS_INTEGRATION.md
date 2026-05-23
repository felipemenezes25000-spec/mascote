# Integração Unity iOS — Mascote mobile

## Status

Integração iOS é **documentada + plugin stub**. Requer **Mac + Xcode + Unity Editor** para export real. Sem Mac no CI, apenas validação de contrato RN e plugin Expo.

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

1. Unity **2022.3.62f1**
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

### 4. Bridge nativa iOS (a implementar)

Espelhar Android:

```objc
// UnityMascotModule.m — stub futuro
RCT_EXPORT_METHOD(postMessage:(NSString *)json ...)
```

Unity C# chama via:

```csharp
#if UNITY_IOS
[DllImport("__Internal")]
private static extern void onUnityMessage(string json);
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

1. Mac dev: export UnityFramework
2. Implementar `UnityMascotModule.swift` espelhando Kotlin
3. Substituir placeholder `UnityMascotView` por `UIView` Unity
4. TestFlight beta com `EXPO_PUBLIC_UNITY_DEBUG_PANEL=true`
