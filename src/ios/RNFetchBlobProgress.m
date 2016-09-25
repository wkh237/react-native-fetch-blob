//
//  RNFetchBlobProgress.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/9/25.
//  Copyright © 2016年 wkh237.github.io. All rights reserved.
//

#import "RNFetchBlobProgress.h"

@interface RNFetchBlobProgress ()
{
    float progress;
    int tick;
    long lastTick;
}
@end

@implementation RNFetchBlobProgress

-(id)initWithType:(ProgressType)type interval:(NSNumber *)interval count:(NSNumber *)count
{
    self = [super init];
    self.count = count;
    self.interval = interval;
    self.type = type;
    self.enable = YES;
    return self;
}

-(void)tick:(NSNumber *) nextProgress
{
    progress = [nextProgress floatValue];
    tick++;
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    // NSTimeInterval is defined as double
    NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
    lastTick = [timeStampObj longValue];
}

-(BOOL)shouldReport
{
    BOOL result = YES;
    if(self.count > 0)
    {
        result = floorf(progress*100/[count floatValue]) > tick;
    }
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    // NSTimeInterval is defined as double
    NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
    return lastTick - [timeStampObj longValue] > [self.interval longValue] && self.enable && result;
    
}


@end
