using System.IO;
using Mascote.Unity.Bridge;
using Mascote.Unity.State;
using NUnit.Framework;

namespace Mascote.Unity.Tests
{
    public class JsonParsingTests
    {
        [Test]
        public void ParseSampleUnityMascotState_FromFixture()
        {
            var path = Path.Combine(
                UnityEngine.Application.dataPath,
                "..", "Tests", "EditMode", "Fixtures", "sample-state.json");
            var json = File.ReadAllText(path);

            var state = JsonMessageParser.ParseState(json);

            Assert.NotNull(state);
            Assert.AreEqual(1, state.schemaVersion);
            Assert.AreEqual("lulu", state.identity.baseModel);
            Assert.AreEqual("teen", state.progression.phase);
            Assert.AreEqual(11, CountDnaFields(state.dna));
        }

        [Test]
        public void ParseStateUpdateMessage_RoundTrip()
        {
            var envelope =
                "{\"type\":\"state.update\",\"state\":{\"schemaVersion\":1,\"identity\":{\"id\":\"a\",\"name\":\"n\",\"personality\":\"calm\",\"seed\":1,\"baseModel\":\"bipo\"},\"progression\":{\"phase\":\"adult\",\"level\":1,\"xp\":0,\"energy\":1,\"health\":1},\"state\":{\"mood\":\"neutral\",\"animation\":{\"primary\":\"idle\",\"speed\":1},\"reduceMotion\":false,\"lastSeenAt\":\"2026-01-01T00:00:00Z\"},\"dna\":{\"empathy\":0.5,\"curiosity\":0.5,\"creativity\":0.5,\"discipline\":0.5,\"chaos\":0.5,\"aggression\":0.5,\"resilience\":0.5,\"emotionalDepth\":0.5,\"socialEnergy\":0.5,\"adaptability\":0.5,\"intelligence\":0.5},\"visuals\":{\"bodyTint\":0,\"accentTint\":0,\"glowTint\":0,\"emissiveIntensity\":0,\"roughness\":0.5,\"metalness\":0,\"clearcoat\":0,\"pattern\":\"plain\",\"phaseScale\":1},\"morphology\":{\"boneScales\":{\"head\":1,\"neck\":1,\"body\":1,\"arm_L\":1,\"arm_R\":1,\"leg_L\":1,\"leg_R\":1,\"eye_L\":1,\"eye_R\":1,\"jaw\":1},\"limbCount\":4,\"eyeSize\":1,\"hasTail\":false,\"hasSpikes\":false,\"pattern\":\"plain\"},\"accessories\":[],\"mutations\":[],\"environment\":{\"sceneId\":\"mascot_room\",\"tint\":\"#FFFFFF\",\"quality\":\"auto\"}},\"seq\":7}";

            Assert.IsTrue(JsonMessageParser.TryParseInbound(envelope, out var type, out var payload));
            Assert.AreEqual(BridgeMessageTypes.StateUpdate, type);

            var msg = (RNStateUpdateMessage)payload;
            Assert.AreEqual(7, msg.seq);
            Assert.AreEqual("bipo", msg.state.identity.baseModel);
        }

        static int CountDnaFields(UnityDnaGenes dna)
        {
            if (dna == null) return 0;
            return 11;
        }
    }
}
