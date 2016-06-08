//
//  RNFetchBlobNetwork.m
//  RNFetchBlob
//
//  Created by wkh237 on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//

#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobNetwork.h"
#import "RNFetchBlobConst.h"

////////////////////////////////////////
//
//  HTTP request handler
//
////////////////////////////////////////

@implementation RNFetchBlobNetwork


@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;
@synthesize bridge;
@synthesize options;

// constructor
- (id)init {
    self = [super init];
    return self;
}


// removing case from headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers {
    
    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }
    
    return mheaders;
}

// send HTTP request
- (void) sendRequest:(NSDictionary *)options bridge:(RCTBridge *)bridgeRef taskId:(NSString *)taskId withRequest:(NSURLRequest *)req callback:(RCTResponseSenderBlock) callback {
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    self.callback = callback;
    self.bridge = bridgeRef;
    self.expectedBytes = 0;
    self.receivedBytes = 0;
    self.options = options;
    
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];

    NSURLSession * session = [NSURLSession sharedSession];
    
    // file will be stored at a specific path
    if( path != nil) {
        NSURLSessionDownloadTask * task = [session downloadTaskWithRequest:req completionHandler:^(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error) {
            if(error != nil) {
                callback(@[[error localizedDescription]]);
                return;
            }
            NSError * taskErr;
            NSFileManager * fm = [NSFileManager defaultManager];
            // move temp file to desination
            [fm moveItemAtURL:location toURL:[NSURL fileURLWithPath:path] error:&taskErr];
            if(taskErr != nil) {
                callback(@[[taskErr localizedDescription]]);
                return;
            }
            callback(@[[NSNull null], path]);
        }];
        [task resume];
    }
    // file will be stored at tmp path
    else if ( [self.options valueForKey:CONFIG_USE_TEMP]!= nil ) {
        NSURLSessionDownloadTask * task = [session downloadTaskWithRequest:req completionHandler:^(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error) {
            if(error != nil) {
                callback(@[[error localizedDescription]]);
                return;
            }
            NSError * taskErr;
            NSFileManager * fm = [NSFileManager defaultManager];
            NSString * tmpPath = [RNFetchBlobFS getTempPath:self.taskId withExtension:[self.options valueForKey:CONFIG_FILE_EXT]];
            // move temp file to desination
            [fm moveItemAtURL:location toURL:[NSURL fileURLWithPath:tmpPath] error:&taskErr];
            if(taskErr != nil) {
                callback(@[[taskErr localizedDescription]]);
                return;
            }
            callback(@[[NSNull null], tmpPath]);
        }];
        [task resume];
    }
    // base64 response
    else {
        NSURLSessionUploadTask * task =
        
        [session dataTaskWithRequest:req completionHandler:^(NSData * _Nullable resp, NSURLResponse * _Nullable response, NSError * _Nullable error) {
            if(error != nil) {
                callback(@[[error localizedDescription]]);
                return;
            }
            else {
                callback(@[[NSNull null], [resp base64EncodedStringWithOptions:0]]);
            }
        }];
        [task resume];
    }
}

////////////////////////////////////////
//
//  NSURLSession delegates
//
////////////////////////////////////////


#pragma mark NSURLSession delegate methods

// set expected content length on response received
- (void) URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveResponse:(NSURLResponse *)response completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler
{
    expectedBytes = [response expectedContentLength];
}

// download progress handler
- (void) URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data
{
    receivedBytes += [data length];
    
    Boolean fileCache = [self.options valueForKey:CONFIG_USE_TEMP];
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    // cache data in memory
    if(path == nil && fileCache == nil) {
        [respData appendData:data];
    }
    
    [self.bridge.eventDispatcher
     sendDeviceEventWithName:@"RNFetchBlobProgress"
     body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%d", receivedBytes],
            @"total": [NSString stringWithFormat:@"%d", expectedBytes]
            }
     ];
}

- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error {
    NSLog([error localizedDescription]);
}

// upload progress handler
- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesWritten totalBytesExpectedToSend:(int64_t)totalBytesExpectedToWrite
{
    expectedBytes = totalBytesExpectedToWrite;
    receivedBytes += totalBytesWritten;
    [self.bridge.eventDispatcher
     sendDeviceEventWithName:@"RNFetchBlobProgress"
     body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%d", receivedBytes],
            @"total": [NSString stringWithFormat:@"%d", expectedBytes]
            }
     ];
}

@end