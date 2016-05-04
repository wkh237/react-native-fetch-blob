//
//  RNFetchBlob.m
//
//  Created by Ben Hsieh on 2016/4/28.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import "RNFetchBlob.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>

// CalendarManager.m
@implementation RNFetchBlob

RCT_EXPORT_MODULE();

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlob:(NSString *)method url:(NSString *)url headers:(NSDictionary *)headers body:(NSString *)body callback:(RCTResponseSenderBlock)callback)
{
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: url]];
    
    // if method is POST or PUT, convert data string format
    if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
        NSData* blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
        NSMutableData* postBody = [[NSMutableData alloc] init];
        [postBody appendData:[NSData dataWithData:blobData]];
        [request setHTTPBody:postBody];
    }
    
    [request setHTTPMethod: method];
    [request setAllHTTPHeaderFields:headers];
    
    // create thread for http request
    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
    [NSURLConnection sendAsynchronousRequest:request queue:queue completionHandler:^(NSURLResponse * _Nullable response, NSData * _Nullable data, NSError * _Nullable connectionError) {
        
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
        
    }];
    
}

@end