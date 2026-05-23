using System;

namespace Mascote.Unity.State
{
    /// <summary>
    /// Último estado aplicado + sequência monotônica do bridge.
    /// </summary>
    public sealed class MascotStateStore
    {
        public UnityMascotState Current { get; private set; }
        public int LastSeq { get; private set; } = -1;

        public event Action<UnityMascotState> OnStateChanged;

        public bool TryApply(UnityMascotState state, int seq)
        {
            if (state == null) return false;
            if (seq <= LastSeq && LastSeq >= 0) return false;

            LastSeq = seq;
            Current = state;
            OnStateChanged?.Invoke(state);
            return true;
        }

        public void ForceSet(UnityMascotState state)
        {
            Current = state;
            OnStateChanged?.Invoke(state);
        }

        public void Clear()
        {
            Current = null;
            LastSeq = -1;
        }
    }
}
