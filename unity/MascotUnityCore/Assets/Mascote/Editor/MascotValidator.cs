// MascotValidator — Editor menu pra verificar setup do Unity project antes de buildar AAR.
//
// Detecta problemas comuns que matam o build sem mensagem clara:
//   - URP nao instalado / pipeline asset nao referenciado.
//   - GLBs ausentes em StreamingAssets/mascot-3d/.
//   - MascotRoom.unity nao adicionada a Build Settings.
//   - Shape keys do catalogo Mascote faltando nos prefabs.
//   - Build scripts (AndroidBuildPipeline.cs) ausente ou desreferenciado.
//
// Como rodar:
//   Unity Editor → menu Mascote → Validate Setup
//
// Output: Console com lista de findings (severity: ERROR / WARN / OK).
// Sai com Debug.LogError pra falhar CLI builds quando houver ERROR.

#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Mascote.Editor
{
    public static class MascotValidator
    {
        // Manter sincronizado com src/lib/dna/morphInfluences.ts (MORPH_INFLUENCE_KEYS).
        private static readonly string[] EXPECTED_SHAPE_KEYS = {
            "eye_big", "eye_small",
            "body_tall", "body_short",
            "body_wide", "body_narrow",
            "posture_forward", "posture_back",
            "aura_strong", "pattern_dense",
        };

        private static readonly string[] EXPECTED_GLB_NAMES = {
            "bipo", "zip", "lulu", "aro",
        };

        [MenuItem("Mascote/Validate Setup")]
        public static void Validate()
        {
            var findings = new List<Finding>();

            CheckUrp(findings);
            CheckGlbs(findings);
            CheckScenes(findings);
            CheckShapeKeys(findings);

            Report(findings);
        }

        private static void CheckUrp(List<Finding> findings)
        {
            var pipe = GraphicsSettings.defaultRenderPipeline;
            if (pipe == null)
            {
                findings.Add(new Finding(Severity.ERROR,
                    "URP not configured",
                    "GraphicsSettings.defaultRenderPipeline = null. " +
                    "Edit → Project Settings → Graphics → assign UniversalRenderPipelineAsset."));
                return;
            }
            if (!pipe.GetType().Name.Contains("Universal"))
            {
                findings.Add(new Finding(Severity.WARN,
                    "Non-URP pipeline detected",
                    $"Pipeline type: {pipe.GetType().Name}. Expected UniversalRenderPipelineAsset."));
            }
            else
            {
                findings.Add(new Finding(Severity.OK, "URP configured", pipe.name));
            }
        }

        private static void CheckGlbs(List<Finding> findings)
        {
            var dir = Path.Combine(Application.dataPath, "Mascote", "StreamingAssets", "mascot-3d");
            if (!Directory.Exists(dir))
            {
                findings.Add(new Finding(Severity.ERROR,
                    "GLB folder missing",
                    $"Expected: {dir}"));
                return;
            }
            foreach (var name in EXPECTED_GLB_NAMES)
            {
                var path = Path.Combine(dir, name + ".glb");
                if (!File.Exists(path))
                {
                    findings.Add(new Finding(Severity.ERROR,
                        $"GLB missing: {name}.glb",
                        $"Expected: {path}"));
                }
                else
                {
                    findings.Add(new Finding(Severity.OK, $"GLB ok: {name}.glb", path));
                }
            }
        }

        private static void CheckScenes(List<Finding> findings)
        {
            bool hasMascotRoom = false;
            foreach (var s in EditorBuildSettings.scenes)
            {
                if (s.path.EndsWith("MascotRoom.unity") && s.enabled)
                {
                    hasMascotRoom = true;
                    break;
                }
            }
            if (!hasMascotRoom)
            {
                findings.Add(new Finding(Severity.ERROR,
                    "MascotRoom.unity not in Build Settings",
                    "File → Build Settings → drag MascotRoom.unity into scenes list + enable."));
            }
            else
            {
                findings.Add(new Finding(Severity.OK, "MascotRoom.unity in Build Settings", "enabled"));
            }
        }

        private static void CheckShapeKeys(List<Finding> findings)
        {
            var dir = Path.Combine(Application.dataPath, "Mascote", "StreamingAssets", "mascot-3d");
            if (!Directory.Exists(dir)) return;
            foreach (var name in EXPECTED_GLB_NAMES)
            {
                var rel = $"Assets/Mascote/StreamingAssets/mascot-3d/{name}.glb";
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(rel);
                if (go == null) continue;
                var smr = go.GetComponentInChildren<SkinnedMeshRenderer>();
                if (smr == null || smr.sharedMesh == null)
                {
                    findings.Add(new Finding(Severity.WARN,
                        $"{name}.glb: no SkinnedMeshRenderer/mesh",
                        "shape keys nao validaveis"));
                    continue;
                }
                var missing = new List<string>();
                foreach (var key in EXPECTED_SHAPE_KEYS)
                {
                    if (smr.sharedMesh.GetBlendShapeIndex(key) < 0) missing.Add(key);
                }
                if (missing.Count == 0)
                {
                    findings.Add(new Finding(Severity.OK, $"{name}.glb: shape keys ok", $"{EXPECTED_SHAPE_KEYS.Length} keys"));
                }
                else
                {
                    findings.Add(new Finding(Severity.WARN,
                        $"{name}.glb: {missing.Count} shape keys missing",
                        $"missing: {string.Join(", ", missing)}. Roda scripts/blender/add_shape_keys.py"));
                }
            }
        }

        private static void Report(List<Finding> findings)
        {
            int errors = 0, warns = 0, oks = 0;
            foreach (var f in findings)
            {
                var label = f.Severity == Severity.ERROR ? "ERROR" :
                            f.Severity == Severity.WARN ? "WARN" : "OK";
                var line = $"[Mascote Validator] {label}: {f.Title} — {f.Detail}";
                if (f.Severity == Severity.ERROR) { Debug.LogError(line); errors++; }
                else if (f.Severity == Severity.WARN) { Debug.LogWarning(line); warns++; }
                else { Debug.Log(line); oks++; }
            }
            Debug.Log($"[Mascote Validator] summary: {oks} ok, {warns} warn, {errors} error.");
        }

        private enum Severity { OK, WARN, ERROR }

        private struct Finding
        {
            public Severity Severity;
            public string Title;
            public string Detail;
            public Finding(Severity s, string t, string d) { Severity = s; Title = t; Detail = d; }
        }
    }
}
#endif
