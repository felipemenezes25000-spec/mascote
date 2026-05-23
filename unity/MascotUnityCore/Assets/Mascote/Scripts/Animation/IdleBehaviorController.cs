using UnityEngine;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Micro-movimentos idle: sway da cabeça, olhar ocasional, pausa quando reduceMotion.
    /// </summary>
    public class IdleBehaviorController : MonoBehaviour
    {
        [SerializeField] Transform headBone;
        [SerializeField] Transform bodyBone;
        [SerializeField] float swayAmplitude = 3f;
        [SerializeField] float swaySpeed = 0.6f;

        bool _enabled = true;
        string _mood = "neutral";
        float _phaseOffset;
        Quaternion _headBase;
        Quaternion _bodyBase;

        void Awake()
        {
            _phaseOffset = Random.Range(0f, Mathf.PI * 2f);
            if (headBone != null) _headBase = headBone.localRotation;
            if (bodyBone != null) _bodyBase = bodyBone.localRotation;
        }

        void Update()
        {
            if (!_enabled) return;

            var amp = swayAmplitude * MoodSway(_mood);
            var t = Time.time * swaySpeed + _phaseOffset;

            if (headBone != null)
            {
                var yaw = Mathf.Sin(t) * amp;
                var pitch = Mathf.Sin(t * 0.7f) * amp * 0.35f;
                headBone.localRotation = _headBase * Quaternion.Euler(pitch, yaw, 0f);
            }

            if (bodyBone != null)
            {
                var roll = Mathf.Sin(t * 0.5f) * amp * 0.15f;
                bodyBone.localRotation = _bodyBase * Quaternion.Euler(0f, 0f, roll);
            }
        }

        public void SetMood(string mood)
        {
            _mood = mood ?? "neutral";
        }

        public void SetEnabled(bool enabled)
        {
            _enabled = enabled;
            if (!enabled)
            {
                if (headBone != null) headBone.localRotation = _headBase;
                if (bodyBone != null) bodyBone.localRotation = _bodyBase;
            }
        }

        static float MoodSway(string mood) => mood switch
        {
            "excited" => 1.4f,
            "sad" => 0.5f,
            "exhausted" => 0.3f,
            _ => 1f,
        };
    }
}
