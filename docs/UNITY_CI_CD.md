# Unity CI/CD — Build automatizado do AAR

**Slice:** 2026-05-25 (slice 5 paralelo)

## Status

Workflow `.github/workflows/unity-android-build.yml` configurado em modo
**manual (`workflow_dispatch`)** — não roda automaticamente em push até você
configurar os secrets necessários e validar uma run.

Sem os secrets, o workflow falha no step `Activate Unity license` — por
isso ele é manual: pra não quebrar PR builds.

## Pré-requisitos (one-time setup)

### 1. Conta Unity + license

Para Unity Personal (free):
1. https://license.unity.com/manual
2. Gerar request file via [game-ci/unity-request-activation-file](https://game.ci/docs/github/activation)
3. Submeter pra Unity → recebe `Unity_v6.x.alf` por email
4. Upload do `.alf` na page de license → recebe `Unity_v6.x.ulf`

Para Unity Pro:
- Use o arquivo `.ulf` da seat ativa

### 2. Configurar Secrets no GitHub

Em `Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Valor |
|---|---|
| `UNITY_LICENSE` | conteúdo COMPLETO do arquivo `Unity_v6.x.ulf` (cole o XML) |
| `UNITY_EMAIL` | email da conta Unity |
| `UNITY_PASSWORD` | password da conta Unity |

### 3. Validar primeira run

Em `Actions → Unity Android — Build AAR → Run workflow`:
- Branch: `main`
- Upload artifact: `true`
- Run

Primeira run leva ~25-40 min (sem cache `Library/`).
Runs subsequentes: ~10-15 min (cache hit).

### 4. Habilitar trigger automático

Quando workflow estiver verde, descomentar trigger automático em
`unity-android-build.yml`:

```yaml
on:
  workflow_dispatch:  # mantém manual também
  push:
    tags:
      - 'unity-v*'
  pull_request:
    paths:
      - 'unity/MascotUnityCore/**'
```

## Como funciona

```
push → trigger
   ↓
checkout (com LFS)
   ↓
cache Library/ (~3GB, acelera 60% das runs)
   ↓
free disk space (ubuntu-latest fica apertado)
   ↓
game-ci/unity-builder@v4 com:
   - unityVersion: 6000.4.8f1 (idêntico ao ProjectVersion.txt local)
   - targetPlatform: Android
   - buildMethod: Mascote.Unity.EditorTools.AndroidBuildPipeline.BuildAndroidLibrary
   - androidExportType: androidProject
   ↓
verify app/mobile/android/unityLibrary/build.gradle existe
   ↓
upload artifact unityLibrary-android (retention 14 dias)
   ↓
$GITHUB_STEP_SUMMARY com tamanho + próximos passos
```

## Custo

| Plano | Runner | Custo |
|---|---|---|
| GitHub Free (public repo) | ubuntu-latest | grátis |
| GitHub Free (private repo) | ubuntu-latest | 2000 min/mês grátis, depois $0.008/min |
| Self-hosted Linux | qualquer | grátis (sem GitHub minutes) |

Build de ~15min usa ~30 GitHub minutes (cache hit). Em repo private, ~150 builds/mês de graça.

## Troubleshooting

| Sintoma | Causa | Fix |
|---|---|---|
| `License is not activated` | Secret UNITY_LICENSE faltando ou inválido | Regerar .ulf via game-ci/unity-request-activation-file |
| `Build hangs on Library cache restore` | Cache > 5GB | Limpar cache antigo no Actions tab |
| `Project upgrades from older Unity version` | unityVersion bate diferente do ProjectVersion.txt | Atualizar ambos pra mesma versão |
| `Out of disk space` | Default ubuntu-latest ~14GB free | `Free disk space` step já remove ~10GB de stuff inútil |
| `Editor script BuildAndroidLibrary não existe` | namespace errado | Verificar `Mascote.Unity.EditorTools.AndroidBuildPipeline` bate |
| `gradlew not found in export` | Unity 6 mudou structure do export | OK — AAR vai ser built quando RN buildar o app |

## Próximos slices candidatos

- **Auto-wire pós-build**: rodar `wire-unity-android.ps1` automaticamente após upload artifact
- **Test do AAR**: build do app Android RN consumindo o AAR baixado, verifica que não quebra
- **iOS workflow**: equivalente em macos-latest runner com `game-ci/unity-builder` iOS
- **Release tag → AAB**: tag `unity-v*` triggera build, anexa AAR na release GitHub
- **Slack notification**: avisa quando AAR novo está disponível
