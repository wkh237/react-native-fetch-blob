//
//  RNFetchBlobResp.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//

#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobResp.h"
#import "RNFetchBlobConst.h"

////////////////////////////////////////
//
//  HTTP request handler
//
////////////////////////////////////////

@implementation FetchBlobUtils


@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;
@synthesize bridge;
@synthesize options;


// removing case from headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers {
    
    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }
    
    return mheaders;
}

- (id)init {
    self = [super init];
    return self;
}


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
    
    // open file stream for write
    if( path != nil) {
        self.fileStream = [[RNFetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithPath:path encode:@"ascii" appendData:YES ];
    }
    else if ( [self.options valueForKey:CONFIG_USE_TEMP]!= nil ) {
        self.fileStream = [[RNFetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithPath:[RNFetchBlobFS getTempPath:taskId withExtension:ext] encode:@"ascii" appendData:YES];
    }
    
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self startImmediately:NO];
    [conn scheduleInRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
    [conn start];
    
    if(!conn) {
        callback(@[[NSString stringWithFormat:@"RNFetchBlob could not initialize connection"], [NSNull null]]);
    }
}


#pragma mark NSURLConnection delegate methods


- (void) connection:(NSURLConnection *)connection didReceiveResponse:(nonnull NSURLResponse *)response {
    //    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
    expectedBytes = [response expectedContentLength];
}


- (void) connection:(NSURLConnection *)connection didReceiveData:(nonnull NSData *)data {
    receivedBytes += [data length];
    
    Boolean fileCache = [self.options valueForKey:CONFIG_USE_TEMP];
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    if(path != nil) {
        
        [self.fileStream write:data];
    }
    // write to tmp file
    else if( fileCache != nil) {
        NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
        [self.fileStream write:data];
    }
    // cache data in memory
    else {
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

- (void) connection:(NSURLConnection *)connection didSendBodyData:(NSInteger)bytesWritten totalBytesWritten:(NSInteger)totalBytesWritten totalBytesExpectedToWrite:(NSInteger)totalBytesExpectedToWrite {
    
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

- (void) connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    
    //    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    
    [self.fileStream closeInStream];
    [self.fileStream closeOutStream];
    
    callback(@[[error localizedDescription], [NSNull null]]);
}

- (NSCachedURLResponse *) connection:(NSURLConnection *)connection willCacheResponse: (NSCachedURLResponse *)cachedResponse {
    return nil;
}


// handle 301 and 302 responses
- (NSURLRequest *)connection:(NSURLConnection *)connection willSendRequest:(NSURLRequest *)request redirectResponse:response {
    return request;
}

// request complete
- (void) connectionDidFinishLoading:(NSURLConnection *)connection {
    
    NSData * data;
    if(respData != nil)
        data = [NSData dataWithData:respData];
    else
        data = [[NSData alloc] init];
    
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
    Boolean useCache = [self.options valueForKey:CONFIG_USE_TEMP];
    
    [self.fileStream closeInStream];
    
    // if fileCache is true or file path is given, return a path
    if( path != nil ) {
        callback(@[[NSNull null], path]);
    }
    // when fileCache option is set but no path specified, save to tmp path
    else if( [self.options valueForKey:CONFIG_USE_TEMP] != nil) {
        NSString * tmpPath = [RNFetchBlobFS getTempPath:taskId withExtension:ext];
        callback(@[[NSNull null], tmpPath]);
    }
    // otherwise return base64 string
    else {
        callback(@[[NSNull null], [data base64EncodedStringWithOptions:0]]);
    }
}

@end