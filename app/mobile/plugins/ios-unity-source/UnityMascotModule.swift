//
//  UnityMascotModule.swift — Bridge RN ↔ Unity iOS (espelha UnityMascotModule.kt).
//
//  Sem UnityFramework no projeto: modo stub (isAvailable=false, postMessage no-op).
//  Com UnityFramework embedded: invoca UnityFramework.getInstance().sendMessageToGOWithName.
//
//  Setup necessário (passo manual em Mac/Xcode):
//   1. Criar bridging header: Mascote-Bridging-Header.h
//   2. Adicionar import: @import UnityFramework;
//   3. Embed UnityFramework.framework no projeto
//   4. Habilitar Modules: GENERATE_INFOPLIST_FILE = YES; ENABLE_BITCODE = NO
//

import Foundation
import React

@objc(UnityMascotModule)
public class UnityMascotModule: RCTEventEmitter {

    public static let EVENT_UNITY_MESSAGE = "UnityMascotMessage"
    private static let UNITY_BRIDGE_OBJECT = "MascotUnityBridge"
    private static let UNITY_BRIDGE_METHOD = "OnMessageFromReactNative"

    private static weak var sharedInstance: UnityMascotModule?

    public override init() {
        super.init()
        UnityMascotModule.sharedInstance = self
    }

    public override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    public override func supportedEvents() -> [String]! {
        return [UnityMascotModule.EVENT_UNITY_MESSAGE]
    }

    public override func constantsToExport() -> [AnyHashable : Any]! {
        let embedded = UnityMascotModule.isUnityEmbedded()
        return [
            "version": embedded ? "ios-embedded-0.3.0" : "ios-stub-0.3.0",
            "embedded": embedded,
        ]
    }

    // MARK: - Public RN API

    @objc(isAvailable:rejecter:)
    public func isAvailable(_ resolve: RCTPromiseResolveBlock,
                            rejecter: RCTPromiseRejectBlock) {
        resolve(UnityMascotModule.isUnityEmbedded())
    }

    @objc(postMessage:resolver:rejecter:)
    public func postMessage(_ json: String,
                            resolver: RCTPromiseResolveBlock,
                            rejecter: RCTPromiseRejectBlock) {
        if UnityMascotModule.isUnityEmbedded() {
            UnityMascotModule.sendToUnity(json: json)
        } else {
            #if DEBUG
            NSLog("[UnityMascotModule] postMessage (stub): %@", json)
            #endif
        }
        resolver(true)
    }

    // MARK: - Unity → RN callback (chamado pelo C# DllImport)

    @objc public static func onUnityMessage(_ json: String) {
        sharedInstance?.sendEvent(withName: EVENT_UNITY_MESSAGE, body: json)
    }

    // MARK: - Reflection-safe UnityFramework lookup

    private static func unityFrameworkClass() -> AnyClass? {
        return NSClassFromString("UnityFramework")
    }

    public static func isUnityEmbedded() -> Bool {
        return unityFrameworkClass() != nil
    }

    private static func sendToUnity(json: String) {
        guard let cls = unityFrameworkClass() as? NSObject.Type else { return }
        // Equivalente a:
        //   UnityFramework.getInstance().sendMessageToGO(
        //       withName: UNITY_BRIDGE_OBJECT,
        //       functionName: UNITY_BRIDGE_METHOD,
        //       message: json)
        let getInstance = NSSelectorFromString("getInstance")
        guard cls.responds(to: getInstance) else { return }
        let instance = cls.perform(getInstance)?.takeUnretainedValue() as? NSObject
        guard let inst = instance else { return }

        let sendSelector = NSSelectorFromString("sendMessageToGOWithName:functionName:message:")
        if inst.responds(to: sendSelector) {
            // Sem invocar Selector diretamente (3 args). Usa método via NSInvocation.
            let methodSig = inst.method(for: sendSelector)
            if methodSig != nil {
                typealias FuncType = @convention(c) (AnyObject, Selector, NSString, NSString, NSString) -> Void
                let fn = unsafeBitCast(methodSig, to: FuncType.self)
                fn(inst, sendSelector,
                   UNITY_BRIDGE_OBJECT as NSString,
                   UNITY_BRIDGE_METHOD as NSString,
                   json as NSString)
            }
        }
    }
}
