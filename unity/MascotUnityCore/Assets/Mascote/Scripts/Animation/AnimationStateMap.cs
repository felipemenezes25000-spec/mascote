using System.Collections.Generic;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Mapeamento nome lógico → state hash do Animator Controller.
    /// Usado quando clips reais forem importados no Editor.
    /// </summary>
    public static class AnimationStateMap
    {
        public static readonly IReadOnlyDictionary<string, string> ClipToState = new Dictionary<string, string>
        {
            ["idle"] = "Idle",
            ["blink"] = "Blink",
            ["smile"] = "Smile",
            ["sad"] = "Sad",
            ["excited"] = "Excited",
            ["sleep"] = "Sleep",
            ["wave"] = "Wave",
            ["hatch"] = "Hatch",
            ["celebrate"] = "Celebrate",
            ["rest"] = "Rest",
            ["observe"] = "Observe",
            ["stretch"] = "Stretch",
        };

        public static readonly IReadOnlyDictionary<string, string> MoodToIdle = new Dictionary<string, string>
        {
            ["sad"] = "sad",
            ["happy"] = "idle",
            ["excited"] = "excited",
            ["exhausted"] = "sleep",
            ["neutral"] = "idle",
        };

        public static readonly IReadOnlyDictionary<string, string> HabitToOneShot = new Dictionary<string, string>
        {
            ["water"] = "observe",
            ["sleep"] = "sleep",
            ["exercise"] = "stretch",
            ["meditation"] = "rest",
            ["reading"] = "observe",
            ["journaling"] = "smile",
            ["breath"] = "rest",
            ["outdoor"] = "stretch",
            ["sun"] = "smile",
        };

        public static string ResolveClip(string logicalName)
        {
            if (string.IsNullOrEmpty(logicalName)) return "idle";
            return ClipToState.ContainsKey(logicalName) ? logicalName : "idle";
        }
    }
}
