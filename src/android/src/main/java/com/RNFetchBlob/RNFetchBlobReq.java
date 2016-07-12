package com.RNFetchBlob;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.util.Base64;

import com.RNFetchBlob.Response.RNFetchBlobDefaultResp;
import com.RNFetchBlob.Response.RNFetchBlobFileResp;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;

import okhttp3.Call;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Created by wkh237 on 2016/6/21.
 */
public class RNFetchBlobReq extends BroadcastReceiver implements Runnable {

    enum RequestType  {
        Form,
        SingleFile,
        WithoutBody,
        Others
    };

    enum ResponseType {
        KeepInMemory,
        FileStorage
    };

    MediaType contentType = RNFetchBlobConst.MIME_OCTET;
    ReactApplicationContext ctx;
    RNFetchBlobConfig options;
    String taskId;
    String method;
    String url;
    String rawRequestBody;
    String destPath;
    ReadableArray rawRequestBodyArray;
    ReadableMap headers;
    Callback callback;
    long contentLength;
    long downloadManagerId;
    RequestType requestType;
    ResponseType responseType;

    public RNFetchBlobReq(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, ReadableArray arrayBody, final Callback callback) {
        this.method = method;
        this.options = new RNFetchBlobConfig(options);
        this.taskId = taskId;
        this.url = url;
        this.headers = headers;
        this.callback = callback;
        this.rawRequestBody = body;
        this.rawRequestBodyArray = arrayBody;

        if(this.options.fileCache == true || this.options.path != null)
            responseType = ResponseType.FileStorage;
        else
            responseType = ResponseType.KeepInMemory;

        if (body != null)
            requestType = RequestType.SingleFile;
        else if (arrayBody != null)
            requestType = RequestType.Form;
        else
            requestType = RequestType.WithoutBody;
    }

    @Override
    public void run() {

        // use download manager instead of default HTTP implementation
        if (options.addAndroidDownloads != null && options.addAndroidDownloads.hasKey("useDownloadManager")) {

            if (options.addAndroidDownloads.getBoolean("useDownloadManager")) {
                Uri uri = Uri.parse(url);
                DownloadManager.Request req = new DownloadManager.Request(uri);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

                if (options.addAndroidDownloads.hasKey("title")) {
                    req.setTitle(options.addAndroidDownloads.getString("title"));
                }
                if (options.addAndroidDownloads.hasKey("description")) {
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

        // find cached result if `key` property exists
        String cacheKey = this.taskId;
//        if (this.options.key != null) {
//            cacheKey = RNFetchBlobUtils.getMD5(this.options.key);
//            if (cacheKey == null) {
//                cacheKey = this.taskId;
//            }
//
//            File file = new File(RNFetchBlobFS.getTmpPath(ctx, cacheKey));
//            if (file.exists()) {
//                callback.invoke(null, file.getAbsolutePath());
//                return;
//            }
//        }

        if(this.options.path != null)
            this.destPath = this.options.path;
        else if(this.options.fileCache == true)
            this.destPath = RNFetchBlobFS.getTmpPath(RNFetchBlob.RCTContext, cacheKey);

        OkHttpClient.Builder client;

//        try {
            // use trusty SSL socket
            if (this.options.trusty) {
                client = RNFetchBlobUtils.getUnsafeOkHttpClient();
            } else {
                client = new OkHttpClient.Builder();
            }

            final Request.Builder builder = new Request.Builder();
            try {
                builder.url(new URL(url));
            } catch (MalformedURLException e) {
                e.printStackTrace();
            }
            // set headers
            if (headers != null) {
                ReadableMapKeySetIterator it = headers.keySetIterator();
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    String value = headers.getString(key);
                    builder.header(key, value);
                }
            }

            // set request body
            switch (requestType) {
                case SingleFile:
                    InputStream dataStream= buildOctetBody(rawRequestBody);
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            RequestType.SingleFile,
                            null,
                            dataStream,
                            contentLength,
                            RNFetchBlobConst.MIME_OCTET
                    ));
                    break;
                case Form:
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            RequestType.Form,
                            rawRequestBodyArray,
                            null,
                            0,
                            MediaType.parse("multipart/form-data; boundary=RNFetchBlob-" + taskId)
                    ));
                    break;
                case WithoutBody:
                    builder.method(method, null);
                    break;
            }

            final Request req = builder.build();

