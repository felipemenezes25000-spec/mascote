package app.meumascote.dev.unity

import app.meumascote.dev.BuildConfig
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge RN ↔ Unity (Sprint 3 embed path).
 *
 * Sem unityLibrary exportado: modo stub (isAvailable=false, postMessage log-only).
 * Com AAR embutido: UnitySendMessage via reflexão para evitar erro de compilação
 * quando com.unity3d.player.UnityPlayer não está no classpath.
 */
class UnityMascotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "UnityMascotModule"
        const val EVENT_UNITY_MESSAGE = "UnityMascotMessage"
        private const val UNITY_BRIDGE_OBJECT = "MascotUnityBridge"
        private const val UNITY_BRIDGE_METHOD = "OnMessageFromReactNative"
        private var reactContextRef: ReactApplicationContext? = null

        /** Chamado pelo C# ReactNativeBridge via JNI estático. */
        @JvmStatic
        fun onUnityMessage(json: String) {
            val ctx = reactContextRef ?: return
            ctx
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_UNITY_MESSAGE, json)
        }

        private fun isUnityEmbedded(): Boolean = try {
            Class.forName("com.unity3d.player.UnityPlayer")
            true
        } catch (_: ClassNotFoundException) {
            false
        }

        private fun sendToUnity(json: String) {
            val unityPlayer = Class.forName("com.unity3d.player.UnityPlayer")
            val method = unityPlayer.getMethod(
                "UnitySendMessage",
                String::class.java,
                String::class.java,
                String::class.java,
            )
            method.invoke(null, UNITY_BRIDGE_OBJECT, UNITY_BRIDGE_METHOD, json)
        }
    }

    init {
        reactContextRef = reactContext
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(isUnityEmbedded())
    }

    @ReactMethod
    fun postMessage(json: String, promise: Promise) {
        try {
            if (isUnityEmbedded()) {
                sendToUnity(json)
            } else if (BuildConfig.DEBUG) {
                android.util.Log.d(NAME, "postMessage (stub): $json")
            }
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("UNITY_POST_FAILED", e.message, e)
        }
    }

    override fun getConstants(): MutableMap<String, Any> {
        val embedded = isUnityEmbedded()
        return hashMapOf(
            "version" to if (embedded) "android-embedded-0.3.0" else "android-stub-0.3.0",
            "embedded" to embedded,
        )
    }
}
