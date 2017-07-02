//
//  RNFetchBlobFileHandle.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2017/7/2.
//  Copyright © 2017年 wkh237.github.io. All rights reserved.
//
#import "RNFetchBlobFileHandle.h"
#import "RNFetchBlobConst.h"
#import "RNFetchBlobDataConv.h"
#import "RNFetchBlobFs.h"

@interface RNFetchBlobFileHandle ()
{

}
@end


@implementation RNFetchBlobFileHandle

@synthesize readHandle;
@synthesize writeHandle;
@synthesize mode;

- (id)initWithPath:(NSString *)path mode:(NSString *)accessMode
{
    if([accessMode containsString:@"r"])
    {
        readHandle = [NSFileHandle fileHandleForReadingAtPath:path];
    }
    else if([accessMode containsString:@"w"])
    {
        writeHandle = [NSFileHandle fileHandleForWritingAtPath:path];
    }
    mode = accessMode;
    return [self init];
}


- (void)write:(NSString *)encoding
               data:(id)data
             offset:(NSNumber *)offset
         onComplete:(void (^)(NSNumber * written))onComplete
{
    __block long written = 0;
    __block NSData * bytes;

    if([encoding isEqualToString:@"utf8"])
    {
        bytes = [((NSString *)data) dataUsingEncoding:NSUTF8StringEncoding];
    }
    else if([encoding isEqualToString:@"base64"])
    {
        bytes = [[NSData alloc] initWithBase64EncodedString:((NSString *)data) options:0];
    }
    else if([encoding isEqualToString:@"ascii"])
    {
        bytes = [RNFetchBlobDataConv arrayToData:((NSArray *)data)];
    }
    else if([encoding isEqualToString:@"uri"])
    {
        NSString * path = (NSString *) data;
        [RNFetchBlobFS getPathFromUri:path completionHandler:^(NSString *path, ALAssetRepresentation *asset) {
            if(path != nil)
            {
                bytes = [NSData dataWithContentsOfFile:path];
            }
            else if (asset != nil)
            {
                __block Byte * buffer;
                
                buffer = malloc(asset.size);
                NSError * err;
                [asset getBytes:buffer fromOffset:0 length:asset.size error:&err];
                if(err != nil)
                {
                    onComplete([NSNumber numberWithLong:written]);
                    free(buffer);
                }
                bytes = [NSData dataWithBytes:buffer length:asset.size];
                free(buffer);
            }
            [writeHandle seekToFileOffset:[offset longLongValue]];
            [writeHandle writeData:bytes];
            written = [bytes length];
        }];
        return;
    }
    [writeHandle seekToFileOffset:[offset longLongValue]];
    [writeHandle writeData:bytes];
    written = [bytes length];
    onComplete([NSNumber numberWithLong:written]);
}

- (id)read:(NSString *)encoding
          offset:(NSNumber *)offset
          length:(NSNumber *)length
{
    NSData * bytes;
    [readHandle seekToFileOffset:[offset longLongValue]];
    bytes = [readHandle readDataOfLength:[length longLongValue]];
    if([encoding isEqualToString:@"utf8"])
    {
        return [[NSString alloc] initWithData:bytes encoding:NSUTF8StringEncoding];
    }
    else if([encoding isEqualToString:@"base64"])
    {
        return [bytes base64EncodedStringWithOptions:0];
    }
    else if([encoding isEqualToString:@"ascii"])
    {
        return [RNFetchBlobDataConv dataToArray:bytes];
    }
    return nil;
    
}

- (void)close
{
    if([mode containsString:@"r"])
    {
        [readHandle closeFile];
    }
    else if([mode containsString:@"w"])
    {
        [writeHandle closeFile];
    }
}

@end
