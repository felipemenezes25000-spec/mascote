using System.Collections.Generic;
using System.IO;
using Mascote.Unity.Data;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Instancia acessórios por assetKey a partir de StreamingAssets/mascot-3d/accessories/.
    /// Sem GLTFast: cria placeholder nomeado + path; Editor importa GLB manualmente.
    /// </summary>
    public class MascotAccessoryController : MonoBehaviour
    {
        [SerializeField] Transform attachRoot;
        readonly Dictionary<string, GameObject> _spawned = new();

        void Awake()
        {
            if (attachRoot == null) attachRoot = transform;
        }

        public void ApplyAccessories(List<UnityAccessorySlot> slots)
        {
            foreach (var kv in _spawned)
            {
                if (kv.Value != null) Destroy(kv.Value);
            }
            _spawned.Clear();

            if (slots == null) return;

            foreach (var slot in slots)
            {
                if (string.IsNullOrEmpty(slot?.assetKey)) continue;
                SpawnAccessory(slot);
            }
        }

        void SpawnAccessory(UnityAccessorySlot slot)
        {
            if (!AccessoryRegistry.TryGet(slot.assetKey, out var def))
            {
                Debug.LogWarning($"[Accessory] Unknown assetKey: {slot.assetKey}");
                return;
            }

            var boneName = !string.IsNullOrEmpty(slot.bone) ? slot.bone : def.defaultBone;
            // Fallback chain: bone exato → Socket_<slot> → Socket_Hat etc convenção → attachRoot
            var parent = ResolveBone(boneName)
                         ?? ResolveBone(SocketNameForSlot(def.slot))
                         ?? attachRoot
                         ?? transform;
            var scale = slot.scale ?? def.defaultScale;

            var go = new GameObject($"acc_{def.assetKey}");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = def.localOffset;
            go.transform.localRotation = Quaternion.Euler(def.localEuler);
            go.transform.localScale = Vector3.one * scale;

            var marker = go.AddComponent<AccessoryPlaceholder>();
            marker.assetKey = def.assetKey;
            marker.glbRelativePath = AccessoryRegistry.GlbRelativePath(def);
            marker.glbExists = File.Exists(Path.Combine(Application.streamingAssetsPath, marker.glbRelativePath ?? ""));

            // Sprint 2: gera visual primitivo (chapéu cone, óculos, asa, etc) já que
            // o GLB ainda não é importado em runtime. Quando GLTFast estiver wired,
            // este builder pode ser substituído por um async load do .glb real.
            AccessoryPrimitiveBuilder.Build(go, def.assetKey, def.slot);

            _spawned[slot.id ?? def.assetKey] = go;
        }

        Transform ResolveBone(string boneName)
        {
            if (string.IsNullOrEmpty(boneName) || attachRoot == null) return null;
            return attachRoot.Find(boneName)
                ?? attachRoot.FindDeep(boneName)
                ?? attachRoot.FindDeepIgnoreCase(boneName);
        }

        static string SocketNameForSlot(string slot)
        {
            if (string.IsNullOrEmpty(slot)) return null;
            // hat → Socket_Hat, glasses → Socket_Glasses, ear_l → Socket_Ear_L etc.
            var parts = slot.Split('_');
            var sb = new System.Text.StringBuilder("Socket");
            foreach (var p in parts)
            {
                sb.Append('_');
                if (p.Length > 0)
                {
                    sb.Append(char.ToUpperInvariant(p[0]));
                    if (p.Length > 1) sb.Append(p.Substring(1).ToLowerInvariant());
                }
            }
            return sb.ToString();
        }
    }

    /// <summary>Marca placeholder até import GLB no Editor (GLTFast Sprint futuro).</summary>
    public class AccessoryPlaceholder : MonoBehaviour
    {
        public string assetKey;
        public string glbRelativePath;
        public bool glbExists;
    }

    static class TransformExtensions
    {
        public static Transform FindDeep(this Transform parent, string name)
        {
            if (parent.name == name) return parent;
            for (var i = 0; i < parent.childCount; i++)
            {
                var found = parent.GetChild(i).FindDeep(name);
                if (found != null) return found;
            }
            return null;
        }

        public static Transform FindDeepIgnoreCase(this Transform parent, string name)
        {
            if (string.Equals(parent.name, name, System.StringComparison.OrdinalIgnoreCase)) return parent;
            for (var i = 0; i < parent.childCount; i++)
            {
                var found = parent.GetChild(i).FindDeepIgnoreCase(name);
                if (found != null) return found;
            }
            return null;
        }
    }
}
