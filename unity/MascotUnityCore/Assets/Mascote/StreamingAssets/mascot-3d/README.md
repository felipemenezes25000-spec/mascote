# StreamingAssets — mascot-3d

Os GLBs de produção ficam em:

`app/mobile/assets/mascot-3d/`

## Sincronizar para o Unity

Na raiz do repositório:

**Windows (junction — não duplica disco):**

```powershell
.\unity\MascotUnityCore\scripts\sync-mascot-assets.ps1
```

**macOS / Linux (symlink):**

```bash
./unity/MascotUnityCore/scripts/sync-mascot-assets.sh
```

Após o link, esta pasta deve listar `bipo.glb`, `zip.glb`, `lulu.glb`, `aro.glb` e `accessories/*.glb`.

> Os `.glb` estão no `.gitignore` do projeto Unity para não duplicar binários no histórico. O CI valida a pasta fonte em `app/mobile/assets/mascot-3d/`.

Ver também: `docs/UNITY_ASSET_PIPELINE.md`.
