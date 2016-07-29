//
//  RNFetchBlobNetwork.h
//  RNFetchBlob
//
//  Created by wkh237 on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//

#ifndef RNFetchBlobResp_h
#define RNFetchBlobResp_h

#import <Foundation/Foundation.h>
#import "RCTBridgeModule.h"
#import "RNFetchBlobFS.h"

typedef void(^CompletionHander)(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error);
typedef void(^DataTaskCompletionHander) (NSData * _Nullable resp, NSURLResponse * _Nullable response, NSError * _Nullable error);

@interface RNFetchBlobNetwork : NSObject  <NSURLSessionDelegate, NSURLSessionTaskDelegate, NSURLSessionDataDelegate>

@property (nullable, nonatomic) NSString * taskId;
@property (nonatomic) int expectedBytes;
@property (nonatomic) int receivedBytes;
@property (nullable, nonatomic) NSMutableData * respData;
@property (strong, nonatomic) RCTResponseSenderBlock callback;
@property (nullable, nonatomic) RCTBridge * bridge;
@property (nullable, nonatomic) NSDictionary * options;
@property (nullable, nonatomic) RNFetchBlobFS * fileStream;
@property (strong, nonatomic) CompletionHander fileTaskCompletionHandler;
@property (strong, nonatomic) DataTaskCompletionHander dataTaskCompletionHandler;
@property (nullable, nonatomic) NSError * error;


- (nullable id) init;
- (void) sendRequest;

+ (NSMutableDictionary  * _Nullable ) normalizeHeaders:(NSDictionary * _Nullable)headers;
+ (void) cancelRequest:(NSString *)taskId;
+ (void) enableProgressReport:(NSString *) taskId;
+ (void) enableUploadProgress:(NSString *) taskId;
- (void) sendRequest:(NSDictionary  * _Nullable )options contentLength:(long)contentLength bridge:(RCTBridge * _Nullable)bridgeRef taskId:(NSString * _Nullable)taskId withRequest:(NSURLRequest * _Nullable)req callback:(_Nullable RCTResponseSenderBlock) callback;


@end


#endif /* RNFetchBlobResp_h */
