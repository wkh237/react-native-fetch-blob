package com.RNFetchBlob;

import android.net.Uri;
import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.AsyncHttpClient;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;
import com.loopj.android.http.RequestParams;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.HashMap;
import java.util.Map;

import cz.msebera.android.httpclient.HttpEntity;
import cz.msebera.android.httpclient.entity.AbstractHttpEntity;
import cz.msebera.android.httpclient.entity.ByteArrayEntity;
import cz.msebera.android.httpclient.entity.ContentType;
import cz.msebera.android.httpclient.entity.FileEntity;
import cz.msebera.android.httpclient.entity.mime.MultipartEntityBuilder;
import cz.msebera.android.httpclient.entity.mime.content.ContentBody;

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

        RNFetchBlobConfig config = new RNFetchBlobConfig(options);

        try {
            AsyncHttpClient req = new AsyncHttpClient();

            AbstractHttpEntity entity = null;

            // set headers
            ReadableMapKeySetIterator it = headers.keySetIterator();
            while (it.hasNextKey()) {
                String key = it.nextKey();
                req.addHeader(key, headers.getString(key));
            }

            // set body for POST and PUT
            if(body != null && method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put")) {

                byte [] blob;
                // upload from storage
                if(body.startsWith(filePathPrefix)) {
                    String filePath = body.substring(filePathPrefix.length());
                    entity = new FileEntity(new File(filePath));
                }
                else {
                    blob = Base64.decode(body, 0);
                    entity = new ByteArrayEntity(blob);
                }
                entity.setContentType(headers.getString("Content-Type"));
            }

            AsyncHttpResponseHandler handler;

            // create handler
            if(config.fileCache || config.path != null) {
                handler = new RNFetchBlobFileHandler(this.getReactApplicationContext(), taskId, config, callback);
                // if path format invalid, throw error
                if (!((RNFetchBlobFileHandler)handler).isValid) {
                    callback.invoke("RNFetchBlob fetch error, configuration path `"+ config.path  +"` is not a valid path.");
                    return;
                }
            }
            else
                handler = new RNFetchBlobBinaryHandler(this.getReactApplicationContext(), taskId, callback);

            // send request
            switch(method.toLowerCase()) {
                case "get" :
                    req.get(url, handler);
                    break;
                case "post" :
                    req.post(this.getReactApplicationContext(), url, entity, "octet-stream", handler);
                    break;
                case "put" :
                    req.put(this.getReactApplicationContext(), url, entity, "octet-stream",handler);
                    break;
                case "delete" :
                    req.delete(url, handler);
                    break;
            }
        } catch(Exception error) {
            callback.invoke( "RNFetchBlob serialize request data failed: " + error.getMessage() + error.getCause());
        }

    }

    @ReactMethod
    public void fetchBlobForm(ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {

        RNFetchBlobConfig config = new RNFetchBlobConfig(options);
        try {

            AsyncHttpClient req = new AsyncHttpClient();

            HttpEntity entity = null;

            // set headers
            if(headers != null) {
                ReadableMapKeySetIterator it = headers.keySetIterator();
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    req.addHeader(key, headers.getString(key));
                }
            }

            // set body for POST and PUT
            if(body != null && method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put")) {
                Long tsLong = System.currentTimeMillis()/1000;
                String ts = tsLong.toString();
                String boundary = "RNFetchBlob".concat(ts);
                MultipartEntityBuilder form = MultipartEntityBuilder.create();
                form.setBoundary(boundary);
                for( int i = 0; i< body.size(); i++) {
                    ReadableMap map = body.getMap(i);
                    String name = map.getString("name");
                    if(!map.hasKey("data"))
                        continue;
                    String data = map.getString("data");
                    // file field
                    if(map.hasKey("filename")) {
                        String filename = map.getString("filename");
                        // upload from storage
                        if(data.startsWith(filePathPrefix)) {
                            File file = new File(data.substring(filePathPrefix.length()));
                            form.addBinaryBody(name, file, ContentType.APPLICATION_OCTET_STREAM, filename);
                        }
                        // base64 embedded file content
                        else {
                            form.addBinaryBody(name, Base64.decode(data, 0), ContentType.APPLICATION_OCTET_STREAM, filename);
                        }
                    }
                    // data field
                    else {
                        form.addTextBody(name, map.getString("data"));
                    }
                }
                entity = form.build();
                req.addHeader("Content-Type", headers.getString("Content-Type") + "; charset=utf8; boundary=" + boundary);
            }

            AsyncHttpResponseHandler handler;

            // create handler
            if(config.fileCache || config.path != null) {
                handler = new RNFetchBlobFileHandler(this.getReactApplicationContext(), taskId, config, callback);
                // if path format invalid, throw error
                if (!((RNFetchBlobFileHandler)handler).isValid) {
                    callback.invoke("RNFetchBlob fetch error, configuration path `"+ config.path  +"` is not a valid path.");
                    return;
                }
            }
            else
                handler = new RNFetchBlobBinaryHandler(this.getReactApplicationContext(), taskId, callback);

            // send request
            switch(method.toLowerCase()) {
                case "get" :
                    req.get(url, handler);
                    break;
                case "post" :
                    req.post(this.getReactApplicationContext(), url, entity, "multipart/form-data; charset=utf8", handler);
                    break;
                case "put" :
                    req.put(this.getReactApplicationContext(), url, entity, "multipart/form-data",handler);
                    break;
                case "delete" :
                    req.delete(url, handler);
                    break;
            }
        } catch(Exception error) {
            callback.invoke( "RNFetchBlob serialize request data failed: " + error.getMessage() + error.getCause());
        }

    }

}

