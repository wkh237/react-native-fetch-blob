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

NSMutableDictionary * taskTable;

@interface RNFetchBlobNetwork ()
{
    BOOL * respFile;
    NSString * destPath;
    NSOutputStream * writeStream;
    long bodyLength;
}

@end

@implementation RNFetchBlobNetwork

NSOperationQueue *taskQueue;

@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;
@synthesize bridge;
@synthesize options;
@synthesize fileTaskCompletionHandler;
@synthesize dataTaskCompletionHandler;
@synthesize error;


// constructor
- (id)init {
    self = [super init];
    if(taskQueue == nil) {
        taskQueue = [[NSOperationQueue alloc] init];
    }
    if(taskTable == nil) {
        taskTable = [[NSMutableDictionary alloc] init];
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
- (void) sendRequest:(NSDictionary  * _Nullable )options
       contentLength:(long) contentLength
              bridge:(RCTBridge * _Nullable)bridgeRef
              taskId:(NSString * _Nullable)taskId
         withRequest:(NSURLRequest * _Nullable)req
            callback:(_Nullable RCTResponseSenderBlock) callback
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
    
    bodyLength = contentLength;
    
    // the session trust any SSL certification

    NSURLSessionConfiguration *defaultConfigObject = [NSURLSessionConfiguration defaultSessionConfiguration];
    session = [NSURLSession sessionWithConfiguration:defaultConfigObject delegate:self delegateQueue:[NSOperationQueue mainQueue]];
    
    if(path != nil || [self.options valueForKey:CONFIG_USE_TEMP]!= nil)
    {
        respFile = YES;
        if(path != nil)
            destPath = path;
        else
            destPath = [RNFetchBlobFS getTempPath:taskId withExtension:[self.options valueForKey:CONFIG_FILE_EXT]];
    }
    else
    {
        respData = [[NSMutableData alloc] init];
        respFile = NO;
    }
    NSURLSessionDataTask * task = [session dataTaskWithRequest:req];
    [taskTable setValue:task forKey:taskId];
    [task resume];
    
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
 
    NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse*)response;
    NSInteger statusCode = [(NSHTTPURLResponse *)response statusCode];
    if ([response respondsToSelector:@selector(allHeaderFields)])
    {
        NSDictionary *headers = [httpResponse allHeaderFields];
        NSString * respType = [[headers valueForKey:@"Content-Type"] lowercaseString];
        if([headers valueForKey:@"Content-Type"] != nil)
        {
            if([respType containsString:@"text/plain"])
            {
                respType = @"text";
            }
            else if([respType containsString:@"application/json"])
            {
                respType = @"json";
            }
            else
            {
                respType = @"blob";
            }
        }
        else
            respType = @"";
        [self.bridge.eventDispatcher
         sendDeviceEventWithName: EVENT_STATE_CHANGE
         body:@{
                @"taskId": taskId,
                @"state": @"2",
                @"headers": headers,
                @"respType" : respType,
                @"status": [NSString stringWithFormat:@"%d", statusCode ]
            }
         ];
    }
    
    if(respFile == YES)
    {
        NSFileManager * fm = [NSFileManager defaultManager];
        NSString * folder = [destPath stringByDeletingLastPathComponent];
        if(![fm fileExistsAtPath:folder]) {
            [fm createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:NULL error:nil];
        }
        [fm createFileAtPath:destPath contents:[[NSData alloc] init] attributes:nil];
        writeStream = [[NSOutputStream alloc] initToFileAtPath:destPath append:YES];
        [writeStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
        [writeStream open];
    }
    completionHandler(NSURLSessionResponseAllow);
}

// download progress handler
- (void) URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data
{
    receivedBytes += [data length];
    if(respFile == NO)
    {
        [respData appendData:data];
    }
    else
    {
        [writeStream write:[data bytes] maxLength:[data length]];
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
    if(respFile == YES)
    {
        [writeStream close];
        callback(@[error == nil ? [NSNull null] : [error localizedDescription], destPath]);
    }
    // base64 response
    else {
        NSString * res = [[NSString alloc] initWithData:respData encoding:NSUTF8StringEncoding];
        callback(@[error == nil ? [NSNull null] : [error localizedDescription], [respData base64EncodedStringWithOptions:0]]);
    }
}

// upload progress handler
- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesWritten totalBytesExpectedToSend:(int64_t)totalBytesExpectedToWrite
{
    [self.bridge.eventDispatcher
     sendDeviceEventWithName:@"RNFetchBlobProgress-upload"
     body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%d", totalBytesWritten],
            @"total": [NSString stringWithFormat:@"%d", bodyLength]
            }
     ];
}

+ (void) cancelRequest:(NSString *)taskId
{
    NSURLSessionDataTask * task = (NSURLSessionDataTask *)[taskTable objectForKey:taskId];
    if(task != nil && task.state == NSURLSessionTaskStateRunning)
        [task cancel];
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

- (void) URLSession:(NSURLSession *)session didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential * _Nullable credantial))completionHandler
{
    if([options valueForKey:CONFIG_TRUSTY] != nil)
    {
        completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
    }
    else
    {
        NSURLSessionAuthChallengeDisposition disposition = NSURLSessionAuthChallengePerformDefaultHandling;
        __block NSURLCredential *credential = nil;
        if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust])
        {
            credential = [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust];
            if (credential) {
                disposition = NSURLSessionAuthChallengeUseCredential;
            } else {
                disposition = NSURLSessionAuthChallengePerformDefaultHandling;
            }
        }
        else
        {
            disposition = NSURLSessionAuthChallengeCancelAuthenticationChallenge;
            RCTLogWarn(@"counld not create connection with an unstrusted SSL certification, if you're going to create connection anyway, add `trusty:true` to RNFetchBlob.config");
            [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];
        }
        if (completionHandler) {
            completionHandler(disposition, credential);
        }
    }
}

@end