using UnityEngine;

namespace Mascote.Unity.Data
{
    /// <summary>
    /// Metadados de um acessório GLB — bone anchor, escala, slot.
    /// </summary>
    [CreateAssetMenu(fileName = "AccessoryDefinition", menuName = "Mascot/Accessory Definition")]
    public class AccessoryDefinition : ScriptableObject
    {
        [Tooltip("Chave enviada pelo RN (assetKey).")]
        public string assetKey;

        [Tooltip("Nome do arquivo em StreamingAssets/mascot-3d/accessories/.")]
        public string glbFileName;

        public string slot = "hat";
        public string defaultBone = "head";
        public float defaultScale = 1f;
        public Vector3 localOffset;
        public Vector3 localEuler;
    }
}
