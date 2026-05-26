//
//  Mascote-Bridging-Header.h
//
//  Use este header pra expor APIs Objective-C ao código Swift do módulo Unity.
//
//  Configurar no Xcode (Build Settings → Swift Compiler - General):
//    SWIFT_OBJC_BRIDGING_HEADER = Mascote/Mascote-Bridging-Header.h
//
//  Quando UnityFramework estiver embedded, descomentar a linha abaixo:
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// #import <UnityFramework/UnityFramework-Swift.h>
