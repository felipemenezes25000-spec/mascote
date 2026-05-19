# Maestro E2E flows

End-to-end tests usando [Maestro](https://maestro.mobile.dev), declarativos em YAML, rodam em iOS Simulator, Android Emulator e dispositivos físicos.

## Por que Maestro (não Detox)

- **Stack-agnóstico**: funciona com bare RN, Expo Go, e Expo Dev Client sem config nativa
- **Sintaxe declarativa**: 5 linhas pra abrir app + tappear elemento + assertar texto
- **CI-friendly**: roda em GitHub Actions com emulador headless
- **Sem flakiness de timing**: aguarda elementos visíveis automaticamente (sem `sleep(2000)`)

Detox é mais rápido em CI, mas exige config nativa e quebra em cada upgrade de Expo SDK.

## Setup local

```bash
# Instalar CLI (uma vez)
curl -Ls "https://get.maestro.mobile.dev" | bash

# iOS Simulator: abrir
open -a Simulator

# Android: subir emulador
emulator -avd Pixel_6_API_34 &

# Rodar app em modo dev
cd C:/Users/Felipe/Documents/mascote/app/mobile
npm run start

# Rodar flows (outra terminal)
maestro test .maestro/onboarding.yaml
maestro test .maestro/checkin.yaml
maestro test .maestro/  # todos
```

## Flows cobertos

| Arquivo | Cobre |
|---|---|
| `onboarding.yaml` | welcome → age → goal → mood → personality → name → push → notice → home |
| `checkin.yaml` | abrir home + tappear hábito + verificar contador |
| `chat-safe.yaml` | enviar msg neutra; verificar reply sem disclaimer |
| `chat-crisis.yaml` | enviar msg crítica; verificar CRISIS_REPLY com CVV 188 |
| `paywall.yaml` | navegar pra paywall; ver 2 planos; voltar sem comprar |
| `settings-export.yaml` | exportar dados → assertar clipboard preenchido |
| `dynamic-text.yaml` | togglar dynamic_text → ver fonte mudar |

## CI

`.github/workflows/maestro.yml` roda os flows num emulador Android headless a cada PR. iOS é manual (Maestro Cloud).

## Filosofia

Maestro cobre **fluxos críticos** (onboarding completo, checkin, crise safety). NÃO substitui unit/integration tests — só pega regressões que unit-test-em-isolamento perde (navigation, persistência cross-screen, animações que bloqueiam input).

Manter cada flow < 30s. Mais que isso vira "test theatre".
