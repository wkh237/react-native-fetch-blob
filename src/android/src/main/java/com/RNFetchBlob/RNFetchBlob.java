package com.RNFetchBlob;

import android.net.Uri;
import android.text.style.AlignmentSpan;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.loopj.android.http.AsyncHttpClient;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;
import com.loopj.android.http.BinaryHttpResponseHandler;
import com.loopj.android.http.RequestParams;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

import cz.msebera.android.httpclient.Header;
import cz.msebera.android.httpclient.entity.BufferedHttpEntity;
import cz.msebera.android.httpclient.entity.ByteArrayEntity;
import cz.msebera.android.httpclient.entity.ContentType;
import cz.msebera.android.httpclient.entity.StringEntity;
import cz.msebera.android.httpclient.message.BasicHeader;
import cz.msebera.android.httpclient.protocol.HTTP;

public class RNFetchBlob extends ReactContextBaseJavaModule {


    public RNFetchBlob(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "RNFetchBlob";
    }

    @ReactMethod
    public void fetchBlob(String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {

        try {
            Uri uri = Uri.parse(url);
            AsyncHttpClient req = new AsyncHttpClient();

            // set params
            RequestParams params = new RequestParams();
            ByteArrayEntity entity = null;

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
                byte [] blob = Base64.decode(body, 0);
                entity = new ByteArrayEntity(blob);
                entity.setContentType(headers.getString("Content-Type"));
            }

            // create handler
            AsyncHttpResponseHandler handler = new RNFetchBlobHandler(this.getReactApplicationContext(), taskId, callback);

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
    public void fetchBlobForm(String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {

        try {
            Uri uri = Uri.parse(url);
            AsyncHttpClient req = new AsyncHttpClient();

            // set params
            RequestParams params = new RequestParams();
            ByteArrayEntity entity = null;

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
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream( );
                String boundary = "RNFetchBlob".concat(ts);
                for(int i =0; i<body.size() ; i++) {
                    ReadableMap map = body.getMap(i);
                    String name = map.getString("name");
                    // file field
                    if(map.hasKey("filename")) {
                        String filename = map.getString("filename");
                        byte [] file = Base64.decode(map.getString("data"), 0);
                        outputStream.write(String.format("--%s\r\n", boundary).getBytes("UTF-8"));
                        outputStream.write(("Content-Disposition: form-data; name=\""+name+"\"; filename=\""+filename+"\"\r\n").getBytes("UTF-8"));
                        outputStream.write(String.format("Content-Type: application/octet-stream\r\n\r\n").getBytes());
                        outputStream.write(file);
                        outputStream.write("\r\n".getBytes());
                    }
                    // data field
                    else {
                        String data = map.getString("data");
                        outputStream.write(String.format("--%s\r\n", boundary).getBytes("UTF-8"));
                        outputStream.write(String.format("Content-Disposition: form-data; name=\""+name+"\"; \r\n").getBytes("UTF-8"));
                        outputStream.write(String.format("Content-Type: text/plain\r\n\r\n").getBytes());
                        outputStream.write((data+"\r\n").getBytes());
                    }
                }
                outputStream.write(String.format("--%s--\r\n", boundary).getBytes());
                byte bodyBytes[] = outputStream.toByteArray( );
                entity = new ByteArrayEntity(bodyBytes);
                entity.setContentType(headers.getString("Content-Type") + "; charset=utf8; boundary=" + boundary);
                req.addHeader("Content-Type", headers.getString("Content-Type") + "; charset=utf8; boundary=" + boundary);
            }

            // create handler
            AsyncHttpResponseHandler handler = new RNFetchBlobHandler(this.getReactApplicationContext(), taskId, callback);

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

