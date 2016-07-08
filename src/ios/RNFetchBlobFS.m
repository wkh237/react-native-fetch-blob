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
@import AssetsLibrary;
@import Photos;

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

+(NSString *) getPathOfAsset:(NSString *)assetURI
{
    // get file path of an app asset
    if([assetURI hasPrefix:@"bundle-assets://"])
    {
        assetURI = [assetURI stringByReplacingOccurrencesOfString:@"bundle-assets://" withString:@""];
        assetURI = [[NSBundle mainBundle] pathForResource: [assetURI stringByDeletingPathExtension]
                                               ofType: [assetURI pathExtension]];
    }
    return assetURI;
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

- (void) startAssetReadStream:(NSData *)assetUrl
{
    ALAssetsLibraryAssetForURLResultBlock resultblock = ^(ALAsset *myasset)
    {
        dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT,0);
        dispatch_async(queue, ^ {
            NSString * streamEventCode = [NSString stringWithFormat:@"RNFetchBlobStream+%@", self.path];
            ALAssetRepresentation *rep = [myasset defaultRepresentation];
            Byte *buffer = (Byte*)malloc(self.bufferSize);
            NSUInteger cursor = [rep getBytes:buffer fromOffset:0 length:self.bufferSize error:nil];
            while(cursor > 0)
            {
                cursor += [rep getBytes:buffer fromOffset:cursor length:self.bufferSize error:nil];
                NSData * chunkData = [NSData dataWithBytes:buffer length:self.bufferSize];
                NSString * encodedChunk = @"";
                // emit data
                if( [[self.encoding lowercaseString] isEqualToString:@"utf8"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSUTF8StringEncoding];
                }
                // when encoding is ASCII, send byte array data
                else if ( [[self.encoding lowercaseString] isEqualToString:@"ascii"] ) {
                    // RCTBridge only emits string data, so we have to create JSON byte array string
                    NSMutableArray * asciiArray = [NSMutableArray array];
                    unsigned char *bytePtr;
                    if (chunkData.length > 0)
                    {
                        bytePtr = (unsigned char *)[chunkData bytes];
                        NSInteger byteLen = chunkData.length/sizeof(uint8_t);
                        for (int i = 0; i < byteLen; i++)
                        {
                            [asciiArray addObject:[NSNumber numberWithChar:bytePtr[i]]];
                        }
                    }
                    
                    [self.bridge.eventDispatcher
                     sendDeviceEventWithName:streamEventCode
                     body: @{
                             @"event": FS_EVENT_DATA,
                             @"detail": asciiArray
                             }
                     ];
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
            }
            free(buffer);
        });
        
    };
    
    ALAssetsLibraryAccessFailureBlock failureblock  = ^(NSError *error)
    {
        
    };
    
    if(assetUrl && [assetUrl length])
    {
        NSURL *asseturl = [NSURL URLWithString:assetUrl];
        ALAssetsLibrary* assetslibrary = [[ALAssetsLibrary alloc] init];
        [assetslibrary assetForURL:asseturl
                       resultBlock:resultblock
                      failureBlock:failureblock];
    }
}

// read system asset file
+ (void) readAssetFile:(NSData *)assetUrl completionBlock:(void(^)(NSData * content))completionBlock failBlock:(void(^)(NSError * err))failBlock
{
    
    ALAssetsLibraryAssetForURLResultBlock resultblock = ^(ALAsset *myasset)
    {
        ALAssetRepresentation *rep = [myasset defaultRepresentation];
        Byte *buffer = (Byte*)malloc(rep.size);
        NSUInteger buffered = [rep getBytes:buffer fromOffset:0.0 length:rep.size error:nil];
        NSData *data = [NSData dataWithBytesNoCopy:buffer length:buffered freeWhenDone:YES];
        completionBlock(data);
    };
    
    ALAssetsLibraryAccessFailureBlock failureblock  = ^(NSError *error)
    {
        failBlock(error);
    };
    
    if(assetUrl && [assetUrl length])
    {
        NSURL *asseturl = [NSURL URLWithString:assetUrl];
        ALAssetsLibrary* assetslibrary = [[ALAssetsLibrary alloc] init];
        [assetslibrary assetForURL:asseturl
                       resultBlock:resultblock
                      failureBlock:failureblock];
    }
}

+ (void) writeFile:(NSString *)path encoding:(NSString *)encoding data:(NSString *)data append:(BOOL)append resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    @try {
        NSFileManager * fm = [NSFileManager defaultManager];
        NSError * err = nil;
        // check if the folder exists, if not exists, create folders recursively
        // after the folders created, write data into the file
        NSString * folder = [path stringByDeletingLastPathComponent];
        if(![fm fileExistsAtPath:folder]) {
            [fm createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:NULL error:&err];
        }
        // if file exists, write file by encoding and strategy
        if(![fm fileExistsAtPath:path]) {
            if([[encoding lowercaseString] isEqualToString:@"base64"]){
                NSData * byteData = [[NSData alloc] initWithBase64EncodedString:data options:0];
                [fm createFileAtPath:path contents:byteData attributes:NULL];
            }
            else
                [fm createFileAtPath:path contents:[data dataUsingEncoding:NSUTF8StringEncoding] attributes:NULL];
        }
        else {
            NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
            NSData * content = nil;
            if([[encoding lowercaseString] isEqualToString:@"base64"]) {
                content = [[NSData alloc] initWithBase64EncodedString:data options:0];
            }
            else {
                content = [data dataUsingEncoding:NSUTF8StringEncoding];
            }
            if(append == YES) {
                [fileHandle seekToEndOfFile];
                [fileHandle writeData:content];
                [fileHandle closeFile];
            }
            else {
                [content writeToFile:path atomically:YES];
            }
        }
        fm = nil;
        resolve([NSNull null]);
    }
    @catch (NSException * e)
    {
        reject(@"RNFetchBlob writeFile Error", @"Error", [e description]);
    }
}

