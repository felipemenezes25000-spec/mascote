#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → Generate Mascot Prefabs (Primitives)
    ///
    /// Cria 4 prefabs DO ZERO usando primitives (esfera + cápsula + pés),
    /// sem dependência de GLB/glTFast. Cada mascote tem cor distinta e 7
    /// sockets prontos. Permite testar todo o pipeline (cena, animator,
    /// harness, bridge) imediatamente — depois substitui mesh pela real.
    /// </summary>
    public static class MascotPrefabGenerator
    {
        const string PrefabsFolder = "Assets/Mascote/Prefabs/Mascots";
        const string MaterialsFolder = "Assets/Mascote/Materials";

        // 7 sockets esperados pelo MascotAccessoryController.
        static readonly string[] SocketNames =
        {
            "Socket_Hat",
            "Socket_Glasses",
            "Socket_Neck",
            "Socket_Back",
            "Socket_Ear_L",
            "Socket_Ear_R",
            "Socket_Aura",
        };

        // 4 mascotes base — nome, cor de corpo (URP), escala (cabeça relativa).
        static readonly (string name, Color color, float headScale)[] Mascots =
        {
            ("bipo", new Color(0.45f, 0.78f, 0.96f), 1.10f), // azul céu
            ("zip",  new Color(0.98f, 0.78f, 0.42f), 0.95f), // laranja quente
            ("lulu", new Color(0.93f, 0.55f, 0.78f), 1.05f), // rosa pastel
            ("aro",  new Color(0.62f, 0.95f, 0.62f), 1.15f), // verde menta
        };

        [MenuItem("Mascote/Generate Mascot Prefabs (Primitives)")]
        public static void Generate()
        {
            EnsureFolder(PrefabsFolder);
            EnsureFolder(MaterialsFolder);

            int created = 0, updated = 0;
            var accCtrlType = System.Type.GetType("Mascote.Unity.Core.MascotAccessoryController, MascotUnityCore");

            foreach (var m in Mascots)
            {
                var prefabPath = $"{PrefabsFolder}/{m.name}.prefab";
                bool wasExisting = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath) != null;

                // Material URP Lit pro mascote.
                var mat = GetOrCreateMaterial($"Mat_{m.name}", m.color);

                // === Estrutura do mascote ===
                var root = new GameObject(m.name);

                // Corpo (cápsula)
                var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                body.name = "Body";
                body.transform.SetParent(root.transform, false);
                body.transform.localPosition = new Vector3(0, 0.5f, 0);
                body.transform.localScale = new Vector3(0.6f, 0.5f, 0.6f);
                body.GetComponent<Renderer>().sharedMaterial = mat;
                Object.DestroyImmediate(body.GetComponent<Collider>());

                // Cabeça (esfera, no topo da cápsula)
                var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                head.name = "Head";
                head.transform.SetParent(root.transform, false);
                head.transform.localPosition = new Vector3(0, 1.15f, 0);
                head.transform.localScale = Vector3.one * (0.55f * m.headScale);
                head.GetComponent<Renderer>().sharedMaterial = mat;
                Object.DestroyImmediate(head.GetComponent<Collider>());

                // Olhos (2 esferas brancas pequenas)
                var matEye = GetOrCreateMaterial("Mat_Eye", Color.white);
                var matPupil = GetOrCreateMaterial("Mat_Pupil", Color.black);
                CreateEye(head.transform, "Eye_L", new Vector3(-0.18f, 0.05f, 0.42f), matEye, matPupil);
                CreateEye(head.transform, "Eye_R", new Vector3( 0.18f, 0.05f, 0.42f), matEye, matPupil);

                // Pés (2 esferas pequenas)
                var foot_L = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                foot_L.name = "Foot_L";
                foot_L.transform.SetParent(root.transform, false);
                foot_L.transform.localPosition = new Vector3(-0.18f, 0.05f, 0);
                foot_L.transform.localScale = Vector3.one * 0.22f;
                foot_L.GetComponent<Renderer>().sharedMaterial = mat;
                Object.DestroyImmediate(foot_L.GetComponent<Collider>());

                var foot_R = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                foot_R.name = "Foot_R";
                foot_R.transform.SetParent(root.transform, false);
                foot_R.transform.localPosition = new Vector3(0.18f, 0.05f, 0);
                foot_R.transform.localScale = Vector3.one * 0.22f;
                foot_R.GetComponent<Renderer>().sharedMaterial = mat;
                Object.DestroyImmediate(foot_R.GetComponent<Collider>());

                // === Sockets (posicionados em pontos razoáveis na cabeça/corpo) ===
                CreateSocket(root, "Socket_Hat",     new Vector3(0,    1.65f, 0));     // topo cabeça
                CreateSocket(root, "Socket_Glasses", new Vector3(0,    1.20f, 0.45f)); // olhos
                CreateSocket(root, "Socket_Neck",    new Vector3(0,    0.85f, 0));     // pescoço
                CreateSocket(root, "Socket_Back",    new Vector3(0,    0.7f, -0.35f)); // costas
                CreateSocket(root, "Socket_Ear_L",   new Vector3(-0.4f, 1.3f, 0));     // orelha esq
                CreateSocket(root, "Socket_Ear_R",   new Vector3( 0.4f, 1.3f, 0));     // orelha dir
                CreateSocket(root, "Socket_Aura",   new Vector3(0,    0.7f, 0));      // centro

                if (accCtrlType != null) root.AddComponent(accCtrlType);

                PrefabUtility.SaveAsPrefabAsset(root, prefabPath);
                Object.DestroyImmediate(root);

                if (wasExisting) updated++;
                else created++;
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            var msg = $"Mascot Prefabs (Primitives) ready!\n\nCriados: {created}\nAtualizados: {updated}\nTotal: {Mascots.Length}\n\nPasta: {PrefabsFolder}";
            Debug.Log($"[Mascote] {msg.Replace("\n", " | ")}");
            EditorUtility.DisplayDialog("Mascote", msg, "OK");
        }

        static void CreateEye(Transform parent, string name, Vector3 pos, Material eyeMat, Material pupilMat)
        {
            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.name = name;
            eye.transform.SetParent(parent, false);
            eye.transform.localPosition = pos;
            eye.transform.localScale = Vector3.one * 0.22f;
            eye.GetComponent<Renderer>().sharedMaterial = eyeMat;
            Object.DestroyImmediate(eye.GetComponent<Collider>());

            var pupil = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            pupil.name = "Pupil";
            pupil.transform.SetParent(eye.transform, false);
            pupil.transform.localPosition = new Vector3(0, 0, 0.45f);
            pupil.transform.localScale = Vector3.one * 0.5f;
            pupil.GetComponent<Renderer>().sharedMaterial = pupilMat;
            Object.DestroyImmediate(pupil.GetComponent<Collider>());
        }

        static void CreateSocket(GameObject parent, string name, Vector3 localPos)
        {
            var socket = new GameObject(name);
            socket.transform.SetParent(parent.transform, false);
            socket.transform.localPosition = localPos;
        }

        static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                Directory.CreateDirectory(path);
                AssetDatabase.Refresh();
            }
        }

        static Material GetOrCreateMaterial(string name, Color color)
        {
            var path = $"{MaterialsFolder}/{name}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null)
            {
                // URP shader — tenta vários nomes pra cobrir diferentes versões.
                var shader =
                    Shader.Find("Universal Render Pipeline/Lit") ??
                    Shader.Find("Universal Render Pipeline/Simple Lit") ??
                    Shader.Find("Universal Render Pipeline/Unlit") ??
                    Shader.Find("Unlit/Color") ??
                    Shader.Find("Standard");
                if (shader == null)
                {
                    Debug.LogError($"[Mascote] Nenhum shader encontrado pra material {name}");
                    return null;
                }
                mat = new Material(shader) { name = name };
                // URP Lit usa _BaseColor, Standard usa _Color — set ambos pra cobrir.
                if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
                if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
                AssetDatabase.CreateAsset(mat, path);
            }
            else
            {
                // Se o shader atual é null OU não tem _BaseColor (não é URP), troca.
                if (mat.shader == null || !mat.HasProperty("_BaseColor"))
                {
                    var urpShader =
                        Shader.Find("Universal Render Pipeline/Lit") ??
                        Shader.Find("Universal Render Pipeline/Simple Lit") ??
                        Shader.Find("Universal Render Pipeline/Unlit");
                    if (urpShader != null) mat.shader = urpShader;
                }
                if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
                if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
                EditorUtility.SetDirty(mat);
            }
            return mat;
        }
    }
}
#endif
