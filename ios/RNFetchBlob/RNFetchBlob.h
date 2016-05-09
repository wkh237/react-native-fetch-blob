//
//  RNFetchBlob.h
//
//  Created by suzuri04x2 on 2016/4/28.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#ifndef RNFetchBlob_h
#define RNFetchBlob_h

#import "RCTBridgeModule.h"

@interface RNFetchBlob : NSObject <RCTBridgeModule> 

@end

@interface FetchBlobUtils : NSObject

+ (void) onBlobResponse;
+ (NSMutableDictionary *) normalizeHeaders;

@end


#endif /* RNFetchBlob_h */
