using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Cena / tint ambiente + iluminação por mood, sceneId e timeOfDay inferido.
    /// </summary>
    public class MascotEnvironmentController : MonoBehaviour
    {
        [SerializeField] Camera mainCamera;
        [SerializeField] Light keyLight;
        [SerializeField] Light fillLight;
        [SerializeField] Transform environmentRoot;
        [SerializeField] Color defaultTint = new(0.92f, 0.95f, 1f);

        string _activeSceneId = "room";

        public void ApplyEnvironment(UnityEnvironmentState env, string mood = null)
        {
            if (env == null) return;

            _activeSceneId = env.sceneId ?? "room";
            var timeOfDay = InferTimeOfDay(_activeSceneId);
            ApplyTint(env.tint, mood, timeOfDay);
            ApplyLighting(mood, timeOfDay);
            ActivateEnvironmentPrefab(_activeSceneId);
        }

        void ApplyTint(string tintHex, string mood, string timeOfDay)
        {
            Color tint = defaultTint;
            if (!string.IsNullOrEmpty(tintHex) && ColorUtility.TryParseHtmlString(tintHex, out var parsed))
                tint = parsed;

            tint = MoodTintOffset(tint, mood);
            if (timeOfDay == "night") tint *= new Color(0.45f, 0.5f, 0.75f);

            if (mainCamera != null)
                mainCamera.backgroundColor = tint;
            RenderSettings.ambientLight = tint * 0.55f;
        }

        void ApplyLighting(string mood, string timeOfDay)
        {
            var keyIntensity = timeOfDay switch
            {
                "night" => 0.35f,
                "sunset" => 0.65f,
                "dawn" => 0.75f,
                _ => 1f,
            };

            keyIntensity *= mood switch
            {
                "sad" => 0.75f,
                "excited" => 1.15f,
                "exhausted" => 0.6f,
                _ => 1f,
            };

            if (keyLight != null)
            {
                keyLight.intensity = keyIntensity;
                keyLight.color = timeOfDay == "sunset"
                    ? new Color(1f, 0.82f, 0.65f)
                    : Color.white;
            }

            if (fillLight != null)
                fillLight.intensity = keyIntensity * 0.45f;
        }

        void ActivateEnvironmentPrefab(string sceneId)
        {
            if (environmentRoot == null) return;

            var roomName = SceneIdToRoom(sceneId);
            for (var i = 0; i < environmentRoot.childCount; i++)
            {
                var child = environmentRoot.GetChild(i);
                child.gameObject.SetActive(child.name == roomName);
            }
        }

        static string InferTimeOfDay(string sceneId)
        {
            if (string.IsNullOrEmpty(sceneId)) return "day";
            var id = sceneId.ToLowerInvariant();
            if (id.Contains("night") || id.Contains("lunar") || id.Contains("aurora")) return "night";
            if (id.Contains("sunset") || id.Contains("cafe")) return "sunset";
            if (id.Contains("dawn") || id.Contains("garden")) return "dawn";
            return "day";
        }

        static string SceneIdToRoom(string sceneId)
        {
            if (string.IsNullOrEmpty(sceneId)) return "DefaultRoom";
            var id = sceneId.ToLowerInvariant();
            if (id.Contains("forest") || id.Contains("garden")) return "CalmRoom";
            if (id.Contains("beach") || id.Contains("sun")) return "BrightRoom";
            if (id.Contains("library") || id.Contains("temple")) return "FocusRoom";
            if (id.Contains("night") || id.Contains("lunar") || id.Contains("aurora")) return "NightRoom";
            return "DefaultRoom";
        }

        static Color MoodTintOffset(Color baseColor, string mood)
        {
            return mood switch
            {
                "sad" => Color.Lerp(baseColor, new Color(0.55f, 0.6f, 0.85f), 0.25f),
                "excited" => Color.Lerp(baseColor, new Color(1f, 0.92f, 0.75f), 0.15f),
                "exhausted" => Color.Lerp(baseColor, new Color(0.65f, 0.68f, 0.72f), 0.2f),
                _ => baseColor,
            };
        }

        void Reset()
        {
            mainCamera = Camera.main;
            keyLight = FindObjectOfType<Light>();
        }
    }
}
