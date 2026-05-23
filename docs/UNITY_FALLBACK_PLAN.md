# Plano de fallback — renderer mascote

## Ordem (Sprint 1)

1. **unity** — se `EXPO_PUBLIC_MASCOT_RENDERER=unity` e `EXPO_PUBLIC_UNITY_ENABLED=true`
2. **three** — `Mascot.tsx` (R3F + GLB, com boundary → 2D interno)
3. **fallback2d** — modo explícito ou falha do boundary 3D

`MascotRenderer.tsx` implementa: Unity erro recuperável → volta para `Mascot` (three).

## Variáveis de ambiente

```env
EXPO_PUBLIC_MASCOT_RENDERER=three|unity|fallback2d   # default: three
EXPO_PUBLIC_UNITY_ENABLED=true|false               # default: false
EXPO_PUBLIC_UNITY_QUALITY=auto|low|medium|high
EXPO_PUBLIC_UNITY_DEBUG_PANEL=true|false
EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true            # dev: força fallback
```

## Testar fallback Unity

1. `EXPO_PUBLIC_MASCOT_RENDERER=unity`
2. `EXPO_PUBLIC_UNITY_ENABLED=true`
3. `EXPO_PUBLIC_UNITY_SIMULATE_FAILURE=true`
4. Abrir Home — deve cair em Three/2D após stub reportar erro.

## Produção

Manter `three` até Sprint 2 validar embed Unity em APK release. Unity desligado = zero regressão.
