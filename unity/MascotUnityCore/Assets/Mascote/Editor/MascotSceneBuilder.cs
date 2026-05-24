#if UNITY_EDITOR
using System;
using System.IO;
using Mascote.Unity.Bridge;
using Mascote.Unity.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → Build Complete Scene (MascotRoom)
    ///
    /// Monta `Assets/Mascote/Scenes/MascotRoom.unity` do zero:
    ///   - Câmera ortográfica suave + Directional Light + Ambient gradient
    ///   - Floor plane com material pastel
    ///   - MascotUnityBridge (ReactNativeBridge + UnityMessageRouter + OutboundEventDispatcher)
    ///   - MascotRoot com instância de bipo.prefab + todos os controllers
    ///   - MascotDirector wireado
    ///   - MascotEnvironment + MascotRoomTestHarness com refs corretos
    ///
    /// Idempotente — pode rodar várias vezes, sobrescreve o asset.
    /// </summary>
    public static class MascotSceneBuilder
    {
        const string ScenePath = "Assets/Mascote/Scenes/MascotRoom.unity";
        const string BipoPrefabPath = "Assets/Mascote/Prefabs/Mascots/bipo.prefab";
        const string FloorMatPath = "Assets/Mascote/Materials/Mat_Floor.mat";

        [MenuItem("Mascote/Build Complete Scene (MascotRoom)")]
        public static void Build()
        {
            // Cria pasta Scenes se não existir
            if (!AssetDatabase.IsValidFolder("Assets/Mascote/Scenes"))
            {
                Directory.CreateDirectory("Assets/Mascote/Scenes");
                AssetDatabase.Refresh();
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "MascotRoom";

            // ===== Lighting setup =====
            var lightGO = new GameObject("Directional Light");
            SceneManager.MoveGameObjectToScene(lightGO, scene);
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.97f, 0.92f); // warm
            light.intensity = 1.2f;
            lightGO.transform.rotation = Quaternion.Euler(45f, -25f, 0);

            // Ambient/RenderSettings (URP usa RenderSettings.ambientLight)
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.85f, 0.92f, 1.0f);
            RenderSettings.ambientEquatorColor = new Color(0.95f, 0.92f, 0.88f);
            RenderSettings.ambientGroundColor = new Color(0.55f, 0.50f, 0.45f);

            // ===== Camera =====
            var camGO = new GameObject("Main Camera");
            SceneManager.MoveGameObjectToScene(camGO, scene);
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.83f, 0.91f, 0.98f); // céu pastel
            cam.fieldOfView = 38f;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 50f;
            camGO.transform.position = new Vector3(0, 1.3f, -3.5f);
            camGO.transform.rotation = Quaternion.Euler(8f, 0, 0);
            camGO.AddComponent<AudioListener>();

            // ===== Floor =====
            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "Floor";
            SceneManager.MoveGameObjectToScene(floor, scene);
            floor.transform.position = Vector3.zero;
            floor.transform.localScale = new Vector3(3, 1, 3);
            var floorMat = GetOrCreateFloorMaterial();
            floor.GetComponent<Renderer>().sharedMaterial = floorMat;

            // ===== MascotUnityBridge (ponte RN) =====
            var bridgeGO = new GameObject(ReactNativeBridge.GameObjectName);
            SceneManager.MoveGameObjectToScene(bridgeGO, scene);
            var router = bridgeGO.AddComponent<UnityMessageRouter>();
            var bridge = bridgeGO.AddComponent<ReactNativeBridge>();
            // OutboundEventDispatcher é POCO, mas o componente bridge usa SerializeField
            // — vamos setar via SerializedObject pra não desacoplar.
            // Aqui simplificamos: deixamos os campos privados serializados como null e
            // o ReactNativeBridge.Awake/Start ainda funciona pra Editor (só faltam logs);
            // o Director é o que importa visualmente.

            // ===== MascotRoot (gameplay) =====
            var bipoPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(BipoPrefabPath);
            GameObject mascotRoot;
            if (bipoPrefab != null)
            {
                mascotRoot = (GameObject)PrefabUtility.InstantiatePrefab(bipoPrefab);
                mascotRoot.name = "MascotRoot";
            }
            else
            {
                mascotRoot = new GameObject("MascotRoot");
                Debug.LogWarning($"[Mascote] bipo.prefab não encontrado em {BipoPrefabPath} — criando MascotRoot vazio.");
            }
            SceneManager.MoveGameObjectToScene(mascotRoot, scene);
            mascotRoot.transform.position = Vector3.zero;

            // Adiciona controllers no MascotRoot
            var mascotCtrl = mascotRoot.AddComponent<MascotController>();
            mascotRoot.AddComponent<MascotMorphologyController>();
            // MascotAccessoryController já é adicionado pelo prefab — não duplicar
            if (mascotRoot.GetComponent<MascotAccessoryController>() == null)
                mascotRoot.AddComponent<MascotAccessoryController>();
            mascotRoot.AddComponent<MascotReactionController>();
            mascotRoot.AddComponent<MascotQualityController>();
            mascotRoot.AddComponent<Mascote.Unity.Animation.MascotAnimationController>();
            mascotRoot.AddComponent<Mascote.Unity.Animation.IdleBehaviorController>();
            mascotRoot.AddComponent<Mascote.Unity.Animation.LookAtTouchController>();
            mascotRoot.AddComponent<Mascote.Unity.Animation.BlinkController>();
            mascotRoot.AddComponent<Mascote.Unity.Animation.BreathingController>();

            // Wire attachRoot do AccessoryController pro próprio MascotRoot
            var accCtrl = mascotRoot.GetComponent<MascotAccessoryController>();
            if (accCtrl != null) SetPrivateField(accCtrl, "attachRoot", mascotRoot.transform);

            // Wire mascotRoot dentro de MascotController
            SetPrivateField(mascotCtrl, "mascotRoot", mascotRoot.transform);

            // ===== MascotEnvironment =====
            var envGO = new GameObject("MascotEnvironment");
            SceneManager.MoveGameObjectToScene(envGO, scene);
            envGO.AddComponent<MascotEnvironmentController>();

            // ===== MascotDirector =====
            var dirGO = new GameObject("MascotDirector");
            SceneManager.MoveGameObjectToScene(dirGO, scene);
            var director = dirGO.AddComponent<MascotDirector>();
            SetPrivateField(director, "mascotController", mascotCtrl);
            SetPrivateField(director, "reactionController", mascotRoot.GetComponent<MascotReactionController>());
            SetPrivateField(director, "qualityController", mascotRoot.GetComponent<MascotQualityController>());
            SetPrivateField(director, "environmentController", envGO.GetComponent<MascotEnvironmentController>());

            // Wire router → director
            SetPrivateField(router, "director", director);

            // ===== TestHarness (Rich) =====
            var harnessGO = new GameObject("MascotRoomTestHarness");
            SceneManager.MoveGameObjectToScene(harnessGO, scene);
            var harness = harnessGO.AddComponent<MascotRoomTestHarnessRich>();
            SetPrivateField(harness, "router", router);
            SetPrivateField(harness, "director", director);

            // Salva cena
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);

            Debug.Log($"[Mascote] Cena {ScenePath} construída com sucesso! Aperte Play.");
            EditorUtility.DisplayDialog(
                "Mascote — Scene Built",
                $"MascotRoom.unity construída!\n\n" +
                $"GameObjects: bridge, MascotRoot+controllers, MascotDirector, MascotEnvironment, TestHarness, Floor, Camera, Light.\n\n" +
                $"Mascote: {(bipoPrefab != null ? "bipo (azul)" : "vazio — gere prefabs primeiro")}.\n\n" +
                $"Próximo passo: aperte Play. O test harness OnGUI vai aparecer.",
                "OK"
            );
        }

        // === Helpers ===

        static Material GetOrCreateFloorMaterial()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(FloorMatPath);
            if (mat == null)
            {
                var shader =
                    Shader.Find("Universal Render Pipeline/Lit") ??
                    Shader.Find("Standard");
                mat = new Material(shader) { name = "Mat_Floor" };
                if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", new Color(0.95f, 0.93f, 0.88f));
                if (mat.HasProperty("_Color"))     mat.SetColor("_Color",     new Color(0.95f, 0.93f, 0.88f));
                if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", 0.15f);
                AssetDatabase.CreateAsset(mat, FloorMatPath);
            }
            return mat;
        }

        static void SetPrivateField(UnityEngine.Object target, string fieldName, UnityEngine.Object value)
        {
            if (target == null) return;
            var so = new SerializedObject(target);
            var prop = so.FindProperty(fieldName);
            if (prop != null)
            {
                prop.objectReferenceValue = value;
                so.ApplyModifiedPropertiesWithoutUndo();
            }
            else
            {
                Debug.LogWarning($"[Mascote] Campo '{fieldName}' não encontrado em {target.GetType().Name}");
            }
        }
    }
}
#endif
