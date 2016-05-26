package com.RNFetchBlob;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;
import com.loopj.android.http.FileAsyncHttpResponseHandler;

import java.io.File;

import cz.msebera.android.httpclient.Header;

public class RNFetchBlobBinaryHandler extends AsyncHttpResponseHandler {

    Callback onResponse;
    ReactContext mCtx;
    String mTaskId;

    RNFetchBlobBinaryHandler(ReactContext ctx, String taskId, Callback onResponse) {

        this.onResponse = onResponse;
        this.mTaskId = taskId;
        this.mCtx = ctx;
    }

    @Override
    public void onSuccess(int statusCode, Header[] headers, byte[] binaryData) {
        String value = Base64.encodeToString(binaryData, Base64.NO_WRAP);
        this.onResponse.invoke(null, value);
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
    public void onFailure(final int statusCode, final Header[] headers, byte[] binaryData, final Throwable error) {
        this.onResponse.invoke(statusCode, error.getMessage()+ ", "+ error.getCause());
    }

}
