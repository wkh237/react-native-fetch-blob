//
//  RNFetchBlob.m
//
//  Created by wkh237 on 2016/4/28.
//

#import "RNFetchBlob.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RNFetchBlobFS.h"
#import "RNFetchBlobNetwork.h"
#import "RNFetchBlobConst.h"


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
    if(![[NSFileManager defaultManager] fileExistsAtPath: [RNFetchBlobFS getTempPath] isDirectory:&isDir]) {
        [[NSFileManager defaultManager] createDirectoryAtPath:[RNFetchBlobFS getTempPath] withIntermediateDirectories:YES attributes:nil error:NULL];
    }
    return self;
}

- (NSDictionary *)constantsToExport
{
    return @{
             @"DocumentDir": [RNFetchBlobFS getDocumentDir],
             @"CacheDir" : [RNFetchBlobFS getCacheDir]
             };
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
    NSString * encodedUrl = [url stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: encodedUrl]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[ RNFetchBlobNetwork normalizeHeaders:headers]];
    
    
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSNumber * timeStampObj = [NSNumber numberWithDouble: timeStamp];
    
    // generate boundary
    NSString * boundary = [NSString stringWithFormat:@"RNFetchBlob%d", timeStampObj];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSMutableData * postData = [[NSMutableData alloc] init];
        // if method is POST or PUT, convert data string format
        if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
            
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
        RNFetchBlobNetwork * utils = [[RNFetchBlobNetwork alloc] init];
        [utils sendRequest:options bridge:self.bridge taskId:taskId withRequest:request callback:callback];
        utils = nil;
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
    NSString * encodedUrl = [url stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
    // send request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc]
                                    initWithURL:[NSURL
                                                 URLWithString: encodedUrl]];
    
    NSMutableDictionary *mheaders = [[NSMutableDictionary alloc] initWithDictionary:[RNFetchBlobNetwork normalizeHeaders:headers]];
    // move heavy task to another thread
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSMutableData * blobData;
        // if method is POST or PUT, convert data string format
        if([[method lowercaseString] isEqualToString:@"post"] || [[method lowercaseString] isEqualToString:@"put"]) {
            // generate octet-stream body
            if(body != nil) {
                
                // when body is a string contains file path prefix, try load file from the path
                if([body hasPrefix:self.filePathPrefix]) {
                    NSString * orgPath = [body substringFromIndex:[self.filePathPrefix length]];
                    [request setHTTPBodyStream: [NSInputStream inputStreamWithFileAtPath:orgPath ]];
                }
                // otherwise convert it as BASE64 data string
                else {
                    blobData = [[NSData alloc] initWithBase64EncodedString:body options:0];
                    [request setHTTPBody:blobData];
                }
                
                [mheaders setValue:@"application/octet-stream" forKey:@"content-type"];
                
            }
        }
        
        [request setHTTPMethod: method];
        [request setAllHTTPHeaderFields:mheaders];
        
        // send HTTP request
        RNFetchBlobNetwork * utils = [[RNFetchBlobNetwork alloc] init];
        [utils sendRequest:options bridge:self.bridge taskId:taskId withRequest:request callback:callback];
        utils = nil;
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

// method for create file with ASCII content
RCT_EXPORT_METHOD(createFileASCII:(NSString *)path data:(NSArray *)dataArray callback:(RCTResponseSenderBlock)callback) {
    
    NSFileManager * fm = [NSFileManager defaultManager];
    NSMutableData * fileContent = [NSMutableData alloc];
    // prevent stack overflow, alloc on heap
    char * bytes = (char*) malloc([dataArray count]);
//    char bytes[[dataArray count]];
    for(int i = 0; i < dataArray.count; i++) {
        bytes[i] = [[dataArray objectAtIndex:i] charValue];
    }
    [fileContent appendBytes:bytes length:dataArray.count];
    BOOL success = [fm createFileAtPath:path contents:fileContent attributes:NULL];
    free(bytes);
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
    RNFetchBlobFS *fileStream = [[RNFetchBlobFS alloc] initWithBridgeRef:self.bridge];
    if(bufferSize == nil) {
        if([[encoding lowercaseString] isEqualToString:@"base64"])
            bufferSize = 4095;
        else
            bufferSize = 4096;
    }
    [fileStream readWithPath:path useEncoding:encoding bufferSize:bufferSize];
}

