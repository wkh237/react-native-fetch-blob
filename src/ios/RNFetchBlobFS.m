
//  RNFetchBlobFS.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016年 suzuri04x2. All rights reserved.
//


#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RNFetchBlob.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobConst.h"
#import "IOS7Polyfill.h"
@import AssetsLibrary;


NSMutableDictionary *fileStreams = nil;

////////////////////////////////////////
//
//  File system access methods
//
////////////////////////////////////////
@interface RNFetchBlobFS() {
    UIDocumentInteractionController * docCtrl;
}
@end
@implementation RNFetchBlobFS


@synthesize outStream;
@synthesize inStream;
@synthesize encoding;
@synthesize callback;
@synthesize taskId;
@synthesize path;
@synthesize appendData;
@synthesize bufferSize;

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

+ (NSString *) getMainBundleDir {
    return [[NSBundle mainBundle] bundlePath];
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
    
    return NSTemporaryDirectory();
}

+ (NSString *) getTempPath:(NSString*)taskId withExtension:(NSString *)ext {
    
    NSString * documentDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
    NSString * filename = [NSString stringWithFormat:@"/RNFetchBlob_tmp/RNFetchBlobTmp_%@", taskId];
    if(ext != nil)
        filename = [filename stringByAppendingString: [NSString stringWithFormat:@".%@", ext]];
    NSString * tempPath = [documentDir stringByAppendingString: filename];
    return tempPath;
}

#pragma margk - readStream 

+ (void) readStream:(NSString *)uri
           encoding:(NSString * )encoding
         bufferSize:(int)bufferSize
               tick:(int)tick
           streamId:(NSString *)streamId
          bridgeRef:(RCTBridge *)bridgeRef
{
    [[self class] getPathFromUri:uri completionHandler:^(NSString *path, ALAssetRepresentation *asset) {
    
        __block RCTEventDispatcher * event = bridgeRef.eventDispatcher;
        __block int read = 0;
        __block int backoff = tick *1000;
        __block int chunkSize = bufferSize;
        // allocate buffer in heap instead of stack
        uint8_t * buffer;
        @try
        {
            buffer = (uint8_t *) malloc(bufferSize);
            if(path != nil)
            {
                if([[NSFileManager defaultManager] fileExistsAtPath:path] == NO)
                {
                    NSString * message = [NSString stringWithFormat:@"File not exists at path %@", path];
                    NSDictionary * payload = @{ @"event": FS_EVENT_ERROR, @"detail": message };
                    [event sendDeviceEventWithName:streamId body:payload];
                    free(buffer);
                    return ;
                }
                NSInputStream * stream = [[NSInputStream alloc] initWithFileAtPath:path];
                [stream open];
                while((read = [stream read:buffer maxLength:bufferSize]) > 0)
                {
                    [[self class] emitDataChunks:[NSData dataWithBytes:buffer length:read] encoding:encoding streamId:streamId event:event];
                    if(tick > 0)
                    {
                        usleep(backoff);
                    }
                }
                [stream close];
            }
            else if (asset != nil)
            {
                int cursor = 0;
                NSError * err;
                while((read = [asset getBytes:buffer fromOffset:cursor length:bufferSize error:&err]) > 0)
                {
                    cursor += read;
                    [[self class] emitDataChunks:[NSData dataWithBytes:buffer length:read] encoding:encoding streamId:streamId event:event];
                    if(tick > 0)
                    {
                        usleep(backoff);
                    }
                }
            }
            else
            {
                NSDictionary * payload = @{ @"event": FS_EVENT_ERROR, @"detail": @"RNFetchBlob.readStream unable to resolve URI" };
                [event sendDeviceEventWithName:streamId body:payload];
            }
            // release buffer
            if(buffer != nil)
                free(buffer);
            
        }
        @catch (NSError * err)
        {
            NSDictionary * payload = @{ @"event": FS_EVENT_ERROR, @"detail": [NSString stringWithFormat:@"RNFetchBlob.readStream error %@", [err description]] };
            [event sendDeviceEventWithName:streamId body:payload];
        }
        @finally
        {
            NSDictionary * payload = @{ @"event": FS_EVENT_END, @"detail": @"" };
            [event sendDeviceEventWithName:streamId body:payload];
        }
        
    }];
    
}

