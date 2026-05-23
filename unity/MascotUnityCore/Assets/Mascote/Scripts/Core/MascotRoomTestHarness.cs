using Mascote.Unity.Bridge;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Painel de debug: colar JSON de estado / disparar eventos (Editor + dev builds).
    /// </summary>
    public class MascotRoomTestHarness : MonoBehaviour
    {
        [SerializeField] UnityMessageRouter router;
        [SerializeField] MascotDirector director;
        [TextArea(8, 20)]
        [SerializeField] string sampleStateJson;
        [TextArea(3, 6)]
        [SerializeField] string sampleEventJson;

        int _seq = 1;

        [ContextMenu("Apply Sample State")]
        public void ApplySampleState()
        {
            if (string.IsNullOrWhiteSpace(sampleStateJson))
                sampleStateJson = TestHarnessDefaults.MinimalStateJson;

            var wrapped = $"{{\"type\":\"{BridgeMessageTypes.StateUpdate}\",\"state\":{sampleStateJson},\"seq\":{_seq++}}}";
            router?.RouteJson(wrapped);
        }

        [ContextMenu("Play Sample Habit Event")]
        public void PlaySampleHabit() => PlayHabit("water");

        public void PlayHabit(string habit)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"habit\",\"habit\":\"{habit}\"}},\"seq\":{_seq++}}}");
        }

        [ContextMenu("Ping Bridge")]
        public void Ping() => router?.Ping();

        [ContextMenu("Simulate Pet Gesture")]
        public void SimulatePet() => SimulateGesture("pet");

        public void SimulateGesture(string gesture)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.Gesture}\",\"gesture\":\"{gesture}\"}}");
        }

        public void PlayPhaseAdvanced()
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"phase.advanced\",\"from\":\"teen\",\"to\":\"adult\"}},\"seq\":{_seq++}}}");
        }

        public void PlayMutationUnlocked()
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.EventPlay}\",\"event\":{{\"kind\":\"mutation.unlocked\",\"mutationId\":\"wings_spark\",\"rarity\":\"epic\"}},\"seq\":{_seq++}}}");
        }

        public void SetQuality(string quality)
        {
            router?.RouteJson($"{{\"type\":\"{BridgeMessageTypes.QualitySet}\",\"quality\":\"{quality}\"}}");
        }

        public void ApplyAccessoriesState()
        {
            sampleStateJson = TestHarnessDefaults.AccessoriesStateJson;
            ApplySampleState();
        }

        void OnGUI()
        {
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            if (!Debug.isDebugBuild && !Application.isEditor) return;

            const int w = 340;
            var y = 12f;
            GUI.Box(new Rect(12, y, w, 420), "Mascot Test Harness");
            y += 28;

            if (GUI.Button(new Rect(24, y, w - 24, 28), "Ping")) Ping();
            y += 32;
            if (GUI.Button(new Rect(24, y, w - 24, 28), "Apply Sample State")) ApplySampleState();
            y += 32;
            if (GUI.Button(new Rect(24, y, w - 24, 28), "State + Accessories")) ApplyAccessoriesState();
            y += 32;
            if (GUI.Button(new Rect(24, y, 160, 28), "Habit: water")) PlayHabit("water");
            if (GUI.Button(new Rect(192, y, 148, 28), "Habit: sleep")) PlayHabit("sleep");
            y += 32;
            if (GUI.Button(new Rect(24, y, 160, 28), "Habit: exercise")) PlayHabit("exercise");
            if (GUI.Button(new Rect(192, y, 148, 28), "Habit: breath")) PlayHabit("breath");
            y += 32;
            if (GUI.Button(new Rect(24, y, 160, 28), "Phase Advanced")) PlayPhaseAdvanced();
            if (GUI.Button(new Rect(192, y, 148, 28), "Mutation")) PlayMutationUnlocked();
            y += 32;
            if (GUI.Button(new Rect(24, y, 100, 28), "Pet")) SimulateGesture("pet");
            if (GUI.Button(new Rect(130, y, 100, 28), "Tap")) SimulateGesture("tap");
            if (GUI.Button(new Rect(236, y, 104, 28), "Poke")) SimulateGesture("poke");
            y += 32;
            if (GUI.Button(new Rect(24, y, 100, 28), "Q: low")) SetQuality("low");
            if (GUI.Button(new Rect(130, y, 100, 28), "Q: med")) SetQuality("medium");
            if (GUI.Button(new Rect(236, y, 104, 28), "Q: high")) SetQuality("high");
#endif
        }
    }

    internal static class TestHarnessDefaults
    {
        public const string MinimalStateJson =
            "{\"schemaVersion\":1,\"identity\":{\"id\":\"test\",\"name\":\"Mascote\",\"personality\":\"calm\",\"seed\":42,\"baseModel\":\"bipo\"}," +
            "\"progression\":{\"phase\":\"adult\",\"level\":5,\"xp\":100,\"energy\":80,\"health\":90}," +
            "\"state\":{\"mood\":\"happy\",\"animation\":{\"primary\":\"idle\",\"speed\":1},\"reduceMotion\":false,\"lastSeenAt\":\"2026-05-23T12:00:00Z\"}," +
            "\"dna\":{\"empathy\":0.5,\"curiosity\":0.5,\"creativity\":0.5,\"discipline\":0.5,\"chaos\":0.3,\"aggression\":0.2,\"resilience\":0.6,\"emotionalDepth\":0.5,\"socialEnergy\":0.5,\"adaptability\":0.5,\"intelligence\":0.5}," +
            "\"visuals\":{\"bodyTint\":16777215,\"accentTint\":16711935,\"glowTint\":65535,\"emissiveIntensity\":0.2,\"roughness\":0.6,\"metalness\":0.1,\"clearcoat\":0,\"pattern\":\"plain\",\"phaseScale\":1}," +
            "\"morphology\":{\"boneScales\":{\"head\":1,\"neck\":1,\"body\":1,\"arm_L\":1,\"arm_R\":1,\"leg_L\":1,\"leg_R\":1,\"eye_L\":1,\"eye_R\":1,\"jaw\":1},\"limbCount\":4,\"eyeSize\":1,\"hasTail\":false,\"hasSpikes\":false,\"pattern\":\"plain\"}," +
            "\"accessories\":[],\"mutations\":[],\"environment\":{\"sceneId\":\"mascot_room\",\"tint\":\"#E8F0FF\",\"quality\":\"auto\"}}";

        public const string AccessoriesStateJson =
            "{\"schemaVersion\":1,\"identity\":{\"id\":\"test\",\"name\":\"Mascote\",\"personality\":\"cute\",\"seed\":42,\"baseModel\":\"lulu\"}," +
            "\"progression\":{\"phase\":\"adult\",\"level\":8,\"xp\":200,\"energy\":80,\"health\":90}," +
            "\"state\":{\"mood\":\"excited\",\"animation\":{\"primary\":\"excited\",\"speed\":1},\"reduceMotion\":false,\"lastSeenAt\":\"2026-05-23T12:00:00Z\"}," +
            "\"dna\":{\"empathy\":0.5,\"curiosity\":0.5,\"creativity\":0.5,\"discipline\":0.5,\"chaos\":0.3,\"aggression\":0.2,\"resilience\":0.6,\"emotionalDepth\":0.5,\"socialEnergy\":0.5,\"adaptability\":0.5,\"intelligence\":0.5}," +
            "\"visuals\":{\"bodyTint\":16777215,\"accentTint\":16711935,\"glowTint\":65535,\"emissiveIntensity\":0.3,\"roughness\":0.6,\"metalness\":0.1,\"clearcoat\":0,\"pattern\":\"plain\",\"phaseScale\":1}," +
            "\"morphology\":{\"boneScales\":{\"head\":1,\"neck\":1,\"body\":1,\"arm_L\":1,\"arm_R\":1,\"leg_L\":1,\"leg_R\":1,\"eye_L\":1,\"eye_R\":1,\"jaw\":1},\"limbCount\":4,\"eyeSize\":1,\"hasTail\":false,\"hasSpikes\":false,\"pattern\":\"plain\"}," +
            "\"accessories\":[" +
            "{\"id\":\"cap_classic\",\"slot\":\"hat\",\"bone\":\"head\",\"assetKey\":\"cap_classic\",\"scale\":1}," +
            "{\"id\":\"glasses_round\",\"slot\":\"glasses\",\"bone\":\"head\",\"assetKey\":\"glasses_round\",\"scale\":1}" +
            "],\"mutations\":[],\"environment\":{\"sceneId\":\"forest\",\"tint\":\"#D4EDDA\",\"quality\":\"medium\"}}";
    }
}
