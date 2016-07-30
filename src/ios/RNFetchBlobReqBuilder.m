//
//  RNFetchBlobReqBuilder.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/7/9.
//  Copyright © 2016年 wkh237. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RNFetchBlobReqBuilder.h"
#import "RNFetchBlobNetwork.h"
#import "RNFetchBlobConst.h"
#import "RNFetchBlobFS.h"

@interface RNFetchBlobReqBuilder()
{

}
@end

@implementation RNFetchBlobReqBuilder


// Fetch blob data request
+(void) buildMultipartRequest:(NSDictionary *)options
                       taskId:(NSString *)taskId
                       method:(NSString *)method
                          url:(NSString *)url
                      headers:(NSDictionary *)headers
                         form:(NSArray *)form
                   onComplete:(void(^)(NSURLRequest * req, long bodyLength))onComplete
{
    //    NSString * encodedUrl = [url stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    NSString * encodedUrl = url;
    
    // send request
    __block NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:[NSURL URLWithString: encodedUrl]];
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[RNFetchBlobNetwork normalizeHeaders:headers]];
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSNumber * timeStampObj = [NSNumber numberWithDouble: timeStamp];

    // generate boundary
    NSString * boundary = [NSString stringWithFormat:@"RNFetchBlob%d", timeStampObj];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        __block NSMutableData * postData = [[NSMutableData alloc] init];
        // combine multipart/form-data body
        [[self class] buildFormBody:form boundary:boundary onComplete:^(NSData *formData) {
            if(formData != nil) {
                [postData appendData:formData];
                // close form data
                [postData appendData: [[NSString stringWithFormat:@"--%@--\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                [request setHTTPBody:postData];
            }
            // set content-length
            [mheaders setValue:[NSString stringWithFormat:@"%d",[postData length]] forKey:@"Content-Length"];
            [mheaders setValue:[NSString stringWithFormat:@"100-continue",[postData length]] forKey:@"Expect"];
            // appaned boundary to content-type
            [mheaders setValue:[NSString stringWithFormat:@"multipart/form-data; charset=utf-8; boundary=%@", boundary] forKey:@"content-type"];
            [request setHTTPMethod: method];
            [request setAllHTTPHeaderFields:mheaders];
            onComplete(request, [formData length]);
        }];

    });
}

// Fetch blob data request
+(void) buildOctetRequest:(NSDictionary *)options
                   taskId:(NSString *)taskId
                   method:(NSString *)method
                      url:(NSString *)url
                  headers:(NSDictionary *)headers
                     body:(NSString *)body
               onComplete:(void(^)(__weak NSURLRequest * req, long bodyLength))onComplete
{
//    NSString * encodedUrl = [url stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    NSString * encodedUrl = url;
    // send request
    __block NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL URLWithString: encodedUrl]];

    __block NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[RNFetchBlobNetwork normalizeHeaders:headers]];
    // move heavy task to another thread
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSMutableData * blobData;
        long size = -1;
        // if method is POST or PUT, convert data string format
        if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
            // generate octet-stream body
            if(body != nil) {
                __block NSString * cType = [[self class] getHeaderIgnoreCases:@"content-type" fromHeaders:mheaders];
                // when headers does not contain a key named "content-type" (case ignored), use default content type
                if(cType == nil)
                {
                    [mheaders setValue:@"application/octet-stream" forKey:@"Content-Type"];
                }
                
                // when body is a string contains file path prefix, try load file from the path
                if([body hasPrefix:FILE_PREFIX]) {
                    __block NSString * orgPath = [body substringFromIndex:[FILE_PREFIX length]];
                    orgPath = [RNFetchBlobFS getPathOfAsset:orgPath];
                    if([orgPath hasPrefix:AL_PREFIX])
                    {
                        [RNFetchBlobFS readFile:orgPath encoding:@"utf8" resolver:nil rejecter:nil onComplete:^(NSData *content) {
                            [request setHTTPBody:content];
                            [request setHTTPMethod: method];
                            [request setAllHTTPHeaderFields:mheaders];
                            onComplete(request, [content length]);
                        }];
                        return;
                    }
                    size = [[[NSFileManager defaultManager] attributesOfItemAtPath:orgPath error:nil] fileSize];
                    [request setHTTPBodyStream: [NSInputStream inputStreamWithFileAtPath:orgPath ]];
                }
                // otherwise convert it as BASE64 data string
                else {
                    
                    __block NSString * cType = [[self class]getHeaderIgnoreCases:@"content-type" fromHeaders:mheaders];
                    // when content-type is application/octet* decode body string using BASE64 decoder
                    if([[cType lowercaseString] hasPrefix:@"application/octet"] || [[cType lowercaseString] containsString:@";base64"])
                    {
                        blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
                        [request setHTTPBody:blobData];
                        size = [blobData length];
                    }
                    // otherwise use the body as-is
                    else
                    {
                        size = [body length];
                        [request setHTTPBody: [body dataUsingEncoding:NSUTF8StringEncoding]];
                    }
                }
            }
        }

        [request setHTTPMethod: method];
        [request setAllHTTPHeaderFields:mheaders];

        onComplete(request, size);
    });
}

