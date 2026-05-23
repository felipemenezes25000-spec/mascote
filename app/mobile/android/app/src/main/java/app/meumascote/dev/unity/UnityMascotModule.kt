package app.meumascote.dev.unity

import app.meumascote.dev.BuildConfig
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge stub RN ↔ Unity (Sprint 4).
 *
 * Quando unityLibrary estiver embutido, postMessage chama UnitySendMessage
 * e onUnityMessage repassa eventos para JS via DeviceEventEmitter.
 */
class UnityMascotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "UnityMascotModule"
        const val EVENT_UNITY_MESSAGE = "UnityMascotMessage"
        private var reactContextRef: ReactApplicationContext? = null

        /** Chamado pelo C# ReactNativeBridge via JNI estático. */
        @JvmStatic
        fun onUnityMessage(json: String) {
            val ctx = reactContextRef ?: return
            ctx
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_UNITY_MESSAGE, json)
        }
    }

    init {
        reactContextRef = reactContext
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isAvailable(promise: Promise) {
        // true quando unityLibrary AAR estiver linkado e UnityPlayer ativo
        val hasUnity = try {
            Class.forName("com.unity3d.player.UnityPlayer")
            false // classe existe no stub mas embed não está ativo
        } catch (_: ClassNotFoundException) {
            false
        }
        promise.resolve(hasUnity)
    }

    @ReactMethod
    fun postMessage(json: String, promise: Promise) {
        try {
            // Embed real: UnityPlayer.UnitySendMessage("MascotUnityBridge", "OnMessageFromReactNative", json)
            if (BuildConfig.DEBUG) {
                android.util.Log.d(NAME, "postMessage (stub): $json")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UNITY_POST_FAILED", e.message, e)
        }
    }

    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "version" to "android-stub-0.2.0",
            "embedded" to false,
        )
    }
}
