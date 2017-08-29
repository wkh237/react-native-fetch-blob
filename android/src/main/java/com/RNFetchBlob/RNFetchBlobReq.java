package com.RNFetchBlob;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;

import com.RNFetchBlob.Response.RNFetchBlobDefaultResp;
import com.RNFetchBlob.Response.RNFetchBlobFileResp;
import com.facebook.common.logging.FLog;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.network.OkHttpClientProvider;
import com.facebook.react.modules.network.TLSSocketFactory;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;

import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.ConnectionPool;
import okhttp3.ConnectionSpec;
import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.TlsVersion;


public class RNFetchBlobReq extends BroadcastReceiver implements Runnable {

    enum RequestType  {
        Form,
        SingleFile,
        AsIs,
        WithoutBody,
        Others
    }

    enum ResponseType {
        KeepInMemory,
        FileStorage
    }

    enum ResponseFormat {
        Auto,
        UTF8,
        BASE64
    }

    public static HashMap<String, Call> taskTable = new HashMap<>();
    public static HashMap<String, Long> androidDownloadManagerTaskTable = new HashMap<>();
    static HashMap<String, RNFetchBlobProgressConfig> progressReport = new HashMap<>();
    static HashMap<String, RNFetchBlobProgressConfig> uploadProgressReport = new HashMap<>();
    static ConnectionPool pool = new ConnectionPool();

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
    RNFetchBlobBody requestBody;
    RequestType requestType;
    ResponseType responseType;
    ResponseFormat responseFormat = ResponseFormat.Auto;
    WritableMap respInfo;
    boolean timeout = false;
    ArrayList<String> redirects = new ArrayList<>();
    OkHttpClient client;

