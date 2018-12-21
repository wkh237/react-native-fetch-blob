package com.RNFetchBlob.Response;

import android.support.annotation.NonNull;
// import android.util.Log;

import com.RNFetchBlob.RNFetchBlobConst;
import com.RNFetchBlob.RNFetchBlobProgressConfig;
import com.RNFetchBlob.RNFetchBlobReq;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Objects;

import okhttp3.MediaType;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;
import okio.Okio;
import okio.Source;
import okio.Timeout;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobFileResp extends ResponseBody {

    private final String mTaskId;
    private final ResponseBody originalBody;
    private String mPath;
    private long bytesDownloaded = 0;
    private final ReactApplicationContext rctContext;
    private FileOutputStream ofStream;

    public RNFetchBlobFileResp(ReactApplicationContext ctx, String taskId, ResponseBody body, String path, boolean overwrite) throws IOException {
        super();
        this.rctContext = ctx;
        this.mTaskId = taskId;
        this.originalBody = body;
        this.mPath = Objects.requireNonNull(path);
        boolean appendToExistingFile = !overwrite;
        path = path.replace("?append=true", "");
        mPath = path;
        File f = new File(path);

        File parent = f.getParentFile();
        if(parent != null && !parent.exists() && !parent.mkdirs()){
            throw new IllegalStateException("Couldn't create dir: " + parent);
        }

        if(!f.exists()) {
            if(!f.createNewFile()) {
                throw new IllegalStateException("Couldn't create file: " + path);
            }
        }

        ofStream = new FileOutputStream(new File(path), appendToExistingFile);
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
        ProgressReportingSource countable = new ProgressReportingSource();
        return Okio.buffer(countable);
    }

    private class ProgressReportingSource implements Source {
        @Override
        public long read(@NonNull Buffer sink, long byteCount) {
            try {
                byte[] bytes = new byte[(int) byteCount];
                long read = originalBody.byteStream().read(bytes, 0, (int) byteCount);
                bytesDownloaded += read > 0 ? read : 0;
                if (read > 0) {
                    ofStream.write(bytes, 0, (int) read);
                }
                RNFetchBlobProgressConfig reportConfig = RNFetchBlobReq.getReportProgress(mTaskId);
                if (reportConfig != null && contentLength() != 0 &&reportConfig.shouldReport(bytesDownloaded / contentLength())) {
                    WritableMap args = Arguments.createMap();
                    args.putString("taskId", mTaskId);
                    args.putString("written", String.valueOf(bytesDownloaded));
                    args.putString("total", String.valueOf(contentLength()));
                    rctContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit(RNFetchBlobConst.EVENT_PROGRESS, args);
                }
                return read;
            } catch(Exception ex) {
                return -1;
            }
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
