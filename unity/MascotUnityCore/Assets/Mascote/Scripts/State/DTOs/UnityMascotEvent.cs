using System;
using System.Collections.Generic;

namespace Mascote.Unity.State
{
    /// <summary>
    /// Eventos pendentes / event.play — discriminação por <see cref="kind"/>.
    /// Espelha UnityMascotEvent em types.ts.
    /// </summary>
    [Serializable]
    public class UnityMascotEvent
    {
        public string kind;

        // habit
        public string habit;
        public float? intensity;

        // phase.advanced
        public string from;
        public string to;

        // mutation.unlocked
        public string mutationId;
        public string rarity;

        // checkin.completed
        public int? xpGained;

        // gesture
        public string gesture;

        // custom
        public string name;
        public Dictionary<string, object> payload;

        public bool IsHabit => kind == "habit";
        public bool IsPhaseAdvanced => kind == "phase.advanced";
        public bool IsMutationUnlocked => kind == "mutation.unlocked";
        public bool IsCheckinCompleted => kind == "checkin.completed";
        public bool IsGesture => kind == "gesture";
        public bool IsCustom => kind == "custom";
    }
}