    public RNFetchBlobReq(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, ReadableArray arrayBody, OkHttpClient client, final Callback callback) {
        this.method = method.toUpperCase();
        this.options = new RNFetchBlobConfig(options);
        this.taskId = taskId;
        this.url = url;
        this.headers = headers;
        this.callback = callback;
        this.rawRequestBody = body;
        this.rawRequestBodyArray = arrayBody;
        this.client = client;

        if(this.options.fileCache || this.options.path != null)
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

    public static void cancelTask(String taskId) {
        if(taskTable.containsKey(taskId)) {
            Call call = taskTable.get(taskId);
            call.cancel();
            taskTable.remove(taskId);
        }

        if (androidDownloadManagerTaskTable.containsKey(taskId)) {
            long downloadManagerIdForTaskId = androidDownloadManagerTaskTable.get(taskId).longValue();
            Context appCtx = RNFetchBlob.RCTContext.getApplicationContext();
            DownloadManager dm = (DownloadManager) appCtx.getSystemService(Context.DOWNLOAD_SERVICE);
            dm.remove(downloadManagerIdForTaskId);
        }
    }

    @Override
    public void run() {

        // use download manager instead of default HTTP implementation
        if (options.addAndroidDownloads != null && options.addAndroidDownloads.hasKey("useDownloadManager")) {

            if (options.addAndroidDownloads.getBoolean("useDownloadManager")) {
                Uri uri = Uri.parse(url);
                DownloadManager.Request req = new DownloadManager.Request(uri);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                if(options.addAndroidDownloads.hasKey("title")) {
                    req.setTitle(options.addAndroidDownloads.getString("title"));
                }
                if(options.addAndroidDownloads.hasKey("description")) {
                    req.setDescription(options.addAndroidDownloads.getString("description"));
                }
                if(options.addAndroidDownloads.hasKey("path")) {
                    req.setDestinationUri(Uri.parse("file://" + options.addAndroidDownloads.getString("path")));
                }
                // #391 Add MIME type to the request
                if(options.addAndroidDownloads.hasKey("mime")) {
                    req.setMimeType(options.addAndroidDownloads.getString("mime"));
                }
                // set headers
                ReadableMapKeySetIterator it = headers.keySetIterator();
                if(options.addAndroidDownloads.hasKey("mediaScannable") && options.addAndroidDownloads.hasKey("mediaScannable") == true ) {
                    req.allowScanningByMediaScanner();
                }
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    req.addRequestHeader(key, headers.getString(key));
                }
                Context appCtx = RNFetchBlob.RCTContext.getApplicationContext();
                DownloadManager dm = (DownloadManager) appCtx.getSystemService(Context.DOWNLOAD_SERVICE);
                downloadManagerId = dm.enqueue(req);
                androidDownloadManagerTaskTable.put(taskId, Long.valueOf(downloadManagerId));
                appCtx.registerReceiver(this, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
                return;
            }

        }

        // find cached result if `key` property exists
        String cacheKey = this.taskId;
        String ext = this.options.appendExt.isEmpty() ? "" : "." + this.options.appendExt;

        if (this.options.key != null) {
            cacheKey = RNFetchBlobUtils.getMD5(this.options.key);
            if (cacheKey == null) {
                cacheKey = this.taskId;
            }

            File file = new File(RNFetchBlobFS.getTmpPath(RNFetchBlob.RCTContext, cacheKey) + ext);

            if (file.exists()) {
                callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_PATH, file.getAbsolutePath());
                return;
            }
        }

        if(this.options.path != null)
            this.destPath = this.options.path;
        else if(this.options.fileCache)
            this.destPath = RNFetchBlobFS.getTmpPath(RNFetchBlob.RCTContext, cacheKey) + ext;


        OkHttpClient.Builder clientBuilder;

        try {
            // use trusty SSL socket
            if (this.options.trusty) {
                clientBuilder = RNFetchBlobUtils.getUnsafeOkHttpClient(client);
            } else {
                clientBuilder = client.newBuilder();
            }

            final Request.Builder builder = new Request.Builder();
            try {
                builder.url(new URL(url));
            } catch (MalformedURLException e) {
                e.printStackTrace();
            }

            HashMap<String, String> mheaders = new HashMap<>();
            // set headers
            if (headers != null) {
                ReadableMapKeySetIterator it = headers.keySetIterator();
                while (it.hasNextKey()) {
                    String key = it.nextKey();
                    String value = headers.getString(key);
                    if(key.equalsIgnoreCase("RNFB-Response")) {
                        if(value.equalsIgnoreCase("base64"))
                            responseFormat = ResponseFormat.BASE64;
                        else if (value.equalsIgnoreCase("utf8"))
                            responseFormat = ResponseFormat.UTF8;
                    }
                    else {
                        builder.header(key.toLowerCase(), value);
                        mheaders.put(key.toLowerCase(), value);
                    }
                }
            }

            if(method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put") || method.equalsIgnoreCase("patch")) {
                String cType = getHeaderIgnoreCases(mheaders, "Content-Type").toLowerCase();

                if(rawRequestBodyArray != null) {
                    requestType = RequestType.Form;
                }
                else if(cType.isEmpty()) {
                    builder.header("Content-Type", "application/octet-stream");
                    requestType = RequestType.SingleFile;
                }
                if(rawRequestBody != null) {
                    if(rawRequestBody.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                        requestType = RequestType.SingleFile;
                    }
                    else if (cType.toLowerCase().contains(";base64") || cType.toLowerCase().startsWith("application/octet")) {
                        cType = cType.replace(";base64","").replace(";BASE64","");
                        if(mheaders.containsKey("content-type"))
                            mheaders.put("content-type", cType);
                        if(mheaders.containsKey("Content-Type"))
                            mheaders.put("Content-Type", cType);
                        requestType = RequestType.SingleFile;
                    } else {
                        requestType = RequestType.AsIs;
                    }
                }
            }
            else {
                requestType = RequestType.WithoutBody;
            }

            boolean isChunkedRequest = getHeaderIgnoreCases(mheaders, "Transfer-Encoding").equalsIgnoreCase("chunked");

            // set request body
            switch (requestType) {
                case SingleFile:
                    requestBody = new RNFetchBlobBody(taskId)
                            .chunkedEncoding(isChunkedRequest)
                            .setRequestType(requestType)
                            .setBody(rawRequestBody)
                            .setMIME(MediaType.parse(getHeaderIgnoreCases(mheaders, "content-type")));
                    builder.method(method, requestBody);
                    break;
                case AsIs:
                    requestBody = new RNFetchBlobBody(taskId)
                            .chunkedEncoding(isChunkedRequest)
                            .setRequestType(requestType)
                            .setBody(rawRequestBody)
                            .setMIME(MediaType.parse(getHeaderIgnoreCases(mheaders, "content-type")));
                    builder.method(method, requestBody);
                    break;
                case Form:
                    String boundary = "RNFetchBlob-" + taskId;
                    requestBody = new RNFetchBlobBody(taskId)
                            .chunkedEncoding(isChunkedRequest)
                            .setRequestType(requestType)
                            .setBody(rawRequestBodyArray)
                            .setMIME(MediaType.parse("multipart/form-data; boundary="+ boundary));
                    builder.method(method, requestBody);
                    break;

                case WithoutBody:
                    if(method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put") || method.equalsIgnoreCase("patch"))
                    {
                        builder.method(method, RequestBody.create(null, new byte[0]));
                    }
                    else
                        builder.method(method, null);
                    break;
            }

            // #156 fix cookie issue
            final Request req = builder.build();
            clientBuilder.addNetworkInterceptor(new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                    redirects.add(chain.request().url().toString());
                    return chain.proceed(chain.request());
                }
            });
            // Add request interceptor for upload progress event
            clientBuilder.addInterceptor(new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                    try {
                        Response originalResponse = chain.proceed(req);
                        ResponseBody extended;
                        switch (responseType) {
                            case KeepInMemory:
                                extended = new RNFetchBlobDefaultResp(
                                        RNFetchBlob.RCTContext,
                                        taskId,
                                        originalResponse.body(),
                                        options.increment);
                                break;
                            case FileStorage:
                                extended = new RNFetchBlobFileResp(
                                        RNFetchBlob.RCTContext,
                                        taskId,
                                        originalResponse.body(),
                                        destPath,
                                        options.overwrite);
                                break;
                            default:
                                extended = new RNFetchBlobDefaultResp(
                                        RNFetchBlob.RCTContext,
                                        taskId,
                                        originalResponse.body(),
                                        options.increment);
                                break;
                        }
                        return originalResponse.newBuilder().body(extended).build();
                    }
                    catch(SocketException e) {
                        timeout = true;
                    }
                    catch (SocketTimeoutException e ){
                        timeout = true;
                        RNFetchBlobUtils.emitWarningEvent("RNFetchBlob error when sending request : " + e.getLocalizedMessage());
                    } catch(Exception ex) {

                    }
                    return chain.proceed(chain.request());
                }
            });


            if(options.timeout >= 0) {
                clientBuilder.connectTimeout(options.timeout, TimeUnit.MILLISECONDS);
                clientBuilder.readTimeout(options.timeout, TimeUnit.MILLISECONDS);
            }

            clientBuilder.connectionPool(pool);
            clientBuilder.retryOnConnectionFailure(false);
            clientBuilder.followRedirects(options.followRedirect);
            clientBuilder.followSslRedirects(options.followRedirect);
            clientBuilder.retryOnConnectionFailure(true);

            OkHttpClient client = enableTls12OnPreLollipop(clientBuilder).build();

            Call call =  client.newCall(req);
            taskTable.put(taskId, call);
            call.enqueue(new okhttp3.Callback() {

                @Override
                public void onFailure(Call call, IOException e) {
                    cancelTask(taskId);
                    if(respInfo == null) {
                        respInfo = Arguments.createMap();
                    }

                    // check if this error caused by socket timeout
                    if(e.getClass().equals(SocketTimeoutException.class)) {
                        respInfo.putBoolean("timeout", true);
                        callback.invoke("request timed out.", null, null);
                    }
                    else
                        callback.invoke(e.getLocalizedMessage(), null, null);
                    releaseTaskResource();
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


        } catch (Exception error) {
            error.printStackTrace();
            releaseTaskResource();
            callback.invoke("RNFetchBlob request error: " + error.getMessage() + error.getCause());
        }
    }

    /**
     * Remove cached information of the HTTP task
     */
    private void releaseTaskResource() {
        if(taskTable.containsKey(taskId))
            taskTable.remove(taskId);
        if(androidDownloadManagerTaskTable.containsKey(taskId))
            androidDownloadManagerTaskTable.remove(taskId);
        if(uploadProgressReport.containsKey(taskId))
            uploadProgressReport.remove(taskId);
        if(progressReport.containsKey(taskId))
            progressReport.remove(taskId);
        if(requestBody != null)
            requestBody.clearRequestBody();
    }

    /**
     * Send response data back to javascript context.
     * @param resp OkHttp response object
     */
    private void done(Response resp) {
        boolean isBlobResp = isBlobResponse(resp);
        emitStateEvent(getResponseInfo(resp, isBlobResp));
        switch (responseType) {
            case KeepInMemory:
                try {
                    // For XMLHttpRequest, automatic response data storing strategy, when response
                    // data is considered as binary data, write it to file system
                    if(isBlobResp && options.auto) {
                        String dest = RNFetchBlobFS.getTmpPath(ctx, taskId);
                        InputStream ins = resp.body().byteStream();
                        FileOutputStream os = new FileOutputStream(new File(dest));
                        int read;
                        byte [] buffer = new byte[10240];
                        while ((read = ins.read(buffer)) != -1) {
                            os.write(buffer, 0, read);
                        }
                        ins.close();
                        os.flush();
                        os.close();
                        callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_PATH, dest);
                    }
                    // response data directly pass to JS context as string.
                    else {
                        // #73 Check if the response data contains valid UTF8 string, since BASE64
                        // encoding will somehow break the UTF8 string format, to encode UTF8
                        // string correctly, we should do URL encoding before BASE64.
                        byte[] b = resp.body().bytes();
                        CharsetEncoder encoder = Charset.forName("UTF-8").newEncoder();
                        if(responseFormat == ResponseFormat.BASE64) {
                            callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_BASE64, android.util.Base64.encodeToString(b, Base64.NO_WRAP));
                            return;
                        }
                        try {
                            encoder.encode(ByteBuffer.wrap(b).asCharBuffer());
                            // if the data contains invalid characters the following lines will be
                            // skipped.
                            String utf8 = new String(b);
                            callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_UTF8, utf8);
                        }
                        // This usually mean the data is contains invalid unicode characters, it's
                        // binary data
                        catch(CharacterCodingException ignored) {
                            if(responseFormat == ResponseFormat.UTF8) {
                                callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_UTF8, "");
                            }
                            else {
                                callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_BASE64, android.util.Base64.encodeToString(b, Base64.NO_WRAP));
                            }
                        }
                    }
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to BASE64 string.", null);
                }
                break;
            case FileStorage:
                try {
                    // In order to write response data to `destPath` we have to invoke this method.
                    // It uses customized response body which is able to report download progress
                    // and write response data to destination path.
                    resp.body().bytes();
                } catch (Exception ignored) {
//                    ignored.printStackTrace();
                }
                this.destPath = this.destPath.replace("?append=true", "");
                callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_PATH, this.destPath);
                break;
            default:
                try {
                    callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_UTF8, new String(resp.body().bytes(), "UTF-8"));
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to UTF8 string.", null);
                }
                break;
        }