//             create response handler
            client.addInterceptor(new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                Response originalResponse = chain.proceed(req);
                    ResponseBody extended;
                switch (responseType) {
                    case KeepInMemory:
                        extended = new RNFetchBlobDefaultResp(
                                RNFetchBlob.RCTContext,
                                taskId,
                                originalResponse.body());
                        break;
                    case FileStorage:
                        extended = new RNFetchBlobFileResp(
                                RNFetchBlob.RCTContext,
                                taskId,
                                originalResponse.body(),
                                destPath);
                        break;
                    default:
                        extended = new RNFetchBlobDefaultResp(
                                RNFetchBlob.RCTContext,
                                taskId,
                                originalResponse.body());
                        break;
                }
                return originalResponse.newBuilder().body(extended).build();
                }
            });

            client.build().newCall(req).enqueue(new okhttp3.Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    callback.invoke(e.getLocalizedMessage(), null);
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    ReadableMap notifyConfig = options.addAndroidDownloads;
                    // Download manager settings
                    if(notifyConfig != null ) {
                        String title = "", desc = "", mime = "text/plain";
                        boolean scannable = false, notification = false;
                        if(notifyConfig.hasKey("title"))
                            title = options.addAndroidDownloads.getString("title");
                        if(notifyConfig.hasKey("description"))
                            desc = notifyConfig.getString("description");
                        if(notifyConfig.hasKey("mime"))
                            mime = notifyConfig.getString("mime");
                        if(notifyConfig.hasKey("mediaScannable"))
                            scannable = notifyConfig.getBoolean("mediaScannable");
                        if(notifyConfig.hasKey("notification"))
                            notification = notifyConfig.getBoolean("notification");
                        DownloadManager dm = (DownloadManager)RNFetchBlob.RCTContext.getSystemService(RNFetchBlob.RCTContext.DOWNLOAD_SERVICE);
                        dm.addCompletedDownload(title, desc, scannable, mime, destPath, contentLength, notification);
                    }
                    done(response);
                }
            });


//        } catch (Exception error) {
//            error.printStackTrace();
//            callback.invoke("RNFetchBlob request error: " + error.getMessage() + error.getCause());
//        }
    }

    /**
     * Send response data back to javascript context.
     * @param resp OkHttp response object
     */
    private void done(Response resp) {
        switch (responseType) {
            case KeepInMemory:
                try {
                    byte [] b = resp.body().bytes();
                    callback.invoke(null, android.util.Base64.encodeToString(b,Base64.NO_WRAP));
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to BASE64 string.", null);
                }
                break;
            case FileStorage:
                // write chunk
                try {
                    resp.body().bytes();
                } catch (IOException e) {
                    e.printStackTrace();
                }
                callback.invoke(null, this.destPath);
                break;
            default:
                try {
                    callback.invoke(null, new String(resp.body().bytes(), "UTF-8"));
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to UTF8 string.", null);
                }
                break;
        }
    }

    /**
     * Build request body by given string
     * @param body Content of request body in UTF8 string format.
     * @return
     */
    RequestBody buildRawBody(String body) {
        if(body != null) {
            this.contentType = MediaType.parse(options.mime);
            return RequestBody.create(this.contentType, body);
        }
        return null;

    }

    /**
     * Get InputStream of request body when request body contains a single file.
     *
     * @param body Body in string format
     * @return InputStream When there's no request body, returns null
     */
    InputStream buildOctetBody(String body) {
        // set body for POST and PUT
        if (body != null && (method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put"))) {
            this.contentType = RNFetchBlobConst.MIME_OCTET;
            byte[] blob;
            // upload from storage
            if (body.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                String orgPath = body.substring(RNFetchBlobConst.FILE_PREFIX.length());
                orgPath = RNFetchBlobFS.normalizePath(orgPath);
                // upload file from assets
                if (RNFetchBlobFS.isAsset(orgPath)) {
                    try {
                        String assetName = orgPath.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                        contentLength = RNFetchBlob.RCTContext.getAssets().openFd(assetName).getLength();
                        return RNFetchBlob.RCTContext.getAssets().open(assetName);
                    } catch (IOException e) {
//                        e.printStackTrace();
                    }
                } else {
                    File f = new File(RNFetchBlobFS.normalizePath(orgPath));
                    try {
                        if(!f.exists())
                            f.createNewFile();
                        contentLength = f.length();
                        return new FileInputStream(f);
                    } catch (Exception e) {
                        callback.invoke(e.getLocalizedMessage(), null);
                    }
                }
            } else {
                byte[] bytes = Base64.decode(body, 0);
                contentLength = bytes.length;
                return new ByteArrayInputStream(bytes);
            }
        }
        return null;

    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(action)) {
            long id = intent.getExtras().getLong(DownloadManager.EXTRA_DOWNLOAD_ID);
            if (id == this.downloadManagerId) {
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadManagerId);
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                dm.query(query);
                Cursor c = dm.query(query);
                if (c.moveToFirst()) {
                    String contentUri = c.getString(c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                    Uri uri = Uri.parse(contentUri);
                    Cursor cursor = ctx.getContentResolver().query(uri, new String[]{android.provider.MediaStore.Images.ImageColumns.DATA}, null, null, null);
                    if (cursor != null) {
                        cursor.moveToFirst();
                        String filePath = cursor.getString(0);
                        cursor.close();
                        this.callback.invoke(null, filePath);
                    }
                    else
                        this.callback.invoke(null, null);
                }
            }
        }
    }


}
