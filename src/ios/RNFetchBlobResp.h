//
//  RNFetchBlobResp.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//

#ifndef RNFetchBlobResp_h
#define RNFetchBlobResp_h

#import <Foundation/Foundation.h>
#import "RCTBridgeModule.h"

@interface FetchBlobUtils : NSObject  <NSURLConnectionDelegate, NSURLConnectionDataDelegate> {
    
    NSString * taskId;
    int expectedBytes;
    int receivedBytes;
    NSMutableData * respData;
    RCTResponseSenderBlock callback;
    RCTBridge * bridge;
    NSDictionary * options;
    RNFetchBlobFS * fileStream;
}
@property (nonatomic) NSString * taskId;
@property (nonatomic) int expectedBytes;
@property (nonatomic) int receivedBytes;
@property (nonatomic) NSMutableData * respData;
@property (nonatomic) RCTResponseSenderBlock callback;
@property (nonatomic) RCTBridge * bridge;
@property (nonatomic) NSDictionary * options;
@property (nonatomic) RNFetchBlobFS * fileStream;


- (id) init;
- (void) sendRequest;

+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers;
- (void) sendRequest:(NSDictionary *)options bridge:(RCTBridge *)bridgeRef taskId:(NSString *)taskId withRequest:(NSURLRequest *)req callback:(RCTResponseSenderBlock) callback;


@end


#endif /* RNFetchBlobResp_h */
