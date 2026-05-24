#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → Setup URP Pipeline
    ///
    /// Cria UniversalRenderPipelineAsset + Renderer em Assets/Settings/,
    /// e seta como Render Pipeline ativo em GraphicsSettings + todos os
    /// Quality levels. Sem isso, materiais URP renderizam rosa (missing pipeline).
    /// </summary>
    public static class UrpSetup
    {
        const string SettingsFolder = "Assets/Settings";
        const string UrpAssetPath = "Assets/Settings/MascotUniversalRP.asset";
        const string RendererPath = "Assets/Settings/MascotURPRenderer.asset";

        [MenuItem("Mascote/Setup URP Pipeline")]
        public static void Setup()
        {
            if (!AssetDatabase.IsValidFolder(SettingsFolder))
            {
                Directory.CreateDirectory(SettingsFolder);
                AssetDatabase.Refresh();
            }

            // 1) Renderer data (mobile-friendly forward)
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererPath);
            if (renderer == null)
            {
                renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, RendererPath);
            }

            // 2) URP Asset apontando pro renderer
            var urpAsset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(UrpAssetPath);
            if (urpAsset == null)
            {
                urpAsset = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(urpAsset, UrpAssetPath);
            }

            AssetDatabase.SaveAssets();

            // 3) Set em GraphicsSettings (default pipeline)
            GraphicsSettings.defaultRenderPipeline = urpAsset;

            // 4) Set em TODOS os Quality levels
            int qualityCount = QualitySettings.names.Length;
            for (int i = 0; i < qualityCount; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = urpAsset;
            }

            EditorUtility.SetDirty(GraphicsSettings.GetGraphicsSettings());
            AssetDatabase.SaveAssets();

            Debug.Log($"[Mascote] URP setup OK — pipeline ativo: {urpAsset.name}, quality levels: {qualityCount}");
            EditorUtility.DisplayDialog(
                "Mascote — URP Setup",
                $"URP pipeline ativo!\n\nAsset: {UrpAssetPath}\nRenderer: {RendererPath}\nQuality levels atualizados: {qualityCount}\n\nMateriais rosa devem ficar coloridos agora.",
                "OK"
            );
        }
    }
}
#endif
