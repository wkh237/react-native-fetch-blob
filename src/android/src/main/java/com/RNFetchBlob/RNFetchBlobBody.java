package com.RNFetchBlob;

import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okhttp3.FormBody;
import okio.Buffer;
import okio.BufferedSink;
import okio.ForwardingSink;
import okio.Okio;
import okio.Sink;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobBody extends RequestBody{

    InputStream requestStream;
    long contentLength = 0;
    long bytesWritten = 0;
    ReadableArray form;
    String mTaskId;
    String rawBody;
    RNFetchBlobReq.RequestType requestType;
    MediaType mime;
    File bodyCache;


    public RNFetchBlobBody(String taskId, RNFetchBlobReq.RequestType type, ReadableArray form, MediaType contentType) {
        this.mTaskId = taskId;
        this.form = form;
        requestType = type;
        mime = contentType;
        try {
            bodyCache = createMultipartBodyCache();
            contentLength = bodyCache.length();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public RNFetchBlobBody(String taskId, RNFetchBlobReq.RequestType type, String rawBody, MediaType contentType) {
        this.mTaskId = taskId;
        requestType = type;
        this.rawBody = rawBody;
        mime = contentType;
    }

    @Override
    public long contentLength() {
        return contentLength;
    }
    @Override
    public MediaType contentType() {
        return mime;
    }

    @Override
    public void writeTo(BufferedSink sink) throws IOException {

        ProgressReportingSource source = new ProgressReportingSource(sink, mTaskId);
        BufferedSink buffer = Okio.buffer(source);
        switch (requestType) {
            case Form:
                pipeStreamToSink(new FileInputStream(bodyCache), sink);
                break;
            case SingleFile:
                if(requestStream != null)
                    pipeStreamToSink(requestStream, sink);
                break;
            case AsIs:
				writeRawData(sink);
				break;
        }
        buffer.flush();
    }

    private void caculateOctetContentLength() {
        long total = 0;
        // upload from storage
        if (rawBody.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
            String orgPath = rawBody.substring(RNFetchBlobConst.FILE_PREFIX.length());
            orgPath = RNFetchBlobFS.normalizePath(orgPath);
            // upload file from assets
            if (RNFetchBlobFS.isAsset(orgPath)) {
                try {
                    String assetName = orgPath.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                    contentLength = RNFetchBlob.RCTContext.getAssets().openFd(assetName).getLength();
                    requestStream = RNFetchBlob.RCTContext.getAssets().open(assetName);
                } catch (IOException e) {
//                        e.printStackTrace();
                }
            } else {
                File f = new File(RNFetchBlobFS.normalizePath(orgPath));
                try {
                    if(!f.exists())
                        f.createNewFile();
                    contentLength = f.length();
                    requestStream = new FileInputStream(f);
                } catch (Exception e) {
//                        callback.invoke(e.getLocalizedMessage(), null);
                }
            }
        } else {
            try {
                byte[] bytes = Base64.decode(rawBody, 0);
                contentLength = bytes.length;
                requestStream = new ByteArrayInputStream(bytes);
            } catch(Exception ex) {
                Log.e("error", ex.getLocalizedMessage());
            }
        }
    }

    /**
     * Create a temp file that contains content of multipart form data content
     * @return The cache file object
     * @throws IOException
     */
    private File createMultipartBodyCache() throws IOException {
        String boundary = "RNFetchBlob-" + mTaskId;

        File outputDir = RNFetchBlob.RCTContext.getCacheDir(); // context being the Activity pointer
        File outputFile = File.createTempFile("rnfb-form-tmp", "", outputDir);
        FileOutputStream os = new FileOutputStream(outputFile);

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
                header += "Content-Type: " + field.mime + "\r\n\r\n";
                os.write(header.getBytes());
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
                            pipeStreamToFileStream(in, os);
                        } catch (IOException e) {
                            Log.e("RNFetchBlob", "Failed to create form data asset :" + orgPath + ", " + e.getLocalizedMessage() );
                        }
                    }
                    // data from normal files
                    else {
                        File file = new File(RNFetchBlobFS.normalizePath(orgPath));
                        if(file.exists()) {
                            FileInputStream fs = new FileInputStream(file);
                            pipeStreamToFileStream(fs, os);
                        }
                        else {
                            Log.e("RNFetchBlob", "Failed to create form data from path :" + orgPath + "file not exists.");
                        }
                    }
                }
                // base64 embedded file content
                else {
                    byte[] b = Base64.decode(data, 0);
                    os.write(b);
                    bytesWritten += b.length;
                    emitUploadProgress();
                }

            }
            // data field
            else {
                header += "Content-Disposition: form-data; name=" + name + "\r\n";
                header += "Content-Type: " + field.mime + "\r\n\r\n";
                os.write(header.getBytes());
                byte[] fieldData = field.data.getBytes();
                bytesWritten += fieldData.length;
                os.write(fieldData);
            }
            // form end
            os.write("\r\n".getBytes());
        }
        // close the form
        byte[] end = ("--" + boundary + "--\r\n").getBytes();
        os.write(end);
        os.flush();
        os.close();
        return outputFile;
    }

	/**
     * Write data to request body as-is
     * @param sink
     */
	private void writeRawData(BufferedSink sink) throws IOException {
        byte[] bytes = rawBody.getBytes();
        contentLength = bytes.length;
		sink.write(bytes);
	}

    /**
     * Pipe input stream to request body output stream
     * @param stream    The input stream
     * @param sink      The request body buffer sink
     * @throws IOException
     */
    private void pipeStreamToSink(InputStream stream, BufferedSink sink) throws IOException {
        byte [] chunk = new byte[10240];
        int read;
        while((read = stream.read(chunk, 0, 10240)) > 0) {
            if(read > 0) {
                sink.write(chunk, 0, read);
            }
        }
        stream.close();
    }

    /**
     * Pipe input stream to a file
     * @param is    The input stream
     * @param os    The output stream to a file
     * @throws IOException
     */
    private void pipeStreamToFileStream(InputStream is, FileOutputStream os) throws IOException {

        byte[] buf = new byte[10240];
        int len;
        while ((len = is.read(buf)) > 0) {
            os.write(buf, 0, len);
        }
        is.close();
    }

    /**
     * Compute approximate content length for form data
     * @return
     */
    private ArrayList<FormField> countFormDataLength() {
        long total = 0;
        ArrayList<FormField> list = new ArrayList<>();
        ReactApplicationContext ctx = RNFetchBlob.RCTContext;
        for(int i = 0;i < form.size(); i++) {
            FormField field = new FormField(form.getMap(i));
            list.add(field);
            String data = field.data;
            if (field.filename != null) {
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
                total += field.data != null ? field.data.getBytes().length : 0;
            }
        }
        contentLength = total;
        return list;
    }

    /**
     * Since ReadableMap could only be access once, we have to store the field into a map for
     * repeatedly access.
     */
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
            if(rawData.hasKey("data")) {
                data = rawData.getString("data");
            }
        }
    }

    private void emitUploadProgress() {
        WritableMap args = Arguments.createMap();
        args.putString("taskId", mTaskId);
        args.putString("written", String.valueOf(bytesWritten));
        args.putString("total", String.valueOf(contentLength));

        // emit event to js context
        RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(RNFetchBlobConst.EVENT_UPLOAD_PROGRESS, args);
    }

    private final class ProgressReportingSource extends ForwardingSink {

        private long bytesWritten = 0;
        private String mTaskId;
        private Sink delegate;

        public ProgressReportingSource (Sink delegate, String taskId) {
            super(delegate);
            this.mTaskId = taskId;
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
            args.putString("total", String.valueOf(contentLength));

            if(RNFetchBlobReq.isReportUploadProgress(mTaskId)) {
                // emit event to js context
                RNFetchBlob.RCTContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(RNFetchBlobConst.EVENT_UPLOAD_PROGRESS, args);
            }
        }
    }
}
