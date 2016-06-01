package com.RNFetchBlob;

import android.os.AsyncTask;
import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.loopj.android.http.Base64;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
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
    OutputStream writeStreamInstance = null;
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
                String.valueOf(ctx.getFilesDir().getAbsolutePath()),
                // cache folder
                String.valueOf(ctx.getCacheDir().getAbsolutePath()),
                // SD card folder
                String.valueOf(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM).getAbsolutePath()),
                // Download folder
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath()
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
                            if(cursor < chunkSize) {
                                byte [] copy = new byte[cursor];
                                for(int i =0;i<cursor;i++) {
                                    copy[i] = buffer[i];
                                }
                                emitStreamEvent(eventName, "data", Base64.encodeToString(copy, Base64.NO_WRAP));
                            }
                            else
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
            this.writeStreamInstance = fs;
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
        OutputStream stream = fs.writeStreamInstance;
        byte [] chunk = RNFetchBlobFS.stringToBytes(data, fs.encoding);

        try {
            stream.write(chunk);
            callback.invoke();
        } catch (Exception e) {
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
            OutputStream stream = fs.writeStreamInstance;
            fileStreams.remove(streamId);
            stream.close();
            callback.invoke();
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
            callback.invoke( null, success);
        } catch(Exception err) {
            if(err != null)
            callback.invoke(err.getLocalizedMessage());
        }
    }
    /**
     * Make a folder
     * @param path Source path
     * @param callback  JS context callback
     */
    static void mkdir(String path, Callback callback) {
        File dest = new File(path);
        if(dest.exists()) {
            callback.invoke("failed to create folder at `" + path + "` folder already exists");
            return;
        }
        dest.mkdirs();
        callback.invoke();
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

            if(!new File(dest).exists())
                new File(dest).createNewFile();

            in = new FileInputStream(path);
            out = new FileOutputStream(dest);

            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }

        } catch (Exception err) {
            if(err != null)
                callback.invoke(err.getLocalizedMessage());
        } finally {
            try {
                in.close();
                out.close();
                callback.invoke();
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
        callback.invoke();
    }

    /**
     * Check if the path exists, also check if it is a folder when exists.
     * @param path Path to check
     * @param callback  JS context callback
     */
    static void exists(String path, Callback callback) {
        boolean exist = new File(path).exists();
        boolean isDir = new File(path).isDirectory();;
        callback.invoke(exist, isDir);
    }

    /**
     * List content of folder
     * @param path Target folder
     * @param callback  JS context callback
     */
    static void ls(String path, Callback callback) {
        File src = new File(path);
        if(!src.exists() || !src.isDirectory()) {
            callback.invoke("failed to list path `" + path + "` for it is not exist or it is not a folder");
            return;
        }
        String [] files = new File(path).list();
        WritableArray arg = Arguments.createArray();
        for(String i : files) {
            arg.pushString(i);
        }
        callback.invoke(null, arg);
    }

    /**
     * Create new file at path
     * @param path
     * @param data
     * @param encoding
     * @param callback
     */
    static void createFile(String path, String data, String encoding, Callback callback) {
        try {
            File dest = new File(path);
            boolean created = dest.createNewFile();
            if(!created) {
                callback.invoke("failed to create file at path `" + path + "` for its parent path may not exists");
                return;
            }
            OutputStream ostream = new FileOutputStream(dest);
            ostream.write(RNFetchBlobFS.stringToBytes(data, encoding));
            callback.invoke(null, path);
        } catch(Exception err) {
            callback.invoke(err.getLocalizedMessage());
        }
    }

    static void removeSession(ReadableArray paths, Callback callback) {

        AsyncTask<ReadableArray, Integer, Integer> task = new AsyncTask<ReadableArray, Integer, Integer>() {
            @Override
            protected Integer doInBackground(ReadableArray ...paths) {
                for(int i =0; i< paths[0].size(); i++) {
                    File f = new File(paths[0].getString(i));
                    if(f.exists())
                        f.delete();
                }
                return paths[0].size();
            }
        };
        task.execute(paths);
    }

    /**
     * String to byte converter method
     * @param data  Raw data in string format
     * @param encoding Decoder name
     * @return  Converted data byte array
     */
    private static byte[] stringToBytes(String data, String encoding) {
        if(encoding.equalsIgnoreCase("ascii")) {
            return data.getBytes(Charset.forName("US-ASCII"));
        }
        else if(encoding.equalsIgnoreCase("base64")) {
            return Base64.decode(data, 0);
        }
        else if(encoding.equalsIgnoreCase("utf8")) {
            return data.getBytes(Charset.forName("UTF-8"));
        }
        return data.getBytes(Charset.forName("US-ASCII"));
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


