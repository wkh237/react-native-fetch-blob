//
//  RNFetchBlobUtil.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/5/24.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RCTBridgeModule.h"

#ifndef RNFetchBlobUtil_h
#define RNFetchBlobUtil_h

@class FetchBlobUtils;


@interface FetchBlobUtils : NSObject  <RCTBridgeModule, NSURLConnectionDelegate, NSURLConnectionDataDelegate> {
    
    NSString * taskId;
    int expectedBytes;
    int receivedBytes;
    NSMutableData * respData;
    RCTResponseSenderBlock callback;
}
@property (nonatomic) NSString * taskId;
@property (nonatomic) int expectedBytes;
@property (nonatomic) int receivedBytes;
@property (nonatomic) NSMutableData * respData;
@property (nonatomic) RCTResponseSenderBlock callback;


- (id) init;
- (id) delegate;
- (void) sendRequest;

+ (NSMutableDictionary *) normalizeHeaders;


@end



#endif /* RNFetchBlobUtil_h */
