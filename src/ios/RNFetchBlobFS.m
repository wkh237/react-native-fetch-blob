//
//  RNFetchBlobFS.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//


#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobConst.h"

NSMutableDictionary *fileStreams = nil;

////////////////////////////////////////
//
//  File system access methods
//
////////////////////////////////////////

@implementation RNFetchBlobFS


@synthesize outStream;
@synthesize inStream;
@synthesize encoding;
@synthesize callback;
@synthesize taskId;
@synthesize path;
@synthesize appendData;
@synthesize bufferSize;

// static member getter
+ (NSArray *) getFileStreams {
    
    if(fileStreams == nil)
        fileStreams = [[NSMutableDictionary alloc] init];
    return fileStreams;
}

+(void) setFileStream:(RNFetchBlobFS *) instance withId:(NSString *) uuid {
    if(fileStreams == nil)
        fileStreams = [[NSMutableDictionary alloc] init];
    [fileStreams setValue:instance forKey:uuid];
}

+ (NSString *) getCacheDir {
    return [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) firstObject];
}

+ (NSString *) getDocumentDir {
    return [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
}

+ (NSString *) getMusicDir {
    return [NSSearchPathForDirectoriesInDomains(NSMusicDirectory, NSUserDomainMask, YES) firstObject];
}

+ (NSString *) getMovieDir {
    return [NSSearchPathForDirectoriesInDomains(NSMoviesDirectory, NSUserDomainMask, YES) firstObject];
}

+ (NSString *) getPictureDir {
    return [NSSearchPathForDirectoriesInDomains(NSPicturesDirectory, NSUserDomainMask, YES) firstObject];
}


+ (NSString *) getTempPath {
    
    return [[NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject] stringByAppendingString:@"/RNFetchBlob_tmp"];
}

+ (NSString *) getTempPath:(NSString*)taskId withExtension:(NSString *)ext {
    
    NSString * documentDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
    NSString * filename = [NSString stringWithFormat:@"/RNFetchBlob_tmp/RNFetchBlobTmp_%@", taskId];
    if(ext != nil)
        filename = [filename stringByAppendingString: [NSString stringWithFormat:@".%@", ext]];
    NSString * tempPath = [documentDir stringByAppendingString: filename];
    return tempPath;
}

+ (BOOL) mkdir:(NSString *) path {
    BOOL isDir;
    NSError * err = nil;
    // if temp folder not exists, create one
    if(![[NSFileManager defaultManager] fileExistsAtPath: path isDirectory:&isDir]) {
        [[NSFileManager defaultManager] createDirectoryAtPath:path withIntermediateDirectories:YES attributes:nil error:&err];
    }
    return err == nil;
}

+ (NSDictionary *) stat:(NSString *) path error:(NSError **) error {
    NSMutableDictionary *stat = [[NSMutableDictionary alloc] init];
    BOOL isDir = NO;
    NSFileManager * fm = [NSFileManager defaultManager];
    if([fm fileExistsAtPath:path isDirectory:&isDir] == NO) {
        return nil;
    }
    NSDictionary * info = [fm attributesOfItemAtPath:path error:&error];
    NSString * size = [NSString stringWithFormat:@"%d", [info fileSize]];
    NSString * filename = [path lastPathComponent];
    NSDate * lastModified;
    [[NSURL fileURLWithPath:path] getResourceValue:&lastModified forKey:NSURLContentModificationDateKey error:&error];
    return @{
             @"size" : size,
             @"filename" : filename,
             @"path" : path,
             @"lastModified" : [NSString stringWithFormat:@"%d", [lastModified timeIntervalSince1970]],
             @"type" : isDir ? @"directory" : @"file"
             };
}

+ (BOOL) exists:(NSString *) path {
    return [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory:NULL];
}

- (id)init {
    self = [super init];
    return self;
}

- (id)initWithCallback:(RCTResponseSenderBlock)callback {
    self = [super init];
    self.callback = callback;
    return self;
}

- (id)initWithBridgeRef:(RCTBridge *)bridgeRef {
    self = [super init];
    self.bridge = bridgeRef;
    return self;
}

// Create file stream for write data
- (NSString *)openWithPath:(NSString *)destPath encode:(nullable NSString *)encode appendData:(BOOL)append {
    self.outStream = [[NSOutputStream alloc] initToFileAtPath:destPath append:append];
    self.encoding = encode;
    [self.outStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
    [self.outStream open];
    NSString *uuid = [[NSUUID UUID] UUIDString];
    self.streamId = uuid;
    [RNFetchBlobFS setFileStream:self withId:uuid];
    return uuid;
}

// Write file chunk into an opened stream
- (void)writeEncodeChunk:(NSString *) chunk {
    NSMutableData * decodedData = [NSData alloc];
    if([[self.encoding lowercaseString] isEqualToString:@"base64"]) {
        decodedData = [[NSData alloc] initWithBase64EncodedData:chunk options:0];
    }
    if([[self.encoding lowercaseString] isEqualToString:@"utf8"]) {
        decodedData = [chunk dataUsingEncoding:NSUTF8StringEncoding];
    }
    else if([[self.encoding lowercaseString] isEqualToString:@"ascii"]) {
        decodedData = [chunk dataUsingEncoding:NSASCIIStringEncoding];
    }
    NSUInteger left = [decodedData length];
    NSUInteger nwr = 0;
    do {
        nwr = [self.outStream write:[decodedData bytes] maxLength:left];
        if (-1 == nwr) break;
        left -= nwr;
    } while (left > 0);
    if (left) {
        NSLog(@"stream error: %@", [self.outStream streamError]);
    }
}

// Write file chunk into an opened stream
- (void)write:(NSData *) chunk {
    NSUInteger left = [chunk length];
    NSUInteger nwr = 0;
    do {
        nwr = [self.outStream write:[chunk bytes] maxLength:left];
        if (-1 == nwr) break;
        left -= nwr;
    } while (left > 0);
    if (left) {
        NSLog(@"stream error: %@", [self.outStream streamError]);
    }
}

// close file write stream
- (void)closeOutStream {
    if(self.outStream != nil) {
        [self.outStream close];
        self.outStream = nil;
    }
    
}

- (void)readWithPath:(NSString *)path useEncoding:(NSString *)encoding bufferSize:(int) bufferSize {
    
    self.inStream = [[NSInputStream alloc] initWithFileAtPath:path];
    self.inStream.delegate = self;
    self.encoding = encoding;
    self.path = path;
    self.bufferSize = bufferSize;
    
    // NSStream needs a runloop so let's create a run loop for it
    dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT,0);
    // start NSStream is a runloop
    dispatch_async(queue, ^ {
        [inStream scheduleInRunLoop:[NSRunLoop currentRunLoop]
                            forMode:NSDefaultRunLoopMode];
        [inStream open];
        [[NSRunLoop currentRunLoop] run];
        
    });
}

// close file read stream
- (void)closeInStream {
    if(self.inStream != nil) {
        [self.inStream close];
        [self.inStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
        [[RNFetchBlobFS getFileStreams] setValue:nil forKey:self.streamId];
        self.streamId = nil;
    }
    
}

void runOnMainQueueWithoutDeadlocking(void (^block)(void))
{
    if ([NSThread isMainThread])
    {
        block();
    }
    else
    {
        dispatch_sync(dispatch_get_main_queue(), block);
    }
}


#pragma mark RNFetchBlobFS read stream delegate

- (void)stream:(NSStream *)stream handleEvent:(NSStreamEvent)eventCode {
    
    NSString * streamEventCode = [NSString stringWithFormat:@"RNFetchBlobStream+%@", self.path];
    
    switch(eventCode) {
            
            // write stream event
        case NSStreamEventHasSpaceAvailable:
        {
            
            
        }
            
            // read stream incoming chunk
        case NSStreamEventHasBytesAvailable:
        {
            NSMutableData * chunkData = [[NSMutableData alloc] init];
            NSInteger chunkSize = 4096;
            if([[self.encoding lowercaseString] isEqualToString:@"base64"])
                chunkSize = 4095;
            if(self.bufferSize > 0)
                chunkSize = self.bufferSize;
//            uint8_t * buf = (uint8_t *)malloc(chunkSize);
            uint8_t buf[chunkSize];
            unsigned int len = 0;
            len = [(NSInputStream *)stream read:buf maxLength:chunkSize];
            // still have data in stream
            if(len) {
                [chunkData appendBytes:buf length:len];
                // dispatch data event
                NSString * encodedChunk = [NSString alloc];
                if( [[self.encoding lowercaseString] isEqualToString:@"utf8"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSUTF8StringEncoding];
                }
                // when encoding is ASCII, send byte array data
                else if ( [[self.encoding lowercaseString] isEqualToString:@"ascii"] ) {
                    // RCTBridge only emits string data, so we have to create JSON byte array string
                    NSString * asciiStr = @"[";
                    if (chunkData.length > 0)
                    {
//                        unsigned char *bytePtr = (unsigned char *)[chunkData bytes];
                        unsigned char *bytePtr = (unsigned char *)[chunkData bytes];
                        NSInteger byteLen = chunkData.length/sizeof(uint8_t);
                        for (int i = 0; i < byteLen; i++)
                        {
                            NSInteger val = bytePtr[i];
                            if(i+1 < byteLen)
                                asciiStr = [asciiStr stringByAppendingFormat:@"%d,", val];
                            else
                                asciiStr = [asciiStr stringByAppendingFormat:@"%d", val];
                        }
//                        free(bytePtr);
                    }
                    asciiStr = [asciiStr stringByAppendingString:@"]"];
                    [self.bridge.eventDispatcher
                     sendDeviceEventWithName:streamEventCode
                     body: @{
                             @"event": FS_EVENT_DATA,
                             @"detail": asciiStr
                            }
                     ];
//                    free(buf);
//                    asciiStr = nil;
//                    buf = nil;
//                    chunkData = nil;
                    return;
                }
                // convert byte array to base64 data chunks
                else if ( [[self.encoding lowercaseString] isEqualToString:@"base64"] ) {
                    encodedChunk = [chunkData base64EncodedStringWithOptions:0];
                }
                // unknown encoding, send error event
                else {
                    [self.bridge.eventDispatcher
                     sendDeviceEventWithName:streamEventCode
                     body:@{
                            @"event": FS_EVENT_ERROR,
                            @"detail": @"unrecognized encoding"
                            }
                     ];
                    return;
                }
                
                [self.bridge.eventDispatcher
                 sendDeviceEventWithName:streamEventCode
                 body:@{
                        @"event": FS_EVENT_DATA,
                        @"detail": encodedChunk
                        }
                 ];
//                chunkData = nil;
//                free(buf);
            }
            // end of stream
            else {
                [self.bridge.eventDispatcher
                 sendDeviceEventWithName:streamEventCode
                 body:@{
                        @"event": FS_EVENT_END,
                        @"detail": @""
                        }
                 ];
//                chunkData = nil;
//                free(buf);
            }
            break;
        }
            
            // stream error
        case NSStreamEventErrorOccurred:
        {
            [self.bridge.eventDispatcher
             sendDeviceEventWithName:streamEventCode
             body:@{
                    @"event": FS_EVENT_ERROR,
                    @"detail": @"RNFetchBlob error when read file with stream, file may not exists"
                    }
             ];
            break;
        }
            
    }
    
}

@end

