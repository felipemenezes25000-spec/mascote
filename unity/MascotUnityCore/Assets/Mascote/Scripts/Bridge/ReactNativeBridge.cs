using UnityEngine;

namespace Mascote.Unity.Bridge
{
    /// <summary>
    /// Ponto de entrada nativo: UnitySendMessage / módulo RN UnityMascotModule.
    /// GameObject deve chamar-se MascotUnityBridge.
    /// </summary>
    public class ReactNativeBridge : MonoBehaviour
    {
        public const string GameObjectName = "MascotUnityBridge";
        public const string MethodOnMessage = "OnMessageFromReactNative";

        [SerializeField] UnityMessageRouter router;
        [SerializeField] OutboundEventDispatcher outbound;

        static ReactNativeBridge _instance;

        static AndroidJavaClass _unityMascotModuleClass;

        void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
            DontDestroyOnLoad(gameObject);
            gameObject.name = GameObjectName;

            outbound?.SetSender(SendToReactNative);
        }

        void Start()
        {
            outbound?.SendReady();
        }

        /// <summary>Chamado via UnitySendMessage do lado RN/Android.</summary>
        public void OnMessageFromReactNative(string json)
        {
            router?.RouteJson(json);
        }

        public static void SendToReactNative(string json)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                _unityMascotModuleClass ??= new AndroidJavaClass("app.meumascote.dev.unity.UnityMascotModule");
                _unityMascotModuleClass.CallStatic("onUnityMessage", json);
                return;
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[ReactNativeBridge] UnityMascotModule fallback: {ex.Message}");
            }

            try
            {
                using var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
                activity?.Call("runOnUiThread", new AndroidJavaRunnable(() =>
                {
                    Debug.Log($"[ReactNativeBridge] → RN (log only): {json}");
                }));
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[ReactNativeBridge] Android send failed: {ex.Message}");
            }
#else
            Debug.Log($"[ReactNativeBridge] → RN: {json}");
#endif
        }
    }
}
