//
//  RNFetchBlob.h
//
//  Created by wkh237 on 2016/4/28.
//

#ifndef RNFetchBlob_h
#define RNFetchBlob_h
#import "RCTBridgeModule.h"


@interface RNFetchBlob : NSObject <RCTBridgeModule> {

    NSString * filePathPrefix;

}

@property (nonatomic) NSString * filePathPrefix;


@end

#endif /* RNFetchBlob_h */