//        if(!resp.isSuccessful())
        resp.body().close();
        releaseTaskResource();
    }

    /**
     * Invoke this method to enable download progress reporting.
     * @param taskId Task ID of the HTTP task.
     * @return Task ID of the target task
     */
    public static RNFetchBlobProgressConfig getReportProgress(String taskId) {
        if(!progressReport.containsKey(taskId)) return null;
        return progressReport.get(taskId);
    }

    /**
     * Invoke this method to enable download progress reporting.
     * @param taskId Task ID of the HTTP task.
     * @return Task ID of the target task
     */
    public static RNFetchBlobProgressConfig getReportUploadProgress(String taskId) {
        if(!uploadProgressReport.containsKey(taskId)) return null;
        return uploadProgressReport.get(taskId);
    }

    /**
     * Create response information object, contains status code, headers, etc.
     * @param resp Response object
     * @param isBlobResp If the response is binary data
     * @return Get RCT bridge object contains response information.
     */
    private WritableMap getResponseInfo(Response resp, boolean isBlobResp) {
        WritableMap info = Arguments.createMap();
        info.putInt("status", resp.code());
        info.putString("state", "2");
        info.putString("taskId", this.taskId);
        info.putBoolean("timeout", timeout);
        WritableMap headers = Arguments.createMap();
        for(int i =0;i< resp.headers().size();i++) {
            headers.putString(resp.headers().name(i), resp.headers().value(i));
        }
        WritableArray redirectList = Arguments.createArray();
        for(String r : redirects) {
            redirectList.pushString(r);
        }
        info.putArray("redirects", redirectList);
        info.putMap("headers", headers);
        Headers h = resp.headers();
        if(isBlobResp) {
            info.putString("respType", "blob");
        }
        else if(getHeaderIgnoreCases(h, "content-type").equalsIgnoreCase("text/")) {
            info.putString("respType", "text");
        }
        else if(getHeaderIgnoreCases(h, "content-type").contains("application/json")) {
            info.putString("respType", "json");
        }
        else {
            info.putString("respType", "");
        }
        return info;
    }

    /**
     * Check if response data is binary data.
     * @param resp OkHttp response.
     * @return If the response data contains binary bytes
     */
    private boolean isBlobResponse(Response resp) {
        Headers h = resp.headers();
        String ctype = getHeaderIgnoreCases(h, "Content-Type");
        boolean isText = !ctype.equalsIgnoreCase("text/");
        boolean isJSON = !ctype.equalsIgnoreCase("application/json");
        boolean isCustomBinary = false;
        if(options.binaryContentTypes != null) {
            for(int i = 0; i< options.binaryContentTypes.size();i++) {
                if(ctype.toLowerCase().contains(options.binaryContentTypes.getString(i).toLowerCase())) {
                    isCustomBinary = true;
                    break;
                }
            }
        }
        return  (!(isJSON || isText)) || isCustomBinary;
    }

    private String getHeaderIgnoreCases(Headers headers, String field) {
        String val = headers.get(field);
        if(val != null) return val;
        return headers.get(field.toLowerCase()) == null ? "" : headers.get(field.toLowerCase());
    }

    private String getHeaderIgnoreCases(HashMap<String,String> headers, String field) {
        String val = headers.get(field);
        if(val != null) return val;
        String lowerCasedValue = headers.get(field.toLowerCase());
        return lowerCasedValue == null ? "" : lowerCasedValue;
    }

    private void emitStateEvent(WritableMap args) {
        RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(RNFetchBlobConst.EVENT_HTTP_STATE, args);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(action)) {
            Context appCtx = RNFetchBlob.RCTContext.getApplicationContext();
            long id = intent.getExtras().getLong(DownloadManager.EXTRA_DOWNLOAD_ID);
            if (id == this.downloadManagerId) {
                releaseTaskResource(); // remove task ID from task map

                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadManagerId);
                DownloadManager dm = (DownloadManager) appCtx.getSystemService(Context.DOWNLOAD_SERVICE);
                dm.query(query);
                Cursor c = dm.query(query);


                String filePath = null;
                // the file exists in media content database
                if (c.moveToFirst()) {
                    // #297 handle failed request
                    int statusCode = c.getInt(c.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    if(statusCode == DownloadManager.STATUS_FAILED) {
                        this.callback.invoke("Download manager failed to download from  " + this.url + ". Statu Code = " + statusCode, null, null);
                        return;
                    }
                    String contentUri = c.getString(c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                    if ( contentUri != null &&
                            options.addAndroidDownloads.hasKey("mime") &&
                            options.addAndroidDownloads.getString("mime").contains("image")) {
                        Uri uri = Uri.parse(contentUri);
                        Cursor cursor = appCtx.getContentResolver().query(uri, new String[]{android.provider.MediaStore.Images.ImageColumns.DATA}, null, null, null);

                            // use default destination of DownloadManager
                        if (cursor != null) {
                            cursor.moveToFirst();
                            filePath = cursor.getString(0);
                        }
                    }
                }

                // When the file is not found in media content database, check if custom path exists
                if (options.addAndroidDownloads.hasKey("path")) {
                    try {
                        String customDest = options.addAndroidDownloads.getString("path");
                        boolean exists = new File(customDest).exists();
                        if(!exists)
                            throw new Exception("Download manager download failed, the file does not downloaded to destination.");
                        else
                            this.callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_PATH, customDest);

                    } catch(Exception ex) {
                        ex.printStackTrace();
                        this.callback.invoke(ex.getLocalizedMessage(), null);
                    }
                }
                else {
                    if(filePath == null)
                        this.callback.invoke("Download manager could not resolve downloaded file path.", RNFetchBlobConst.RNFB_RESPONSE_PATH, null);
                    else
                        this.callback.invoke(null, RNFetchBlobConst.RNFB_RESPONSE_PATH, filePath);
                }

            }
        }
    }

    public static OkHttpClient.Builder enableTls12OnPreLollipop(OkHttpClient.Builder client) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN && Build.VERSION.SDK_INT <= Build.VERSION_CODES.KITKAT) {
            try {
                client.sslSocketFactory(new TLSSocketFactory());

                ConnectionSpec cs = new ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                        .tlsVersions(TlsVersion.TLS_1_2)
                        .build();

                List< ConnectionSpec > specs = new ArrayList < > ();
                specs.add(cs);
                specs.add(ConnectionSpec.COMPATIBLE_TLS);
                specs.add(ConnectionSpec.CLEARTEXT);

                client.connectionSpecs(specs);
            } catch (Exception exc) {
                FLog.e("OkHttpClientProvider", "Error while enabling TLS 1.2", exc);
            }
        }

        return client;
    }


}
