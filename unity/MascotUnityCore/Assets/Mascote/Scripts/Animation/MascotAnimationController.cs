using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Idle por mood, one-shots, crossfade. Fallback procedural se não houver Animator clips.
    /// </summary>
    public class MascotAnimationController : MonoBehaviour
    {
        [SerializeField] Animator animator;
        [SerializeField] Transform headBone;
        [SerializeField] Transform bodyBone;
        [SerializeField] BlinkController blink;
        [SerializeField] BreathingController breathing;

        string _currentMood = "neutral";
        string _primaryAnim = "idle";

        public void ApplyLiveState(UnityMascotLiveState live)
        {
            if (live == null) return;

            _currentMood = live.mood ?? "neutral";
            _primaryAnim = live.animation?.primary ?? MoodToIdle(_currentMood);

            if (live.reduceMotion)
            {
                breathing?.SetIntensity(0.2f);
                blink?.SetEnabled(false);
            }
            else
            {
                breathing?.SetIntensity(1f);
                blink?.SetEnabled(true);
            }

            PlayIdle(_primaryAnim, live.animation?.speed ?? 1f);

            if (live.animation?.blend != null && HasClip(live.animation.blend.name))
                CrossFade(live.animation.blend.name, live.animation.blend.weight, 0.25f);
        }

        public void PlayOneShot(string animationName)
        {
            if (HasClip(animationName))
            {
                animator.CrossFade(animationName, 0.15f, 0);
                return;
            }

            // Procedural fallback
            if (animationName == "blink") blink?.TriggerBlink();
            else if (animationName == "smile" && headBone != null)
                StartCoroutine(PunchScale(headBone, 1.08f, 0.2f));
            else if (animationName == "wave" && headBone != null)
                StartCoroutine(PunchScale(headBone, 1.05f, 0.35f));
        }

        public void PlayIdle(string idleKind, float speed)
        {
            if (HasClip(idleKind))
            {
                animator.speed = speed;
                animator.CrossFade(idleKind, 0.3f, 0);
                return;
            }

            breathing?.SetMood(_currentMood);
            animator.speed = speed;
        }

        public void CrossFade(string stateName, float weight, float duration)
        {
            if (!HasClip(stateName)) return;
            animator.CrossFade(stateName, duration, 0, 0f, weight);
        }

        bool HasClip(string name)
        {
            if (animator == null || animator.runtimeAnimatorController == null) return false;
            return animator.HasState(0, Animator.StringToHash(name));
        }

        static string MoodToIdle(string mood) => mood switch
        {
            "sad" => "sad",
            "happy" => "idle",
            "excited" => "excited",
            "exhausted" => "sleep",
            _ => "idle",
        };

        static System.Collections.IEnumerator PunchScale(Transform target, float mult, float duration)
        {
            var baseScale = target.localScale;
            var peak = baseScale * mult;
            var t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                var k = Mathf.Sin((t / duration) * Mathf.PI);
                target.localScale = Vector3.LerpUnclamped(baseScale, peak, k);
                yield return null;
            }
            target.localScale = baseScale;
        }
    }
}
