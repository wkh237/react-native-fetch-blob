package com.RNFetchBlob.Response;

import com.RNFetchBlob.RNFetchBlob;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;
import okio.Okio;
import okio.Source;
import okio.Timeout;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobFileResp extends RNFetchBlobDefaultResp {

    String mPath;
    ReactApplicationContext rctContext;
    FileOutputStream ofStream;

    public RNFetchBlobFileResp(ReactApplicationContext ctx, String taskId, ResponseBody body, String path) throws IOException {
        super(ctx, taskId, body);
        this.rctContext = ctx;
        this.mTaskId = taskId;
        this.originalBody = body;
        this.mPath = path;
        File f = new File(path);
        if(f.exists() == false)
            f.createNewFile();
        ofStream = new FileOutputStream(new File(path));
    }


    @Override
    public BufferedSource source() {
        ProgressReportingSource source = new ProgressReportingSource(originalBody.source());
        return Okio.buffer(source);
    }

    private class ProgressReportingSource implements Source {

        BufferedSource mOriginalSource;
        long bytesRead = 0;

        ProgressReportingSource(BufferedSource originalSource) {
            mOriginalSource = originalSource;
        }

        @Override
        public long read(Buffer sink, long byteCount) throws IOException {
            bytesRead += byteCount;
            byte [] bytes = new byte[10240];
            long read = mOriginalSource.read(bytes);
            ofStream.write(bytes);
            WritableMap args = Arguments.createMap();
            args.putString("taskId", mTaskId);
            args.putString("written", String.valueOf(bytesRead));
            args.putString("total", String.valueOf(contentLength()));
            rctContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("RNFetchBlobProgress", args);
            return read;
        }

        @Override
        public Timeout timeout() {
            return null;
        }

        @Override
        public void close() throws IOException {
            ofStream.close();

        }
    }

}