// send read stream chunks via native event emitter
+ (void) emitDataChunks:(NSData *)data encoding:(NSString *) encoding streamId:(NSString *)streamId event:(RCTEventDispatcher *)event
{
    NSString * encodedChunk = @"";
    if([[encoding lowercaseString] isEqualToString:@"utf8"])
    {
        NSDictionary * payload = @{ @"event": FS_EVENT_DATA,  @"detail" : [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] };
        [event sendDeviceEventWithName:streamId body:payload];
    }
    else if ([[encoding lowercaseString] isEqualToString:@"base64"])
    {
        NSDictionary * payload = @{ @"event": FS_EVENT_DATA,  @"detail" : [data base64EncodedStringWithOptions:0] };
        [event sendDeviceEventWithName:streamId body:payload];
    }
    else if([[encoding lowercaseString] isEqualToString:@"ascii"])
    {
        // RCTBridge only emits string data, so we have to create JSON byte array string
        NSMutableArray * asciiArray = [NSMutableArray array];
        unsigned char *bytePtr;
        if (data.length > 0)
        {
            bytePtr = (unsigned char *)[data bytes];
            NSInteger byteLen = data.length/sizeof(uint8_t);
            for (int i = 0; i < byteLen; i++)
            {
                [asciiArray addObject:[NSNumber numberWithChar:bytePtr[i]]];
            }
        }

        NSDictionary * payload = @{ @"event": FS_EVENT_DATA,  @"detail" : asciiArray };
        [event sendDeviceEventWithName:streamId body:payload];
    }
    
    
}

# pragma write file from file

