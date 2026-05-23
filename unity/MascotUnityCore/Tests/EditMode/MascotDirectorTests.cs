using Mascote.Unity.Core;
using Mascote.Unity.State;
using NUnit.Framework;
using UnityEngine;

namespace Mascote.Unity.Tests
{
    public class MascotDirectorTests
    {
        [Test]
        public void ApplyState_NullState_ReturnsFalse()
        {
            var go = new GameObject("DirectorTest");
            var director = go.AddComponent<MascotDirector>();

            Assert.IsFalse(director.ApplyState(null, 1));

            Object.DestroyImmediate(go);
        }

        [Test]
        public void ApplyState_ValidState_UpdatesStore()
        {
            var go = new GameObject("DirectorTest2");
            var director = go.AddComponent<MascotDirector>();
            var state = new UnityMascotState
            {
                schemaVersion = 1,
                identity = new UnityMascotIdentity { id = "x", name = "X", personality = "calm", seed = 1, baseModel = "bipo" },
                progression = new UnityMascotProgression { phase = "adult", level = 1, xp = 0, energy = 1, health = 1 },
                state = new UnityMascotLiveState
                {
                    mood = "happy",
                    animation = new UnityAnimationState { primary = "idle", speed = 1f },
                    reduceMotion = false,
                    lastSeenAt = "2026-01-01T00:00:00Z",
                },
                dna = new UnityDnaGenes(),
                visuals = new UnityMascotVisuals { pattern = "plain", phaseScale = 1f },
                morphology = new UnityMorphologyParams { boneScales = new UnityBoneScales(), pattern = "plain" },
                environment = new UnityEnvironmentState { sceneId = "mascot_room", tint = "#FFF", quality = "auto" },
            };

            Assert.IsTrue(director.ApplyState(state, 1));
            Assert.NotNull(director.Store.Current);
            Assert.AreEqual("happy", director.Store.Current.state.mood);

            Object.DestroyImmediate(go);
        }
    }
}
