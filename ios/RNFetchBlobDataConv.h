//
//  RNFetchBlobDataConv.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2017/7/2.
//  Copyright © 2017年 wkh237.github.io. All rights reserved.
//

#ifndef RNFetchBlobDataConv_h
#define RNFetchBlobDataConv_h

#import <Foundation/Foundation.h>

@interface RNFetchBlobDataConv : NSObject

+ (NSArray *) dataToArray:(NSData *) input;
+ (NSData *) arrayToData:(NSArray *)input;

@end

#endif /* RNFetchBlobDataConv_h */
