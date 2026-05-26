package app.meumascote.dev.unity

import android.app.Activity
import android.content.res.Configuration
import app.meumascote.dev.BuildConfig

/**
 * Delega lifecycle calls ao Unity `UnityPlayer` via reflection.
 *
 * Reflection-safe: se `com.unity3d.player.UnityPlayer` não estiver no classpath
 * (build sem unityLibrary), TODO método vira NO-OP silent. Isso permite que
 * `MainActivity` chame esses métodos incondicionalmente sem quebrar build atual.
 *
 * Espelha o mesmo padrão de [UnityMascotModule.isUnityEmbedded] pra manter
 * single source of truth sobre a presença do AAR.
 *
 * Importante: o `UnityPlayer` é um singleton estático gerenciado pelo Unity.
 * Os métodos aqui são thread-safe via reflection lookup cacheado.
 */
object UnityPlayerActivityHelper {

    private const val TAG = "UnityPlayerHelper"
    private const val UNITY_PLAYER_CLASS = "com.unity3d.player.UnityPlayer"

    @Volatile
    private var cachedClass: Class<*>? = null

    @Volatile
    private var classLookupAttempted = false

    /** Single source of truth — mesma checagem que [UnityMascotModule] usa. */
    fun isUnityEmbedded(): Boolean = resolveClass() != null

    fun onResume(activity: Activity) {
        invokeStaticVoid("resume", activity = activity, methodTakesActivity = false)
    }

    fun onPause(activity: Activity) {
        invokeStaticVoid("pause", activity = activity, methodTakesActivity = false)
    }

    /**
     * `UnityPlayer.quit()` libera GPU context e descarrega native libs.
     * Chamar uma vez na destruição final da activity.
     */
    fun onDestroy(activity: Activity) {
        invokeStaticVoid("quit", activity = activity, methodTakesActivity = false)
    }

    fun onLowMemory() {
        invokeStaticVoid("lowMemory", activity = null, methodTakesActivity = false)
    }

    fun onTrimMemory(level: Int) {
        val cls = resolveClass() ?: return
        runCatching {
            val method = cls.getMethod("trimMemory", Int::class.javaPrimitiveType)
            method.invoke(null, level)
            logDebug("trimMemory($level)")
        }.onFailure { handleReflectionError("trimMemory", it) }
    }

    fun onWindowFocusChanged(hasFocus: Boolean) {
        val cls = resolveClass() ?: return
        runCatching {
            val method = cls.getMethod("windowFocusChanged", Boolean::class.javaPrimitiveType)
            method.invoke(null, hasFocus)
            logDebug("windowFocusChanged($hasFocus)")
        }.onFailure { handleReflectionError("windowFocusChanged", it) }
    }

    fun onConfigurationChanged(newConfig: Configuration) {
        val cls = resolveClass() ?: return
        runCatching {
            val method = cls.getMethod("configurationChanged", Configuration::class.java)
            method.invoke(null, newConfig)
            logDebug("configurationChanged")
        }.onFailure { handleReflectionError("configurationChanged", it) }
    }

    /**
     * Resolve a classe `UnityPlayer` uma única vez (negative-cached também).
     * Após primeira tentativa, evita custo repetido de `Class.forName`.
     */
    private fun resolveClass(): Class<*>? {
        if (classLookupAttempted) return cachedClass
        synchronized(this) {
            if (classLookupAttempted) return cachedClass
            cachedClass = try {
                Class.forName(UNITY_PLAYER_CLASS)
            } catch (_: ClassNotFoundException) {
                null
            } catch (_: NoClassDefFoundError) {
                null
            }
            classLookupAttempted = true
            if (cachedClass == null && BuildConfig.DEBUG) {
                android.util.Log.d(TAG, "Unity AAR ausente — lifecycle helpers viraram NO-OP")
            }
            return cachedClass
        }
    }

    private fun invokeStaticVoid(methodName: String, activity: Activity?, methodTakesActivity: Boolean) {
        val cls = resolveClass() ?: return
        runCatching {
            if (methodTakesActivity && activity != null) {
                val method = cls.getMethod(methodName, Activity::class.java)
                method.invoke(null, activity)
            } else {
                val method = cls.getMethod(methodName)
                method.invoke(null)
            }
            logDebug(methodName)
        }.onFailure { handleReflectionError(methodName, it) }
    }

    private fun logDebug(methodName: String) {
        if (BuildConfig.DEBUG) {
            android.util.Log.d(TAG, "UnityPlayer.$methodName() OK")
        }
    }

    private fun handleReflectionError(methodName: String, t: Throwable) {
        // Não relança: lifecycle method falhando NÃO pode crashar o app.
        // Log sempre (mesmo em release) porque indica state inconsistente do Unity.
        android.util.Log.w(TAG, "UnityPlayer.$methodName() falhou: ${t.message}")
    }
}
