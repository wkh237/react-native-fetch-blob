//
//  RNFetchBlob.h
//
//  Created by wkh237 on 2016/4/28.
//

// comment out this line if your RN project >= 0.40
#define OLD_IMPORT

#ifndef RNFetchBlob_h
#define RNFetchBlob_h


#ifdef OLD_IMPORT
#import "RCTBridgeModule.h"
#import "RCTLog.h"
#import "RCTRootView.h"
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#else
#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTBridgeModule.h>
#endif

#import <UIKit/UIKit.h>


@interface RNFetchBlob : NSObject <RCTBridgeModule, UIDocumentInteractionControllerDelegate> {

    NSString * filePathPrefix;

}

@property (nonatomic) NSString * filePathPrefix;
@property (retain) UIDocumentInteractionController * documentController;

+ (RCTBridge *)getRCTBridge;
+ (void) checkExpiredSessions;

@end

#endif /* RNFetchBlob_h */
