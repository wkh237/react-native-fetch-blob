//
//  RNFetchBlobFileHandle.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2017/7/2.
//  Copyright © 2017年 wkh237.github.io. All rights reserved.
//

#ifndef RNFetchBlobFileHandle_h
#define RNFetchBlobFileHandle_h

#import <Foundation/Foundation.h>


@interface RNFetchBlobFileHandle : NSObject

@property (nonatomic) NSFileHandle * readHandle;
@property (nonatomic) NSFileHandle * writeHandle;
@property (nonatomic) NSString * mode;


- (id)initWithPath:(NSString *)path mode:(NSString *)mode;
- (void)write:(NSString *)encoding
               data:(id)data
             offset:(NSNumber *)offset
         onComplete:(void (^)(NSNumber * written))onComplete;
- (id)read:(NSString *)encoding
    offset:(NSNumber *)offset
    length:(NSNumber *)length;


@end


#endif /* RNFetchBlobFileHandle_h */
