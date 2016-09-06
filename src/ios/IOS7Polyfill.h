//
//  IOS7Polyfill.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/9/6.
//  Copyright © 2016年 wkh237.github.io. All rights reserved.
//

#ifndef IOS7Polyfill_h
#define IOS7Polyfill_h

@interface NSString (Contains)

- (BOOL)RNFBContainsString:(NSString*)other;

@end

@implementation NSString (Contains)

- (BOOL)RNFBContainsString:(NSString*)other {
    NSRange range = [self rangeOfString:other];
    return range.length != 0;
}


@end
#endif /* IOS7Polyfill_h */
