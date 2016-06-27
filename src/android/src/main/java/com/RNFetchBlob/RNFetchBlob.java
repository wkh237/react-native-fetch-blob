package com.RNFetchBlob;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import java.util.Map;

public class RNFetchBlob extends ReactContextBaseJavaModule {

    String filePathPrefix = "RNFetchBlob-file://";

    public RNFetchBlob(ReactApplicationContext reactContext) {
        super(reactContext);
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
    public void createFile(String path, String content, String encode, Callback callback) {
        RNFetchBlobFS.createFile(path, content, encode, callback);
    }

    @ReactMethod
    public void createFileASCII(String path, ReadableArray dataArray, Callback callback) {
        RNFetchBlobFS.createFileASCII(path, dataArray, callback);
    }

    @ReactMethod
    public void writeArrayChunk(String streamId, ReadableArray dataArray, Callback callback) {
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
    public void cp(String path, String dest, Callback callback) {
        RNFetchBlobFS.cp(path, dest, callback);
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
    public void readFile(String path, String encoding, Promise promise) {
        RNFetchBlobFS.readFile(path, encoding, promise);
    }

    @ReactMethod
    public void writeFileArray(String path, ReadableArray data, boolean append, Promise promise) {
        RNFetchBlobFS.writeFile(path, data, append, promise);
    }

    @ReactMethod
    public void writeFile(String path, String encoding, String data, boolean append, Promise promise) {
        RNFetchBlobFS.writeFile(path, encoding, data, append, promise);
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
    public void scanFile(ReadableArray pairs, Callback callback) {
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
        new RNFetchBlobFS(this.getReactApplicationContext()).scanFile(p, m, callback);
    }

    @ReactMethod
    /**
     * @param path Stream file path
     * @param encoding Stream encoding, should be one of `base64`, `ascii`, and `utf8`
     * @param bufferSize Stream buffer size, default to 1024 or 1026(base64).
     */
    public void readStream(String path, String encoding, int bufferSize) {
        RNFetchBlobFS fs = new RNFetchBlobFS(this.getReactApplicationContext());
        fs.readStream(path, encoding, bufferSize);
    }

    @ReactMethod
    public void fetchBlob(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {
        new RNFetchBlobReq(this.getReactApplicationContext(), options, taskId, method, url, headers, body, callback).run();
    }

    @ReactMethod
    public void fetchBlobForm(ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {
        new RNFetchBlobReq(this.getReactApplicationContext(), options, taskId, method, url, headers, body, callback).run();
    }

}

