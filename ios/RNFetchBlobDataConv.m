//
//  RNFetchBlobDataConv.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2017/7/2.
//  Copyright © 2017年 wkh237.github.io. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RNFetchBlobDataConv.h"

@implementation RNFetchBlobDataConv

+ (NSData *) arrayToData:(NSArray *)input
{
    char * bytes = (char*) malloc([input count]);
    for(int i = 0; i < input.count; i++) {
        bytes[i] = [[input objectAtIndex:i] charValue];
    }
    return [[NSData alloc] initWithBytesNoCopy:bytes length:[input count] freeWhenDone:YES];
}


+ (NSArray *) dataToArray:(NSData *) input
{
    NSMutableArray * resultArray = [NSMutableArray array];
    char * bytes = [input bytes];
    for(int i=0;i<[input length];i++) {
        [resultArray addObject:[NSNumber numberWithChar:bytes[i]]];
    }
    return resultArray;
}

@end
