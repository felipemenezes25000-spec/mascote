//
//  UnityPlayerHelper.swift — Espelha UnityPlayerActivityHelper.kt no iOS.
//
//  Reflection-safe: se UnityFramework não estiver embedded, todos os métodos
//  viram NO-OP. Permite chamar incondicionalmente do AppDelegate.
//
//  Lifecycle UIApplication → UnityFramework:
//    applicationWillResignActive      → pause
//    applicationDidEnterBackground    → pause (já idempotente)
//    applicationWillEnterForeground   → resume
//    applicationDidBecomeActive       → resume (já idempotente)
//    applicationDidReceiveMemoryWarning → quit (descarrega)
//

import Foundation
import UIKit

@objc public final class UnityPlayerHelper: NSObject {

    private static let logTag = "[UnityPlayerHelper]"
    private static var cachedClass: AnyClass??

    /// Single source of truth — espelha [UnityMascotModule.isUnityEmbedded].
    @objc public static func isUnityEmbedded() -> Bool {
        return resolveClass() != nil
    }

    @objc public static func applicationDidFinishLaunching() {
        invokeStaticVoid("application", takesUIApplication: true)
    }

    @objc public static func applicationWillResignActive() {
        // UnityFramework chama pauseUnity automaticamente em alguns paths,
        // mas chamar explicitamente garante consistência cross-versão.
        invokeUnityInstanceVoid("pauseUnity")
    }

    @objc public static func applicationDidEnterBackground() {
        invokeUnityInstanceVoid("pauseUnity")
    }

    @objc public static func applicationWillEnterForeground() {
        invokeUnityInstanceVoid("resumeUnity")
    }

    @objc public static func applicationDidBecomeActive() {
        invokeUnityInstanceVoid("resumeUnity")
    }

    @objc public static func applicationDidReceiveMemoryWarning() {
        // Em pressão de memória, libera Unity. App pode re-init depois.
        invokeUnityInstanceVoid("unloadApplication")
    }

    @objc public static func applicationWillTerminate() {
        invokeUnityInstanceVoid("unloadApplication")
    }

    // MARK: - Reflection helpers

    private static func resolveClass() -> AnyClass? {
        if let cached = cachedClass {
            return cached
        }
        let cls = NSClassFromString("UnityFramework")
        cachedClass = cls
        #if DEBUG
        if cls == nil {
            NSLog("%@ UnityFramework ausente — lifecycle helpers viraram NO-OP", logTag)
        }
        #endif
        return cls
    }

    private static func invokeStaticVoid(_ methodName: String, takesUIApplication: Bool) {
        // Reservado pra métodos estáticos sem args — atualmente nenhum
        // UnityFramework método de lifecycle é estático.
        // Stub pra futuro.
    }

    private static func invokeUnityInstanceVoid(_ methodName: String) {
        guard let cls = resolveClass() as? NSObject.Type else { return }
        let getInstance = NSSelectorFromString("getInstance")
        guard cls.responds(to: getInstance) else { return }
        let instance = cls.perform(getInstance)?.takeUnretainedValue() as? NSObject
        guard let inst = instance else { return }

        let selector = NSSelectorFromString(methodName)
        if inst.responds(to: selector) {
            inst.perform(selector)
            #if DEBUG
            NSLog("%@ UnityFramework.%@ OK", logTag, methodName)
            #endif
        } else {
            #if DEBUG
            NSLog("%@ UnityFramework não responde a %@", logTag, methodName)
            #endif
        }
    }
}
