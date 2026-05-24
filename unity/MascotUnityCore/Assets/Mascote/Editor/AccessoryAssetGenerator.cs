#if UNITY_EDITOR
using System.IO;
using Mascote.Unity.Data;
using UnityEditor;
using UnityEngine;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → Generate Accessory Definitions
    ///
    /// Gera os 18 .asset de AccessoryDefinition em Assets/Mascote/Data/Accessories/.
    /// Source-of-truth: AccessoryRegistry.cs (linhas 65-83). Se algum .asset já
    /// existir, é atualizado in-place (preserva GUID e referências em prefabs).
    ///
    /// Roda apenas no Editor; não vai pro build runtime.
    /// </summary>
    public static class AccessoryAssetGenerator
    {
        const string OutputFolder = "Assets/Mascote/Data/Accessories";

        // (assetKey, glbFileName, slot, defaultBone, defaultScale)
        // Espelho de AccessoryRegistry.EnsureInitialized — mantenha em sync.
        static readonly (string key, string glb, string slot, string bone, float scale)[] Defs =
        {
            ("cap_classic",     "cap_classic",     "hat",     "head",   1.00f),
            ("beanie",          "beanie",          "hat",     "head",   1.00f),
            ("bow_tie",         "bow_tie",         "hat",     "head",   0.90f),
            ("cape_velvet",     "cape_velvet",     "back",    "body",   1.10f),
            ("crown_flowers",   "crown_flowers",   "hat",     "head",   1.00f),
            ("crown_royal",     "crown_royal",     "hat",     "head",   1.05f),
            ("flame_mane",      "flame_mane",      "hat",     "head",   1.00f),
            ("flower_daisy",    "flower_daisy",    "hat",     "head",   0.85f),
            ("glasses_round",   "glasses_round",   "glasses", "head",   1.00f),
            ("heart_glow",      "heart_glow",      "body",    "chest",  0.90f),
            ("monocle_gold",    "monocle_gold",    "glasses", "head",   0.95f),
            ("scarf_cozy",      "scarf_cozy",      "neck",    "neck",   1.00f),
            ("sunglasses",      "sunglasses",      "glasses", "head",   1.00f),
            ("sword_floating",  "sword_floating",  "back",    "hand_R", 1.20f),
            ("wings_angel",     "wings_angel",     "back",    "body",   1.15f),
            ("wings_butterfly", "wings_butterfly", "back",    "body",   1.10f),
            ("wings_dragon",    "wings_dragon",    "back",    "body",   1.20f),
            ("aura_cosmic",     "aura_cosmic",     "aura",    "body",   1.30f),
        };

        [MenuItem("Mascote/Generate Accessory Definitions")]
        public static void Generate()
        {
            if (!AssetDatabase.IsValidFolder(OutputFolder))
            {
                Directory.CreateDirectory(OutputFolder);
                AssetDatabase.Refresh();
            }

            int created = 0, updated = 0;

            foreach (var (key, glb, slot, bone, scale) in Defs)
            {
                var path = $"{OutputFolder}/{key}.asset";
                var def = AssetDatabase.LoadAssetAtPath<AccessoryDefinition>(path);

                if (def == null)
                {
                    def = ScriptableObject.CreateInstance<AccessoryDefinition>();
                    AssetDatabase.CreateAsset(def, path);
                    created++;
                }
                else
                {
                    updated++;
                }

                Undo.RecordObject(def, "Generate Accessory Definition");
                def.assetKey = key;
                def.glbFileName = glb;
                def.slot = slot;
                def.defaultBone = bone;
                def.defaultScale = scale;
                EditorUtility.SetDirty(def);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[Mascote] AccessoryDefinitions ready — created {created}, updated {updated}, total {Defs.Length} in {OutputFolder}");
            EditorUtility.DisplayDialog(
                "Mascote",
                $"Pronto!\n\nCriados: {created}\nAtualizados: {updated}\nTotal: {Defs.Length}\n\nPasta: {OutputFolder}",
                "OK"
            );
        }

        [MenuItem("Mascote/Validate Accessory GLBs (StreamingAssets)")]
        public static void ValidateGlbs()
        {
            int missing = 0;
            var baseDir = Path.Combine(Application.streamingAssetsPath, "mascot-3d", "accessories");
            foreach (var d in Defs)
            {
                var p = Path.Combine(baseDir, d.glb + ".glb");
                if (!File.Exists(p))
                {
                    Debug.LogWarning($"[Mascote] GLB FALTANDO: {p}");
                    missing++;
                }
            }
            var msg = missing == 0
                ? $"OK — todos {Defs.Length} GLBs presentes."
                : $"FALTAM {missing}/{Defs.Length} — ver Console pra lista.";
            EditorUtility.DisplayDialog("Mascote — GLB validation", msg, "OK");
        }
    }
}
#endif
