package com.RNFetchBlob;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.loopj.android.http.AsyncHttpClient;
import com.loopj.android.http.AsyncHttpResponseHandler;
import com.loopj.android.http.Base64;
import com.loopj.android.http.MySSLSocketFactory;

import java.io.File;
import java.security.KeyStore;
import java.security.MessageDigest;

import cz.msebera.android.httpclient.HttpEntity;
import cz.msebera.android.httpclient.entity.ByteArrayEntity;
import cz.msebera.android.httpclient.entity.ContentType;
import cz.msebera.android.httpclient.entity.FileEntity;
import cz.msebera.android.httpclient.entity.mime.MultipartEntityBuilder;

/**
 * Created by wkh237 on 2016/6/21.
 */
public class RNFetchBlobReq extends BroadcastReceiver implements Runnable {

    final String filePathPrefix = "RNFetchBlob-file://";
    ReactApplicationContext ctx;
    RNFetchBlobConfig options;
    String taskId;
    String method;
    String url;
    String boundary;
    ReadableMap headers;
    Callback callback;
    HttpEntity entity;
    long downloadManagerId;
    AsyncHttpClient req;
    String type;

    public RNFetchBlobReq(ReactApplicationContext ctx, ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {
        this.ctx = ctx;
        this.method = method;
        this.options= new RNFetchBlobConfig(options);
        this.taskId = taskId;
        this.url = url;
        this.headers = headers;
        this.callback = callback;
        this.req = new AsyncHttpClient();
        if(body != null) {
            type = "octet";
            buildEntity(body);
        }
    }

    public RNFetchBlobReq(ReactApplicationContext ctx, ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {
        this.ctx = ctx;
        this.method = method;
        this.options= new RNFetchBlobConfig(options);
        this.taskId = taskId;
        this.url = url;
        this.headers = headers;
        this.callback = callback;
        this.req = new AsyncHttpClient();
        if(body != null) {
            type = "form";
            buildFormEntity(body);
        }
    }

    public static String getMD5(String input) {
        MessageDigest md = MessageDigest.getInstance("MD5");
        md.update(input.getBytes());
        byte[] digest = md.digest();
        
        StringBuffer sb = new StringBuffer();
        
        for (byte b : digest) {
            sb.append(String.format("%02x", b & 0xff))
        }

        return sb.toString();
    }

    @Override
    public void run() {

        // use download manager instead of default HTTP implementation
        if(options.addAndroidDownloads != null && options.addAndroidDownloads.hasKey("useDownloadManager")) {

            if(options.addAndroidDownloads.getBoolean("useDownloadManager")) {
                Uri uri = Uri.parse(url);
                DownloadManager.Request req = new DownloadManager.Request(uri);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

                if(options.addAndroidDownloads.hasKey("title")) {
                    req.setTitle(options.addAndroidDownloads.getString("title"));
                }
                if(options.addAndroidDownloads.hasKey("description")) {
                    req.setDescription(options.addAndroidDownloads.getString("description"));
                }
                // set headers
                ReadableMapKeySetIterator it = headers.keySetIterator();
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    req.addRequestHeader(key, headers.getString(key));
                }
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                downloadManagerId = dm.enqueue(req);
                ctx.registerReceiver(this, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
                return;
            }

        }

        String key = this.taskId;
        if (this.options.key != null) {
            key = RNFetchBlobReq.getMD5(this.options.key);

            File file = new File(RNFetchBlobFileHandler.getFilePath(ctx, taskId, key, this.options))
            if (file.exists()) {
               callback.invoke(null, file.getAbsolutePath());
               return;
            }
        }

        try {

            req = new AsyncHttpClient();

            // use trusty SSL socket
            if(this.options.trusty) {
                KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
                trustStore.load(null, null);
                MySSLSocketFactory sf = new MySSLSocketFactory(trustStore);
                sf.setHostnameVerifier(MySSLSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);
                req.setSSLSocketFactory(sf);
            }

            // set headers
            if(headers != null) {
                ReadableMapKeySetIterator it = headers.keySetIterator();
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    req.addHeader(key, headers.getString(key));
                }
            }

            if(type != null)
            {
                if(type == "octet")
                    req.addHeader("Content-Type", "application/octet-stream");
                else if(type == "form")
                    req.addHeader("Content-Type", "multipart/form-data; charset=utf8; boundary="+boundary);
            }

            AsyncHttpResponseHandler handler;

            // create handler
            if(options.fileCache || options.path != null) {
                handler = new RNFetchBlobFileHandler(ctx, taskId, key, options, callback);
                // if path format invalid, throw error
                if (!((RNFetchBlobFileHandler)handler).isValid) {
                    callback.invoke("RNFetchBlob fetch error, configuration path `"+ options.path  +"` is not a valid path.");
                    return;
                }
            }
            else
                handler = new RNFetchBlobBinaryHandler(this.ctx, taskId, callback);

            // send request
            switch(method.toLowerCase()) {
                case "get" :
                    req.get(url, handler);
                    break;
                case "post" :
                    if(this.type == null || this.type.equalsIgnoreCase("octet"))
                        req.post(ctx, url, entity, "application/octet-stream", handler);
                    else
                        req.post(ctx, url, entity, "multipart/form-data", handler);
                    break;
                case "put" :
                    if(this.type == null || this.type.equalsIgnoreCase("octet"))
                        req.put(ctx, url, entity, "application/octet-stream", handler);
                    else
                        req.put(ctx, url, entity, "multipart/form-data", handler);
                    break;
                case "delete" :
                    req.delete(url, handler);
                    break;
            }
        } catch(Exception error) {
            callback.invoke( "RNFetchBlob serialize request data failed: " + error.getMessage() + error.getCause());
        }
    }

    /**
     * Build Mutipart body
     * @param body  Body in array format
     */
    void buildFormEntity(ReadableArray body) {
        if(body != null && (method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put"))) {
            Long tsLong = System.currentTimeMillis()/1000;
            String ts = tsLong.toString();
            boundary = "RNFetchBlob".concat(ts);
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
        }
    }

    /**
     * Build Octet-Stream body
     * @param body  Body in string format
     */
    void buildEntity(String body) {
        // set body for POST and PUT
        if(body != null && (method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put"))) {

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
        }

    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(action)) {
            long id = intent.getExtras().getLong(DownloadManager.EXTRA_DOWNLOAD_ID);
            if(id == this.downloadManagerId) {
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadManagerId);
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                dm.query(query);
                Cursor c = dm.query(query);
                if (c.moveToFirst()) {
                    String contentUri = c.getString(c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                    Uri uri = Uri.parse(contentUri);
                    Cursor cursor = ctx.getContentResolver().query(uri, new String[] { android.provider.MediaStore.Images.ImageColumns.DATA }, null, null, null);
                    cursor.moveToFirst();
                    String filePath = cursor.getString(0);
                    cursor.close();
                    this.callback.invoke(null, filePath);
                }
            }
        }
    }
}
