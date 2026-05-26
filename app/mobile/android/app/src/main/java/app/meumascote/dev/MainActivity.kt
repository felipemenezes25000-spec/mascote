package app.meumascote.dev

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

import app.meumascote.dev.unity.UnityPlayerActivityHelper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  // --- Unity lifecycle delegation ---
  // Helper é reflection-safe: NO-OP quando unityLibrary AAR ausente.
  // Quando presente, garante que UnityPlayer pausa/resume corretamente
  // pra evitar vazamento de memória e bateria em background.

  override fun onResume() {
    super.onResume()
    UnityPlayerActivityHelper.onResume(this)
  }

  override fun onPause() {
    super.onPause()
    UnityPlayerActivityHelper.onPause(this)
  }

  override fun onDestroy() {
    UnityPlayerActivityHelper.onDestroy(this)
    super.onDestroy()
  }

  override fun onLowMemory() {
    super.onLowMemory()
    UnityPlayerActivityHelper.onLowMemory()
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    UnityPlayerActivityHelper.onTrimMemory(level)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    UnityPlayerActivityHelper.onWindowFocusChanged(hasFocus)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    UnityPlayerActivityHelper.onConfigurationChanged(newConfig)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
