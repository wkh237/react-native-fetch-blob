//
//  RNFetchBlobConst.m
//  RNFetchBlob
//
//  Created by Ben Hsieh on 2016/6/6.
//  Copyright © 2016 wkh237. All rights reserved.
//
#import "RNFetchBlobConst.h"

extern NSString *const FILE_PREFIX = @"RNFetchBlob-file://";
extern NSString *const ASSET_PREFIX = @"bundle-assets://";
extern NSString *const AL_PREFIX = @"assets-library://";



// fetch configs
extern NSString *const CONFIG_USE_TEMP = @"fileCache";
extern NSString *const CONFIG_FILE_PATH = @"path";
extern NSString *const CONFIG_FILE_EXT = @"appendExt";
extern NSString *const CONFIG_TRUSTY = @"trusty";
extern NSString *const CONFIG_INDICATOR = @"indicator";
extern NSString *const CONFIG_KEY = @"key";
extern NSString *const CONFIG_EXTRA_BLOB_CTYPE = @"binaryContentTypes";

extern NSString *const EVENT_STATE_CHANGE = @"RNFetchBlobState";
extern NSString *const EVENT_PROGRESS = @"RNFetchBlobProgress";
extern NSString *const EVENT_PROGRESS_UPLOAD = @"RNFetchBlobProgress-upload";

extern NSString *const MSG_EVENT = @"RNFetchBlobMessage";
extern NSString *const MSG_EVENT_LOG = @"log";
extern NSString *const MSG_EVENT_WARN = @"warn";
extern NSString *const MSG_EVENT_ERROR = @"error";
extern NSString *const FS_EVENT_DATA = @"data";
extern NSString *const FS_EVENT_END = @"end";
extern NSString *const FS_EVENT_WARN = @"warn";
extern NSString *const FS_EVENT_ERROR = @"error";

extern NSString *const KEY_REPORT_PROGRESS = @"reportProgress";
extern NSString *const KEY_REPORT_UPLOAD_PROGRESS = @"reportUploadProgress";

// response type
extern NSString *const RESP_TYPE_BASE64 = @"base64";
extern NSString *const RESP_TYPE_UTF8 = @"utf8";
extern NSString *const RESP_TYPE_PATH = @"path";