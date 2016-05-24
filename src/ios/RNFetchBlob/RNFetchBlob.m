//
//  RNFetchBlob.m
//
//  Created by suzuri04x2 on 2016/4/28.
//

#import "RNFetchBlob.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"


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
@synthesize bridge;


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

- (void) sendRequest:(RCTBridge *)bridgeRef taskId:(NSString *)taskId withRequest:(NSURLRequest *)req callback:(RCTResponseSenderBlock) callback {
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    self.callback = callback;
    self.bridge = bridgeRef;
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
            @"written": [NSString stringWithFormat:@"%d", receivedBytes],
            @"total": [NSString stringWithFormat:@"%d", expectedBytes]
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
                    @"written": [NSString stringWithFormat:@"%d", receivedBytes],
                    @"total": [NSString stringWithFormat:@"%d", expectedBytes]
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
    NSData * data = [NSData dataWithData:respData];
    callback(@[[NSNull null], [data base64EncodedStringWithOptions:0]]);
}

@end


////////////////////////////////////////
//
//  Exported native methods
//
////////////////////////////////////////

@implementation RNFetchBlob

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE();

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlobForm:(NSString *)taskId method:(NSString *)method url:(NSString *)url headers:(NSDictionary *)headers form:(NSArray *)form callback:(RCTResponseSenderBlock)callback)
{
    
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: url]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[ FetchBlobUtils normalizeHeaders:headers]];
    
    
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSNumber * timeStampObj = [NSNumber numberWithDouble: timeStamp];
    
    // generate boundary
    NSString * boundary = [NSString stringWithFormat:@"RNFetchBlob%d", timeStampObj];
    
    // if method is POST or PUT, convert data string format
    if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
        NSMutableData * postData = [[NSMutableData alloc] init];
        
        // combine multipart/form-data body
        for(id field in form) {
            NSString * name = [field valueForKey:@"name"];
            NSString * content = [field valueForKey:@"data"];
            // field is a text field
            if([field valueForKey:@"filename"] == nil) {
                [postData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n", name] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:[[NSString stringWithFormat:@"Content-Type: text/plain\r\n\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:[[NSString stringWithFormat:@"%@\r\n", content] dataUsingEncoding:NSUTF8StringEncoding]];
            }
            // field contains a file
            else {
                NSData* blobData = [[NSData alloc] initWithBase64EncodedString:content options:0];
                NSString * filename = [field valueForKey:@"filename"];
                [postData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", name, filename] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:[[NSString stringWithFormat:@"Content-Type: application/octet-stream\r\n\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                [postData appendData:blobData];
                [postData appendData:[[NSString stringWithFormat:@"\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
            }
            
        }
        // close form data
        [postData appendData: [[NSString stringWithFormat:@"--%@--\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
        [request setHTTPBody:postData];
        // set content-length
        [mheaders setValue:[NSString stringWithFormat:@"%d",[postData length]] forKey:@"Content-Length"];
        [mheaders setValue:[NSString stringWithFormat:@"100-continue",[postData length]] forKey:@"Expect"];
        // appaned boundary to content-type
        [mheaders setValue:[NSString stringWithFormat:@"multipart/form-data; charset=utf-8; boundary=%@", boundary] forKey:@"content-type"];
        
    }
    
    [request setHTTPMethod: method];
    [request setAllHTTPHeaderFields:mheaders];
    
    [[[FetchBlobUtils alloc] init] sendRequest:self.bridge taskId:taskId withRequest:request callback:callback];
    
    // create thread for http request
//    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
//    [NSURLConnection sendAsynchronousRequest:request queue:queue completionHandler:^(NSURLResponse * _Nullable response, NSData * _Nullable data, NSError * _Nullable connectionError) {
//        
//        [FetchBlobUtils onBlobResponse:response withData:data withError: connectionError withCallback: callback];
//        
//    }];
    
}

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlob:(NSString *)taskId method:(NSString *)method url:(NSString *)url headers:(NSDictionary *)headers body:(NSString *)body callback:(RCTResponseSenderBlock)callback)
{
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: url]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[FetchBlobUtils normalizeHeaders:headers]];

    // if method is POST or PUT, convert data string format
    if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
        
        // generate octet-stream body
        NSData* blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
        NSMutableData* postBody = [[NSMutableData alloc] init];
        [postBody appendData:[NSData dataWithData:blobData]];
        [request setHTTPBody:postBody];
        [mheaders setValue:@"application/octet-stream" forKey:@"content-type"];
        
    }
    
    [request setHTTPMethod: method];
    [request setAllHTTPHeaderFields:mheaders];
    
    [[[FetchBlobUtils alloc] init] sendRequest:self.bridge taskId:taskId withRequest:request callback:callback];
    
    // create thread for http request
//    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
//    
//    
//    [NSURLConnection sendAsynchronousRequest:request queue:queue completionHandler:^(NSURLResponse * _Nullable response, NSData * _Nullable data, NSError * _Nullable connectionError) {
//        
//        [FetchBlobUtils onBlobResponse:response withData:data withError: connectionError withCallback: callback];
//        
//    }];
    
}

@end
