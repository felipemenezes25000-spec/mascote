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
            var parent = ResolveBone(boneName) ?? attachRoot ?? transform;
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

            _spawned[slot.id ?? def.assetKey] = go;
        }

        Transform ResolveBone(string boneName)
        {
            if (string.IsNullOrEmpty(boneName) || attachRoot == null) return attachRoot;
            return attachRoot.Find(boneName) ?? attachRoot.FindDeep(boneName) ?? attachRoot;
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
    }
}
