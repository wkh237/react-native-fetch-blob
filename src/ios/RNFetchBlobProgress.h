//
//  RNFetchBlobProgress.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/9/25.
//  Copyright © 2016年 wkh237.github.io. All rights reserved.
//

#ifndef RNFetchBlobProgress_h
#define RNFetchBlobProgress_h

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSUInteger, ProgressType) {
    Download,
    Upload,
};

@interface RNFetchBlobProgress : NSObject
{
    NSNumber * count;
    NSNumber * interval;
    ProgressType type;
    BOOL enable;
    
}

@property (nonatomic) NSNumber * count;
@property (nonatomic) NSNumber * interval;
@property (nonatomic) NSInteger type;
@property (nonatomic) BOOL enable;

-(id)initWithType:(ProgressType)type interval:(NSNumber*)interval count:(NSNumber *)count;
-(BOOL)shouldReport:(NSNumber *) nextProgress;


@end

#endif /* RNFetchBlobProgress_h */
