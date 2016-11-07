//
//  RNFetchBlob.h
//
//  Created by wkh237 on 2016/4/28.
//

#ifndef RNFetchBlob_h
#define RNFetchBlob_h
#import "RCTBridgeModule.h"
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
