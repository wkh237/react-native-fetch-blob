package com.RNFetchBlob.Response;

import com.RNFetchBlob.RNFetchBlob;
import com.RNFetchBlob.RNFetchBlobConst;
import com.RNFetchBlob.RNFetchBlobReq;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;
import okio.ForwardingSource;
import okio.Okio;
import okio.Source;
import okio.Timeout;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobDefaultResp extends ResponseBody {

    String mTaskId;
    ReactApplicationContext rctContext;
    ResponseBody originalBody;

    public RNFetchBlobDefaultResp(ReactApplicationContext ctx, String taskId, ResponseBody body) {
        this.rctContext = ctx;
        this.mTaskId = taskId;
        this.originalBody = body;
    }

    @Override
    public MediaType contentType() {
        return originalBody.contentType();
    }

    @Override
    public long contentLength() {
        return originalBody.contentLength();
    }

    @Override
    public BufferedSource source() {
        return Okio.buffer(new ProgressReportingSource(originalBody.source()));
    }

    private class ProgressReportingSource implements Source {

        BufferedSource mOriginalSource;
        long bytesRead = 0;

        ProgressReportingSource(BufferedSource originalSource) {
            mOriginalSource = originalSource;
        }

        @Override
        public long read(Buffer sink, long byteCount) throws IOException {

            long read =  mOriginalSource.read(sink, byteCount);
            bytesRead += read > 0 ? read : 0;
            if(RNFetchBlobReq.isReportProgress(mTaskId)) {
                WritableMap args = Arguments.createMap();
                args.putString("taskId", mTaskId);
                args.putString("written", String.valueOf(bytesRead));
                args.putString("total", String.valueOf(contentLength()));
                rctContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(RNFetchBlobConst.EVENT_PROGRESS, args);
            }
            return read;
        }

        @Override
        public Timeout timeout() {
            return null;
        }

        @Override
        public void close() throws IOException {

        }
    }

}
