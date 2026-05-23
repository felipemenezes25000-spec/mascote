using System.Collections.Generic;
using Mascote.Unity.Animation;
using Mascote.Unity.State;
using Mascote.Unity.Utils;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Aplica species, mood, morphology, visuals, accessories, mutations ao rig.
    /// </summary>
    public class MascotController : MonoBehaviour
    {
        static readonly int BodyColorId = Shader.PropertyToID("_BaseColor");
        static readonly int AccentColorId = Shader.PropertyToID("_EmissionColor");

        [SerializeField] Transform mascotRoot;
        [SerializeField] Renderer[] tintRenderers;
        [SerializeField] MascotMorphologyController morphology;
        [SerializeField] MascotAccessoryController accessories;
        [SerializeField] MascotAnimationController animation;
        [SerializeField] IdleBehaviorController idleBehavior;
        [SerializeField] LookAtTouchController lookAtTouch;

        readonly MaterialPropertyBlock _mpb = new();
        UnityMascotState _current;

        public void ApplyFromState(UnityMascotState state)
        {
            _current = state;
            if (state == null) return;

            EnsureRoot();
            morphology?.ApplyMorphology(state.morphology, state.visuals);
            accessories?.ApplyAccessories(state.accessories);
            animation?.ApplyLiveState(state.state);
            ApplyVisualTints(state.visuals);

            var reduce = state.state?.reduceMotion ?? false;
            idleBehavior?.SetMood(state.state?.mood);
            idleBehavior?.SetEnabled(!reduce);
            lookAtTouch?.SetEnabled(!reduce);
        }

        void EnsureRoot()
        {
            if (mascotRoot != null) return;
            mascotRoot = transform.Find("MascotRoot");
            if (mascotRoot == null)
            {
                var go = new GameObject("MascotRoot");
                go.transform.SetParent(transform, false);
                mascotRoot = go.transform;
            }
        }

        void ApplyVisualTints(UnityMascotVisuals visuals)
        {
            if (visuals == null) return;

            var body = HexColorUtil.IntToColor(visuals.bodyTint);
            var accent = HexColorUtil.IntToColor(visuals.accentTint);
            var glow = HexColorUtil.IntToColor(visuals.glowTint);
            var emissive = accent * (visuals.emissiveIntensity * (visuals.evolution?.glowMultiplier ?? 1f));

            if (tintRenderers == null || tintRenderers.Length == 0)
            {
                tintRenderers = mascotRoot != null
                    ? mascotRoot.GetComponentsInChildren<Renderer>()
                    : GetComponentsInChildren<Renderer>();
            }

            foreach (var r in tintRenderers)
            {
                if (r == null) continue;
                r.GetPropertyBlock(_mpb);
                _mpb.SetColor(BodyColorId, body);
                _mpb.SetColor(AccentColorId, emissive + glow * 0.25f);
                r.SetPropertyBlock(_mpb);
            }
        }

        public void HandleGesture(string gesture, Vector2 normalized)
        {
            lookAtTouch?.HandleTouch(gesture, normalized);
        }

        public string CurrentBaseModel => _current?.identity?.baseModel;
        public string CurrentMood => _current?.state?.mood;
    }
}
