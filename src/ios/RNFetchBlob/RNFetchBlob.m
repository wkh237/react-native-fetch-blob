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

// lib event
NSString *const MSG_EVENT = @"RNFetchBlobMessage";
NSString *const MSG_EVENT_LOG = @"log";
NSString *const MSG_EVENT_WARN = @"warn";
NSString *const MSG_EVENT_ERROR = @"error";
NSString *const CONFIG_USE_TEMP = @"fileCache";
NSString *const CONFIG_FILE_PATH = @"path";
NSString *const FS_EVENT_DATA = @"data";
NSString *const FS_EVENT_END = @"end";
NSString *const FS_EVENT_WARN = @"warn";
NSString *const FS_EVENT_ERROR = @"error";

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

+ (NSString *) getTempPath:(NSString*)taskId {

    NSString * documentDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
    NSString * filename = [NSString stringWithFormat:@"/RNFetchBlobTmp_%@", taskId];
    NSString * tempPath = [documentDir stringByAppendingString: filename];
    return tempPath;
}

- (id)initWithCallback:(RCTResponseSenderBlock)callback {
    self = [super init];
    self.callback = callback;
    return self;
}

- (id)initWithBridgeRef:(RCTBridge *)bridgeRef {
    self = [super init];
    self.callback = callback;
    return self;
}

- (void)openWithPath:(NSString *)destPath {
    self.outStream = [[NSOutputStream alloc] initToFileAtPath:destPath append:YES];
    [self.outStream open];
}


- (void)openWithId:(NSString *)taskId {
    
    NSString * tmpPath = [[self class ]getTempPath: taskId];
    // create a file stream
    [self openWithPath:tmpPath];
    
}

