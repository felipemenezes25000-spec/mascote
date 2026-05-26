using System;
using System.Collections.Generic;

namespace Mascote.Unity.State
{
    /// <summary>
    /// Espelho de UnityMascotState (types.ts) — schemaVersion 1.
    /// Deserializado via Newtonsoft.Json no bridge RN.
    /// </summary>
    [Serializable]
    public class UnityMascotState
    {
        public int schemaVersion = 1;
        public UnityMascotIdentity identity;
        public UnityMascotProgression progression;
        public UnityMascotLiveState state;
        public UnityDnaGenes dna;
        public UnityMascotVisuals visuals;
        public UnityMorphologyParams morphology;
        public List<UnityAccessorySlot> accessories = new();
        public List<UnityMutationSlot> mutations = new();
        public UnityEnvironmentState environment;
        public UnityMascotEvent pendingEvent;
    }

    [Serializable]
    public class UnityMascotIdentity
    {
        public string id;
        public string name;
        public string personality;
        public float seed;
        public string baseModel;
    }

    [Serializable]
    public class UnityMascotProgression
    {
        public string phase;
        public int level;
        public int xp;
        public float energy;
        public float health;
        public int? streakDays;
    }

    [Serializable]
    public class UnityMascotLiveState
    {
        public string mood;
        public UnityAnimationState animation;
        public bool reduceMotion;
        public string lastSeenAt;
    }

    [Serializable]
    public class UnityAnimationState
    {
        public string primary;
        public UnityAnimationBlend blend;
        public float speed = 1f;
    }

    [Serializable]
    public class UnityAnimationBlend
    {
        public string name;
        public float weight;
    }

    [Serializable]
    public class UnityDnaGenes
    {
        public float empathy;
        public float curiosity;
        public float creativity;
        public float discipline;
        public float chaos;
        public float aggression;
        public float resilience;
        public float emotionalDepth;
        public float socialEnergy;
        public float adaptability;
        public float intelligence;
    }

    [Serializable]
    public class UnityMaterialVisuals
    {
        public int bodyTint;
        public int accentTint;
        public int glowTint;
        public float emissiveIntensity;
        public float roughness;
        public float metalness;
        public float clearcoat;
        public string pattern;
    }

    [Serializable]
    public class UnityEvolutionVisuals
    {
        public float glowMultiplier;
        public float auraParticleBoost;
        public float postureBias;
        public float eyeBrightness;
        public float bodyFirmness;
        public bool calmAura;
        public bool zenParticles;
        public string environmentTint;
        public string idleAnimation;
        public float bodyScaleMultiplier;
    }

    [Serializable]
    public class UnityMascotVisuals : UnityMaterialVisuals
    {
        public UnityEvolutionVisuals evolution;
        public float phaseScale = 1f;
    }

    [Serializable]
    public class UnityBoneScales
    {
        public float head = 1f;
        public float neck = 1f;
        public float body = 1f;
        public float arm_L = 1f;
        public float arm_R = 1f;
        public float leg_L = 1f;
        public float leg_R = 1f;
        public float eye_L = 1f;
        public float eye_R = 1f;
        public float jaw = 1f;
    }

    [Serializable]
    public class UnityMorphologyParams
    {
        public UnityBoneScales boneScales;
        public int limbCount;
        public float eyeSize;
        public bool hasTail;
        public bool hasSpikes;
        public string pattern;

        /// <summary>
        /// Blend shape weights normalizados [0, 1]. Catálogo de keys oficial em
        /// `lib/dna/morphInfluences.ts:MORPH_INFLUENCE_KEYS` (slice 2026-05-25).
        /// Aplicado por <see cref="Mascote.Unity.Core.MascotBlendShapeController"/>.
        /// </summary>
        public Dictionary<string, float> morphInfluences;
    }

    [Serializable]
    public class UnityAccessorySlot
    {
        public string id;
        public string slot;
        public string bone;
        public string assetKey;
        public float? scale;
    }

    [Serializable]
    public class UnityMutationSlot
    {
        public string id;
        public string rarity;
    }

    [Serializable]
    public class UnityEnvironmentState
    {
        public string sceneId;
        public string tint;
        public string quality;
    }
}
