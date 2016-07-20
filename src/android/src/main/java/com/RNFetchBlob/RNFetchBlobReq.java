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
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;

import okhttp3.Call;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.FormBody;

/**
 * Created by wkh237 on 2016/6/21.
 */
public class RNFetchBlobReq extends BroadcastReceiver implements Runnable {

    enum RequestType  {
        Form,
		Encoded,
        SingleFile,
        WithoutBody,
        Others
    };

    enum ResponseType {
        KeepInMemory,
        FileStorage
    };

    static HashMap<String, Call> taskTable = new HashMap<>();

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

        if (body != null && headers.hasKey("content-type") && "application/x-www-form-urlencoded".equals(headers.getString("content-type")))
			requestType = RequestType.Encoded;
		else if (body != null)
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
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            RequestType.SingleFile,
                            rawRequestBody,
                            RNFetchBlobConst.MIME_OCTET
                    ));
                    break;
                case Form:
                    builder.method(method, new RNFetchBlobBody(
                            taskId,
                            RequestType.Form,
                            rawRequestBodyArray,
                            MediaType.parse("multipart/form-data; boundary=RNFetchBlob-" + taskId)
                    ));
                    break;
				case Encoded:
					// rawRequestBody has an expected format of
					// key1=value1&key2=value&...
					FormBody.Builder formBuilder = new FormBody.Builder();

					String[] pairs = rawRequestBody.split("&");
					for ( String pair : pairs ) {
						String[] kv = pair.split("=");
						formBuilder.add(kv[0], kv[1]);
					}

					RequestBody body = formBuilder.build();

					builder.method(method, body);
					break;
                case WithoutBody:
                    builder.method(method, null);
                    break;
            }

            final Request req = builder.build();

//          create response handler
            clientBuilder.addInterceptor(new Interceptor() {
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

            OkHttpClient client = clientBuilder.build();
            Call call = client.newCall(req);
            taskTable.put(taskId, call);
            call.enqueue(new okhttp3.Callback() {
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


        } catch (Exception error) {
            error.printStackTrace();
            taskTable.remove(taskId);
            callback.invoke("RNFetchBlob request error: " + error.getMessage() + error.getCause());
        }
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
                try{
                    resp.body().bytes();
                } catch (Exception ignored) {

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
        if(taskTable.containsKey(taskId))
            taskTable.remove(taskId);
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
                        this.callback.invoke(null, filePath);
                    }
                    else
                        this.callback.invoke(null, null);
                }
            }
        }
    }


}
