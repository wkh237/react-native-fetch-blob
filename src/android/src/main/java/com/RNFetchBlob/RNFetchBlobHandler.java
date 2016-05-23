package com.RNFetchBlob;

import com.facebook.react.bridge.Callback;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;

import cz.msebera.android.httpclient.Header;

public class RNFetchBlobHandler extends AsyncHttpResponseHandler {

    Callback onResponse;

    RNFetchBlobHandler(Callback onResponse) {
        this.onResponse = onResponse;
    }

    @Override
    public void onSuccess(int statusCode, Header[] headers, byte[] binaryData) {
        String value = Base64.encodeToString(binaryData, Base64.NO_WRAP);
        this.onResponse.invoke(null, value);
    }

    @Override
    public void onProgress(long bytesWritten, long totalSize) {
        super.onProgress(bytesWritten, totalSize);
    }

    @Override
    public void onFailure(final int statusCode, final Header[] headers, byte[] binaryData, final Throwable error) {
        this.onResponse.invoke(statusCode, error.getMessage()+ ", "+ error.getCause());
    }
}
