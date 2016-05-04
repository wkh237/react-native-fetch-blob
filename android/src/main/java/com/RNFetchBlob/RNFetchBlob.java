package com.RNFetchBlob;

import android.net.Uri;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.loopj.android.http.AsyncHttpClient;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;
import com.loopj.android.http.BinaryHttpResponseHandler;
import com.loopj.android.http.RequestParams;

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
    public void fetchBlob(String method, String url, ReadableMap headers, String body, final Callback callback) {

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
            AsyncHttpResponseHandler handler = new AsyncHttpResponseHandler() {
                @Override
                public void onSuccess(int statusCode, Header[] headers, byte[] binaryData) {
                    String value = Base64.encodeToString(binaryData, Base64.NO_WRAP);
                    callback.invoke(null, value);
                }

                @Override
                public void onFailure(final int statusCode, final Header[] headers, byte[] binaryData, final Throwable error) {
                    callback.invoke(statusCode, error.getMessage()+ ", "+ error.getCause());
                }
            };

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

}
