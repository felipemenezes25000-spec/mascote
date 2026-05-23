using System.Collections.Generic;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Escala bones do rig conforme boneScales do contrato.
    /// </summary>
    public class MascotMorphologyController : MonoBehaviour
    {
        [SerializeField] Transform rigRoot;

        readonly Dictionary<string, Transform> _bones = new();

        public void ApplyMorphology(UnityMorphologyParams morphology, UnityMascotVisuals visuals)
        {
            if (morphology?.boneScales == null) return;
            CacheBones();

            SetBoneScale("head", morphology.boneScales.head);
            SetBoneScale("neck", morphology.boneScales.neck);
            SetBoneScale("body", morphology.boneScales.body);
            SetBoneScale("arm_L", morphology.boneScales.arm_L);
            SetBoneScale("arm_R", morphology.boneScales.arm_R);
            SetBoneScale("leg_L", morphology.boneScales.leg_L);
            SetBoneScale("leg_R", morphology.boneScales.leg_R);
            SetBoneScale("eye_L", morphology.boneScales.eye_L);
            SetBoneScale("eye_R", morphology.boneScales.eye_R);
            SetBoneScale("jaw", morphology.boneScales.jaw);

            if (visuals != null && rigRoot != null)
            {
                var phase = Mathf.Max(0.1f, visuals.phaseScale);
                rigRoot.localScale = Vector3.one * phase;
            }
        }

        void CacheBones()
        {
            if (_bones.Count > 0 || rigRoot == null) return;
            foreach (var t in rigRoot.GetComponentsInChildren<Transform>(true))
                _bones[t.name] = t;
        }

        void SetBoneScale(string boneName, float scale)
        {
            if (!_bones.TryGetValue(boneName, out var bone)) return;
            bone.localScale = Vector3.one * Mathf.Max(0.01f, scale);
        }
    }
}
