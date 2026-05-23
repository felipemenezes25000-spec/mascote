# Performance Unity — Mascote mobile

## Metas

| Métrica | Low | Medium (default) | High |
|---------|-----|------------------|------|
| FPS alvo | 30 | 45 | 60 |
| Memória Unity | < 200 MB | < 350 MB | < 500 MB |
| Tempo cold start | < 3 s | < 2 s | < 2 s |
| Tamanho APK delta | +80 MB | +100 MB | +120 MB |

## Presets (`MascotQualityController.cs`)

| Preset | QualitySettings | FPS | VFX |
|--------|-----------------|-----|-----|
| `low` | 0 | 30 | off / 30% |
| `medium` | 2 | 45 | 60% |
| `high` | 4 | 60 | 100% |
| `auto` | RAM < 3 GB → low, senão medium | — | — |

`reduceMotion=true` no estado RN força preset **low** independente da flag.

## RN — throttling

`useUnityMascot` envia `state.update` no máximo **10 Hz** (100 ms). Eventos one-shot (`pendingEvent`, `event.play`) não são throttled.

## Otimizações implementadas

- **Procedural animation** (blink, breathing, idle sway) quando Animator clips ausentes
- **MaterialPropertyBlock** para tints DNA (sem instanciar materiais)
- **Accessory placeholders** leves até GLTFast/Addressables
- **Environment room swap** — apenas um prefab ativo por vez
- **Fallback Three.js** evita tela preta se Unity falhar

## Recomendações futuras (Editor)

1. **Addressables** para GLBs de acessório (load sob demanda)
2. **LOD** nos 4 mascotes base (bipo, zip, lulu, aro)
3. **GPU instancing** para partículas VFX
4. **Static batching** nos environment prefabs
5. **IL2CPP + Managed Stripping Level High** no export Android/iOS

## Profiling

### Android

```bash
adb shell dumpsys meminfo app.meumascote.dev
adb shell gfxinfo app.meumascote.dev framestats
```

### Unity Profiler

Conectar via USB com **Development Build** + **Autoconnect Profiler**.

### RN

Flipper / React Native DevTools — monitorar re-renders de `MascotRenderer`.

## Env vars relacionadas

```env
EXPO_PUBLIC_UNITY_QUALITY=auto|low|medium|high
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true   # FPS/messages no overlay
```

## Checklist release

- [ ] Testar `low` em device 2 GB RAM
- [ ] Testar `reduceMotion` (WCAG)
- [ ] Medir APK antes/depois do embed Unity
- [ ] Validar fallback com `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true`
- [ ] Sem memory leak após 10 min idle (Android Profiler)
