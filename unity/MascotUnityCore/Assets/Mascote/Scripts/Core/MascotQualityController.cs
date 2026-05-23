using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Presets low / medium / high / auto + reduceMotion override.
    /// </summary>
    public class MascotQualityController : MonoBehaviour
    {
        public enum QualityLevel { Auto, Low, Medium, High }

        [SerializeField] int targetFrameRate = 60;
        [SerializeField] ParticleSystem[] vfxSystems;

        QualityLevel _current = QualityLevel.Auto;
        bool _reduceMotion;

        public void ApplyPreset(string quality, bool reduceMotion = false)
        {
            _reduceMotion = reduceMotion;
            _current = quality switch
            {
                "low" => QualityLevel.Low,
                "medium" => QualityLevel.Medium,
                "high" => QualityLevel.High,
                _ => QualityLevel.Auto,
            };
            ApplyResolved(Resolve(_current));
        }

        static QualityLevel Resolve(QualityLevel preset)
        {
            if (preset != QualityLevel.Auto) return preset;
            return SystemInfo.systemMemorySize < 3000 ? QualityLevel.Low : QualityLevel.Medium;
        }

        void ApplyResolved(QualityLevel level)
        {
            if (_reduceMotion) level = QualityLevel.Low;

            switch (level)
            {
                case QualityLevel.Low:
                    QualitySettings.SetQualityLevel(0, true);
                    Application.targetFrameRate = 30;
                    SetVfx(false, 0.3f);
                    break;
                case QualityLevel.Medium:
                    QualitySettings.SetQualityLevel(2, true);
                    Application.targetFrameRate = 45;
                    SetVfx(true, 0.6f);
                    break;
                case QualityLevel.High:
                    QualitySettings.SetQualityLevel(4, true);
                    Application.targetFrameRate = targetFrameRate;
                    SetVfx(true, 1f);
                    break;
            }
        }

        void SetVfx(bool enabled, float rate)
        {
            if (vfxSystems == null) return;
            foreach (var ps in vfxSystems)
            {
                if (ps == null) continue;
                var emission = ps.emission;
                emission.rateOverTimeMultiplier = enabled ? rate : 0f;
                if (!enabled && ps.isPlaying) ps.Stop(true, ParticleSystemStopBehavior.StopEmitting);
                else if (enabled && !ps.isPlaying) ps.Play();
            }
        }
    }
}
