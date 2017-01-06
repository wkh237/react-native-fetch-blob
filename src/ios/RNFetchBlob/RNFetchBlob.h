//
//  RNFetchBlob.h
//
//  Created by wkh237 on 2016/4/28.
//

#define OLD_IMPORT

#ifndef RNFetchBlob_h
#define RNFetchBlob_h

#ifdef OLD_IMPORT
#import "RCTBridgeModule.h"
#else
#import "<React/RCTBridgeModule.h>"
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
