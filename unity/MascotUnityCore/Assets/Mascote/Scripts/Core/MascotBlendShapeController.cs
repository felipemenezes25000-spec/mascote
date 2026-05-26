using System.Collections.Generic;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Aplica blend shape weights normalizados [0, 1] do contrato RN nos
    /// SkinnedMeshRenderers descobertos no rig.
    ///
    /// Range Unity: SetBlendShapeWeight aceita 0-100 (não 0-1). Convertemos.
    ///
    /// Defensive: se um blend shape do contrato não existe na mesh, loga
    /// warning UMA vez por shape (não a cada frame) e ignora. Mesh sem
    /// nenhum blend shape correspondente → NO-OP silencioso (caso 90% dos
    /// GLBs hoje, que não têm blend shapes).
    ///
    /// Catálogo oficial de keys: `lib/dna/morphInfluences.ts:MORPH_INFLUENCE_KEYS`.
    /// </summary>
    public class MascotBlendShapeController : MonoBehaviour
    {
        [SerializeField] Transform rigRoot;

        readonly List<SkinnedMeshRenderer> _renderers = new();
        readonly HashSet<string> _warnedMissingShapes = new();
        bool _cached;

        public void ApplyMorphInfluences(Dictionary<string, float> influences)
        {
            if (influences == null || influences.Count == 0)
            {
                ResetAllWeights();
                return;
            }
            CacheRenderers();

            // Pra cada renderer, mapeia (shapeName → index) UMA vez e aplica.
            foreach (var renderer in _renderers)
            {
                if (renderer == null || renderer.sharedMesh == null) continue;
                var mesh = renderer.sharedMesh;
                int shapeCount = mesh.blendShapeCount;

                // Zero todas as influences que esse renderer suporta — evita
                // estado pendurado de frames anteriores quando influences muda.
                for (int i = 0; i < shapeCount; i++)
                {
                    var name = mesh.GetBlendShapeName(i);
                    if (influences.TryGetValue(name, out var weight01))
                    {
                        var weight100 = Mathf.Clamp01(weight01) * 100f;
                        renderer.SetBlendShapeWeight(i, weight100);
                    }
                    else
                    {
                        renderer.SetBlendShapeWeight(i, 0f);
                    }
                }
            }

            // Warning pra blend shapes do contrato que NENHUM renderer expõe.
            foreach (var key in influences.Keys)
            {
                if (_warnedMissingShapes.Contains(key)) continue;
                if (!AnyRendererHasShape(key))
                {
                    Debug.LogWarning(
                        $"[MascotBlendShapeController] blend shape '{key}' do contrato " +
                        $"não encontrado em nenhuma mesh. GLB precisa expor blend shapes " +
                        $"nomeados conforme o catálogo (ver morphInfluences.ts).");
                    _warnedMissingShapes.Add(key);
                }
            }
        }

        void CacheRenderers()
        {
            if (_cached) return;
            if (rigRoot == null) rigRoot = transform;
            _renderers.Clear();
            _renderers.AddRange(rigRoot.GetComponentsInChildren<SkinnedMeshRenderer>(true));
            _cached = true;
        }

        void ResetAllWeights()
        {
            CacheRenderers();
            foreach (var renderer in _renderers)
            {
                if (renderer == null || renderer.sharedMesh == null) continue;
                int shapeCount = renderer.sharedMesh.blendShapeCount;
                for (int i = 0; i < shapeCount; i++)
                {
                    renderer.SetBlendShapeWeight(i, 0f);
                }
            }
        }

        bool AnyRendererHasShape(string shapeName)
        {
            foreach (var renderer in _renderers)
            {
                if (renderer == null || renderer.sharedMesh == null) continue;
                if (renderer.sharedMesh.GetBlendShapeIndex(shapeName) >= 0) return true;
            }
            return false;
        }
    }
}