RCT_EXPORT_METHOD(writeStream:(NSString *)path withEncoding:(NSString *)encoding appendData:(BOOL)append callback:(RCTResponseSenderBlock)callback) {
    RNFetchBlobFS * fileStream = [[RNFetchBlobFS alloc] initWithBridgeRef:self.bridge];
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

RCT_EXPORT_METHOD(writeArrayChunk:(NSString *)streamId withArray:(NSArray *)dataArray callback:(RCTResponseSenderBlock) callback) {
    RNFetchBlobFS *fs = [[RNFetchBlobFS getFileStreams] valueForKey:streamId];
//    char bytes[[dataArray count]];
    char * bytes = (char *) malloc([dataArray count]);
    for(int i = 0; i < dataArray.count; i++) {
        bytes[i] = [[dataArray objectAtIndex:i] charValue];
    }
    NSMutableData * data = [NSMutableData alloc];
    [data appendBytes:bytes length:dataArray.count];
    [fs write:data];
    free(bytes);
    callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(writeChunk:(NSString *)streamId withData:(NSString *)data callback:(RCTResponseSenderBlock) callback) {
    RNFetchBlobFS *fs = [[RNFetchBlobFS getFileStreams] valueForKey:streamId];
    [fs writeEncodeChunk:data];
    callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(closeStream:(NSString *)streamId callback:(RCTResponseSenderBlock) callback) {
    RNFetchBlobFS *fs = [[RNFetchBlobFS getFileStreams] valueForKey:streamId];
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

RCT_EXPORT_METHOD(stat:(NSString *)path callback:(RCTResponseSenderBlock) callback) {
    NSFileManager* fm = [NSFileManager defaultManager];
    BOOL exist = nil;
    BOOL isDir = nil;
    NSError * error = nil;
    exist = [fm fileExistsAtPath:path isDirectory:&isDir];
    if(exist == NO) {
        callback(@[[NSString stringWithFormat:@"failed to list path `%@` for it is not exist or it is not exist", path]]);
        return ;
    }
    NSData * res = [RNFetchBlobFS stat:path error:&error];
    
    if(error == nil)
        callback(@[[NSNull null], res]);
    else
        callback(@[[error localizedDescription], [NSNull null]]);
    
}

RCT_EXPORT_METHOD(lstat:(NSString *)path callback:(RCTResponseSenderBlock) callback) {
    NSFileManager* fm = [NSFileManager defaultManager];
    BOOL exist = nil;
    BOOL isDir = nil;
    exist = [fm fileExistsAtPath:path isDirectory:&isDir];
    if(exist == NO) {
        callback(@[[NSString stringWithFormat:@"failed to list path `%@` for it is not exist or it is not exist", path]]);
        return ;
    }
    NSError * error = nil;
    NSArray * files = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path error:&error];
    
    NSMutableArray * res = [[NSMutableArray alloc] init];
    if(isDir == YES) {
        for(NSString * p in files) {
            NSString * filePath = [NSString stringWithFormat:@"%@/%@", path, p];
            [res addObject:[RNFetchBlobFS stat:filePath error:&error]];
        }
    }
    else {
        [res addObject:[RNFetchBlobFS stat:path error:&error]];
    }
    
    if(error == nil)
        callback(@[[NSNull null], res == nil ? [NSNull null] :res ]);
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
    if([RNFetchBlobFS exists:path]) {
        callback(@[@"mkdir failed, folder already exists"]);
        return;
    }
    else
        [RNFetchBlobFS mkdir:path];
    callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(getEnvironmentDirs:(RCTResponseSenderBlock) callback) {
    
    callback(@[
               [RNFetchBlobFS getDocumentDir],
               [RNFetchBlobFS getCacheDir],
               ]);
}

#pragma mark RNFetchBlob private methods


@end
