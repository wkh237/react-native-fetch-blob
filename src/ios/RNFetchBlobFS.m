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
    if([assetURI hasPrefix:ASSET_PREFIX])
    {
        assetURI = [assetURI stringByReplacingOccurrencesOfString:ASSET_PREFIX withString:@""];
        assetURI = [[NSBundle mainBundle] pathForResource: [assetURI stringByDeletingPathExtension]
                                                   ofType: [assetURI pathExtension]];
    }
    return assetURI;
}

#pragma mark - system directories

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

#pragma mark - read asset stream

- (void) startAssetReadStream:(NSString *)assetUrl
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

# pragma write file from file

+ (NSNumber *) writeFileFromFile:(NSString *)src toFile:(NSString *)dest append:(BOOL)append
{
    NSInputStream * is = [[NSInputStream alloc] initWithFileAtPath:src];
    NSOutputStream * os = [[NSOutputStream alloc] initToFileAtPath:dest append:append];
    [is open];
    [os open];
    uint8_t buffer[10240];
    long written = 0;
    int read = [is read:buffer maxLength:10240];
    written += read;
    while(read > 0) {
        [os write:buffer maxLength:read];
        read = [is read:buffer maxLength:10240];
        written += read;
    }
    [os close];
    [is close];
    return [NSNumber numberWithLong:written];
}

# pragma mark - write file

+ (void) writeFile:(NSString *)path encoding:(NSString *)encoding data:(NSString *)data append:(BOOL)append resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        NSFileManager * fm = [NSFileManager defaultManager];
        NSError * err = nil;
        // check if the folder exists, if not exists, create folders recursively
        // after the folders created, write data into the file
        NSString * folder = [path stringByDeletingLastPathComponent];
        encoding = [encoding lowercaseString];
        if(![fm fileExistsAtPath:folder]) {
            [fm createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:NULL error:&err];
            [fm createFileAtPath:path contents:nil attributes:nil];
        }
        if(err != nil) {
            reject(@"RNFetchBlob writeFile Error", @"could not create file at path", path);
            return;
        }
        NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
        NSData * content = nil;
        if([encoding containsString:@"base64"]) {
            content = [[NSData alloc] initWithBase64EncodedString:data options:0];
        }
        else if([encoding isEqualToString:@"uri"]) {
            NSNumber* size = [[self class] writeFileFromFile:data toFile:path append:append];
            resolve(size);
            return;
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
        fm = nil;
        
        resolve([NSNumber numberWithInteger:[content length]]);
    }
    @catch (NSException * e)
    {
        reject(@"RNFetchBlob writeFile Error", @"Error", [e description]);
    }
}

# pragma mark - write file (array)

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
        resolve([NSNumber numberWithInteger: data.count]);
    }
    @catch (NSException * e)
    {
        reject(@"RNFetchBlob writeFile Error", @"Error", [e description]);
    }
}

# pragma mark - read file

+ (void) readFile:(NSString *)path encoding:(NSString *)encoding
         resolver:(RCTPromiseResolveBlock)resolve
         rejecter:(RCTPromiseRejectBlock)reject
       onComplete:(void (^)(NSData * content))onComplete
{
    @try
    {
        [[self class] getPathFromUri:path completionHandler:^(NSString *path, ALAssetRepresentation *asset) {
            __block NSData * fileContent;
            NSError * err;
            __block Byte * buffer;
            if(asset != nil)
            {
                buffer = malloc(asset.size);
                [asset getBytes:buffer fromOffset:0 length:asset.size error:&err];
                if(err != nil)
                {
                    reject(@"RNFetchBlobFS readFile error", @"failed to read asset", [err localizedDescription]);
                    return;
                }
                fileContent = [NSData dataWithBytes:buffer length:asset.size];
                free(buffer);
            }
            else
            {
                BOOL exists = [[NSFileManager defaultManager] fileExistsAtPath:path];
                if(!exists) {
                    reject(@"RNFetchBlobFS readFile error", @"file not exists", path);
                    return;
                }
                fileContent = [NSData dataWithContentsOfFile:path];
                
            }
            if(onComplete != nil)
                onComplete(fileContent);
            
            if([[encoding lowercaseString] isEqualToString:@"utf8"]) {
                if(resolve != nil) {
                    NSString * utf8 = [[NSString alloc] initWithData:fileContent encoding:NSUTF8StringEncoding];
                    if(utf8 == nil)
                        resolve([[NSString alloc] initWithData:fileContent encoding:NSISOLatin1StringEncoding]);
                    else
                        resolve(utf8);
                }
            }
            else if ([[encoding lowercaseString] isEqualToString:@"base64"]) {
                if(resolve != nil)
                    resolve([fileContent base64EncodedStringWithOptions:0]);
            }
            else if ([[encoding lowercaseString] isEqualToString:@"ascii"]) {
                NSMutableArray * resultArray = [NSMutableArray array];
                char * bytes = [fileContent bytes];
                for(int i=0;i<[fileContent length];i++) {
                    [resultArray addObject:[NSNumber numberWithChar:bytes[i]]];
                }
                if(resolve != nil)
                    resolve(resultArray);
            }
        }];
    }
    @catch(NSException * e)
    {
        if(reject != nil)
            reject(@"RNFetchBlobFS readFile error", @"error", [e description]);
    }
}

