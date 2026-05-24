#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → 🚀 Setup Everything (1-click full bootstrap)
    ///
    /// Roda em sequência:
    ///   1. UrpSetup.Setup() — cria URP Asset + Renderer + seta ativo
    ///   2. AccessoryAssetGenerator.Generate() — 18 .asset SO
    ///   3. MascotPrefabGenerator.Generate() — 4 prefabs primitivos coloridos
    ///   4. MascotSceneBuilder.Build() — MascotRoom.unity completa
    ///
    /// Idempotente. Roda tudo silenciosamente, mostra dialog final consolidado.
    /// </summary>
    public static class MascotSetupAll
    {
        [MenuItem("Mascote/🚀 Setup Everything", priority = -100)]
        public static void Run()
        {
            if (!EditorUtility.DisplayDialog(
                "Mascote — Setup Everything",
                "Vai rodar em sequência:\n\n" +
                "1) URP Pipeline Asset\n" +
                "2) 18 AccessoryDefinitions\n" +
                "3) 4 prefabs Mascote (azul/laranja/rosa/verde)\n" +
                "4) Cena MascotRoom completa\n\n" +
                "Demora ~30s. Continuar?",
                "Sim, bora!",
                "Cancelar"))
                return;

            try
            {
                EditorUtility.DisplayProgressBar("Mascote", "1/4 Setting up URP Pipeline...", 0.10f);
                UrpSetup.Setup();

                EditorUtility.DisplayProgressBar("Mascote", "2/4 Generating 18 Accessory Definitions...", 0.35f);
                AccessoryAssetGenerator.Generate();

                EditorUtility.DisplayProgressBar("Mascote", "3/4 Generating 4 Mascot Prefabs...", 0.60f);
                MascotPrefabGenerator.Generate();

                EditorUtility.DisplayProgressBar("Mascote", "4/4 Building MascotRoom.unity...", 0.85f);
                MascotSceneBuilder.Build();

                EditorUtility.ClearProgressBar();

                Debug.Log("[Mascote] 🚀 Setup Everything completo!");
                EditorUtility.DisplayDialog(
                    "Mascote — Tudo Pronto! 🚀",
                    "Tudo configurado!\n\n" +
                    "✅ URP pipeline ativo\n" +
                    "✅ 18 AccessoryDefinitions\n" +
                    "✅ 4 prefabs mascote\n" +
                    "✅ MascotRoom.unity construída\n\n" +
                    "Aperte Play e brinque com o Test Harness na tela!",
                    "Vamos jogar!"
                );
            }
            catch (System.Exception e)
            {
                EditorUtility.ClearProgressBar();
                Debug.LogError($"[Mascote] Setup Everything FAILED: {e.Message}\n{e.StackTrace}");
                EditorUtility.DisplayDialog("Mascote — ERRO", $"Falhou em algum passo:\n\n{e.Message}\n\nVer Console.", "OK");
            }
        }
    }
}
#endif
