//
//  RNFetchBlobFS.h
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//

#ifndef RNFetchBlobFS_h
#define RNFetchBlobFS_h

#import <Foundation/Foundation.h>
#import "RCTBridgeModule.h"

@interface RNFetchBlobFS : NSObject <NSStreamDelegate>  {
    NSOutputStream * outStream;
    NSInputStream * inStream;
    RCTResponseSenderBlock callback;
    RCTBridge * bridge;
    Boolean isOpen;
    NSString * encoding;
    int bufferSize;
    BOOL appendData;
    NSString * taskId;
    NSString * path;
    NSString * streamId;
}

@property (nonatomic) NSOutputStream * outStream;
@property (nonatomic) NSInputStream * inStream;
@property (strong, nonatomic) RCTResponseSenderBlock callback;
@property (nonatomic) RCTBridge * bridge;
@property (nonatomic) NSString * encoding;
@property (nonatomic) NSString * taskId;
@property (nonatomic) NSString * path;
@property (nonatomic) int bufferSize;
@property (nonatomic) NSString * streamId;
@property (nonatomic) BOOL appendData;

// get dirs
+ (NSString *) getTempPath;
+ (NSString *) getCacheDir;
+ (NSString *) getDocumentDir;
+ (NSString *) getTempPath:(NSString*)taskId withExtension:(NSString *)ext;

// fs methods
+ (RNFetchBlobFS *) getFileStreams;
+ (BOOL) mkdir:(NSString *) path;
+ (NSDictionary *) stat:(NSString *) path error:(NSError **) error;
+ (BOOL) exists:(NSString *) path;

// constructor
- (id) init;
- (id)initWithCallback:(RCTResponseSenderBlock)callback;
- (id)initWithBridgeRef:(RCTBridge *)bridgeRef;

// file stream
- (void) openWithDestination;
- (void) openWithId;
- (NSString *)openWithPath:(NSString *)destPath encode:(nullable NSString *)encode appendData:(BOOL)append;

// file stream write data
- (void)write:(NSData *) chunk;
- (void)writeEncodeChunk:(NSString *) chunk;
- (void)readWithPath:(NSString *)path useEncoding:(NSString *)encoding bufferSize:(int) bufferSize;

- (void) closeInStream;
- (void) closeOutStream;

@end

#endif /* RNFetchBlobFS_h */
