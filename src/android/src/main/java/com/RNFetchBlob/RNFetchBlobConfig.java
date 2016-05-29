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

        this.fileCache = options.getBoolean("fileCache");
        this.path = options.getString("path");
        this.appendExt = options.getString("appendExt");

    }

}
