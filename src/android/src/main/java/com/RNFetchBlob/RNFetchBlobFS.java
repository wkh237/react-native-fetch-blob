package com.RNFetchBlob;

import android.os.AsyncTask;
import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.Base64;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import cz.msebera.android.httpclient.util.EncodingUtils;

/**
 * Created by wkh237 on 2016/5/26.
 */
public class RNFetchBlobFS {

    ReactApplicationContext mCtx;
    DeviceEventManagerModule.RCTDeviceEventEmitter emitter;
    String encoding = "base64";
    boolean append = false;
    FileOutputStream writeStreamInstance = null;
    static HashMap<String, RNFetchBlobFS> fileStreams = new HashMap<>();

    RNFetchBlobFS(ReactApplicationContext ctx) {
        this.mCtx = ctx;
        this.emitter = ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
    }

    /**
     * Static method that returns system folders to JS context
     * @param ctx   React Native application context
     * @param callback  Javascript callback function
     */
    static public void getSystemfolders(ReactApplicationContext ctx, Callback callback) {
        callback.invoke(
                // document folder
                String.valueOf(ctx.getFilesDir()),
                // cache folder
                String.valueOf(ctx.getCacheDir()),
                // SD card folder
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM)),
                // Download folder
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        );
    }

    /**
     * Static method that returns a temp file path
     * @param ctx   React Native application context
     * @param taskId    An unique string for identify
     * @return
     */
    static public String getTmpPath(ReactApplicationContext ctx, String taskId) {
        return ctx.getFilesDir() + "/RNFetchBlobTmp_" + taskId;
    }

    /**
     * Create a file stream for read
     * @param path  File stream target path
     * @param encoding  File stream decoder, should be one of `base64`, `utf8`, `ascii`
     * @param bufferSize    Buffer size of read stream, default to 4096 (4095 when encode is `base64`)
     */
    public void readStream( String path, String encoding, int bufferSize) {
        AsyncTask<String, Integer, Integer> task = new AsyncTask<String, Integer, Integer>() {
            @Override
            protected Integer doInBackground(String ... args) {
                String path = args[0];
                String encoding = args[1];
                int bufferSize = Integer.parseInt(args[2]);
                String eventName = "RNFetchBlobStream+" + path;
                try {

                    int chunkSize = encoding.equalsIgnoreCase("base64") ? 4095 : 4096;
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

    /**
     * Create a write stream and store its instance in RNFetchBlobFS.fileStreams
     * @param path  Target file path
     * @param encoding Should be one of `base64`, `utf8`, `ascii`
     * @param append    Flag represents if the file stream overwrite existing content
     * @param callback
     */
    public void writeStream(String path, String encoding, boolean append, Callback callback) {
        File dest = new File(path);
        if(!dest.exists() || dest.isDirectory()) {
            callback.invoke("target path `" + path + "` may not exists or it's a folder");
            return;
        }
        try {
            OutputStream fs = new FileOutputStream(path, append);
            this.encoding = encoding;
            this.append = append;
            String streamId = UUID.randomUUID().toString();
            RNFetchBlobFS.fileStreams.put(streamId, this);
            callback.invoke(null, streamId);
        } catch(Exception err) {
            callback.invoke("failed to create write stream at path `"+path+"` "+ err.getLocalizedMessage());
        }

    }

    /**
     * Write a chunk of data into a file stream.
     * @param streamId File stream ID
     * @param data  Data chunk in string format
     * @param callback JS context callback
     */
    static void writeChunk(String streamId, String data, Callback callback) {

        RNFetchBlobFS fs = fileStreams.get(streamId);
        FileOutputStream stream = fs.writeStreamInstance;
        byte [] chunk;
        if(fs.encoding.equalsIgnoreCase("ascii")) {
            chunk = data.getBytes(Charset.forName("US-ASCII"));
        }
        else if(fs.encoding.equalsIgnoreCase("base64")) {
            chunk = Base64.decode(data, 0);
        }
        else if(fs.encoding.equalsIgnoreCase("utf8")) {
            chunk = data.getBytes(Charset.forName("UTF-8"));
        }
        else {
            chunk = data.getBytes(Charset.forName("US-ASCII"));
        }
        try {
            stream.write(chunk);
            callback.invoke(null);
        } catch (IOException e) {
            callback.invoke(e.getLocalizedMessage());
        }
    }

    /**
     * Close file stream by ID
     * @param streamId Stream ID
     * @param callback JS context callback
     */
    static void closeStream(String streamId, Callback callback) {
        try {
            RNFetchBlobFS fs = fileStreams.get(streamId);
            FileOutputStream stream = fs.writeStreamInstance;
            stream.close();
            stream = null;
            fileStreams.remove(streamId);
        } catch(Exception err) {
            callback.invoke(err.getLocalizedMessage());
        }
    }

    /**
     * Unlink file at path
     * @param path  Path of target
     * @param callback  JS context callback
     */
    static void unlink(String path, Callback callback) {
        try {
            boolean success = new File(path).delete();
            callback.invoke(success);
        } catch(Exception err) {
            if(err != null)
            callback.invoke(err.getLocalizedMessage());
        }
    }

    /**
     * Copy file to destination path
     * @param path Source path
     * @param dest Target path
     * @param callback  JS context callback
     */
    static void cp(String path, String dest, Callback callback) {
        InputStream in = null;
        OutputStream out = null;

        try {

            String destFolder = new File(dest).getPath();
            if(!new File(path).exists()) {
                callback.invoke("source file at path`" + path + "` not exists");
                return;
            }
            if(!new File(destFolder).exists())
                new File(destFolder).mkdir();
            if(!new File(dest).exists())
                new File(dest).createNewFile();

            in = new FileInputStream(path);
            out = new FileOutputStream(dest);

            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
            in.close();
            out.close();
            callback.invoke(null);
        } catch (Exception err) {
            if(err != null)
                callback.invoke(err.getLocalizedMessage());
        } finally {
            try {
                in.close();
            } catch (IOException e) {
                callback.invoke(e.getLocalizedMessage());
            }
            try {
                out.close();
            } catch (IOException e) {
                callback.invoke(e.getLocalizedMessage());
            }
        }
    }

    /**
     * Move file
     * @param path Source file path
     * @param dest Destination file path
     * @param callback JS context callback
     */
    static void mv(String path, String dest, Callback callback) {
        File src = new File(path);
        if(!src.exists()) {
            callback.invoke("source file at path `" + path + "` does not exists");
            return;
        }
        src.renameTo(new File(dest));
        callback.invoke(null);
    }

    /**
     * Check if the path exists, also check if it is a folder when exists.
     * @param path Path to check
     * @param callback  JS context callback
     */
    static void exists(String path, Callback callback) {
        boolean exist = new File(path).exists();
        boolean isDir = false;
        if(exist)
         isDir = new File(path).isDirectory();
        callback.invoke(exist, isDir);
    }

    /**
     * List content of folder
     * @param path Target folder
     * @param callback  JS context callback
     */
    static void ls(String path, Callback callback) {
        File src = new File(path);
        if(!src.exists() || !src.isDirectory())
            callback.invoke(null);
        String [] files = new File(path).list();
        callback.invoke(files);
    }

    /**
     * Private method for emit read stream event.
     * @param streamName    ID of the read stream
     * @param event Event name, `data`, `end`, `error`, etc.
     * @param data  Event data
     */
    void emitStreamEvent(String streamName, String event, String data) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("event", event);
        eventData.putString("detail", data);
        this.emitter.emit(streamName, eventData);
    }

    // TODO : should we remove this ?
    void emitFSData(String taskId, String event, String data) {
        WritableMap eventData = Arguments.createMap();
        eventData.putString("event", event);
        eventData.putString("detail", data);
        this.emitter.emit("RNFetchBlobStream" + taskId, eventData);
    }
}


