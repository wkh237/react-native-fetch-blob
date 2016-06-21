package com.RNFetchBlob;

import com.facebook.react.bridge.ReadableMap;

import java.util.HashMap;

/**
 * Created by wkh237 on 2016/5/29.
 */
public class RNFetchBlobConfig {

    public Boolean fileCache;
    public String path;
    public String appendExt;
    public ReadableMap addAndroidDownloads;
    public Boolean trusty;

    RNFetchBlobConfig(ReadableMap options) {
        if(options == null)
            return;
        this.fileCache = options.hasKey("fileCache") ? options.getBoolean("fileCache") : false;
        this.path = options.hasKey("path") ? options.getString("path") : null;
        this.appendExt = options.hasKey("appendExt") ? options.getString("appendExt") : "";
        this.trusty = options.hasKey("trusty") ? options.getBoolean("trusty") : false;
        if(options.hasKey("addAndroidDownloads")) {
            this.addAndroidDownloads = options.getMap("addAndroidDownloads");
        }
    }

}
