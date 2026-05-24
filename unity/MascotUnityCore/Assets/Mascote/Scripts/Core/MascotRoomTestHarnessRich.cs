using System.Collections.Generic;
using System.Text;
using Mascote.Unity.Bridge;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// HUD overlay rico pra dev/QA. 3 colunas:
    ///   1) Identidade (4 mascotes, mood, fase)
    ///   2) Reações (habit, gesture, quality)
    ///   3) Acessórios (drop/clear de cada slot)
    ///
    /// Substitui ou complementa MascotRoomTestHarness — mais widgets, mais bonito.
    /// </summary>
    public class MascotRoomTestHarnessRich : MonoBehaviour
    {
        [SerializeField] UnityMessageRouter router;
        [SerializeField] MascotDirector director;

        readonly Dictionary<string, bool> _equipped = new();
        int _seq = 1000;
        string _currentMascot = "bipo";
        string _currentMood = "happy";
        string _currentPersonality = "calm";
        string _statusLine = "(idle)";

        static readonly string[] Mascots = { "bipo", "zip", "lulu", "aro" };
        static readonly string[] Moods = { "happy", "sad", "excited", "calm", "exhausted", "playful" };
        static readonly string[] Habits = { "water", "sleep", "exercise", "meditation", "reading", "breath" };
        static readonly string[] Personalities = { "calm", "playful", "wise", "cute", "fierce" };

        // (assetKey, slot)
        static readonly (string key, string slot)[] Accessories =
        {
            ("cap_classic","hat"),   ("beanie","hat"),         ("crown_flowers","hat"),
            ("crown_royal","hat"),   ("flame_mane","hat"),     ("flower_daisy","hat"),
            ("bow_tie","hat"),
            ("glasses_round","glasses"), ("sunglasses","glasses"), ("monocle_gold","glasses"),
            ("scarf_cozy","neck"),
            ("cape_velvet","back"),  ("wings_angel","back"),   ("wings_butterfly","back"),
            ("wings_dragon","back"), ("sword_floating","back"),
            ("heart_glow","body"),
            ("aura_cosmic","aura"),
        };

        public void ApplyMascot(string baseModel, string personality, string mood)
        {
            _currentMascot = baseModel;
            _currentMood = mood;
            _currentPersonality = personality;
            _equipped.Clear();
            SendState(BuildStateJson(baseModel, personality, mood, new List<(string, string)>()));
            _statusLine = $"Applied: {baseModel} ({personality}, {mood})";
        }

        public void SetMood(string mood)
        {
            _currentMood = mood;
            SendState(BuildStateJson(_currentMascot, _currentPersonality, mood, CurrentAccessories()));
            _statusLine = $"Mood → {mood}";
        }

        public void ToggleAccessory(string assetKey, string slot)
        {
            _equipped[assetKey] = !_equipped.GetValueOrDefault(assetKey);
            SendState(BuildStateJson(_currentMascot, _currentPersonality, _currentMood, CurrentAccessories()));
            _statusLine = _equipped[assetKey] ? $"Equip: {assetKey}" : $"Unequip: {assetKey}";
        }

        public void ClearAccessories()
        {
            _equipped.Clear();
            SendState(BuildStateJson(_currentMascot, _currentPersonality, _currentMood, new List<(string, string)>()));
            _statusLine = "Cleared accessories";
        }

        public void PlayHabit(string habit)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"habit\",\"habit\":\"{habit}\"}},\"seq\":{_seq++}}}");
            _statusLine = $"Event: habit.{habit}";
        }

        public void PlayGesture(string g)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.Gesture}\",\"gesture\":\"{g}\"}}");
            _statusLine = $"Gesture: {g}";
        }

        public void PlayPhaseAdvance()
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"phase.advanced\",\"from\":\"teen\",\"to\":\"adult\"}},\"seq\":{_seq++}}}");
            _statusLine = "Event: phase.advanced (teen→adult)";
        }

        public void PlayMutationUnlocked()
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"mutation.unlocked\",\"mutationId\":\"wings_spark\",\"rarity\":\"legendary\"}},\"seq\":{_seq++}}}");
            _statusLine = "Event: mutation.legendary";
        }

        public void SetQuality(string q)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.QualitySet}\",\"quality\":\"{q}\"}}");
            _statusLine = $"Quality → {q}";
        }

        void SendState(string stateJson)
        {
            var wrapped = $"{{\"type\":\"{BridgeMessageTypes.StateUpdate}\",\"state\":{stateJson},\"seq\":{_seq++}}}";
            router?.RouteJson(wrapped);
        }

        List<(string, string)> CurrentAccessories()
        {
            var list = new List<(string, string)>();
            foreach (var (k, s) in Accessories)
                if (_equipped.GetValueOrDefault(k)) list.Add((k, s));
            return list;
        }

        static string BuildStateJson(string baseModel, string personality, string mood, List<(string key, string slot)> accs)
        {
            var sb = new StringBuilder();
            sb.Append("{\"schemaVersion\":1,\"identity\":{\"id\":\"harness\",\"name\":\"")
              .Append(baseModel).Append("\",\"personality\":\"").Append(personality)
              .Append("\",\"seed\":42,\"baseModel\":\"").Append(baseModel).Append("\"},");
            sb.Append("\"progression\":{\"phase\":\"adult\",\"level\":7,\"xp\":120,\"energy\":85,\"health\":92},");
            sb.Append("\"state\":{\"mood\":\"").Append(mood).Append("\",\"animation\":{\"primary\":\"idle\",\"speed\":1},\"reduceMotion\":false,\"lastSeenAt\":\"2026-05-23T12:00:00Z\"},");
            sb.Append("\"dna\":{\"empathy\":0.5,\"curiosity\":0.5,\"creativity\":0.5,\"discipline\":0.5,\"chaos\":0.3,\"aggression\":0.2,\"resilience\":0.6,\"emotionalDepth\":0.5,\"socialEnergy\":0.5,\"adaptability\":0.5,\"intelligence\":0.5},");
            sb.Append("\"visuals\":{\"bodyTint\":16777215,\"accentTint\":16711935,\"glowTint\":65535,\"emissiveIntensity\":0.25,\"roughness\":0.5,\"metalness\":0.1,\"clearcoat\":0,\"pattern\":\"plain\",\"phaseScale\":1},");
            sb.Append("\"morphology\":{\"boneScales\":{\"head\":1,\"neck\":1,\"body\":1,\"arm_L\":1,\"arm_R\":1,\"leg_L\":1,\"leg_R\":1,\"eye_L\":1,\"eye_R\":1,\"jaw\":1},\"limbCount\":4,\"eyeSize\":1,\"hasTail\":false,\"hasSpikes\":false,\"pattern\":\"plain\"},");
            sb.Append("\"accessories\":[");
            for (int i = 0; i < accs.Count; i++)
            {
                if (i > 0) sb.Append(',');
                var (key, slot) = accs[i];
                sb.Append("{\"id\":\"").Append(key)
                  .Append("\",\"slot\":\"").Append(slot)
                  .Append("\",\"bone\":\"head\",\"assetKey\":\"").Append(key)
                  .Append("\",\"scale\":1}");
            }
            sb.Append("],\"mutations\":[],\"environment\":{\"sceneId\":\"mascot_room\",\"tint\":\"#E8F0FF\",\"quality\":\"high\"}}");
            return sb.ToString();
        }

        void OnGUI()
        {
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            const int colW = 220;
            const int gap = 8;
            const int row = 26;
            var bg = new GUIStyle(GUI.skin.box);

            int x0 = 12;
            int y0 = 12;

            // ===== COLUNA 1: Identidade =====
            GUI.Box(new Rect(x0, y0, colW, 270), "Identidade", bg);
            int y = y0 + 22;
            GUI.Label(new Rect(x0 + 10, y, colW - 20, row), "Mascote:");
            y += 20;
            for (int i = 0; i < Mascots.Length; i++)
            {
                int bx = x0 + 8 + (i % 2) * (colW / 2 - 2);
                int by = y + (i / 2) * (row + 4);
                var label = _currentMascot == Mascots[i] ? $"● {Mascots[i]}" : Mascots[i];
                if (GUI.Button(new Rect(bx, by, colW / 2 - 12, row), label))
                    ApplyMascot(Mascots[i], _currentPersonality, _currentMood);
            }
            y += 2 * (row + 4) + 6;
            GUI.Label(new Rect(x0 + 10, y, colW - 20, row), "Mood:");
            y += 20;
            for (int i = 0; i < Moods.Length; i++)
            {
                int bx = x0 + 8 + (i % 2) * (colW / 2 - 2);
                int by = y + (i / 2) * (row + 4);
                var label = _currentMood == Moods[i] ? $"● {Moods[i]}" : Moods[i];
                if (GUI.Button(new Rect(bx, by, colW / 2 - 12, row), label))
                    SetMood(Moods[i]);
            }

            // ===== COLUNA 2: Reações =====
            int x1 = x0 + colW + gap;
            GUI.Box(new Rect(x1, y0, colW, 320), "Reações & Eventos", bg);
            y = y0 + 22;
            GUI.Label(new Rect(x1 + 10, y, colW - 20, row), "Habit:");
            y += 20;
            for (int i = 0; i < Habits.Length; i++)
            {
                int bx = x1 + 8 + (i % 2) * (colW / 2 - 2);
                int by = y + (i / 2) * (row + 4);
                if (GUI.Button(new Rect(bx, by, colW / 2 - 12, row), Habits[i]))
                    PlayHabit(Habits[i]);
            }
            y += 3 * (row + 4) + 6;
            GUI.Label(new Rect(x1 + 10, y, colW - 20, row), "Gesture:");
            y += 20;
            if (GUI.Button(new Rect(x1 + 8, y, (colW - 24) / 3, row), "pet")) PlayGesture("pet");
            if (GUI.Button(new Rect(x1 + 8 + (colW - 24) / 3 + 4, y, (colW - 24) / 3, row), "tap")) PlayGesture("tap");
            if (GUI.Button(new Rect(x1 + 8 + 2 * ((colW - 24) / 3 + 4), y, (colW - 24) / 3, row), "poke")) PlayGesture("poke");
            y += row + 8;
            GUI.Label(new Rect(x1 + 10, y, colW - 20, row), "Special:");
            y += 20;
            if (GUI.Button(new Rect(x1 + 8, y, colW - 16, row), "Phase Advance (teen→adult)")) PlayPhaseAdvance();
            y += row + 4;
            if (GUI.Button(new Rect(x1 + 8, y, colW - 16, row), "Mutation: Legendary")) PlayMutationUnlocked();
            y += row + 8;
            GUI.Label(new Rect(x1 + 10, y, colW - 20, row), "Quality:");
            y += 20;
            if (GUI.Button(new Rect(x1 + 8, y, (colW - 24) / 3, row), "low")) SetQuality("low");
            if (GUI.Button(new Rect(x1 + 8 + (colW - 24) / 3 + 4, y, (colW - 24) / 3, row), "med")) SetQuality("medium");
            if (GUI.Button(new Rect(x1 + 8 + 2 * ((colW - 24) / 3 + 4), y, (colW - 24) / 3, row), "high")) SetQuality("high");

            // ===== COLUNA 3: Acessórios =====
            int x2 = x1 + colW + gap;
            int accCol = 260;
            GUI.Box(new Rect(x2, y0, accCol, 30 + ((Accessories.Length + 1) / 2) * (row + 4) + 40), "Acessórios (toggle)", bg);
            y = y0 + 22;
            for (int i = 0; i < Accessories.Length; i++)
            {
                int bx = x2 + 8 + (i % 2) * (accCol / 2 - 2);
                int by = y + (i / 2) * (row + 4);
                var (key, slot) = Accessories[i];
                var on = _equipped.GetValueOrDefault(key);
                var label = (on ? "● " : "  ") + key;
                if (GUI.Button(new Rect(bx, by, accCol / 2 - 12, row), label))
                    ToggleAccessory(key, slot);
            }
            int lastRowY = y + ((Accessories.Length + 1) / 2) * (row + 4) + 8;
            if (GUI.Button(new Rect(x2 + 8, lastRowY, accCol - 16, row), "Clear All Accessories"))
                ClearAccessories();

            // ===== STATUS BAR =====
            var statusY = Screen.height - 30;
            GUI.Box(new Rect(12, statusY, Screen.width - 24, 22), $"Status: {_statusLine}    |    Mascote: {_currentMascot}    |    Mood: {_currentMood}    |    Personality: {_currentPersonality}", bg);
#endif
        }
    }
}
