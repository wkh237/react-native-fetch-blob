//
//  RNFetchBlob.m
//
//  Created by suzuri04x2 on 2016/4/28.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import "RNFetchBlob.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>


////////////////////////////////////////
//
//  Util functions
//
////////////////////////////////////////

@implementation FetchBlobUtils

// callback class method to handle request
+ (void) onBlobResponse:(NSURLResponse * _Nullable)response withData:(NSData * _Nullable)data withError:(NSError * _Nullable)connectionError withCallback:(RCTResponseSenderBlock)callback{
    
    NSHTTPURLResponse* resp = (NSHTTPURLResponse *) response;
    NSString* status = [NSString stringWithFormat:@"%d", resp.statusCode];
    
    if(connectionError)
    {
        callback(@[[connectionError localizedDescription], [NSNull null]]);
    }
    else if(![status isEqualToString:@"200"]) {
        callback(@[status, [NSNull null]]);
    }
    else {
        callback(@[[NSNull null], [data base64EncodedStringWithOptions:0]]);
    }
    
}

// removing case of headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers {
    
    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }
    
    return mheaders;
}

@end


////////////////////////////////////////
//
//  Exported native methods
//
////////////////////////////////////////

@implementation RNFetchBlob

RCT_EXPORT_MODULE();

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlobForm:(NSString *)method url:(NSString *)url headers:(NSDictionary *)headers form:(NSArray *)form callback:(RCTResponseSenderBlock)callback)
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
    
    // create thread for http request
    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
    [NSURLConnection sendAsynchronousRequest:request queue:queue completionHandler:^(NSURLResponse * _Nullable response, NSData * _Nullable data, NSError * _Nullable connectionError) {
        
        [FetchBlobUtils onBlobResponse:response withData:data withError: connectionError withCallback: callback];
        
    }];
    
}

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlob:(NSString *)method url:(NSString *)url headers:(NSDictionary *)headers body:(NSString *)body callback:(RCTResponseSenderBlock)callback)
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
    
    // create thread for http request
    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
    [NSURLConnection sendAsynchronousRequest:request queue:queue completionHandler:^(NSURLResponse * _Nullable response, NSData * _Nullable data, NSError * _Nullable connectionError) {
        
        [FetchBlobUtils onBlobResponse:response withData:data withError: connectionError withCallback: callback];
        
    }];
    
}
@end

