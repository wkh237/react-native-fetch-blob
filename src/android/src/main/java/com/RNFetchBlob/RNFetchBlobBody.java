package com.RNFetchBlob;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.IOException;
import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.Buffer;
import okio.BufferedSink;
import okio.ForwardingSink;
import okio.Okio;
import okio.Sink;

/**
 * Created by wkh237on 2016/7/11.
 */
public class RNFetchBlobBody extends RequestBody{

    InputStream requestStream;
    long contentLength;
    RequestBody originalBody;
    String mTaskId;
    RNFetchBlobReq.RequestType requestType;

    public RNFetchBlobBody(String taskId, RNFetchBlobReq.RequestType type, RequestBody body, InputStream stream, long size) {
        this.mTaskId = taskId;
        originalBody = body;
        requestStream = stream;
        contentLength = size;
        requestType = type;
    }

    @Override
    public MediaType contentType() {
        return originalBody.contentType();
    }

    @Override
    public void writeTo(BufferedSink sink) throws IOException {

        ProgressReportingSource source = new ProgressReportingSource(sink, mTaskId, contentLength());
        BufferedSink buffer = Okio.buffer(source);
        switch (requestType) {
            case Form:
                originalBody.writeTo(buffer);
                break;
            case SingleFile:
                byte [] chunk = new byte[10240];
                int cursor = requestStream.read(chunk, 0, 10240);
                while(cursor > 0) {
                    cursor = requestStream.read(chunk, 0, 10240);
                    buffer.write(chunk);
                }
                requestStream.close();
                break;
            case Others:
                originalBody.writeTo(buffer);
                break;
        }
        buffer.flush();
    }

    private final class ProgressReportingSource extends ForwardingSink {

        private long bytesWritten = 0;
        private String mTaskId;
        private long mContentLength ;

        public ProgressReportingSource (Sink delegate, String taskId, long contentLength) {
            super(delegate);
            this.mTaskId = taskId;
            this.mContentLength = contentLength;
        }

        @Override
        public void write(Buffer source, long byteCount) throws IOException {
            super.write(source, byteCount);
            // on progress, emit RNFetchBlobProgress upload progress event with ticketId,
            // bytesWritten, and totalSize
            bytesWritten += byteCount;
            WritableMap args = Arguments.createMap();
            args.putString("taskId", mTaskId);
            args.putString("written", String.valueOf(bytesWritten));
            args.putString("total", String.valueOf(mContentLength ));

            // emit event to js context
            RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(RNFetchBlobConst.EVENT_UPLOAD_PROGRESS, args);
        }
    }
}
