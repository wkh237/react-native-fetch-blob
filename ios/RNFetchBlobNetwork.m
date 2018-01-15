//
//  RNFetchBlobNetwork.m
//  RNFetchBlob
//
//  Created by wkh237 on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//


#import <Foundation/Foundation.h>
#import "RNFetchBlobNetwork.h"

#import "RNFetchBlob.h"
#import "RNFetchBlobConst.h"
#import "RNFetchBlobProgress.h"
#import "RNFetchBlobRequest.h"

#if __has_include(<React/RCTAssert.h>)
#import <React/RCTRootView.h>
#import <React/RCTLog.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTBridge.h>
#else
#import "RCTRootView.h"
#import "RCTLog.h"
#import "RCTEventDispatcher.h"
#import "RCTBridge.h"
#endif

////////////////////////////////////////
//
//  HTTP request handler
//
////////////////////////////////////////

NSMapTable * expirationTable;

__attribute__((constructor))
static void initialize_tables() {
    if(expirationTable == nil)
    {
        expirationTable = [[NSMapTable alloc] init];
    }
}


@implementation RNFetchBlobNetwork

NSOperationQueue *taskQueue;
NSMapTable<NSString*, RNFetchBlobRequest*> * requestsTable;

- (id)init {
    self = [super init];
    if (self) {
        requestsTable = [NSMapTable mapTableWithKeyOptions:NSMapTableStrongMemory valueOptions:NSMapTableWeakMemory];
        
        taskQueue = [[NSOperationQueue alloc] init];
        taskQueue.qualityOfService = NSQualityOfServiceUtility;
        taskQueue.maxConcurrentOperationCount = 10;
    }
    
    return self;
}

+ (instancetype)sharedInstance {
    static id _sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _sharedInstance = [[self alloc] init];
    });
    
    return _sharedInstance;
}

+ (void) sendRequest:(__weak NSDictionary  * _Nullable )options
       contentLength:(long) contentLength
              bridge:(RCTBridge * _Nullable)bridgeRef
              taskId:(NSString * _Nullable)taskId
         withRequest:(__weak NSURLRequest * _Nullable)req
            callback:(_Nullable RCTResponseSenderBlock) callback
{
    RNFetchBlobRequest *request = [[RNFetchBlobRequest alloc] init];
    [request sendRequest:options
           contentLength:contentLength
                  bridge:bridgeRef
                  taskId:taskId
             withRequest:req
      taskOperationQueue:taskQueue
                callback:callback];
    
    @synchronized([RNFetchBlobNetwork class]) {
        [requestsTable setObject:request forKey:taskId];
    }
}

+ (void) enableProgressReport:(NSString *) taskId config:(RNFetchBlobProgress *)config
{
    if (config) {
        @synchronized ([RNFetchBlobNetwork class]) {
            [requestsTable objectForKey:taskId].progressConfig = config;
        }
    }
}

+ (void) enableUploadProgress:(NSString *) taskId config:(RNFetchBlobProgress *)config
{
    if (config) {
        @synchronized ([RNFetchBlobNetwork class]) {
            [requestsTable objectForKey:taskId].uploadProgressConfig = config;
        }
    }
}

// removing case from headers
+ (NSMutableDictionary *) normalizeHeaders:(NSDictionary *)headers
{
    NSMutableDictionary * mheaders = [[NSMutableDictionary alloc]init];
    for(NSString * key in headers) {
        [mheaders setValue:[headers valueForKey:key] forKey:[key lowercaseString]];
    }

    return mheaders;
}

// #115 Invoke fetch.expire event on those expired requests so that the expired event can be handled
+ (void) emitExpiredTasks
{
    @synchronized ([RNFetchBlobNetwork class]){
        NSEnumerator * emu =  [expirationTable keyEnumerator];
        NSString * key;
        
        while((key = [emu nextObject]))
        {
            RCTBridge * bridge = [RNFetchBlob getRCTBridge];
            id args = @{ @"taskId": key };
            [bridge.eventDispatcher sendDeviceEventWithName:EVENT_EXPIRE body:args];
            
        }
        
        // clear expired task entries
        [expirationTable removeAllObjects];
        expirationTable = [[NSMapTable alloc] init];
    }
}

+ (void) cancelRequest:(NSString *)taskId
{
    NSURLSessionDataTask * task;
    
    @synchronized ([RNFetchBlobNetwork class]) {
        task = [requestsTable objectForKey:taskId].task;
    }
    
    if(task && task.state == NSURLSessionTaskStateRunning) {
        [task cancel];
    }
}

@end
