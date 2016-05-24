//
//  RNFetchBlobUtil.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/5/24.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RNFetchBlobUtil.h"


////////////////////////////////////////
//
//  Util functions
//
////////////////////////////////////////

@implementation FetchBlobUtils


@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;

RCT_EXPORT_MODULE();

// callback class method to handle request
//+ (void) onBlobResponse:(NSURLResponse * _Nullable)response withData:(NSData * _Nullable)data withError:(NSError * _Nullable)connectionError withCallback:(RCTResponseSenderBlock) callback{
//
//    NSHTTPURLResponse* resp = (NSHTTPURLResponse *) response;
//    NSString* status = [NSString stringWithFormat:@"%d", resp.statusCode];
//
//    if(connectionError)
//    {
//        callback(@[[connectionError localizedDescription], [NSNull null]]);
//    }
//    else if(![status isEqualToString:@"200"]) {
//        callback(@[status, [NSNull null]]);
//    }
//    else {
//        callback(@[[NSNull null], [data base64EncodedStringWithOptions:0]]);
//    }
//
//}

// removing case of headers
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

- (id)delegate:(id)delegate {
    return delegate;
}

- (void) sendRequest:(NSString *)taskId withRequest:(NSURLRequest *)req callback:(RCTResponseSenderBlock) callback {
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    // Call long-running code on background thread
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self startImmediately:NO];
    [conn scheduleInRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
    [conn start];
    
    if(!conn) {
        callback(@[[NSString stringWithFormat:@"RNFetchBlob could not initialize connection"], [NSNull null]]);
    }
}


#pragma mark NSURLConnection delegate methods


- (void) connection:(NSURLConnection *)connection didReceiveResponse:(nonnull NSURLResponse *)response {
    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
    expectedBytes = [response expectedContentLength];
}

- (void) connection:(NSURLConnection *)connection didReceiveData:(nonnull NSData *)data {
    receivedBytes = data.length;
    [respData appendData:data];
    [self.bridge.eventDispatcher
     sendAppEventWithName:@"RNFetchBlobProgress"
     body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%@", receivedBytes],
            @"total": [NSString stringWithFormat:@"%@", expectedBytes]
            }
     ];
}

- (void) connection:(NSURLConnection *)connection didSendBodyData:(NSInteger)bytesWritten totalBytesWritten:(NSInteger)totalBytesWritten totalBytesExpectedToWrite:(NSInteger)totalBytesExpectedToWrite {
    
    expectedBytes = totalBytesExpectedToWrite;
    receivedBytes = totalBytesWritten;
    [self.bridge.eventDispatcher
     sendAppEventWithName:@"RNFetchBlobProgress"
     body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%@", receivedBytes],
            @"total": [NSString stringWithFormat:@"%@", expectedBytes]
            }
     ];
    
}

- (void) connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
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
    callback(@[[NSNull null], [respData base64EncodedStringWithOptions:0]]);
}

@end