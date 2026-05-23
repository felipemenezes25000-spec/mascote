using UnityEngine;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Respiração procedural no body — amplitude por mood.
    /// </summary>
    public class BreathingController : MonoBehaviour
    {
        [SerializeField] Transform body;
        [SerializeField] float baseAmplitude = 0.02f;

        float _intensity = 1f;
        string _mood = "neutral";
        Vector3 _baseScale;

        void Awake()
        {
            if (body != null) _baseScale = body.localScale;
        }

        void Update()
        {
            if (body == null) return;

            var amp = baseAmplitude * _intensity * MoodMultiplier(_mood);
            var breath = 1f + Mathf.Sin(Time.time * BreathSpeed(_mood)) * amp;
            body.localScale = new Vector3(_baseScale.x, _baseScale.y * breath, _baseScale.z);
        }

        public void SetIntensity(float intensity) => _intensity = Mathf.Clamp01(intensity);

        public void SetMood(string mood) => _mood = mood ?? "neutral";

        static float MoodMultiplier(string mood) => mood switch
        {
            "excited" => 1.4f,
            "exhausted" => 0.5f,
            "sad" => 0.7f,
            _ => 1f,
        };

        static float BreathSpeed(string mood) => mood switch
        {
            "excited" => 3.5f,
            "exhausted" => 1.2f,
            _ => 2.2f,
        };
    }
}
