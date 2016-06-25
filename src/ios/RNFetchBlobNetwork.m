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

NSOperationQueue *taskQueue;

@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;
@synthesize bridge;
@synthesize options;
//@synthesize fileTaskCompletionHandler;
//@synthesize dataTaskCompletionHandler;
@synthesize error;


// constructor
- (id)init {
    self = [super init];
    if(taskQueue == nil) {
        taskQueue = [[NSOperationQueue alloc] init];
    }
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
- (void) sendRequest:(NSDictionary  * _Nullable )options bridge:(RCTBridge * _Nullable)bridgeRef taskId:(NSString * _Nullable)taskId withRequest:(NSURLRequest * _Nullable)req callback:(_Nullable RCTResponseSenderBlock) callback
{
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    self.callback = callback;
    self.bridge = bridgeRef;
    self.expectedBytes = 0;
    self.receivedBytes = 0;
    self.options = options;
    
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
    NSURLSession * session;
    
    // the session trust any SSL certification
    if([options valueForKey:CONFIG_TRUSTY] != nil)
    {
        NSURLSessionConfiguration *defaultConfigObject = [NSURLSessionConfiguration defaultSessionConfiguration];
        session = [NSURLSession sessionWithConfiguration:defaultConfigObject delegate:self delegateQueue:[NSOperationQueue mainQueue]];
    }
    // the session validates SSL certification, self-signed certification will be aborted
    else
    {
        session = [NSURLSession sharedSession];
    }
    
    // file will be stored at a specific path
    if( path != nil) {
        
//        self.fileTaskCompletionHandler = ;
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
            // prevent memory leaks
            self.respData = nil;
            [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
        }];
        [task resume];
    }
    // file will be stored at tmp path
    else if ( [self.options valueForKey:CONFIG_USE_TEMP]!= nil ) {
        
//        self.fileTaskCompletionHandler;
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
            [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
            // prevent memory leaks
            self.respData = nil;
        }];
        [task resume];
    }
    // base64 response
    else {
//        self.dataTaskCompletionHandler = ;
        NSURLSessionDataTask * task = [session dataTaskWithRequest:req completionHandler:^(NSData * _Nullable resp, NSURLResponse * _Nullable response, NSError * _Nullable error) {
            if(error != nil) {
                callback(@[[error localizedDescription]]);
                return;
            }
            else {
                callback(@[[NSNull null], [resp base64EncodedStringWithOptions:0]]);
            }
            self.respData = nil;
            [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
        }];
        [task resume];
    }
    
    // network status indicator
    if([[options objectForKey:CONFIG_INDICATOR] boolValue] == YES)
        [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:YES];
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
    self.error = error;
    [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
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

//- (void) application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)())completionHandler {
//    
//}

//- (void) URLSessionDidFinishEventsForBackgroundURLSession:(NSURLSession *)session
//{
//    if(self.dataTaskCompletionHandler != nil)
//    {
//        dataTaskCompletionHandler(self.respData, nil, error);
//    }
//    else if(self.fileTaskCompletionHandler != nil)
//    {
//        fileTaskCompletionHandler(nil, nil, self.error);
//    }
//}

- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential * _Nullable))completionHandler
{
    if([options valueForKey:CONFIG_TRUSTY] != nil)
        completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
    else {
        RCTLogWarn(@"counld not create connection with an unstrusted SSL certification, if you're going to create connection anyway, add `trusty:true` to RNFetchBlob.config");
        [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
    }
}

@end