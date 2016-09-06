//
//  RNFetchBlobNetwork.m
//  RNFetchBlob
//
//  Created by wkh237 on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//

#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobNetwork.h"
#import "RNFetchBlobConst.h"
#import "RNFetchBlobReqBuilder.h"
#import "IOS7Polyfill.h"
#import <CommonCrypto/CommonDigest.h>

////////////////////////////////////////
//
//  HTTP request handler
//
////////////////////////////////////////

NSMapTable * taskTable;
NSMutableDictionary * progressTable;
NSMutableDictionary * uploadProgressTable;


@interface RNFetchBlobNetwork ()
{
    BOOL * respFile;
    NSString * destPath;
    NSOutputStream * writeStream;
    long bodyLength;
    NSMutableDictionary * respInfo;
    NSInteger respStatus;
    NSMutableArray * redirects;
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
        taskQueue.maxConcurrentOperationCount = 10;
    }
    if(taskTable == nil) {
        taskTable = [[NSMapTable alloc] init];
    }
    if(progressTable == nil)
    {
        progressTable = [[NSMutableDictionary alloc] init];
    }
    if(uploadProgressTable == nil)
    {
        uploadProgressTable = [[NSMutableDictionary alloc] init];
    }
    return self;
}

+ (void) enableProgressReport:(NSString *) taskId
{
    [progressTable setValue:@YES forKey:taskId];
}

+ (void) enableUploadProgress:(NSString *) taskId
{
    [uploadProgressTable setValue:@YES forKey:taskId];
}

// removing case from headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers
{

    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }

    return mheaders;
}

- (NSString *)md5:(NSString *)input {
    const char* str = [input UTF8String];
    unsigned char result[CC_MD5_DIGEST_LENGTH];
    CC_MD5(str, (CC_LONG)strlen(str), result);

    NSMutableString *ret = [NSMutableString stringWithCapacity:CC_MD5_DIGEST_LENGTH*2];
    for(int i = 0; i<CC_MD5_DIGEST_LENGTH; i++) {
        [ret appendFormat:@"%02x",result[i]];
    }
    return ret;
}