# pragma mark - mkdir

+ (BOOL) mkdir:(NSString *) path {
    BOOL isDir;
    NSError * err = nil;
    // if temp folder not exists, create one
    if(![[NSFileManager defaultManager] fileExistsAtPath: path isDirectory:&isDir]) {
        [[NSFileManager defaultManager] createDirectoryAtPath:path withIntermediateDirectories:YES attributes:nil error:&err];
    }
    return err == nil;
}

# pragma mark - stat

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

# pragma mark - exists

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

# pragma mark - open file stream

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

# pragma mark - file stream write chunk

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
    
    if([path hasPrefix:AL_PREFIX])
    {
        [self startAssetReadStream:path];
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

// Slice a file into another file, generally for support Blob implementation.
- (void)slice:(NSString *)path
         dest:(NSString *)dest
        start:(NSNumber *)start
          end:(NSNumber *)end
        encod:(NSString *)encode
     resolver:(RCTPromiseResolveBlock)resolve
     rejecter:(RCTPromiseRejectBlock)reject
{
    long expected = [end longValue] - [start longValue];
    long read = 0;
    NSFileHandle * handle = [NSFileHandle fileHandleForReadingAtPath:path];
    NSFileManager * fm = [NSFileManager defaultManager];
    NSOutputStream * os = [[NSOutputStream alloc] initToFileAtPath:dest append:NO];
    [os open];
    // abort for the source file not exists
    if([fm fileExistsAtPath:path] == NO)
    {
        reject(@"RNFetchBlob slice failed", @"the file does not exists", path);
        return;
    }
    long size = [fm attributesOfItemAtPath:path error:nil].fileSize;
    // abort for the file size is less than start
    if(size < start)
    {
        reject(@"RNFetchBlob slice failed", @"start is greater than file size", @"");
        return;
    }
    if(![fm fileExistsAtPath:dest]) {
        [fm createFileAtPath:dest contents:@"" attributes:nil];
    }
    [handle seekToFileOffset:start];
    while(read < expected)
    {
        NSData * chunk = [handle readDataOfLength:10240];
        read += [chunk length];
        [os write:[chunk bytes] maxLength:10240];
    }
    [handle closeFile];
    [os close];
    resolve(dest);
    
}

// close file read stream
- (void)closeInStream
{
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

# pragma mark - get absolute path of resource

+ (void) getPathFromUri:(NSString *)uri completionHandler:(void(^)(NSString * path, ALAssetRepresentation *asset)) onComplete
{
    if([uri hasPrefix:AL_PREFIX])
    {
        NSURL *asseturl = [NSURL URLWithString:uri];
        __block ALAssetsLibrary* assetslibrary = [[ALAssetsLibrary alloc] init];
        [assetslibrary assetForURL:asseturl
                       resultBlock:^(ALAsset *asset) {
                           __block ALAssetRepresentation * present = [asset defaultRepresentation];
                           onComplete(nil, present);
                       }
                      failureBlock:^(NSError *error) {
                          onComplete(nil, nil);
                      }];
    }
    else
    {
        onComplete([[self class] getPathOfAsset:uri], nil);
    }
}

@end
