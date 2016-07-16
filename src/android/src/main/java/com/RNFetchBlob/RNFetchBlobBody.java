package com.RNFetchBlob;

import android.net.Uri;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.Buffer;
import okio.BufferedSink;
import okio.ByteString;
import okio.ForwardingSink;
import okio.Okio;
import okio.Sink;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobBody extends RequestBody{

    InputStream requestStream;
    long contentLength;
    long bytesWritten = 0;
    ReadableArray form;
    String mTaskId;
    RNFetchBlobReq.RequestType requestType;
    MediaType mime;

    public RNFetchBlobBody(String taskId, RNFetchBlobReq.RequestType type, ReadableArray form, InputStream stream, long size, MediaType contentType) {
        this.mTaskId = taskId;
        this.form = form;
        requestStream = stream;
        contentLength = size;
        requestType = type;
        mime = contentType;
    }

    @Override
    public MediaType contentType() {
        return mime;
    }

    @Override
    public void writeTo(BufferedSink sink) throws IOException {

        ProgressReportingSource source = new ProgressReportingSource(sink, mTaskId, contentLength());
        BufferedSink buffer = Okio.buffer(source);
        switch (requestType) {
            case Form:
                String boundary = "RNFetchBlob-" + mTaskId;
                ArrayList<FormField> fields = countFormDataLength();
                ReactApplicationContext ctx = RNFetchBlob.RCTContext;
                for(int i = 0;i < fields.size(); i++) {
                    FormField field = fields.get(i);
                    String data = field.data;
                    String name = field.name;
                    // skip invalid fields
                    if(name == null || data == null)
                        continue;
                    // form begin
                    String header = "--" + boundary + "\r\n";
                    if (field.filename != null) {
                        header += "Content-Disposition: form-data; name=" + name + "; filename=" + field.filename + "\r\n";
                        header += "Content-Type: " + field.mime+ "\r\n\r\n";
                        sink.write(header.getBytes());
                        // file field header end
                        // upload from storage
                        if (data.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                            String orgPath = data.substring(RNFetchBlobConst.FILE_PREFIX.length());
                            orgPath = RNFetchBlobFS.normalizePath(orgPath);
                            // path starts with content://
                            if (RNFetchBlobFS.isAsset(orgPath)) {
                                try {
                                    String assetName = orgPath.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                                    InputStream in = ctx.getAssets().open(assetName);
                                    pipeStreamToSink(in, sink);
                                } catch (IOException e) {
                                    Log.e("RNFetchBlob", "Failed to create form data asset :" + orgPath + ", " + e.getLocalizedMessage() );
                                }
                            }
                            // data from normal files
                            else {
                                File file = new File(RNFetchBlobFS.normalizePath(orgPath));
                                if(file.exists()) {
                                    FileInputStream fs = new FileInputStream(file);
                                    pipeStreamToSink(fs, sink);
                                }
                                else {
                                    Log.e("RNFetchBlob", "Failed to create form data from path :" + orgPath + "file not exists.");
                                }
                            }
                        }
                        // base64 embedded file content
                        else {
                            byte[] b = Base64.decode(data, 0);
                            sink.write(b);
                            bytesWritten += b.length;
                            emitUploadProgress(bytesWritten, contentLength);
                        }

                    }
                    // data field
                    else {
                        header += "Content-Disposition: form-data; name=" + name + "\r\n";
                        header += "Content-Type: " + field.mime + "\r\n\r\n";
                        sink.write(header.getBytes());
                        byte[] fieldData = field.data.getBytes();
                        bytesWritten += fieldData.length;
                        sink.write(fieldData);
                    }
                    // form end
                    sink.write("\r\n".getBytes());
                }
                // close the form
                byte[] end = ("--" + boundary + "--\r\n").getBytes();
                sink.write(end);
                break;
            case SingleFile:
                pipeStreamToSink(requestStream, sink);
                break;
        }
        buffer.flush();
    }

    private void pipeStreamToSink(InputStream stream, BufferedSink sink) throws IOException {
        byte [] chunk = new byte[10240];
        int read = stream.read(chunk, 0, 10240);
        if(read > 0) {
            sink.write(chunk, 0, read);
        }
        bytesWritten += read;
        while(read > 0) {
            read = stream.read(chunk, 0, 10240);
            if(read > 0) {
                sink.write(chunk, 0, read);
                bytesWritten += read;
                emitUploadProgress(bytesWritten, contentLength);
            }

        }
        stream.close();
    }

    private void emitUploadProgress(long current, long total) {
        WritableMap args = Arguments.createMap();
        args.putString("taskId", mTaskId);
        args.putString("written", String.valueOf(bytesWritten));
        args.putString("total", String.valueOf(contentLength));

        // emit event to js context
        RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(RNFetchBlobConst.EVENT_UPLOAD_PROGRESS, args);
    }



    /**
     * Compute a proximate content length for form data
     * @return
     */
    private ArrayList<FormField> countFormDataLength() {
        long total = 0;
        ArrayList<FormField> list = new ArrayList<>();
        ReactApplicationContext ctx = RNFetchBlob.RCTContext;
        for(int i = 0;i < form.size(); i++) {
            ReadableMap field = form.getMap(i);
            list.add(new FormField(field));
            String data = field.getString("data");
            if (field.hasKey("filename")) {
                // upload from storage
                if (data.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                    String orgPath = data.substring(RNFetchBlobConst.FILE_PREFIX.length());
                    orgPath = RNFetchBlobFS.normalizePath(orgPath);
                    // path starts with asset://
                    if (RNFetchBlobFS.isAsset(orgPath)) {
                        try {
                            String assetName = orgPath.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                            long length = ctx.getAssets().open(assetName).available();
                            total += length;
                        } catch (IOException e) {

                        }
                    }
                    // general files
                    else {
                        File file = new File(RNFetchBlobFS.normalizePath(orgPath));
                        total += file.length();
                    }
                }
                // base64 embedded file content
                else {
                    byte[] bytes = Base64.decode(data, 0);
                    total += bytes.length;
                }
            }
            // data field
            else {
                total += field.getString("data").length();
            }
        }
        contentLength = total;
        return list;
    }

    private class FormField {
        public String name;
        public String filename;
        public String mime;
        public String data;

        public FormField(ReadableMap rawData) {
            if(rawData.hasKey("name"))
                name = rawData.getString("name");
            if(rawData.hasKey("filename"))
                filename = rawData.getString("filename");
            if(rawData.hasKey("type"))
                mime = rawData.getString("type");
            else {
                mime = filename == null ? "text/plain" : "application/octet-stream";
            }
            if(rawData.hasKey("data"))
                data = rawData.getString("data");
        }
    }

    private final class ProgressReportingSource extends ForwardingSink {

        private long bytesWritten = 0;
        private String mTaskId;
        private long mContentLength ;
        private Sink delegate;

        public ProgressReportingSource (Sink delegate, String taskId, long contentLength) {
            super(delegate);
            this.mTaskId = taskId;
            this.mContentLength = contentLength;
            this.delegate = delegate;
        }

        @Override
        public void write(Buffer source, long byteCount) throws IOException {
            delegate.write(source, byteCount);
            // on progress, emit RNFetchBlobProgress upload progress event with ticketId,
            // bytesWritten, and totalSize
            bytesWritten += byteCount;
            WritableMap args = Arguments.createMap();
            args.putString("taskId", mTaskId);
            args.putString("written", String.valueOf(bytesWritten));
            args.putString("total", String.valueOf(mContentLength ));

            // emit event to js context
            RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(RNFetchBlobConst.EVENT_UPLOAD_PROGRESS, args);
        }
    }
}
