# Fontes nativas iOS — Unity bridge

Templates Swift/ObjC que o config plugin `withUnityIOS.js` copia pra
`ios/Mascote/Unity/` durante `expo prebuild --platform ios`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `UnityMascotModule.swift` | Bridge RN ↔ Unity (espelha `UnityMascotModule.kt`) |
| `UnityMascotModule.m` | RCT_EXTERN macros pra registrar o Swift module |
| `UnityPlayerHelper.swift` | Lifecycle reflection-safe (espelha `UnityPlayerActivityHelper.kt`) |
| `Mascote-Bridging-Header.h` | Bridging header (precisa configurar `SWIFT_OBJC_BRIDGING_HEADER` no Xcode) |

## Checklist Mac

Depois de `expo prebuild --platform ios`:

1. Verificar que `ios/Mascote/Unity/` foi criado com os 4 arquivos acima
2. Abrir `ios/Mascote.xcworkspace` no Xcode
3. **Build Settings → Swift Compiler - General → Objective-C Bridging Header**
   - Valor: `Mascote/Unity/Mascote-Bridging-Header.h`
4. Export Unity como `UnityFramework.framework`:
   - Unity Editor (Mac) → `File → Build Settings → iOS → Build`
   - Output `ios/UnityExport/`
5. **Drag & drop `UnityFramework.framework` no Xcode**:
   - General → Frameworks, Libraries, and Embedded Content
   - Embed: **Embed & Sign**
6. Descomentar `@import UnityFramework;` no bridging header
7. Patcheia `AppDelegate.swift` com lifecycle delegation:
   ```swift
   override func applicationWillResignActive(_ application: UIApplication) {
       super.applicationWillResignActive(application)
       UnityPlayerHelper.applicationWillResignActive()
   }
   // ... e os outros 5 callbacks
   ```
8. `pod install`
9. Build no device (simulator Unity = limitado)

## Padrão de reflection

Todo método nesses arquivos é **reflection-safe** — se `UnityFramework` não
estiver no classpath/embedded, vira NO-OP silent. Isso permite:

- Build iOS funciona com OU sem framework embedded (mesma binária dev)
- Não force-link em libs Unity que ainda não foram embedded
- Mesmo padrão da implementação Android (`UnityPlayerActivityHelper.kt`)

## Limitações conhecidas

- **Não testado em Mac/device** — implementação foi feita seguindo specs
  oficiais de UnityFramework + RN Bridge, mas precisa validação em
  ambiente real
- **`appController` integration ainda não implementada** — Unity precisa do
  `UnityAppController` pra render numa view existente; isso é setup
  manual no Xcode (não cabe em config plugin)
- **Lifecycle simplificado** — não cobre device orientation, scene
  lifecycle (iOS 13+) — adicionar conforme necessidade