+(void) buildFormBody:(NSArray *)form boundary:(NSString *)boundary onComplete:(void(^)(NSData * formData))onComplete
{
    NSMutableData * formData = [[NSMutableData alloc] init];
    if(form == nil)
        onComplete(nil);
    else
    {
        __block int i = 0;
        __block int count = [form count];
        void __block (^getFieldData)(id field) = ^(id field)
        {
            NSString * name = [field valueForKey:@"name"];
            NSString * content = [field valueForKey:@"data"];
            NSString * contentType = [field valueForKey:@"type"];
            contentType = contentType == nil ? @"application/octet-stream" : contentType;
            // field is a text field
            if([field valueForKey:@"filename"] == nil || content == [NSNull null]) {
                [formData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n", name] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:[[NSString stringWithFormat:@"Content-Type: text/plain\r\n\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:[[NSString stringWithFormat:@"%@\r\n", content] dataUsingEncoding:NSUTF8StringEncoding]];
            }
            // field contains a file
            else {
                NSMutableData * blobData;
                if(content != nil)
                {
                    // append data from file asynchronously
                    if([content hasPrefix:FILE_PREFIX])
                    {
                        NSString * orgPath = [content substringFromIndex:[FILE_PREFIX length]];
                        orgPath = [RNFetchBlobFS getPathOfAsset:orgPath];
                        [RNFetchBlobFS readFile:orgPath encoding:@"utf8" resolver:nil rejecter:nil onComplete:^(NSData *content) {
                            NSString * filename = [field valueForKey:@"filename"];
                            [formData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                            [formData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", name, filename] dataUsingEncoding:NSUTF8StringEncoding]];
                            [formData appendData:[[NSString stringWithFormat:@"Content-Type: %@\r\n\r\n", contentType] dataUsingEncoding:NSUTF8StringEncoding]];
                            [formData appendData:content];
                            [formData appendData:[[NSString stringWithFormat:@"\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                            i++;
                            if(i < count)
                            {
                                getFieldData([form objectAtIndex:i]);
                            }
                            else
                                onComplete(formData);
                        }];
                        return ;
                    }
                    else
                        blobData = [[NSData alloc] initWithBase64EncodedString:content options:0];
                }
                NSString * filename = [field valueForKey:@"filename"];
                [formData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", name, filename] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:[[NSString stringWithFormat:@"Content-Type: %@\r\n\r\n", contentType] dataUsingEncoding:NSUTF8StringEncoding]];
                [formData appendData:blobData];
                [formData appendData:[[NSString stringWithFormat:@"\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
            }
            i++;
            if(i < count)
            {
                getFieldData([form objectAtIndex:i]);
            }
            else
                onComplete(formData);

        };
        getFieldData([form objectAtIndex:i]);
    }
}

+(NSString *) getHeaderIgnoreCases:(NSString *)field fromHeaders:(NSMutableArray *) headers {
    
    NSString * normalCase = [headers valueForKey:field];
    NSString * ignoredCase = [headers valueForKey:[field lowercaseString]];
    if( normalCase != nil)
        return normalCase;
    else
        return ignoredCase;
    
}


@end
