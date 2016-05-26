package com.RNFetchBlob;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.FileAsyncHttpResponseHandler;

import java.io.File;

import cz.msebera.android.httpclient.Header;

/**
 * Created by wkh237 on 2016/5/26.
 */
public class RNFetchBlobFileHandler extends FileAsyncHttpResponseHandler {

    Callback onResponse;
    ReactContext mCtx;
    String mTaskId;

    RNFetchBlobFileHandler(ReactApplicationContext ctx, String taskId, Callback onResponse) {
        // save temp file to application storage
        super(new File(RNFetchBlobFS.getTmpPath(ctx, taskId)), false, false);
        this.onResponse = onResponse;
        this.mTaskId = taskId;
        this.mCtx = ctx;
    }

    @Override
    public void onFailure(int statusCode, Header[] headers, Throwable throwable, File file) {
        this.onResponse.invoke(statusCode, throwable.getMessage()+ ", "+ throwable.getCause());
    }

    @Override
    public void onProgress(long bytesWritten, long totalSize) {
        super.onProgress(bytesWritten, totalSize);

        // on progress, emit RNFetchBlobProgress event with ticketId, bytesWritten, and totalSize
        WritableMap args = Arguments.createMap();
        args.putString("taskId", this.mTaskId);
        args.putString("written", String.valueOf(bytesWritten));
        args.putString("total", String.valueOf(totalSize));

        // emit event to js context
        this.mCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("RNFetchBlobProgress", args);
    }

    @Override
    public void onSuccess(int statusCode, Header[] headers, File file) {
        this.onResponse.invoke(null, file.getAbsolutePath());
    }
}
