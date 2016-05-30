package com.RNFetchBlob;

import android.os.AsyncTask;
import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.Base64;

import java.io.File;
import java.io.FileInputStream;

import cz.msebera.android.httpclient.util.EncodingUtils;

/**
 * Created by wkh237 on 2016/5/26.
 */
public class RNFetchBlobFS {

    ReactApplicationContext mCtx;
    DeviceEventManagerModule.RCTDeviceEventEmitter emitter;

    static public String getTmpPath(ReactApplicationContext ctx, String taskId) {
        return ctx.getFilesDir() + "/RNFetchBlobTmp_" + taskId;
    }


    RNFetchBlobFS(ReactApplicationContext ctx) {
        this.mCtx = ctx;
        this.emitter = ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
    }

    public void readStream( String path, String encoding, int bufferSize) {
        AsyncTask<String, Integer, Integer> task = new AsyncTask<String, Integer, Integer>() {
            @Override
            protected Integer doInBackground(String ... args) {
                String path = args[0];
                String encoding = args[1];
                int bufferSize = Integer.parseInt(args[2]);
                String eventName = "RNFetchBlobStream+" + path;
                try {

                    int chunkSize = encoding.equalsIgnoreCase("base64") ? 1026 : 1024;
                    if(bufferSize > 0)
                        chunkSize = bufferSize;
                    FileInputStream fs = new FileInputStream(new File(path));
                    byte[] buffer = new byte[chunkSize];
                    int cursor = 0;
                    boolean error = false;

                    if (encoding.equalsIgnoreCase("utf8")) {
                        while ((cursor = fs.read(buffer)) != -1) {
                            String chunk = new String(buffer, 0, cursor, "UTF-8");
                            emitStreamEvent(eventName, "data", chunk);
                        }
                    } else if (encoding.equalsIgnoreCase("ascii")) {
                        while ((cursor = fs.read(buffer)) != -1) {
                            String chunk = EncodingUtils.getAsciiString(buffer, 0, cursor);
                            emitStreamEvent(eventName, "data", chunk);
                        }
                    } else if (encoding.equalsIgnoreCase("base64")) {
                        while ((cursor = fs.read(buffer)) != -1) {
                            emitStreamEvent(eventName, "data", Base64.encodeToString(buffer, Base64.NO_WRAP));
                        }
                    } else {
                        String msg = "unrecognized encoding `" + encoding + "`";
                        emitStreamEvent(eventName, "error", msg);
                        error = true;
                    }

                    if(!error)
                        emitStreamEvent(eventName, "end", "");
                    fs.close();


                } catch (Exception err) {
                    emitStreamEvent(eventName, "error", err.getLocalizedMessage());
                }
                return null;
            }
        };
        task.execute(path, encoding, String.valueOf(bufferSize));
    }

    void emitStreamEvent(String streamName, String event, String data) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("event", event);
        eventData.putString("detail", data);
        this.emitter.emit(streamName, eventData);
    }

    void emitFSData(String taskId, String event, String data) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("event", event);
        eventData.putString("detail", data);
        this.emitter.emit("RNFetchBlobStream" + taskId, eventData);
    }
}


