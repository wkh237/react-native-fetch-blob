package com.RNFetchBlob;

import android.os.AsyncTask;
import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.Base64;

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
    
    // TODO : make it an AsyncTask
    public void readStream(final String path, String encoding) {
        AsyncTask<String, Integer, Integer> task = new AsyncTask<String, Integer, Integer>() {
            @Override
            protected Integer doInBackground(String ... args) {
                String path = args[0];
                String encoding = args[1];
                String eventName = "RNFetchBlobStream+" + path;
                try {
                    FileInputStream fs = mCtx.openFileInput(mCtx.getFilesDir() + "/"+ path);
                    byte[] buffer = new byte[1024];
                    int cursor = 0;
                    boolean error = false;

                    if (encoding.toLowerCase() == "utf8") {
                        while ((cursor = fs.read(buffer)) != -1) {
                            String chunk = new String(buffer, 0, cursor, "UTF-8");
                            emitFSData(eventName, "data", chunk);
                        }
                    } else if (encoding.toLowerCase() == "ascii") {
                        while ((cursor = fs.read(buffer)) != -1) {
                            String chunk = EncodingUtils.getAsciiString(buffer, 0, cursor);
                            emitFSData(eventName, "data", chunk);
                        }
                    } else if (encoding.toLowerCase() == "base64") {
                        while ((cursor = fs.read(buffer)) != -1) {
                            emitFSData(eventName, "data", Base64.encodeToString(buffer, Base64.NO_WRAP));
                        }
                    } else {
                        String msg = "unrecognized encoding `" + encoding + "`";
                        emitFSData(eventName, "error", msg);
                        error = true;
                    }

                    if(!error)
                        emitFSData(eventName, "end", "");

                } catch (Exception err) {
                    emitFSData(eventName, "error", err.getLocalizedMessage());
                }
                return null;
            }
        };
        task.execute(path, encoding);
    }

    void emitFSData(String taskId, String event, String data) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("event", event);
        eventData.putString("detail", data);
        this.emitter.emit("RNFetchBlobStream" + taskId, eventData);
    }
}


