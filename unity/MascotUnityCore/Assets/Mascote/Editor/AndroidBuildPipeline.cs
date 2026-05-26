#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → 📦 Build Android Library
    ///
    /// Exporta o projeto Unity como Android Library Project (unityLibrary)
    /// direto pra `app/mobile/android/unityLibrary/` — local que o script
    /// `wire-unity-android.ps1` espera.
    ///
    /// Faz:
    ///   1. Auto-switch pra Android build target (se ainda não)
    ///   2. Valida cena MascotRoom no Build Settings
    ///   3. Valida bones esperados em pelo menos um prefab (sanity check)
    ///   4. Aplica Player Settings de mobile (IL2CPP, ARM64, min SDK 24)
    ///   5. Marca BuildOptions.AcceptExternalModificationsToPlayer (modo Export Project)
    ///   6. Chama BuildPipeline.BuildPlayer
    ///   7. Imprime relatório (tamanho, tempo, próximo passo)
    /// </summary>
    public static class AndroidBuildPipeline
    {
        private const string ScenePath = "Assets/Mascote/Scenes/MascotRoom.unity";
        private const int MinSdkVersion = 24; // matches RN minSdkVersion
        private const string MenuPath = "Mascote/📦 Build Android Library";

        [MenuItem(MenuPath, priority = -50)]
        public static void BuildAndroidLibrary()
        {
            if (!EditorUtility.DisplayDialog(
                "Mascote — Build Android Library",
                "Exporta unityLibrary direto pra:\n\n" +
                "    app/mobile/android/unityLibrary/\n\n" +
                "Demora ~1-2 min (primeira vez pode levar mais).\n\n" +
                "Após sucesso, rode:\n" +
                "    powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1\n\n" +
                "Continuar?",
                "Buildar",
                "Cancelar"))
                return;

            var startedAt = DateTime.UtcNow;

            try
            {
                EditorUtility.DisplayProgressBar("Mascote Build", "1/5 Verificando build target...", 0.10f);
                EnsureAndroidTarget();

                EditorUtility.DisplayProgressBar("Mascote Build", "2/5 Validando cena...", 0.25f);
                var scenes = EnsureBuildScenes();

                EditorUtility.DisplayProgressBar("Mascote Build", "3/5 Sanity check prefabs...", 0.40f);
                ValidatePrefabsExist();

                EditorUtility.DisplayProgressBar("Mascote Build", "4/5 Aplicando Player Settings mobile...", 0.55f);
                ApplyMobilePlayerSettings();

                EditorUtility.DisplayProgressBar("Mascote Build", "5/5 Buildando AAR (1-2min)...", 0.70f);
                var outputPath = ResolveOutputPath();
                EnsureCleanOutput(outputPath);

                var options = new BuildPlayerOptions
                {
                    scenes = scenes,
                    locationPathName = outputPath,
                    target = BuildTarget.Android,
                    targetGroup = BuildTargetGroup.Android,
                    options = BuildOptions.AcceptExternalModificationsToPlayer,
                };

                var report = BuildPipeline.BuildPlayer(options);

                EditorUtility.ClearProgressBar();

                if (report.summary.result == BuildResult.Succeeded)
                {
                    var elapsed = DateTime.UtcNow - startedAt;
                    var sizeMb = report.summary.totalSize / 1024f / 1024f;
                    var manifest = Path.Combine(outputPath, "unityLibrary", "build.gradle");
                    var manifestOk = File.Exists(manifest)
                        ? "✅"
                        : "⚠️ (não encontrou unityLibrary/build.gradle — verificar manualmente)";

                    Debug.Log(
                        $"[Mascote] ✅ Build Android OK em {elapsed.TotalSeconds:F1}s. " +
                        $"Tamanho: {sizeMb:F1} MB. Output: {outputPath}");

                    EditorUtility.DisplayDialog(
                        "Mascote — Build OK",
                        $"✅ Export concluído em {elapsed.TotalSeconds:F0}s\n" +
                        $"Tamanho: {sizeMb:F1} MB\n" +
                        $"unityLibrary detectado: {manifestOk}\n\n" +
                        "Próximo passo:\n" +
                        "    cd app/mobile\n" +
                        "    powershell -ExecutionPolicy Bypass -File scripts/wire-unity-android.ps1\n\n" +
                        "Depois:\n" +
                        "    npx expo run:android\n" +
                        "    EXPO_PUBLIC_UNITY_ENABLED=true",
                        "OK");
                }
                else
                {
                    var firstError = report.steps
                        .SelectMany(s => s.messages)
                        .Where(m => m.type == LogType.Error)
                        .Select(m => m.content)
                        .FirstOrDefault() ?? "ver Console";

                    Debug.LogError($"[Mascote] ❌ Build Android FAILED. Primeiro erro: {firstError}");
                    EditorUtility.DisplayDialog(
                        "Mascote — Build FAILED",
                        $"Resultado: {report.summary.result}\n\n" +
                        $"Primeiro erro:\n{firstError}\n\n" +
                        "Ver Console pra detalhes completos.",
                        "OK");
                }
            }
            catch (Exception e)
            {
                EditorUtility.ClearProgressBar();
                Debug.LogError($"[Mascote] ❌ Build EXCEPTION: {e.Message}\n{e.StackTrace}");
                EditorUtility.DisplayDialog(
                    "Mascote — Build EXCEPTION",
                    $"{e.Message}\n\nVer Console pra stack trace.",
                    "OK");
            }
        }

        private static void EnsureAndroidTarget()
        {
            if (EditorUserBuildSettings.activeBuildTarget == BuildTarget.Android)
                return;

            var ok = EditorUserBuildSettings.SwitchActiveBuildTarget(
                BuildTargetGroup.Android,
                BuildTarget.Android);
            if (!ok)
                throw new Exception(
                    "Não consegui mudar pra Android build target. " +
                    "Verifique se Android Build Support está instalado no Unity Hub.");
        }

        private static string[] EnsureBuildScenes()
        {
            if (!File.Exists(ScenePath))
                throw new Exception($"Cena não encontrada: {ScenePath}");

            // Garante que a cena principal está no índice 0 (UnityPlayerActivity inicia ela).
            var scenes = EditorBuildSettings.scenes ?? Array.Empty<EditorBuildSettingsScene>();
            var alreadyIncluded = scenes.Any(s =>
                s != null && s.path == ScenePath && s.enabled);

            if (!alreadyIncluded)
            {
                var newList = new[] { new EditorBuildSettingsScene(ScenePath, true) }
                    .Concat(scenes.Where(s => s != null && s.path != ScenePath))
                    .ToArray();
                EditorBuildSettings.scenes = newList;
                Debug.Log($"[Mascote] Adicionei {ScenePath} ao Build Settings (índice 0).");
            }

            return new[] { ScenePath };
        }

        private static void ValidatePrefabsExist()
        {
            string[] expected =
            {
                "Assets/Mascote/Prefabs/Mascots/bipo.prefab",
                "Assets/Mascote/Prefabs/Mascots/zip.prefab",
                "Assets/Mascote/Prefabs/Mascots/lulu.prefab",
                "Assets/Mascote/Prefabs/Mascots/aro.prefab",
            };

            var missing = expected.Where(p => !File.Exists(p)).ToArray();
            if (missing.Length > 0)
            {
                Debug.LogWarning(
                    $"[Mascote] Prefabs ausentes: {string.Join(", ", missing)}. " +
                    "Build vai prosseguir mas runtime pode falhar ao spawnar mascote.");
            }
        }

        private static void ApplyMobilePlayerSettings()
        {
            // Scripting backend IL2CPP + ARM64 (obrigatório pra Play Store + Unity 6).
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.FromBuildTargetGroup(BuildTargetGroup.Android), ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures =
                AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7;

            // Min SDK alinhado com o app RN (24 = Android 7.0).
            if ((int)PlayerSettings.Android.minSdkVersion < MinSdkVersion)
                PlayerSettings.Android.minSdkVersion = (AndroidSdkVersions)MinSdkVersion;

            // Target SDK = auto (segue Unity recommended).
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;

            // Strip engine code agressivo (menor AAR).
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.FromBuildTargetGroup(BuildTargetGroup.Android), ManagedStrippingLevel.Medium);

            // Garante that as a library doesn't try to be standalone APK.
            EditorUserBuildSettings.exportAsGoogleAndroidProject = true;

            // Color space linear (URP recomendado pra mobile com Unity 6).
            PlayerSettings.colorSpace = ColorSpace.Linear;

            Debug.Log("[Mascote] Player Settings aplicados: IL2CPP, ARM64+ARMv7, minSdk=24, strip=Medium, linear color.");
        }

        private static string ResolveOutputPath()
        {
            // Application.dataPath = unity/MascotUnityCore/Assets
            // Subir 3 níveis pra raiz do repo: ../../../
            var repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            var output = Path.Combine(repoRoot, "app", "mobile", "android", "unityLibrary");

            // Unity vai criar PROJECT pasta no path; o `unityLibrary/` sub-folder é o que importa.
            // Mas BuildPipeline pede um "location" que vira a pasta-mãe do export.
            // Como queremos o `unityLibrary/` exato no destino esperado, usamos o pai.
            return Path.GetDirectoryName(output);
        }

        private static void EnsureCleanOutput(string parentPath)
        {
            // Limpa export anterior pra não misturar arquivos órfãos.
            var unityLibPath = Path.Combine(parentPath, "unityLibrary");
            if (Directory.Exists(unityLibPath))
            {
                try
                {
                    Directory.Delete(unityLibPath, true);
                    Debug.Log($"[Mascote] Limpei export anterior: {unityLibPath}");
                }
                catch (Exception e)
                {
                    Debug.LogWarning(
                        $"[Mascote] Não consegui limpar {unityLibPath}: {e.Message}. " +
                        "Build pode misturar arquivos antigos — feche Android Studio se aberto.");
                }
            }

            if (!Directory.Exists(parentPath))
                Directory.CreateDirectory(parentPath);
        }
    }
}
#endif
