//
//  RNFetchBlob.m
//
//  Created by wkh237 on 2016/4/28.
//

#import "RNFetchBlob.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import <Foundation/Foundation.h>
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"

NSString *const FILE_PREFIX = @"RNFetchBlob-file://";

// fetch configs
NSString *const CONFIG_USE_TEMP = @"fileCache";
NSString *const CONFIG_FILE_PATH = @"path";
NSString *const CONFIG_FILE_EXT = @"appendExt";

NSString *const MSG_EVENT = @"RNFetchBlobMessage";
NSString *const MSG_EVENT_LOG = @"log";
NSString *const MSG_EVENT_WARN = @"warn";
NSString *const MSG_EVENT_ERROR = @"error";
NSString *const FS_EVENT_DATA = @"data";
NSString *const FS_EVENT_END = @"end";
NSString *const FS_EVENT_WARN = @"warn";
NSString *const FS_EVENT_ERROR = @"error";
NSMutableDictionary *fileStreams = nil;

////////////////////////////////////////
//
//  File system access methods
//
////////////////////////////////////////

@implementation FetchBlobFS


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

+(void) setFileStream:(FetchBlobFS *) instance withId:(NSString *) uuid {
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
    [FetchBlobFS setFileStream:self withId:uuid];
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

- (void)readWithPath:(NSString *)path useEncoding:(NSString *)encoding bufferSize:(int) bufferSize{
    
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
        [[FetchBlobFS getFileStreams] setValue:nil forKey:self.streamId];
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
            NSMutableData * chunkData = [[NSMutableData data] init];
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
                [chunkData appendBytes:(const void *)buf length:len];
                // TODO : file read progress ?
                // dispatch data event
                NSString * encodedChunk = [NSString alloc];
                if( [[self.encoding lowercaseString] isEqualToString:@"utf8"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSUTF8StringEncoding];
                }
                else if ( [[self.encoding lowercaseString] isEqualToString:@"ascii"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSASCIIStringEncoding];
                }
                else if ( [[self.encoding lowercaseString] isEqualToString:@"base64"] ) {
                    encodedChunk = [chunkData base64EncodedStringWithOptions:0];
                }
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

////////////////////////////////////////
//
//  HTTP request handler
//
////////////////////////////////////////

@implementation FetchBlobUtils


@synthesize taskId;
@synthesize expectedBytes;
@synthesize receivedBytes;
@synthesize respData;
@synthesize callback;
@synthesize bridge;
@synthesize options;


// removing case from headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers {
    
    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }
    
    return mheaders;
}

- (id)init {
    self = [super init];
    return self;
}