// Write file chunk into an opened stream
- (void)write:(NSData *) chunk toPath:(NSString *) path{
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

- (void)readWithPath:(NSString *)path useEncoding:(NSString *)encoding {
    self.inStream = [[NSInputStream alloc]init];
    self.encoding = encoding;
    [self.inStream setDelegate:self];
    
}

- (void)readWithTaskId:(NSString *)taskId withPath:(NSString *)path useEncoding:(NSString *)encoding {
    self.taskId = taskId;
    self.path = path;
    if(path == nil)
        [self readWithPath:[[self class]getTempPath:taskId] useEncoding:encoding];
    else
        [self readWithPath:path useEncoding:encoding];
}

// close file write stream
- (void)closeOutStream {
    if(self.outStream != nil) {
        [self.outStream close];
        self.outStream = nil;
    }

}

// close file read stream
- (void)closeInStream {
    if(self.inStream != nil) {
        [self.inStream close];
        [self.inStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
    }
    
}

#pragma mark RNFetchBlobFS read stream delegate

- (void)stream:(NSStream *)stream handleEvent:(NSStreamEvent)eventCode {

    switch(eventCode) {
            
        // write stream event
        case NSStreamEventHasSpaceAvailable:
        {
            
        
        }
        
        // read stream incoming chunk
        case NSStreamEventHasBytesAvailable:
        {
            
            
            NSMutableData * chunkData = [[NSMutableData data] init];
            
            uint8_t buf[1024];
            unsigned int len = 0;
            len = [(NSInputStream *)stream read:buf maxLength:1024];
            // still have data in stream
            if(len) {
                [chunkData appendBytes:(const void *)buf length:len];
                // TODO : file read progress ?
//                [bytesRead setIntValue:[bytesRead intValue]+len];
                
                // dispatch data event
                NSString * encodedChunk = [NSString alloc];
                if( [self.encoding caseInsensitiveCompare:@"utf8"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSUTF8StringEncoding];
                }
                else if ( [self.encoding caseInsensitiveCompare:@"ascii"] ) {
                    encodedChunk = [encodedChunk initWithData:chunkData encoding:NSASCIIStringEncoding];
                }
                else if ( [self.encoding caseInsensitiveCompare:@"base64"] ) {
                    encodedChunk = [chunkData base64EncodedStringWithOptions:0];
                }
                else {
                    [self.bridge.eventDispatcher
                     sendAppEventWithName: [NSString stringWithFormat:@"RNFetchBlobStream%s", self.taskId]
                     body:@{
                            @"event": FS_EVENT_ERROR,
                            @"detail": @"unrecognized encoding"
                        }
                     ];
                    return;
                }
                [self.bridge.eventDispatcher
                 sendAppEventWithName: [NSString stringWithFormat:@"RNFetchBlobStream%s", self.taskId]
                 body:@{
                        @"event": FS_EVENT_DATA,
                        @"detail": encodedChunk
                    }
                 ];
            }
            // end of stream
            else {
                [self.bridge.eventDispatcher
                sendAppEventWithName: [NSString stringWithFormat:@"RNFetchBlobStream%s", self.taskId]
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
             sendAppEventWithName: [NSString stringWithFormat:@"RNFetchBlobStream%s", self.taskId]
             body:@{
                    @"event": FS_EVENT_ERROR,
                    @"detail": @"error when read file with stream"
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
    
    // open file stream for write
    if( path != nil) {
        self.fileStream = [[FetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithPath:path];
    }
    else if ( [self.options valueForKey:CONFIG_USE_TEMP]!= nil ) {
        self.fileStream = [[FetchBlobFS alloc]initWithCallback:self.callback];
        [self.fileStream openWithId:taskId];
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
    receivedBytes += data.length;
    
    Boolean fileCache = [self.options valueForKey:CONFIG_USE_TEMP];
    NSString * path = [self.options valueForKey:CONFIG_FILE_PATH];
    if(path != nil) {
        [self.fileStream write:data toPath:path];
    }
    // write to tmp file
    else if( fileCache != nil) {
        [self.fileStream write:data toPath:[FetchBlobFS getTempPath:self.taskId ]];
    }
    // cache data in memory
    else {
        [respData appendData:data];
    }
    
    [self.bridge.eventDispatcher
        sendAppEventWithName:@"RNFetchBlobProgress"
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
        sendAppEventWithName:@"RNFetchBlobProgress"
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
    Boolean useCache = [self.options valueForKey:CONFIG_USE_TEMP];
    
    [self.fileStream closeInStream];
    
    // if fileCache is true or file path is given, return a path
    if( path != nil ) {
        callback(@[[NSNull null], path]);
    }
    // when fileCache option is set but no path specified, save to tmp path
    else if( [self.options valueForKey:CONFIG_USE_TEMP] != nil) {
        NSString * tmpPath = [FetchBlobFS getTempPath:taskId];
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

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE();

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
                NSData* blobData = [[NSData alloc] initWithBase64EncodedString:content options:0];
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

    // if method is POST or PUT, convert data string format
    if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
        
        if(body != nil) {
            // generate octet-stream body
            NSData* blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
            NSMutableData* postBody = [[NSMutableData alloc] init];
            [postBody appendData:[NSData dataWithData:blobData]];
            [request setHTTPBody:postBody];
            [mheaders setValue:@"application/octet-stream" forKey:@"content-type"];
        }
    }
    
    [request setHTTPMethod: method];
    [request setAllHTTPHeaderFields:mheaders];
    
    // send HTTP request
    FetchBlobUtils * utils = [[FetchBlobUtils alloc] init];
    [utils sendRequest:options bridge:self.bridge taskId:taskId withRequest:request callback:callback];
    
}

RCT_EXPORT_METHOD(readStream:(NSString *)taskId withPath:(NSString *)path withEncoding:(NSString *)encoding) {
    FetchBlobFS *fileStream = [[FetchBlobFS alloc] initWithBridgeRef:self.bridge];
    [fileStream readWithTaskId:taskId withPath:path useEncoding:encoding];
}

RCT_EXPORT_METHOD(flush:(NSString *)taskId withPath:(NSString *)path) {
    NSError * error = nil;
    NSString * tmpPath = nil;
    if(path != nil)
        tmpPath = path;
    else
        tmpPath = [FetchBlobFS getTempPath:taskId];
    [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
}

RCT_EXPORT_METHOD(getEnvironmentDirs:(RCTResponseSenderBlock) callback) {
    
    callback(@[
               [FetchBlobFS getPictureDir],
               [FetchBlobFS getMovieDir],
               [FetchBlobFS getDocumentDir],
               [FetchBlobFS getCacheDir],
            ]);
}

@end