+ (NSNumber *) writeFileFromFile:(NSString *)src toFile:(NSString *)dest append:(BOOL)append callback:(void(^)(NSString * errMsg, NSNumber *size))callback
{
    [[self class] getPathFromUri:src completionHandler:^(NSString *path, ALAssetRepresentation *asset) {
        if(path != nil)
        {
            __block NSInputStream * is = [[NSInputStream alloc] initWithFileAtPath:path];
            __block NSOutputStream * os = [[NSOutputStream alloc] initToFileAtPath:dest append:append];
            [is open];
            [os open];
            uint8_t buffer[10240];
            __block long written = 0;
            int read = [is read:buffer maxLength:10240];
            written += read;
            while(read > 0) {
                [os write:buffer maxLength:read];
                read = [is read:buffer maxLength:10240];
                written += read;
            }
            [os close];
            [is close];
            __block NSNumber * size = [NSNumber numberWithLong:written];
            callback(nil, size);
        }
        else if(asset != nil)
        {
            
            __block NSOutputStream * os = [[NSOutputStream alloc] initToFileAtPath:dest append:append];
            int read = 0;
            int cursor = 0;
            __block long written = 0;
            uint8_t buffer[10240];
            [os open];
            while((read = [asset getBytes:buffer fromOffset:cursor length:10240 error:nil]) > 0)
            {
                cursor += read;
                [os write:buffer maxLength:read];
            }
            __block NSNumber * size = [NSNumber numberWithLong:written];
            [os close];
            callback(nil, size);
        }
        else
            callback(@"failed to resolve path", nil);
    }];
    
    return 0;
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
            reject(@"RNFetchBlob writeFile Error", @"could not create file at path", nil);
            return;
        }
        NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
        NSData * content = nil;
        if([encoding RNFBContainsString:@"base64"]) {
            content = [[NSData alloc] initWithBase64EncodedString:data options:0];
        }
        else if([encoding isEqualToString:@"uri"]) {
            NSNumber* size = [[self class] writeFileFromFile:data toFile:path append:append callback:^(NSString *errMsg, NSNumber *size) {
                if(errMsg != nil)
                    reject(@"RNFetchBlob writeFile Error", errMsg, nil);
                else
                    resolve(size);
            }];
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
                if(![[NSFileManager defaultManager] fileExistsAtPath:path]) {
                    
                    reject(@"RNFetchBlobFS readFile error", @"file not exists", nil);
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

+ (void) exists:(NSString *) path callback:(RCTResponseSenderBlock)callback
{
    [[self class] getPathFromUri:path completionHandler:^(NSString *path, ALAssetRepresentation *asset) {
        if(path != nil)
        {
            BOOL isDir = NO;
            BOOL exists = NO;
            exists = [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory: &isDir];
            callback(@[@(exists), @(isDir)]);
        }
        else if(asset != nil)
        {
            callback(@[@YES, @NO]);
        }
        else
        {
            callback(@[@NO, @NO]);
        }
    }];
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

// Slice a file into another file, generally for support Blob implementation.
+ (void)slice:(NSString *)path
         dest:(NSString *)dest
        start:(nonnull NSNumber *)start
          end:(nonnull NSNumber *)end
        encode:(NSString *)encode
     resolver:(RCTPromiseResolveBlock)resolve
     rejecter:(RCTPromiseRejectBlock)reject
{
    [[self class] getPathFromUri:path completionHandler:^(NSString *path, ALAssetRepresentation *asset)
    {
        if(path != nil)
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
                reject(@"RNFetchBlob slice failed : the file does not exists", path, nil);
                return;
            }
            long size = [fm attributesOfItemAtPath:path error:nil].fileSize;
            long max = MIN(size, [end longValue]);
            
            if(![fm fileExistsAtPath:dest]) {
                [fm createFileAtPath:dest contents:@"" attributes:nil];
            }
            [handle seekToFileOffset:[start longValue]];
            while(read < expected)
            {
                
                NSData * chunk;
                long chunkSize = 0;
                if([start longValue] + read + 10240 > max)
                {
                    NSLog(@"read chunk %lu", max - read - [start longValue]);
                    chunkSize = max - read - [start longValue];
                    chunk = [handle readDataOfLength:chunkSize];
                }
                else
                {
                    NSLog(@"read chunk %lu", 10240);
                    chunkSize = 10240;
                    chunk = [handle readDataOfLength:10240];
                }
                if([chunk length] <= 0)
                    break;
                long remain = expected - read;
                
                [os write:[chunk bytes] maxLength:chunkSize];
                read += [chunk length];
            }
            [handle closeFile];
            [os close];
            resolve(dest);
        }
        else if (asset != nil)
        {
            long expected = [end longValue] - [start longValue];
            long read = 0;
            long chunkRead = 0;
            NSOutputStream * os = [[NSOutputStream alloc] initToFileAtPath:dest append:NO];
            [os open];
            long size = asset.size;
            long max = MIN(size, [end longValue]);
            
            while(read < expected)
            {
                
                uint8_t * chunk[10240];
                long chunkSize = 0;
                if([start longValue] + read + 10240 > max)
                {
                    NSLog(@"read chunk %lu", max - read - [start longValue]);
                    chunkSize = max - read - [start longValue];
                    chunkRead = [asset getBytes:chunk fromOffset:[start longValue] + read length:chunkSize error:nil];
                }
                else
                {
                    NSLog(@"read chunk %lu", 10240);
                    chunkSize = 10240;
                    chunkRead = [asset getBytes:chunk fromOffset:[start longValue] + read length:chunkSize error:nil];
                }
                if( chunkRead <= 0)
                    break;
                long remain = expected - read;
                
                [os write:chunk maxLength:chunkSize];
                read += chunkRead;
            }
            [os close];
            resolve(dest);
        }
        else
        {
            reject(@"slice error",  [NSString stringWithFormat: @"could not resolve URI %@", path ], nil);
        }
        
    }];
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

#pragma mark - get disk space

+(void) df:(RCTResponseSenderBlock)callback
{
    uint64_t totalSpace = 0;
    uint64_t totalFreeSpace = 0;
    NSError *error = nil;
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSDictionary *dictionary = [[NSFileManager defaultManager] attributesOfFileSystemForPath:[paths lastObject] error: &error];
    
    if (dictionary) {
        NSNumber *fileSystemSizeInBytes = [dictionary objectForKey: NSFileSystemSize];
        NSNumber *freeFileSystemSizeInBytes = [dictionary objectForKey:NSFileSystemFreeSize];
        totalSpace = [fileSystemSizeInBytes unsignedLongLongValue];
        totalFreeSpace = [freeFileSystemSizeInBytes unsignedLongLongValue];
        callback(@[[NSNull null], @{
                  @"free" : [NSString stringWithFormat:@"%d", totalFreeSpace],
                  @"total" : [NSString stringWithFormat:@"%d", totalSpace]
                }]);
    } else {
        callback(@[@"failed to get storage usage."]);
    }
    
}

+ (void) writeAssetToPath:(ALAssetRepresentation * )rep dest:(NSString *)dest
{
    int read = 0;
    int cursor = 0;
    Byte * buffer = (Byte *)malloc(10240);
    NSOutputStream * ostream = [[NSOutputStream alloc] initToFileAtPath:dest append:NO];
    [ostream open];
    while((read = [rep getBytes:buffer fromOffset:cursor length:10240 error:nil]) > 0)
    {
        cursor+=10240;
        [ostream write:buffer maxLength:read];
    }
    [ostream close];
    free(buffer);
    return;
}

@end