// send HTTP request
- (void) sendRequest:(__weak NSDictionary  * _Nullable )options
       contentLength:(long) contentLength
              bridge:(RCTBridge * _Nullable)bridgeRef
              taskId:(NSString * _Nullable)taskId
         withRequest:(__weak NSURLRequest * _Nullable)req
            callback:(_Nullable RCTResponseSenderBlock) callback
{
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    self.callback = callback;
    self.bridge = bridgeRef;
    self.expectedBytes = 0;
    self.receivedBytes = 0;
    self.options = options;
    redirects = [[NSMutableArray alloc] init];
    [redirects addObject:req.URL.absoluteString];

    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
	NSString * key = [self.options valueForKey:CONFIG_KEY];
    __block NSURLSession * session;

    bodyLength = contentLength;

    // the session trust any SSL certification
    NSURLSessionConfiguration *defaultConfigObject = [NSURLSessionConfiguration defaultSessionConfiguration];
    // set request timeout
    float timeout = [options valueForKey:@"timeout"] == nil ? -1 : [[options valueForKey:@"timeout"] floatValue];
    if(timeout > 0)
    {
        defaultConfigObject.timeoutIntervalForRequest = timeout/1000;
    }
    defaultConfigObject.HTTPMaximumConnectionsPerHost = 10;
    session = [NSURLSession sessionWithConfiguration:defaultConfigObject delegate:self delegateQueue:taskQueue];
    if(path != nil || [self.options valueForKey:CONFIG_USE_TEMP]!= nil)
    {
        respFile = YES;

		NSString* cacheKey = taskId;
		if (key != nil) {
            cacheKey = [self md5:key];
			if (cacheKey == nil) {
				cacheKey = taskId;
			}

			destPath = [RNFetchBlobFS getTempPath:cacheKey withExtension:[self.options valueForKey:CONFIG_FILE_EXT]];
            if ([[NSFileManager defaultManager] fileExistsAtPath:destPath]) {
				callback(@[[NSNull null], RESP_TYPE_PATH, destPath]);
                return;
            }
		}

        if(path != nil)
            destPath = path;
        else
            destPath = [RNFetchBlobFS getTempPath:cacheKey withExtension:[self.options valueForKey:CONFIG_FILE_EXT]];
    }
    else
    {
        respData = [[NSMutableData alloc] init];
        respFile = NO;
    }
    NSURLSessionDataTask * task = [session dataTaskWithRequest:req];
    [taskTable setObject:task forKey:taskId];
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
    NSString * respType = @"";
    respStatus = statusCode;
    if ([response respondsToSelector:@selector(allHeaderFields)])
    {
        NSDictionary *headers = [httpResponse allHeaderFields];
        NSString * respCType = [[RNFetchBlobReqBuilder getHeaderIgnoreCases:@"Content-Type" fromHeaders:headers] lowercaseString];
        if(respCType != nil)
        {
            NSArray * extraBlobCTypes = [options objectForKey:CONFIG_EXTRA_BLOB_CTYPE];
            if([respCType RNFBContainsString:@"text/"])
            {
                respType = @"text";
            }
            else if([respCType RNFBContainsString:@"application/json"])
            {
                respType = @"json";
            }
            // If extra blob content type is not empty, check if response type matches
            else if( extraBlobCTypes !=  nil) {
                for(NSString * substr in extraBlobCTypes)
                {
                    if([respCType RNFBContainsString:[substr lowercaseString]])
                    {
                        respType = @"blob";
                        respFile = YES;
                        destPath = [RNFetchBlobFS getTempPath:taskId withExtension:nil];
                        break;
                    }
                }
            }
            else
            {
                respType = @"blob";
                // for XMLHttpRequest, switch response data handling strategy automatically
                if([options valueForKey:@"auto"] == YES) {
                    respFile = YES;
                    destPath = [RNFetchBlobFS getTempPath:taskId withExtension:@""];
                }
            }
        }
        else
            respType = @"text";
        respInfo = @{
                     @"taskId": taskId,
                     @"state": @"2",
                     @"headers": headers,
                     @"redirects": redirects,
                     @"respType" : respType,
                     @"timeout" : @NO,
                     @"status": [NSString stringWithFormat:@"%d", statusCode ]
                    };

        [self.bridge.eventDispatcher
         sendDeviceEventWithName: EVENT_STATE_CHANGE
         body:respInfo
        ];
        headers = nil;
        respInfo = nil;
    }
    else
        NSLog(@"oops");

    if(respFile == YES)
    {
        @try{
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
        @catch(NSException * ex)
        {
            NSLog(@"write file error");
        }
    }

    completionHandler(NSURLSessionResponseAllow);
}

// download progress handler
- (void) URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data
{
    NSNumber * received = [NSNumber numberWithLong:[data length]];
    receivedBytes += [received longValue];
    if(respFile == NO)
    {
        [respData appendData:data];
    }
    else
    {
        [writeStream write:[data bytes] maxLength:[data length]];
    }

    if([progressTable valueForKey:taskId] == @YES)
    {
        [self.bridge.eventDispatcher
         sendDeviceEventWithName:EVENT_PROGRESS
         body:@{
                @"taskId": taskId,
                @"written": [NSString stringWithFormat:@"%d", receivedBytes],
                @"total": [NSString stringWithFormat:@"%d", expectedBytes]
            }
         ];
    }
    received = nil;

}

- (void) URLSession:(NSURLSession *)session didBecomeInvalidWithError:(nullable NSError *)error
{
    if([session isEqual:session])
        session = nil;
}

- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{

    self.error = error;
    NSString * errMsg = [NSNull null];
    NSString * respStr = [NSNull null];
    NSString * rnfbRespType = @"";

    [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:NO];

    if(respInfo == nil)
    {
        respInfo = [NSNull null];
    }

    if(error != nil)
    {
        errMsg = [error localizedDescription];
    }
    // Fix #72 response with status code 200 ~ 299 considered as success
    else if(respStatus> 299 || respStatus < 200)
    {
        errMsg = [NSString stringWithFormat:@"Request failed, status %d", respStatus];
    }
    else
    {
        if(respFile == YES)
        {
            [writeStream close];
            rnfbRespType = RESP_TYPE_PATH;
            respStr = destPath;
        }
        // base64 response
        else {
            // #73 fix unicode data encoding issue :
            // when response type is BASE64, we should first try to encode the response data to UTF8 format
            // if it turns out not to be `nil` that means the response data contains valid UTF8 string,
            // in order to properly encode the UTF8 string, use URL encoding before BASE64 encoding.
            NSString * utf8 = [[NSString alloc] initWithData:respData encoding:NSUTF8StringEncoding];

            if(utf8 != nil)
            {
                rnfbRespType = RESP_TYPE_UTF8;
                respStr = utf8;
            }
            else
            {
                rnfbRespType = RESP_TYPE_BASE64;
                respStr = [respData base64EncodedStringWithOptions:0];
            }

        }
    }

    callback(@[ errMsg, rnfbRespType, respStr]);

    @synchronized(taskTable, uploadProgressTable, progressTable)
    {
        if([taskTable objectForKey:taskId] == nil)
            NSLog(@"object released by ARC.");
        else
            [taskTable removeObjectForKey:taskId];
        [uploadProgressTable removeObjectForKey:taskId];
        [progressTable removeObjectForKey:taskId];
    }

    respData = nil;
    receivedBytes = 0;
    [session finishTasksAndInvalidate];

}

// upload progress handler
- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesWritten totalBytesExpectedToSend:(int64_t)totalBytesExpectedToWrite
{
    if([uploadProgressTable valueForKey:taskId] == @YES) {
        [self.bridge.eventDispatcher
         sendDeviceEventWithName:EVENT_PROGRESS_UPLOAD
         body:@{
                @"taskId": taskId,
                @"written": [NSString stringWithFormat:@"%d", totalBytesWritten],
                @"total": [NSString stringWithFormat:@"%d", bodyLength]
                }
         ];
    }
}

+ (void) cancelRequest:(NSString *)taskId
{
    NSURLSessionDataTask * task = [taskTable objectForKey:taskId];
    if(task != nil && task.state == NSURLSessionTaskStateRunning)
        [task cancel];
}


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

- (void) URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)request completionHandler:(void (^)(NSURLRequest * _Nullable))completionHandler
{
    [redirects addObject:[request.URL absoluteString]];
    completionHandler(request);
}

@end