- (void) sendRequest:(NSDictionary *)options bridge:(RCTBridge *)bridgeRef taskId:(NSString *)taskId withRequest:(NSURLRequest *)req callback:(RCTResponseSenderBlock) callback {
    self.taskId = taskId;
    self.respData = [[NSMutableData alloc] initWithLength:0];
    self.callback = callback;
    self.bridge = bridgeRef;
    self.expectedBytes = 0;
    self.receivedBytes = 0;
    self.options = options;
    
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
    
    // open file stream for write
    if( path != nil) {
        self.fileStream = [[FetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithPath:path encode:@"ascii" appendData:YES ];
    }
    else if ( [self.options valueForKey:CONFIG_USE_TEMP]!= nil ) {
        self.fileStream = [[FetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithPath:[FetchBlobFS getTempPath:taskId withExtension:ext] encode:@"ascii" appendData:YES];
    }
    
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self startImmediately:NO];
    [conn scheduleInRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
    [conn start];
    
    if(!conn) {
        callback(@[[NSString stringWithFormat:@"RNFetchBlob could not initialize connection"], [NSNull null]]);
    }
}


#pragma mark NSURLConnection delegate methods


- (void) connection:(NSURLConnection *)connection didReceiveResponse:(nonnull NSURLResponse *)response {
//    [UIApplication sharedApplication].networkActivityIndicatorVisible = YES;
    expectedBytes = [response expectedContentLength];
}


- (void) connection:(NSURLConnection *)connection didReceiveData:(nonnull NSData *)data {
    receivedBytes += [data length];
    
    Boolean fileCache = [self.options valueForKey:CONFIG_USE_TEMP];
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    if(path != nil) {
        [self.fileStream write:data];
    }
    // write to tmp file
    else if( fileCache != nil) {
        NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
        [self.fileStream write:data];
    }
    // cache data in memory
    else {
        [respData appendData:data];
    }
    
    [self.bridge.eventDispatcher
        sendDeviceEventWithName:@"RNFetchBlobProgress"
        body:@{
            @"taskId": taskId,
            @"written": [NSString stringWithFormat:@"%d", receivedBytes],
            @"total": [NSString stringWithFormat:@"%d", expectedBytes]
        }
     ];
}

- (void) connection:(NSURLConnection *)connection didSendBodyData:(NSInteger)bytesWritten totalBytesWritten:(NSInteger)totalBytesWritten totalBytesExpectedToWrite:(NSInteger)totalBytesExpectedToWrite {
    
    expectedBytes = totalBytesExpectedToWrite;
    receivedBytes += totalBytesWritten;
    [self.bridge.eventDispatcher
        sendDeviceEventWithName:@"RNFetchBlobProgress"
            body:@{
                    @"taskId": taskId,
                    @"written": [NSString stringWithFormat:@"%d", receivedBytes],
                    @"total": [NSString stringWithFormat:@"%d", expectedBytes]
                }
     ];
    
}

- (void) connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    
//    [UIApplication sharedApplication].networkActivityIndicatorVisible = NO;
    
    [self.fileStream closeInStream];
    [self.fileStream closeOutStream];
    
    callback(@[[error localizedDescription], [NSNull null]]);
}

- (NSCachedURLResponse *) connection:(NSURLConnection *)connection willCacheResponse: (NSCachedURLResponse *)cachedResponse {
    return nil;
}


// handle 301 and 302 responses
- (NSURLRequest *)connection:(NSURLConnection *)connection willSendRequest:(NSURLRequest *)request redirectResponse:response {
    return request;
}

// request complete
- (void) connectionDidFinishLoading:(NSURLConnection *)connection {
    
    NSData * data;
    if(respData != nil)
        data = [NSData dataWithData:respData];
    else
        data = [[NSData alloc] init];
    
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    NSString * ext = [self.options valueForKey:CONFIG_FILE_EXT];
    Boolean useCache = [self.options valueForKey:CONFIG_USE_TEMP];
    
    [self.fileStream closeInStream];
    
    // if fileCache is true or file path is given, return a path
    if( path != nil ) {
        callback(@[[NSNull null], path]);
    }
    // when fileCache option is set but no path specified, save to tmp path
    else if( [self.options valueForKey:CONFIG_USE_TEMP] != nil) {
        NSString * tmpPath = [FetchBlobFS getTempPath:taskId withExtension:ext];
        callback(@[[NSNull null], tmpPath]);
    }
    // otherwise return base64 string
    else {
        callback(@[[NSNull null], [data base64EncodedStringWithOptions:0]]);
    }
}

@end


////////////////////////////////////////
//
//  Exported native methods
//
////////////////////////////////////////

#pragma mark RNFetchBlob exported methods

@implementation RNFetchBlob

@synthesize filePathPrefix;
@synthesize bridge = _bridge;

- (dispatch_queue_t) methodQueue {
    return dispatch_queue_create("RNFetchBlob.queue", DISPATCH_QUEUE_SERIAL);
}

RCT_EXPORT_MODULE();

- (id) init {
    self = [super init];
    self.filePathPrefix = FILE_PREFIX;
    BOOL isDir;
    // if temp folder not exists, create one
    if(![[NSFileManager defaultManager] fileExistsAtPath: [FetchBlobFS getTempPath] isDirectory:&isDir]) {
        [[NSFileManager defaultManager] createDirectoryAtPath:[FetchBlobFS getTempPath] withIntermediateDirectories:YES attributes:nil error:NULL];
    }
    return self;
}

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlobForm:(NSDictionary *)options
                  taskId:(NSString *)taskId
                  method:(NSString *)method
                  url:(NSString *)url
                  headers:(NSDictionary *)headers
                  form:(NSArray *)form
                  callback:(RCTResponseSenderBlock)callback)
{
    
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: url]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[ FetchBlobUtils normalizeHeaders:headers]];
    
    
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSNumber * timeStampObj = [NSNumber numberWithDouble: timeStamp];
    
    // generate boundary
    NSString * boundary = [NSString stringWithFormat:@"RNFetchBlob%d", timeStampObj];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // if method is POST or PUT, convert data string format
        if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
        NSMutableData * postData = [[NSMutableData alloc] init];
        
            // combine multipart/form-data body
            for(id field in form) {
                NSString * name = [field valueForKey:@"name"];
                NSString * content = [field valueForKey:@"data"];
                // field is a text field
                if([field valueForKey:@"filename"] == nil || content == [NSNull null]) {
                    [postData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n", name] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:[[NSString stringWithFormat:@"Content-Type: text/plain\r\n\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:[[NSString stringWithFormat:@"%@\r\n", content] dataUsingEncoding:NSUTF8StringEncoding]];
                }
                // field contains a file
                else {
                    NSMutableData * blobData;
                    if(content != nil) {
                        if([content hasPrefix:self.filePathPrefix]) {
                            NSString * orgPath = [content substringFromIndex:[self.filePathPrefix length]];
                            blobData = [[NSData alloc] initWithContentsOfFile:orgPath];
                        }
                        else
                            blobData = [[NSData alloc] initWithBase64EncodedString:content options:0];
                    }
                    NSString * filename = [field valueForKey:@"filename"];
                    [postData appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", name, filename] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:[[NSString stringWithFormat:@"Content-Type: application/octet-stream\r\n\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                    [postData appendData:blobData];
                    [postData appendData:[[NSString stringWithFormat:@"\r\n"] dataUsingEncoding:NSUTF8StringEncoding]];
                }
                
            }
        
            // close form data
            [postData appendData: [[NSString stringWithFormat:@"--%@--\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
            [request setHTTPBody:postData];
            // set content-length
            [mheaders setValue:[NSString stringWithFormat:@"%d",[postData length]] forKey:@"Content-Length"];
            [mheaders setValue:[NSString stringWithFormat:@"100-continue",[postData length]] forKey:@"Expect"];
            // appaned boundary to content-type
            [mheaders setValue:[NSString stringWithFormat:@"multipart/form-data; charset=utf-8; boundary=%@", boundary] forKey:@"content-type"];
        
        }
        
        [request setHTTPMethod: method];
        [request setAllHTTPHeaderFields:mheaders];
        
        
        // send HTTP request
        FetchBlobUtils * utils = [[FetchBlobUtils alloc] init];
        [utils sendRequest:options bridge:self.bridge taskId:taskId withRequest:request callback:callback];
    });
}

