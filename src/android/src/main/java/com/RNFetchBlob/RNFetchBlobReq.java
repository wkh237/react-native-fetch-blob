package com.RNFetchBlob;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;

import com.RNFetchBlob.Response.RNFetchBlobDefaultResp;
import com.RNFetchBlob.Response.RNFetchBlobFileResp;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CharsetEncoder;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.ConnectionPool;
import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.FormBody;
import okhttp3.internal.framed.Header;
import okhttp3.internal.http.OkHeaders;

/**
 * Created by wkh237 on 2016/6/21.
 */
public class RNFetchBlobReq extends BroadcastReceiver implements Runnable {

    enum RequestType  {
        Form,
        SingleFile,
        AsIs,
        WithoutBody,
        Others
    };

    enum ResponseType {
        KeepInMemory,
        FileStorage
    };

    public static HashMap<String, Call> taskTable = new HashMap<>();
    static HashMap<String, Boolean> progressReport = new HashMap<>();
    static HashMap<String, Boolean> uploadProgressReport = new HashMap<>();
    static ConnectionPool pool = new ConnectionPool();

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
    WritableMap respInfo;
    boolean timeout = false;
    public boolean reportProgress = false;
    public boolean reportUploadProgress = false;

    public RNFetchBlobReq(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, ReadableArray arrayBody, final Callback callback) {
        this.method = method;
        this.options = new RNFetchBlobConfig(options);
        this.taskId = taskId;
        this.url = url;
        this.headers = headers;
        this.callback = callback;
        this.rawRequestBody = body;
        this.rawRequestBodyArray = arrayBody;

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
                Context appCtx = RNFetchBlob.RCTContext.getApplicationContext();
                DownloadManager dm = (DownloadManager) appCtx.getSystemService(Context.DOWNLOAD_SERVICE);
                downloadManagerId = dm.enqueue(req);
                appCtx.registerReceiver(this, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
                return;
            }

        }

        // find cached result if `key` property exists
        String cacheKey = this.taskId;
		String ext = this.options.appendExt != "" ? "." + this.options.appendExt : "";

       	if (this.options.key != null) {
           cacheKey = RNFetchBlobUtils.getMD5(this.options.key);
           if (cacheKey == null) {
               cacheKey = this.taskId;
           }

           File file = new File(RNFetchBlobFS.getTmpPath(RNFetchBlob.RCTContext, cacheKey) + ext);

           if (file.exists()) {
               callback.invoke(null, file.getAbsolutePath());
               return;
           }
       }

        if(this.options.path != null)
            this.destPath = this.options.path;
        else if(this.options.fileCache == true)
            this.destPath = RNFetchBlobFS.getTmpPath(RNFetchBlob.RCTContext, cacheKey) + ext;

        OkHttpClient.Builder clientBuilder;

        try {
            // use trusty SSL socket
            if (this.options.trusty) {
                clientBuilder = RNFetchBlobUtils.getUnsafeOkHttpClient();
            } else {
                clientBuilder = new OkHttpClient.Builder();
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
                    builder.header(key, value);
                    mheaders.put(key,value);
                }
            }

            if(method.equalsIgnoreCase("post") || method.equalsIgnoreCase("put")) {
                String cType = getHeaderIgnoreCases(mheaders, "Content-Type").toLowerCase();

                if(cType == null) {
                    builder.header("Content-Type", "application/octet-stream");
                    requestType = RequestType.SingleFile;
                }
                if(rawRequestBody != null) {
                    if(rawRequestBody.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                        requestType = RequestType.SingleFile;
                    }
                    else if (cType.toLowerCase().contains(";base64") || cType.toLowerCase().startsWith("application/octet")) {
                        requestType = RequestType.SingleFile;
                    } else {
                        requestType = RequestType.AsIs;
                    }
                }
            }
            else {
                requestType = RequestType.WithoutBody;
            }


