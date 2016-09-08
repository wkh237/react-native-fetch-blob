package com.RNFetchBlob;

import android.content.Intent;
import android.net.Uri;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class RNFetchBlob extends ReactContextBaseJavaModule {

    static ReactApplicationContext RCTContext;
    static LinkedBlockingQueue<Runnable> taskQueue = new LinkedBlockingQueue<>();
    static ThreadPoolExecutor threadPool = new ThreadPoolExecutor(5, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);
    static LinkedBlockingQueue<Runnable> fsTaskQueue = new LinkedBlockingQueue<>();
    static ThreadPoolExecutor fsThreadPool = new ThreadPoolExecutor(2, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);

    public RNFetchBlob(ReactApplicationContext reactContext) {

        super(reactContext);
        RCTContext = reactContext;
    }

    @Override
    public String getName() {
        return "RNFetchBlob";
    }

    @Override
    public Map<String, Object> getConstants() {
        return RNFetchBlobFS.getSystemfolders(this.getReactApplicationContext());
    }

    @ReactMethod
    public void createFile(final String path, final String content, final String encode, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFile(path, content, encode, callback);
            }
        });

    }

    @ReactMethod
    public void actionViewIntent(String path, String mime, Promise promise) {
        try {
            Intent intent= new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(Uri.parse("file://" + path), mime);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            this.getReactApplicationContext().startActivity(intent);
            promise.resolve(null);
        } catch(Exception ex) {
            promise.reject(ex.getLocalizedMessage());
        }
    }

    @ReactMethod
    public void createFileASCII(final String path, final ReadableArray dataArray, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFileASCII(path, dataArray, callback);
            }
        });

    }

    @ReactMethod
    public void writeArrayChunk(final String streamId, final ReadableArray dataArray, final Callback callback) {
        RNFetchBlobFS.writeArrayChunk(streamId, dataArray, callback);
    }

    @ReactMethod
    public void unlink(String path, Callback callback) {
        RNFetchBlobFS.unlink(path, callback);
    }

    @ReactMethod
    public void mkdir(String path, Callback callback) {
        RNFetchBlobFS.mkdir(path, callback);
    }

    @ReactMethod
    public void exists(String path, Callback callback) {
        RNFetchBlobFS.exists(path, callback);
    }

    @ReactMethod
    public void cp(final String path, final String dest, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.cp(path, dest, callback);
            }
        });

    }

    @ReactMethod
    public void mv(String path, String dest, Callback callback) {
        RNFetchBlobFS.mv(path, dest, callback);
    }

    @ReactMethod
    public void ls(String path, Callback callback) {
        RNFetchBlobFS.ls(path, callback);
    }

    @ReactMethod
    public void writeStream(String path, String encode, boolean append, Callback callback) {
        new RNFetchBlobFS(this.getReactApplicationContext()).writeStream(path, encode, append, callback);
    }

    @ReactMethod
    public void writeChunk(String streamId, String data, Callback callback) {
        RNFetchBlobFS.writeChunk(streamId, data, callback);
    }

    @ReactMethod
    public void closeStream(String streamId, Callback callback) {
        RNFetchBlobFS.closeStream(streamId, callback);
    }

    @ReactMethod
    public void removeSession(ReadableArray paths, Callback callback) {
        RNFetchBlobFS.removeSession(paths, callback);
    }

    @ReactMethod
    public void readFile(final String path, final String encoding, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.readFile(path, encoding, promise);
            }
        });
    }

    @ReactMethod
    public void writeFileArray(final String path, final ReadableArray data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, data, append, promise);
            }
        });
    }

    @ReactMethod
    public void writeFile(final String path, final String encoding, final String data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, encoding, data, append, promise);
            }
        });

    }

    @ReactMethod
    public void lstat(String path, Callback callback) {
        RNFetchBlobFS.lstat(path, callback);
    }

    @ReactMethod
    public void stat(String path, Callback callback) {
        RNFetchBlobFS.stat(path, callback);
    }

    @ReactMethod
    public void scanFile(final ReadableArray pairs, final Callback callback) {
        final ReactApplicationContext ctx = this.getReactApplicationContext();
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                int size = pairs.size();
                String [] p = new String[size];
                String [] m = new String[size];
                for(int i=0;i<size;i++) {
                    ReadableMap pair = pairs.getMap(i);
                    if(pair.hasKey("path")) {
                        p[i] = pair.getString("path");
                        if(pair.hasKey("mime"))
                            m[i] = pair.getString("mime");
                        else
                            m[i] = null;
                    }
                }
                new RNFetchBlobFS(ctx).scanFile(p, m, callback);
            }
        });

    }

    @ReactMethod
    /**
     * @param path Stream file path
     * @param encoding Stream encoding, should be one of `base64`, `ascii`, and `utf8`
     * @param bufferSize Stream buffer size, default to 4096 or 4095(base64).
     */
    public void readStream(final String path, final String encoding, final int bufferSize, final int tick, final String streamId) {
        final ReactApplicationContext ctx = this.getReactApplicationContext();
        fsThreadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS fs = new RNFetchBlobFS(ctx);
                fs.readStream(path, encoding, bufferSize, tick, streamId);
            }
        });
    }

    @ReactMethod
    public void cancelRequest(String taskId, Callback callback) {
        try {
            RNFetchBlobReq.cancelTask(taskId);
            callback.invoke(null, taskId);
        } catch (Exception ex) {
            callback.invoke(ex.getLocalizedMessage(), null);
        }
    }

    @ReactMethod
    public void slice(String src, String dest, int start, int end, Promise promise) {
        RNFetchBlobFS.slice(src, dest, start, end, "", promise);
    }

    @ReactMethod
    public void enableProgressReport(String taskId) {
        RNFetchBlobReq.progressReport.put(taskId, true);
    }

    @ReactMethod
    public void enableUploadProgressReport(String taskId) {
        RNFetchBlobReq.uploadProgressReport.put(taskId, true);
    }

    @ReactMethod
    public void fetchBlob(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, body, null, callback).run();
    }

    @ReactMethod
    public void fetchBlobForm(ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, null, body, callback).run();
    }

}