// Fetch blob data request
RCT_EXPORT_METHOD(fetchBlob:(NSDictionary *)options
                  taskId:(NSString *)taskId
                  method:(NSString *)method
                  url:(NSString *)url
                  headers:(NSDictionary *)headers
                  body:(NSString *)body callback:(RCTResponseSenderBlock)callback)
{
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: url]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[FetchBlobUtils normalizeHeaders:headers]];
    // move heavy task to another thread
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // if method is POST or PUT, convert data string format
        if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
            // generate octet-stream body
            if(body != nil) {
                NSMutableData * blobData;
                
                // when body is a string contains file path prefix, try load file from the path
                if([body hasPrefix:self.filePathPrefix]) {
                    NSString * orgPath = [body substringFromIndex:[self.filePathPrefix length]];
                    blobData = [[NSData alloc] initWithContentsOfFile:orgPath];
                }
                // otherwise convert it as BASE64 data string
                else
                    blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
                [request setHTTPBody:blobData];
                [mheaders setValue:@"application/octet-stream" forKey:@"content-type"];
                
            }
        }
        
        [request setHTTPMethod: method];
        [request setAllHTTPHeaderFields:mheaders];
        
        // send HTTP request
        FetchBlobUtils * utils = [[FetchBlobUtils alloc] init];
        [utils sendRequest:options bridge:self.bridge taskId:taskId withRequest:request callback:callback];
    });
}

RCT_EXPORT_METHOD(createFile:(NSString *)path data:(NSString *)data encoding:(NSString *)encoding callback:(RCTResponseSenderBlock)callback) {
    
    NSFileManager * fm = [NSFileManager defaultManager];
    NSData * fileContent = nil;
    
    if([[encoding lowercaseString] isEqualToString:@"utf8"]) {
        fileContent = [[NSData alloc] initWithData:[data dataUsingEncoding:NSUTF8StringEncoding allowLossyConversion:YES]];
    }
    else if([[encoding lowercaseString] isEqualToString:@"base64"]) {
        fileContent = [[NSData alloc] initWithBase64EncodedData:data options:0];
    }
    else {
        fileContent = [[NSData alloc] initWithData:[data dataUsingEncoding:NSASCIIStringEncoding allowLossyConversion:YES]];
    }
    
    BOOL success = [fm createFileAtPath:path contents:fileContent attributes:NULL];
    if(success == YES)
        callback(@[[NSNull null]]);
    else
        callback(@[[NSString stringWithFormat:@"failed to create new file at path %@ please ensure the folder exists"]]);

}


RCT_EXPORT_METHOD(exists:(NSString *)path callback:(RCTResponseSenderBlock)callback) {
    BOOL isDir = NO;
    BOOL exists = NO;
    exists = [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory: &isDir];
    callback(@[@(exists), @(isDir)]);

}

RCT_EXPORT_METHOD(readStream:(NSString *)path withEncoding:(NSString *)encoding bufferSize:(int)bufferSize) {
    FetchBlobFS *fileStream = [[FetchBlobFS alloc] initWithBridgeRef:self.bridge];
    if(bufferSize == nil) {
        if([[encoding lowercaseString] isEqualToString:@"base64"])
            bufferSize = 4095;
        else
            bufferSize = 4096;
    }
    [fileStream readWithPath:path useEncoding:encoding bufferSize:bufferSize];
}

