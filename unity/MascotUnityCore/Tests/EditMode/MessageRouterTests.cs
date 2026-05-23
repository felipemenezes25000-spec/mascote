using Mascote.Unity.Bridge;
using Mascote.Unity.Core;
using Mascote.Unity.State;
using NUnit.Framework;
using UnityEngine;

namespace Mascote.Unity.Tests
{
    public class MessageRouterTests
    {
        GameObject _root;
        UnityMessageRouter _router;
        MascotDirector _director;
        OutboundEventDispatcher _outbound;
        string _lastOutbound;

        [SetUp]
        public void SetUp()
        {
            _root = new GameObject("RouterTest");
            _director = _root.AddComponent<MascotDirector>();
            _outbound = new OutboundEventDispatcher();
            _outbound.SetSender(json => _lastOutbound = json);
            _router = _root.AddComponent<UnityMessageRouter>();
            _router.Configure(_director, _outbound);
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(_root);
        }

        [Test]
        public void Route_StateUpdate_AppliesDirector()
        {
            var json =
                "{\"type\":\"state.update\",\"seq\":1,\"state\":{\"schemaVersion\":1,\"identity\":{\"id\":\"t\",\"name\":\"T\",\"personality\":\"calm\",\"seed\":1,\"baseModel\":\"zip\"},\"progression\":{\"phase\":\"adult\",\"level\":1,\"xp\":0,\"energy\":1,\"health\":1},\"state\":{\"mood\":\"neutral\",\"animation\":{\"primary\":\"idle\",\"speed\":1},\"reduceMotion\":false,\"lastSeenAt\":\"2026-01-01T00:00:00Z\"},\"dna\":{\"empathy\":0.5,\"curiosity\":0.5,\"creativity\":0.5,\"discipline\":0.5,\"chaos\":0.5,\"aggression\":0.5,\"resilience\":0.5,\"emotionalDepth\":0.5,\"socialEnergy\":0.5,\"adaptability\":0.5,\"intelligence\":0.5},\"visuals\":{\"bodyTint\":0,\"accentTint\":0,\"glowTint\":0,\"emissiveIntensity\":0,\"roughness\":0.5,\"metalness\":0,\"clearcoat\":0,\"pattern\":\"plain\",\"phaseScale\":1},\"morphology\":{\"boneScales\":{\"head\":1,\"neck\":1,\"body\":1,\"arm_L\":1,\"arm_R\":1,\"leg_L\":1,\"leg_R\":1,\"eye_L\":1,\"eye_R\":1,\"jaw\":1},\"limbCount\":4,\"eyeSize\":1,\"hasTail\":false,\"hasSpikes\":false,\"pattern\":\"plain\"},\"accessories\":[],\"mutations\":[],\"environment\":{\"sceneId\":\"mascot_room\",\"tint\":\"#FFF\",\"quality\":\"auto\"}}}";

            _router.RouteJson(json);

            Assert.NotNull(_director.Store.Current);
            Assert.AreEqual("zip", _director.Store.Current.identity.baseModel);
        }

        [Test]
        public void Route_EventPlay_DoesNotThrow()
        {
            var json = "{\"type\":\"event.play\",\"seq\":2,\"event\":{\"kind\":\"gesture\",\"gesture\":\"tap\"}}";
            Assert.DoesNotThrow(() => _router.RouteJson(json));
        }

        [Test]
        public void Ping_SendsReady()
        {
            _router.Ping();
            Assert.IsTrue(_lastOutbound.Contains("\"type\":\"ready\""));
            Assert.IsTrue(_lastOutbound.Contains(OutboundEventDispatcher.CoreVersion));
        }
    }
}
