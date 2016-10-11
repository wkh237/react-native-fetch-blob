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
    double lastTick;
}
@end

@implementation RNFetchBlobProgress

-(id)initWithType:(ProgressType)type interval:(NSNumber *)interval count:(NSNumber *)count
{
    self = [super init];
    self.count = count;
    self.interval = [NSNumber numberWithFloat:[interval floatValue] /1000];
    self.type = type;
    self.enable = YES;
    lastTick = 0;
    tick = 1;
    return self;
}

-(BOOL)shouldReport:(NSNumber *)nextProgress
{
    BOOL * result = YES;
    float countF = [self.count floatValue];
    if(countF > 0 && [nextProgress floatValue] > 0)
    {
        result = (int)(floorf([nextProgress floatValue]*countF)) >= tick;
    }
    
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    // NSTimeInterval is defined as double
    NSNumber *timeStampObj = [NSNumber numberWithDouble: timeStamp];
    float delta = [timeStampObj doubleValue] - lastTick;
    BOOL * shouldReport = delta > [self.interval doubleValue] && self.enable && result;
    if(shouldReport)
    {
        tick++;
        lastTick = [timeStampObj doubleValue];
    }
    return shouldReport;
    
}


@end
