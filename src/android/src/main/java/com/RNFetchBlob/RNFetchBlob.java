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

    @ReactMethod
    public void getEnvironmentDirs(Callback callback) {

        WritableArray results = Arguments.createArray();
        ReactApplicationContext ctx = this.getReactApplicationContext();
        callback.invoke(
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)),
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)),
                String.valueOf(ctx.getFilesDir()),
                String.valueOf(ctx.getCacheDir()),
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)),
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM))
        );
    }

    @ReactMethod
    public void flush(String taskId) {
        try {
            new File(RNFetchBlobFS.getTmpPath(this.getReactApplicationContext(), taskId)).delete();
        } catch(Exception err) {
            WritableMap args = Arguments.createMap();
            args.putString("event", "error");
            args.putString("detail", err.getMessage());
            this.getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("RNFetchBlobMessage", args);
        }
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
            Uri uri = Uri.parse(url);
            AsyncHttpClient req = new AsyncHttpClient();

            // set params
            RequestParams params = new RequestParams();
            AbstractHttpEntity entity = null;

            // set params
            for (String paramName : uri.getQueryParameterNames()) {
                params.put(paramName, uri.getQueryParameter(paramName));
            }

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
            if(config.fileCache || config.path != null)
                handler = new RNFetchBlobFileHandler(this.getReactApplicationContext(), taskId, config, callback);
            else
                handler = new RNFetchBlobBinaryHandler(this.getReactApplicationContext(), taskId, callback);

            // send request
            switch(method.toLowerCase()) {
                case "get" :
                    req.get(url, params, handler);
                    break;
                case "post" :
                    req.post(this.getReactApplicationContext(), url, entity, "octet-stream", handler);
                    break;
                case "put" :
                    req.put(this.getReactApplicationContext(), url, entity, "octet-stream",handler);
                    break;
                case "delete" :
                    req.delete(url, params, handler);
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
            Uri uri = Uri.parse(url);
            AsyncHttpClient req = new AsyncHttpClient();

            // set params
            RequestParams params = new RequestParams();
//            ByteArrayEntity entity = null;
            HttpEntity entity = null;
            // set params
            for (String paramName : uri.getQueryParameterNames()) {
                params.put(paramName, uri.getQueryParameter(paramName));
            }

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
            if(config.fileCache || config.path != null)
                handler = new RNFetchBlobFileHandler(this.getReactApplicationContext(), taskId, config, callback);
            else
                handler = new RNFetchBlobBinaryHandler(this.getReactApplicationContext(), taskId, callback);

            // send request
            switch(method.toLowerCase()) {
                case "get" :
                    req.get(url, params, handler);
                    break;
                case "post" :
                    req.post(this.getReactApplicationContext(), url, entity, "multipart/form-data; charset=utf8", handler);
                    break;
                case "put" :
                    req.put(this.getReactApplicationContext(), url, entity, "multipart/form-data",handler);
                    break;
                case "delete" :
                    req.delete(url, params, handler);
                    break;
            }
        } catch(Exception error) {
            callback.invoke( "RNFetchBlob serialize request data failed: " + error.getMessage() + error.getCause());
        }

    }

}

