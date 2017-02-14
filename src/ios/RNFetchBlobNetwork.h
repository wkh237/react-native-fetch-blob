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



typedef void(^CompletionHander)(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error);
typedef void(^DataTaskCompletionHander) (NSData * _Nullable resp, NSURLResponse * _Nullable response, NSError * _Nullable error);
typedef NS_ENUM(NSUInteger, ResponseFormat) {
    UTF8,
    BASE64,
    AUTO
};

@interface RNFetchBlobNetwork : NSObject  <NSURLSessionDelegate, NSURLSessionTaskDelegate, NSURLSessionDataDelegate>

@property (nullable, nonatomic) NSString * taskId;
@property (nonatomic) int expectedBytes;
@property (nonatomic) int receivedBytes;
@property (nonatomic) BOOL isServerPush;
@property (nullable, nonatomic) NSMutableData * respData;
@property (strong, nonatomic) RCTResponseSenderBlock callback;
@property (nullable, nonatomic) RCTBridge * bridge;
@property (nullable, nonatomic) NSDictionary * options;
@property (nullable, nonatomic) RNFetchBlobFS * fileStream;
@property (strong, nonatomic) CompletionHander fileTaskCompletionHandler;
@property (strong, nonatomic) DataTaskCompletionHander dataTaskCompletionHandler;
@property (nullable, nonatomic) NSError * error;
@property (nullable, nonatomic) NSMutableArray * redirects;

@property (nonatomic) BOOL respFile;
@property (nonatomic) BOOL isNewPart;
@property (nonatomic) BOOL isIncrement;
@property (nullable, nonatomic) NSMutableData * partBuffer;
@property (nullable, nonatomic) NSString * destPath;
@property (nullable, nonatomic) NSOutputStream * writeStream;
@property (nonatomic) long bodyLength;
@property (nullable, nonatomic) NSMutableDictionary * respInfo;
@property (nonatomic) NSInteger respStatus;
@property (nonatomic) ResponseFormat responseFormat;
@property ( nonatomic) BOOL followRedirect;


+ (NSMutableDictionary  * _Nullable ) normalizeHeaders:(NSDictionary * _Nullable)headers;
+ (void) cancelRequest:(NSString *)taskId;
+ (void) enableProgressReport:(NSString *) taskId;
+ (void) enableUploadProgress:(NSString *) taskId;
+ (void) emitExpiredTasks;

- (nullable id) init;
- (void) sendRequest;
- (void) sendRequest:(NSDictionary  * _Nullable )options contentLength:(long)contentLength bridge:(RCTBridge * _Nullable)bridgeRef taskId:(NSString * _Nullable)taskId withRequest:(NSURLRequest * _Nullable)req callback:(_Nullable RCTResponseSenderBlock) callback;
+ (void) removeCookies:(NSString *) domain error:(NSError **)error;
+ (void) enableProgressReport:(NSString *) taskId config:(RNFetchBlobProgress *)config;
+ (void) enableUploadProgress:(NSString *) taskId config:(RNFetchBlobProgress *)config;
+ (NSDictionary *) getCookies:(NSString *) url;



@end


#endif /* RNFetchBlobNetwork_h */
