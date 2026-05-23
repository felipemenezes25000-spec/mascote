using Mascote.Unity.Animation;
using UnityEngine;

namespace Mascote.Unity.VFX
{
    /// <summary>
    /// Placeholder VFX — ativa partículas por evento até assets reais.
    /// </summary>
    public class MascotVfxController : MonoBehaviour
    {
        [SerializeField] ParticleSystem celebrateFx;
        [SerializeField] ParticleSystem habitFx;

        public void PlayCelebrate()
        {
            if (celebrateFx != null) celebrateFx.Play();
        }

        public void PlayHabit(string habit)
        {
            if (habitFx == null) return;
            var main = habitFx.main;
            main.startColor = habit switch
            {
                "water" => new Color(0.4f, 0.7f, 1f),
                "sleep" => new Color(0.6f, 0.5f, 0.9f),
                "exercise" => new Color(1f, 0.6f, 0.3f),
                _ => Color.white,
            };
            habitFx.Play();
        }
    }
}
