package com.RNFetchBlob;

import android.app.IntentService;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;

import com.facebook.react.modules.network.*;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Created by pkwak on 11/15/16.
 * IntentService for POSTing multi-form data. Designed for long-uploads with file
 * (but can use data body).
 */

public class RNFetchBlobService extends IntentService implements ProgressListener {
    public static String RNFetchBlobServiceBroadcast = "RNFetchBlobServiceBroadcast";

    public static String CategorySuccess = "CategorySuccess";
    public static String CategoryFail = "CategoryFail";
    public static String CategoryProgress = "CategoryProgress";

    public static String BroadcastMsg = "BroadcastMsg";
    public static String BroadcastProgressMap = "BroadcastProgressMap";
    public static String BroadcastTaskId = "BroadcastTaskId";

    public static String KeyWritten = "KeyWritten";
    public static String KeyTotal = "KeyTotal";

    /**
     * Creates an IntentService.  Invoked by your subclass's constructor.
     */
    public RNFetchBlobService() {
        super("RNFetchBlobService");
    }

    private String _taskId = null;
    @Override
    protected void onHandleIntent(final Intent intent) {

        Bundle bundle = intent.getExtras();
        _taskId = bundle.getString("taskId");
        String url = bundle.getString("url");
        HashMap<String, String> mheaders = (HashMap<String, String>)bundle.getSerializable("mheaders");
        ArrayList<Object> requestBodyArray = (ArrayList<Object>)bundle.getSerializable("requestBodyArray");

        MultipartBody.Builder requestBuilder = new MultipartBody.Builder()
                .setType(MultipartBody.FORM);
        for(Object bodyPart : requestBodyArray) {
            if (bodyPart instanceof HashMap) {
                HashMap<String, String> bodyMap = (HashMap<String, String>)bodyPart;
                String name = bodyMap.get("name");
                String type = bodyMap.get("type");
                String filename = bodyMap.get("filename");
                String data = bodyMap.get("data");
                File file = null;
                MediaType mediaType = type != null
                    ? MediaType.parse(type)
                    : filename == null
                        ? MediaType.parse("text/plain")
                        : MediaType.parse("application/octet-stream");
                if(filename != null && data.startsWith("RNFetchBlob-")) {
                    try {
                        String normalizedUri = RNFetchBlobFS.normalizePath(data.replace(RNFetchBlobConst.FILE_PREFIX, ""));
                        file = new File(String.valueOf(Uri.parse(normalizedUri)));
                    } catch (Exception e) {
                        file = null;
                    }
                }

                String contentDisposition = "form-data"
                        + (!TextUtils.isEmpty(name) ? "; name=" + name : "")
                        + (!TextUtils.isEmpty(filename) ? "; filename=" + filename : "");

                requestBuilder.addPart(
                        Headers.of("Content-Disposition", contentDisposition),
                        file != null
                                ? RequestBody.create(mediaType, file)
                                : RequestBody.create(mediaType, data)
                );
            }
        }
        RequestBody innerRequestBody = requestBuilder.build();

        ProgressRequestBody requestBody = new ProgressRequestBody(innerRequestBody, this);

        final Request.Builder builder = new Request.Builder();
        try {
            builder.url(new URL(url));
        } catch (MalformedURLException e) {
            Intent broadcastIntent = new Intent();
            broadcastIntent.setAction(RNFetchBlobServiceBroadcast);
            broadcastIntent.addCategory(CategoryFail);
            broadcastIntent.putExtra(BroadcastMsg, "Could not create URL : " + e.getMessage().getBytes());
            sendBroadcast(broadcastIntent);
            return;
        }

        builder.post(requestBody);
        for(String key : mheaders.keySet()) {
            builder.addHeader(key, mheaders.get(key));
        }

        OkHttpClient client = new OkHttpClient.Builder()
                .writeTimeout(24, TimeUnit.HOURS)
                .readTimeout(24, TimeUnit.HOURS)
                .build();

        final Call call =  client.newCall(builder.build());
        call.enqueue(new okhttp3.Callback() {

            @Override
            public void onFailure(Call call, IOException e) {
                Intent broadcastIntent = new Intent();
                broadcastIntent.setAction(RNFetchBlobServiceBroadcast);
                broadcastIntent.addCategory(CategoryFail);
                broadcastIntent.putExtra(BroadcastMsg, e.getMessage().getBytes());
                broadcastIntent.putExtra(BroadcastTaskId, _taskId);
                sendBroadcast(broadcastIntent);
                call.cancel();
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                // This is http-response success. Can be 2xx/4xx/5xx/etc.
                Intent broadcastIntent = new Intent();
                broadcastIntent.setAction(RNFetchBlobServiceBroadcast);
                broadcastIntent.addCategory(CategorySuccess);
                broadcastIntent.putExtra(BroadcastMsg, response.body().bytes());
                broadcastIntent.putExtra(BroadcastTaskId, _taskId);
                sendBroadcast(broadcastIntent);

                response.body().close();

            }

        });
    }

    private int _progressPercent = 0;
    private long _lastProgressTime = 0;
    @Override
    public void onProgress(long bytesWritten, long contentLength, boolean done) {

        // no more than once per %
        int currentPercent = (int)((bytesWritten * 100) / contentLength);
        if (currentPercent <= _progressPercent) {
            return;
        }
        _progressPercent = currentPercent;

        // no more than twice a second.
        long now = System.currentTimeMillis();
        if (_lastProgressTime + 500 > now) {
            return;
        }
        _lastProgressTime = now;

        Intent broadcastIntent = new Intent();
        broadcastIntent.setAction(RNFetchBlobServiceBroadcast);
        broadcastIntent.addCategory(CategoryProgress);
        broadcastIntent.putExtra(BroadcastTaskId, _taskId);
        HashMap map = new HashMap();
        map.put(KeyWritten, Long.valueOf(bytesWritten));
        map.put(KeyTotal, Long.valueOf(contentLength));
        broadcastIntent.putExtra(BroadcastProgressMap, map);
        sendBroadcast(broadcastIntent);
    }
}
