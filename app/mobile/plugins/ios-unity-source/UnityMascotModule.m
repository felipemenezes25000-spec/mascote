//
//  UnityMascotModule.m — Exporta UnityMascotModule.swift como RN module via macros.
//
//  Não é necessário implementar nada aqui — RCT_EXTERN_MODULE + RCT_EXTERN_METHOD
//  geram os bindings de Objective-C que o React Native runtime espera.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(UnityMascotModule, RCTEventEmitter)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(postMessage:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