RCT_EXPORT_METHOD(writeStream:(NSString *)path withEncoding:(NSString *)encoding appendData:(BOOL)append callback:(RCTResponseSenderBlock)callback) {
    FetchBlobFS * fileStream = [[FetchBlobFS alloc] initWithBridgeRef:self.bridge];
    NSFileManager * fm = [NSFileManager defaultManager];
    BOOL isDir = nil;
    BOOL exist = [fm fileExistsAtPath:path isDirectory:&isDir];
    if( exist == NO || isDir == YES) {
        callback(@[[NSString stringWithFormat:@"target path `%@` may not exists or it's a folder", path]]);
        return;
    }
    NSString * streamId = [fileStream openWithPath:path encode:encoding appendData:append];
    callback(@[[NSNull null], streamId]);
}

RCT_EXPORT_METHOD(writeChunk:(NSString *)streamId withData:(NSString *)data callback:(RCTResponseSenderBlock) callback) {
    FetchBlobFS *fs = [[FetchBlobFS getFileStreams] valueForKey:streamId];
    [fs writeEncodeChunk:data];
    callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(closeStream:(NSString *)streamId callback:(RCTResponseSenderBlock) callback) {
    FetchBlobFS *fs = [[FetchBlobFS getFileStreams] valueForKey:streamId];
    [fs closeOutStream];
    callback(@[[NSNull null], @YES]);
}

RCT_EXPORT_METHOD(unlink:(NSString *)path callback:(RCTResponseSenderBlock) callback) {
    NSError * error = nil;
    NSString * tmpPath = nil;
    [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
    if(error == nil)
        callback(@[[NSNull null]]);
    else
        callback(@[[NSString stringWithFormat:@"failed to unlink file or path at %@", path]]);
}

RCT_EXPORT_METHOD(removeSession:(NSArray *)paths callback:(RCTResponseSenderBlock) callback) {
    NSError * error = nil;
    NSString * tmpPath = nil;
    
    for(NSString * path in paths) {
        [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
        if(error != nil) {
            callback(@[[NSString stringWithFormat:@"failed to remove session path at %@", path]]);
            return;
        }
    }
    callback(@[[NSNull null]]);
    
}

RCT_EXPORT_METHOD(ls:(NSString *)path callback:(RCTResponseSenderBlock) callback) {
    NSFileManager* fm = [NSFileManager defaultManager];
    BOOL exist = nil;
    BOOL isDir = nil;
    exist = [fm fileExistsAtPath:path isDirectory:&isDir];
    if(exist == NO || isDir == NO) {
        callback(@[[NSString stringWithFormat:@"failed to list path `%@` for it is not exist or it is not a folder", path]]);
        return ;
    }
    NSError * error = nil;
    NSArray * result = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path error:&error];
    
    if(error == nil)
        callback(@[[NSNull null], result == nil ? [NSNull null] :result ]);
    else
        callback(@[[error localizedDescription], [NSNull null]]);
    
}

RCT_EXPORT_METHOD(cp:(NSString *)path toPath:(NSString *)dest callback:(RCTResponseSenderBlock) callback) {
    NSError * error = nil;
    BOOL result = [[NSFileManager defaultManager] copyItemAtURL:[NSURL fileURLWithPath:path] toURL:[NSURL fileURLWithPath:dest] error:&error];
    
    if(error == nil)
        callback(@[[NSNull null], @YES]);
    else
        callback(@[[error localizedDescription], @NO]);
    
}

RCT_EXPORT_METHOD(mv:(NSString *)path toPath:(NSString *)dest callback:(RCTResponseSenderBlock) callback) {
    NSError * error = nil;
    BOOL result = [[NSFileManager defaultManager] moveItemAtURL:[NSURL fileURLWithPath:path] toURL:[NSURL fileURLWithPath:dest] error:&error];
    
    if(error == nil)
        callback(@[[NSNull null], @YES]);
    else
        callback(@[[error localizedDescription], @NO]);
    
}

RCT_EXPORT_METHOD(mkdir:(NSString *)path callback:(RCTResponseSenderBlock) callback) {
    if([FetchBlobFS exists:path]) {
        callback(@[@"mkdir failed, folder already exists"]);
        return;
    }
    else
        [FetchBlobFS mkdir:path];
    callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(getEnvironmentDirs:(RCTResponseSenderBlock) callback) {
    
    callback(@[
               [FetchBlobFS getDocumentDir],
               [FetchBlobFS getCacheDir],
            ]);
}

#pragma mark RNFetchBlob private methods


@end
