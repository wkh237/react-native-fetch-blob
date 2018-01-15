//
//  RNFetchBlobNetwork.h
//  RNFetchBlob
//
//  Created by wkh237 on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RNFetchBlobProgress.h"
#import "RNFetchBlobFS.h"

#if __has_include(<React/RCTAssert.h>)
#import <React/RCTBridgeModule.h>
#else
#import "RCTBridgeModule.h"
#endif

#ifndef RNFetchBlobNetwork_h
#define RNFetchBlobNetwork_h


@interface RNFetchBlobNetwork : NSObject  <NSURLSessionDelegate, NSURLSessionTaskDelegate, NSURLSessionDataDelegate>

@property (nullable, nonatomic) NSString * taskId;
@property (nonatomic) long long expectedBytes;
@property (nonatomic) long long receivedBytes;
@property (nonatomic) BOOL isServerPush;
@property (nullable, nonatomic) NSMutableData * respData;
@property (nullable, strong, nonatomic) RCTResponseSenderBlock callback;
@property (nullable, nonatomic) RCTBridge * bridge;
@property (nullable, nonatomic) NSDictionary * options;
@property (nullable, nonatomic) RNFetchBlobFS * fileStream;
@property (nullable, nonatomic) NSError * error;


+ (NSMutableDictionary  * _Nullable ) normalizeHeaders:(NSDictionary * _Nullable)headers;
+ (void) cancelRequest:(NSString * _Nonnull)taskId;
+ (void) emitExpiredTasks;
+ (void) enableProgressReport:(NSString * _Nonnull) taskId config:(RNFetchBlobProgress * _Nullable)config;
+ (void) enableUploadProgress:(NSString * _Nonnull) taskId config:(RNFetchBlobProgress * _Nullable)config;

- (nullable id) init;
- (void) sendRequest:(NSDictionary  * _Nullable )options contentLength:(long)contentLength bridge:(RCTBridge * _Nullable)bridgeRef taskId:(NSString * _Nullable)taskId withRequest:(NSURLRequest * _Nullable)req callback:(_Nullable RCTResponseSenderBlock) callback;

@end


#endif /* RNFetchBlobNetwork_h */