+ (void) writeFileArray:(NSString *)path data:(NSArray *)data append:(BOOL)append resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    @try {
        NSFileManager * fm = [NSFileManager defaultManager];
        NSError * err = nil;
        // check if the folder exists, if not exists, create folders recursively
        // after the folders created, write data into the file
        NSString * folder = [path stringByDeletingLastPathComponent];
        if(![fm fileExistsAtPath:folder]) {
            [fm createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:NULL error:&err];
        }
        NSMutableData * fileContent = [NSMutableData alloc];
        // prevent stack overflow, alloc on heap
        char * bytes = (char*) malloc([data count]);
        for(int i = 0; i < data.count; i++) {
            bytes[i] = [[data objectAtIndex:i] charValue];
        }
        [fileContent appendBytes:bytes length:data.count];
        if(![fm fileExistsAtPath:path]) {
            [fm createFileAtPath:path contents:fileContent attributes:NULL];
        }
        // if file exists, write file
        else {
            if(append == YES) {
                NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
                [fileHandle seekToEndOfFile];
                [fileHandle writeData:fileContent];
                [fileHandle closeFile];
            }
            else {
                [fileContent writeToFile:path atomically:YES];
            }
        }
        free(bytes);
        fm = nil;
        resolve([NSNull null]);
    }
    @catch (NSException * e)
    {
        reject(@"RNFetchBlob writeFile Error", @"Error", [e description]);
    }
}

+ (void) readFile:(NSString *)path encoding:(NSString *)encoding resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    @try
    {
        // before start reading file, we have to check if the `path` contains any special prefix
        // if the `path` begins with the following prefix then it will need special handling.
        //      "assets-library://" this kind of path usually comes from camera roll, should use it's own readFile implementation
        //      "bundle-assets://" this means an asset inside app bundle, usually we only have to convert it into normal file path
        if([path hasPrefix:@"assets-library://"])
        {
            [[self class] readAssetFile:path completionBlock:^(NSData * content)
            {
                if([[encoding lowercaseString] isEqualToString:@"utf8"]) {
                    resolve([[NSString alloc] initWithData:content encoding:NSUTF8StringEncoding]);
                }
                else if ([[encoding lowercaseString] isEqualToString:@"base64"]) {
                    resolve([content base64EncodedStringWithOptions:0]);
                }
                else if ([[encoding lowercaseString] isEqualToString:@"ascii"]) {
                    NSMutableArray * resultArray = [NSMutableArray array];
                    char * bytes = [content bytes];
                    for(int i=0;i<[content length];i++) {
                        [resultArray addObject:[NSNumber numberWithChar:bytes[i]]];
                    }
                    resolve(resultArray);
                }
            } failBlock:^(NSError *err) {
                @throw @"RNFetchBlobFS readFile error", @"failed to read asset", path;
            }];
            return ;
        }
        
        // normalize the file path
        path = [[self class]getPathOfAsset:path];
        
        NSFileManager * fm = [NSFileManager defaultManager];
        NSError *err = nil;
        BOOL exists = [fm fileExistsAtPath:path];
        if(!exists) {
            @throw @"RNFetchBlobFS readFile error", @"file not exists", path;
            return;
        }
        if([[encoding lowercaseString] isEqualToString:@"utf8"]) {
            NSString * utf8Result = [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:&err];
            resolve(utf8Result);
        }
        else if ([[encoding lowercaseString] isEqualToString:@"base64"]) {
            NSData * fileData = [NSData dataWithContentsOfFile:path];
            resolve([fileData base64EncodedStringWithOptions:0]);
        }
        else if ([[encoding lowercaseString] isEqualToString:@"ascii"]) {
            NSData * resultData = [NSData dataWithContentsOfFile:path];
            NSMutableArray * resultArray = [NSMutableArray array];
            char * bytes = [resultData bytes];
            for(int i=0;i<[resultData length];i++) {
                [resultArray addObject:[NSNumber numberWithChar:bytes[i]]];
            }
            resolve(resultArray);
        }

    }
    @catch(NSException * e)
    {
        reject(@"RNFetchBlobFS readFile error", @"error", [e description]);
    }
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
    
    if([path hasPrefix:@"assets-library://"])
    {
     
        return;
    }
    
    // normalize file path
    path = [[self class] getPathOfAsset:path];
    
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
                    NSMutableArray * asciiArray = [NSMutableArray array];
                    unsigned char *bytePtr;
                    if (chunkData.length > 0)
                    {
                        bytePtr = (unsigned char *)[chunkData bytes];
                        NSInteger byteLen = chunkData.length/sizeof(uint8_t);
                        for (int i = 0; i < byteLen; i++)
                        {
                            [asciiArray addObject:[NSNumber numberWithChar:bytePtr[i]]];
                        }
                    }

                    [self.bridge.eventDispatcher
                     sendDeviceEventWithName:streamEventCode
                     body: @{
                             @"event": FS_EVENT_DATA,
                             @"detail": asciiArray
                            }
                     ];
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