            // set request body
            switch (requestType) {
                case SingleFile:
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            requestType,
                            rawRequestBody,
                            MediaType.parse(getHeaderIgnoreCases(mheaders, "content-type"))
                    ));
                    break;
                case AsIs:
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            requestType,
                            rawRequestBody,
                            MediaType.parse(getHeaderIgnoreCases(mheaders, "content-type"))
                    ));
                    break;
                case Form:
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            requestType,
                            rawRequestBodyArray,
                            MediaType.parse("multipart/form-data; boundary=RNFetchBlob-" + taskId)
                    ));
                    break;

                case WithoutBody:
                    if(method.equalsIgnoreCase("POST") || method.equalsIgnoreCase("PUT"))
                    {
                        builder.method(method, RequestBody.create(null, new byte[0]));
                    }
                    else
                        builder.method(method, null);
                    break;
            }

            final Request req = builder.build();

            // Create response body depends on the responseType
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
                    } catch(Exception ex) {
                        timeout = true;
                    }
                    return chain.proceed(chain.request());
                }
            });


            if(options.timeout > 0) {
                clientBuilder.connectTimeout(options.timeout, TimeUnit.MILLISECONDS);
                clientBuilder.readTimeout(options.timeout, TimeUnit.MILLISECONDS);
            }

            clientBuilder.connectionPool(pool);
            clientBuilder.retryOnConnectionFailure(false);
            clientBuilder.followRedirects(true);

            OkHttpClient client = clientBuilder.build();
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
                        callback.invoke("request timed out.", respInfo, null);
                    }
                    else
                        callback.invoke(e.getLocalizedMessage(), respInfo, null);
                    removeTaskInfo();
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
            taskTable.remove(taskId);
            callback.invoke("RNFetchBlob request error: " + error.getMessage() + error.getCause());
        }
    }

    /**
     * Remove cached information of the HTTP task
     */
    private void removeTaskInfo() {
        if(taskTable.containsKey(taskId))
            taskTable.remove(taskId);
        if(uploadProgressReport.containsKey(taskId))
            uploadProgressReport.remove(taskId);
        if(progressReport.containsKey(taskId))
            progressReport.remove(taskId);
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
                    // header is not `application/json` or `text/plain`, write response data to
                    // file system.
                    if(isBlobResp && options.auto == true) {
                        String dest = RNFetchBlobFS.getTmpPath(ctx, taskId);
                        InputStream ins = resp.body().byteStream();
                        FileOutputStream os = new FileOutputStream(new File(dest));
                        byte [] buffer = new byte[10240];
                        int read = ins.read(buffer);
                        os.write(buffer,0,read);
                        while(read > 0) {
                            os.write(buffer,0,read);
                            read = ins.read(buffer);
                        }
                        ins.close();
                        os.close();
                        callback.invoke(null, null, dest);
                    }
                    else {
                        // #73 Check if the response data contains valid UTF8 string, since BASE64
                        // encoding will somehow break the UTF8 string format, to encode UTF8
                        // string correctly, we should do URL encoding before BASE64.
                        String utf8Str;
                        byte[] b = resp.body().bytes();
                        CharsetEncoder encoder = Charset.forName("UTF-8").newEncoder();
                        try {
                            encoder.encode(ByteBuffer.wrap(b).asCharBuffer());
                            // if the data can be encoded to UTF8 append URL encode
                            b = URLEncoder.encode(new String(b), "UTF-8").replace("+", "%20").getBytes();
                        }
                        // This usually mean the data is binary data
                        catch(CharacterCodingException e) {

                        }
                        finally {
                            callback.invoke(null, null, android.util.Base64.encodeToString(b, Base64.NO_WRAP));
                        }
                    }
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to BASE64 string.", null);
                }
                break;
            case FileStorage:
                try{
                    // In order to write response data to `destPath` we have to invoke this method.
                    // It uses customized response body which is able to report download progress
                    // and write response data to destination path.
                    resp.body().bytes();
                } catch (Exception ignored) {

                }
                callback.invoke(null, null, this.destPath);
                break;
            default:
                try {
                    callback.invoke(null, null, new String(resp.body().bytes(), "UTF-8"));
                } catch (IOException e) {
                    callback.invoke("RNFetchBlob failed to encode response data to UTF8 string.", null);
                }
                break;
        }
        removeTaskInfo();
    }

    /**
     * Invoke this method to enable download progress reporting.
     * @param taskId Task ID of the HTTP task.
     * @return Task ID of the target task
     */
    public static boolean isReportProgress(String taskId) {
        if(!progressReport.containsKey(taskId)) return false;
        return progressReport.get(taskId);
    }

    /**
     * Invoke this method to enable download progress reporting.
     * @param taskId Task ID of the HTTP task.
     * @return Task ID of the target task
     */
    public static boolean isReportUploadProgress(String taskId) {
        if(!uploadProgressReport.containsKey(taskId)) return false;
        return uploadProgressReport.get(taskId);
    }

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
        return headers.get(field.toLowerCase()) == null ? "" : headers.get(field.toLowerCase());
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
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadManagerId);
                DownloadManager dm = (DownloadManager) appCtx.getSystemService(Context.DOWNLOAD_SERVICE);
                dm.query(query);
                Cursor c = dm.query(query);
                if (c.moveToFirst()) {
                    String contentUri = c.getString(c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI));
                    Uri uri = Uri.parse(contentUri);
                    Cursor cursor = appCtx.getContentResolver().query(uri, new String[]{android.provider.MediaStore.Images.ImageColumns.DATA}, null, null, null);
                    if (cursor != null) {
                        cursor.moveToFirst();
                        String filePath = cursor.getString(0);
                        cursor.close();
                        this.callback.invoke(null, null, filePath);
                    }
                    else
                        this.callback.invoke(null, null, null);
                }
            }
        }
    }


}
