# Pipeline de assets 3D — Unity

## Fonte da verdade

| Recurso | Caminho |
|---------|---------|
| GLBs mascotes | `app/mobile/assets/mascot-3d/{bipo,zip,lulu,aro}.glb` |
| Acessórios | `app/mobile/assets/mascot-3d/accessories/*.glb` |
| Contrato DNA → visual | `app/mobile/src/lib/dna/bindings.ts` |
| Estado Unity | `buildUnityMascotState()` → JSON v1 |

O app **Three/R3F** e o **Unity** devem consumir os mesmos arquivos GLB e os mesmos nomes de bones (`head`, `body`, `eye_L`, …).

## Copiar / linkar para o Unity

```powershell
# Windows — junction (recomendado)
.\unity\MascotUnityCore\scripts\sync-mascot-assets.ps1
```

```bash
# macOS / Linux — symlink
chmod +x unity/MascotUnityCore/scripts/sync-mascot-assets.sh
./unity/MascotUnityCore/scripts/sync-mascot-assets.sh
```

Destino: `unity/MascotUnityCore/Assets/Mascote/StreamingAssets/mascot-3d/`

## Import no Editor (manual)

1. Abra `unity/MascotUnityCore` no Unity 6000.4.8f1 (Unity 6, versão pinada no projeto).
2. Arraste os GLBs para `Assets/Mascote/Models/` **ou** use o link em StreamingAssets e importe com **GLTFast** (Sprint 3).
3. Configure materiais nos slots `body_material`, `accent_material`, `glow_material`.
4. Crie **Animator Controller** com estados: `idle`, `blink`, `smile`, `sad`, `excited`, `sleep`, `wave`.
5. Associe o prefab do mascote em `MascotController` / `MascotMorphologyController.rigRoot`.

## Fallback procedural (Sprint 2)

Sem clips Animator, `MascotAnimationController` + `BlinkController` + `BreathingController` aplicam:

- Escala Y nos olhos (piscar)
- Respiração no `body` por mood
- “Punch” de escala no `head` para smile/wave

Isso espelha o comportamento atual do viewer Three com GLB estático.

## CI

O workflow `.github/workflows/unity-ci.yml` verifica:

- Existência da pasta `unity/MascotUnityCore`
- GLBs fonte em `app/mobile/assets/mascot-3d/*.glb`
- Arquivos C# obrigatórios e fixture JSON de teste

Compilação Unity completa fica opcional (requer licença + `game-ci/unity-builder`).
