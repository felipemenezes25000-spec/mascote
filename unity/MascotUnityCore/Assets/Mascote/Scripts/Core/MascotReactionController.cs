using Mascote.Unity.Animation;
using Mascote.Unity.Bridge;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Reações: hábito, toque, retorno, level up, evolução, mutação.
    /// </summary>
    public class MascotReactionController : MonoBehaviour
    {
        [SerializeField] MascotAnimationController animation;
        [SerializeField] OutboundEventDispatcher outbound;

        public void PlayEvent(UnityMascotEvent evt)
        {
            if (evt == null) return;

            if (evt.IsHabit)
            {
                var anim = AnimationStateMap.HabitToOneShot.TryGetValue(evt.habit ?? "", out var mapped)
                    ? mapped
                    : "idle";
                animation?.PlayOneShot(anim);
                outbound?.SendAnimationComplete(anim);
                return;
            }

            if (evt.IsPhaseAdvanced)
            {
                animation?.PlayOneShot("hatch");
                outbound?.SendAnimationComplete("hatch");
                return;
            }

            if (evt.IsMutationUnlocked)
            {
                animation?.PlayOneShot("celebrate");
                outbound?.SendAnimationComplete("celebrate");
                return;
            }

            if (evt.IsCheckinCompleted)
            {
                var anim = AnimationStateMap.HabitToOneShot.TryGetValue(evt.habit ?? "", out var mapped)
                    ? mapped
                    : "smile";
                animation?.PlayOneShot(anim);
                outbound?.SendAnimationComplete(anim);
                return;
            }

            if (evt.IsGesture)
            {
                PlayGesture(evt.gesture);
                return;
            }

            if (evt.IsCustom)
                animation?.PlayOneShot(evt.name ?? "idle");
        }

        public void PlayGesture(string gesture)
        {
            var anim = gesture switch
            {
                "pet" => "smile",
                "tap" => "wave",
                "poke" => "blink",
                _ => "idle",
            };
            animation?.PlayOneShot(anim);
            outbound?.SendGestureReceived(gesture);
            outbound?.SendAnimationComplete(anim);
        }
    }
}
