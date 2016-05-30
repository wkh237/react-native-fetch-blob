package com.RNFetchBlob;

import com.facebook.react.bridge.ReadableMap;

/**
 * Created by wkh237 on 2016/5/29.
 */
public class RNFetchBlobConfig {

    public Boolean fileCache;
    public String path;
    public String appendExt;

    RNFetchBlobConfig(ReadableMap options) {
        if(options == null)
            return;
        this.fileCache = options.hasKey("fileCache") ? options.getBoolean("fileCache") : false;
            this.path = options.hasKey("path") ? options.getString("path") : null;
        this.appendExt = options.hasKey("appendExt") ? options.getString("appendExt") : "";

    }

}
