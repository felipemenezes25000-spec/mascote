#if UNITY_EDITOR
using Mascote.Unity.Core;
using Mascote.Unity.Data;
using UnityEditor;
using UnityEngine;

namespace Mascote.Unity.EditorTools
{
    /// <summary>
    /// Menu: Mascote → Debug → ...
    ///
    /// Ferramentas pra debugar sem precisar do bridge/state pipeline.
    /// </summary>
    public static class MascotDebugMenu
    {
        [MenuItem("Mascote/Debug/Spawn Cap Classic on Active MascotRoot")]
        public static void SpawnCapClassic()
        {
            SpawnDebug("cap_classic", "hat");
        }

        [MenuItem("Mascote/Debug/Spawn Glasses Round")]
        public static void SpawnGlasses()
        {
            SpawnDebug("glasses_round", "glasses");
        }

        [MenuItem("Mascote/Debug/Spawn Wings Angel")]
        public static void SpawnWings()
        {
            SpawnDebug("wings_angel", "back");
        }

        [MenuItem("Mascote/Debug/Clear All Spawned Accessories")]
        public static void ClearAll()
        {
            var root = GameObject.Find("MascotRoot");
            if (root == null) { Debug.LogError("[Debug] MascotRoot não encontrado"); return; }
            int n = 0;
            foreach (Transform child in root.transform)
            {
                if (child.name.StartsWith("acc_") || child.name.StartsWith("debug_acc_"))
                {
                    Object.DestroyImmediate(child.gameObject);
                    n++;
                }
            }
            foreach (Transform child in root.GetComponentsInChildren<Transform>(true))
            {
                if (child == null || child == root.transform) continue;
                if (child.name.StartsWith("acc_") || child.name.StartsWith("debug_acc_"))
                {
                    Object.DestroyImmediate(child.gameObject);
                    n++;
                }
            }
            Debug.Log($"[Debug] Cleared {n} accessory(ies)");
        }

        [MenuItem("Mascote/Debug/Print MascotRoot Hierarchy")]
        public static void PrintHierarchy()
        {
            var root = GameObject.Find("MascotRoot");
            if (root == null) { Debug.LogError("[Debug] MascotRoot não encontrado na cena"); return; }
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"[Debug] MascotRoot @ {root.transform.position}:");
            PrintRecursive(root.transform, sb, 0);
            Debug.Log(sb.ToString());
        }

        static void PrintRecursive(Transform t, System.Text.StringBuilder sb, int indent)
        {
            sb.Append(new string(' ', indent * 2));
            sb.Append("- ").Append(t.name);
            sb.Append(" [pos=").Append(t.localPosition).Append("]");
            var components = t.GetComponents<Component>();
            if (components.Length > 1)
            {
                sb.Append(" (");
                bool first = true;
                foreach (var c in components)
                {
                    if (c is Transform) continue;
                    if (!first) sb.Append(", ");
                    sb.Append(c?.GetType().Name ?? "null");
                    first = false;
                }
                sb.Append(")");
            }
            sb.AppendLine();
            foreach (Transform child in t)
                PrintRecursive(child, sb, indent + 1);
        }

        static void SpawnDebug(string assetKey, string slot)
        {
            var root = GameObject.Find("MascotRoot");
            if (root == null) { Debug.LogError("[Debug] MascotRoot não encontrado na cena"); return; }

            // Procura Socket_X no mascote
            string socketName = "Socket_" + char.ToUpperInvariant(slot[0]) + slot.Substring(1).ToLowerInvariant();
            Transform socket = FindDeep(root.transform, socketName);
            if (socket == null)
            {
                Debug.LogError($"[Debug] {socketName} não encontrado em MascotRoot. Children diretos:");
                foreach (Transform t in root.transform) Debug.Log($"  - {t.name}");
                return;
            }

            // Cria anchor e visual
            var anchor = new GameObject($"debug_acc_{assetKey}");
            anchor.transform.SetParent(socket, false);
            anchor.transform.localPosition = Vector3.zero;
            anchor.transform.localRotation = Quaternion.identity;
            anchor.transform.localScale = Vector3.one;

            AccessoryPrimitiveBuilder.Build(anchor, assetKey, slot);

            Debug.Log($"[Debug] ✅ Spawned {assetKey} (slot={slot}) em {socketName} @ world {anchor.transform.position}. Children criados: {anchor.transform.childCount}");
            Selection.activeGameObject = anchor;
            SceneView.lastActiveSceneView?.FrameSelected();
        }

        static Transform FindDeep(Transform t, string name)
        {
            if (t.name == name) return t;
            foreach (Transform c in t)
            {
                var r = FindDeep(c, name);
                if (r != null) return r;
            }
            return null;
        }
    }
}
#endif
