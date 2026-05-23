using UnityEngine;

namespace Mascote.Unity.Utils
{
    public static class HexColorUtil
    {
        public static bool TryParseTint(string hex, out Color color)
        {
            if (string.IsNullOrEmpty(hex))
            {
                color = Color.white;
                return false;
            }

            if (!hex.StartsWith("#")) hex = "#" + hex;
            return ColorUtility.TryParseHtmlString(hex, out color);
        }

        public static Color IntToColor(int rgb)
        {
            var r = ((rgb >> 16) & 0xFF) / 255f;
            var g = ((rgb >> 8) & 0xFF) / 255f;
            var b = (rgb & 0xFF) / 255f;
            return new Color(r, g, b, 1f);
        }
    }
}
