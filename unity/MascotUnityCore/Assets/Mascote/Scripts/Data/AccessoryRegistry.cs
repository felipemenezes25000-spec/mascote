using System.Collections.Generic;
using UnityEngine;

namespace Mascote.Unity.Data
{
    /// <summary>
    /// Registro estático dos 18 GLBs de acessório + aliases RN.
    /// </summary>
    public static class AccessoryRegistry
    {
        static readonly Dictionary<string, AccessoryDefinition> _byKey = new();
        static bool _initialized;

        public static IReadOnlyDictionary<string, AccessoryDefinition> All
        {
            get
            {
                EnsureInitialized();
                return _byKey;
            }
        }

        public static bool TryGet(string assetKey, out AccessoryDefinition def)
        {
            EnsureInitialized();
            if (string.IsNullOrEmpty(assetKey))
            {
                def = null;
                return false;
            }

            if (_byKey.TryGetValue(assetKey, out def)) return true;

            // Aliases legados Sprint 1
            var alias = assetKey switch
            {
                "bow_classic" => "bow_tie",
                "scarf_green" => "scarf_cozy",
                "crown_gold" => "crown_royal",
                "flower_orange" => "flower_daisy",
                "headphones_music" => "beanie",
                "mask_theater" => "sunglasses",
                "star_forehead" => "heart_glow",
                "monocle_scholar" => "monocle_gold",
                "cape_hero" => "cape_velvet",
                "leaf_autumn" => "flame_mane",
                "cookie_fortune" => "heart_glow",
                "horn_legendary" => "sword_floating",
                _ => assetKey,
            };

            return _byKey.TryGetValue(alias, out def);
        }

        public static string GlbRelativePath(AccessoryDefinition def)
        {
            if (def == null || string.IsNullOrEmpty(def.glbFileName)) return null;
            return $"mascot-3d/accessories/{def.glbFileName}.glb";
        }

        static void EnsureInitialized()
        {
            if (_initialized) return;
            _initialized = true;

            Register("cap_classic", "cap_classic", "hat", "head", 1f);
            Register("beanie", "beanie", "hat", "head", 1f);
            Register("bow_tie", "bow_tie", "hat", "head", 0.9f);
            Register("cape_velvet", "cape_velvet", "back", "body", 1.1f);
            Register("crown_flowers", "crown_flowers", "hat", "head", 1f);
            Register("crown_royal", "crown_royal", "hat", "head", 1.05f);
            Register("flame_mane", "flame_mane", "hat", "head", 1f);
            Register("flower_daisy", "flower_daisy", "hat", "head", 0.85f);
            Register("glasses_round", "glasses_round", "glasses", "head", 1f);
            Register("heart_glow", "heart_glow", "body", "chest", 0.9f);
            Register("monocle_gold", "monocle_gold", "glasses", "head", 0.95f);
            Register("scarf_cozy", "scarf_cozy", "neck", "neck", 1f);
            Register("sunglasses", "sunglasses", "glasses", "head", 1f);
            Register("sword_floating", "sword_floating", "back", "hand_R", 1.2f);
            Register("wings_angel", "wings_angel", "back", "body", 1.15f);
            Register("wings_butterfly", "wings_butterfly", "back", "body", 1.1f);
            Register("wings_dragon", "wings_dragon", "back", "body", 1.2f);
            Register("aura_cosmic", "aura_cosmic", "aura", "body", 1.3f);
        }

        static void Register(
            string assetKey,
            string glbFileName,
            string slot,
            string bone,
            float scale)
        {
            var def = ScriptableObject.CreateInstance<AccessoryDefinition>();
            def.assetKey = assetKey;
            def.glbFileName = glbFileName;
            def.slot = slot;
            def.defaultBone = bone;
            def.defaultScale = scale;
            _byKey[assetKey] = def;
        }
    }
}
