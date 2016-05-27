//
//  RNFetchBlob.h
//
//  Created by wkh237 on 2016/4/28.
//

#ifndef RNFetchBlob_h
#define RNFetchBlob_h
#import <Foundation/Foundation.h>
#import "RCTBridgeModule.h"

// lib event
extern NSString *const MSG_EVENT;
extern NSString *const MSG_EVENT_LOG;
extern NSString *const MSG_EVENT_WARN;
extern NSString *const MSG_EVENT_ERROR;

// config
extern NSString *const CONFIG_USE_TEMP;
extern NSString *const CONFIG_FILE_PATH;
extern NSString *const CONFIG_FILE_EXT;

// fs events
extern NSString *const FS_EVENT_DATA;
extern NSString *const FS_EVENT_END;
extern NSString *const FS_EVENT_WARN;
extern NSString *const FS_EVENT_ERROR;

@interface FetchBlobFS : NSObject <NSStreamDelegate>  {
    NSOutputStream * outStream;
    NSInputStream * inStream;
    RCTResponseSenderBlock callback;
    RCTBridge * bridge;
    Boolean isOpen;
    NSString * encoding;
    NSString * taskId;
    NSString * path;
}

@property (nonatomic) NSOutputStream * outStream;
@property (nonatomic) NSInputStream * inStream;
@property (nonatomic) RCTResponseSenderBlock callback;
@property (nonatomic) RCTBridge * bridge;
@property (nonatomic) NSString * encoding;
@property (nonatomic) NSString * taskId;
@property (nonatomic) NSString * path;

+ (NSString *) getTempPath;
- (void) initWithCallback;
- (void) initWithBridgeRef;
- (void) openWithDestination;
- (void) openWithId;
- (void) write;
- (void) read;
- (void) closeInStream;
- (void) closeOutStream;

@end

@interface FetchBlobUtils : NSObject  <NSURLConnectionDelegate, NSURLConnectionDataDelegate> {
    
    NSString * taskId;
    int expectedBytes;
    int receivedBytes;
    NSMutableData * respData;
    RCTResponseSenderBlock callback;
    RCTBridge * bridge;
    NSDictionary * options;
    FetchBlobFS * fileStream;
}
@property (nonatomic) NSString * taskId;
@property (nonatomic) int expectedBytes;
@property (nonatomic) int receivedBytes;
@property (nonatomic) NSMutableData * respData;
@property (nonatomic) RCTResponseSenderBlock callback;
@property (nonatomic) RCTBridge * bridge;
@property (nonatomic) NSDictionary * options;
@property (nonatomic) FetchBlobFS * fileStream;

- (id) init;
- (id) delegate;
- (void) sendRequest;

+ (NSMutableDictionary *) normalizeHeaders;


@end


@interface RNFetchBlob : NSObject <RCTBridgeModule>

@end

#endif /* RNFetchBlob_h */
