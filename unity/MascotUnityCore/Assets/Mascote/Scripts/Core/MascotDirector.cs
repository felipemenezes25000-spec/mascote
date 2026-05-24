using Mascote.Unity.Animation;
using Mascote.Unity.Bridge;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Orquestrador principal — ApplyState, PlayEvent, SetQuality.
    /// </summary>
    public class MascotDirector : MonoBehaviour
    {
        [SerializeField] MascotController mascotController;
        [SerializeField] MascotReactionController reactionController;
        [SerializeField] MascotQualityController qualityController;
        [SerializeField] MascotEnvironmentController environmentController;
        [SerializeField] OutboundEventDispatcher outbound;

        readonly MascotStateStore _store = new();

        public MascotStateStore Store => _store;

        void Awake()
        {
            // Auto-wire: tenta achar controllers no MascotRoot da cena se não foram setados.
            if (mascotController == null) mascotController = FindFirstObjectByType<MascotController>();
            if (reactionController == null) reactionController = FindFirstObjectByType<MascotReactionController>();
            if (qualityController == null) qualityController = FindFirstObjectByType<MascotQualityController>();
            if (environmentController == null) environmentController = FindFirstObjectByType<MascotEnvironmentController>();
        }

        public bool ApplyState(UnityMascotState state, int seq)
        {
            if (state == null)
            {
                outbound?.SendError("NULL_STATE", "state.update with null state", true);
                return false;
            }

            if (state.schemaVersion != 1)
            {
                outbound?.SendError("SCHEMA_MISMATCH", $"Expected schemaVersion 1, got {state.schemaVersion}", true);
                return false;
            }

            if (!_store.TryApply(state, seq)) return false;

            mascotController?.ApplyFromState(state);
            environmentController?.ApplyEnvironment(state.environment, state.state?.mood);
            qualityController?.ApplyPreset(state.environment?.quality, state.state?.reduceMotion ?? false);

            if (state.pendingEvent != null)
                reactionController?.PlayEvent(state.pendingEvent);

            return true;
        }

        public void PlayEvent(UnityMascotEvent evt, int seq)
        {
            if (evt == null) return;
            reactionController?.PlayEvent(evt);
        }

        public void HandleGesture(string gesture)
        {
            reactionController?.PlayGesture(gesture);
        }

        public void SetQuality(string quality)
        {
            qualityController?.ApplyPreset(quality);
        }
    }
}
