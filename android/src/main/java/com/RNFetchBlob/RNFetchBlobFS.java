package com.RNFetchBlob;

import android.content.res.AssetFileDescriptor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Environment;
import android.os.StatFs;
import android.util.Base64;

import com.RNFetchBlob.Utils.PathResolver;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import javax.annotation.Nullable;

class RNFetchBlobFS {

    private final ReactApplicationContext mCtx;

    static private class StreamData {
        InputStream readStreamInstance;
        OutputStream writeStreamInstance;
        String encoding;

        StreamData(@Nullable InputStream inputStream, @Nullable OutputStream outputStream, String encoding) {
            this.readStreamInstance = inputStream;
            this.writeStreamInstance = outputStream;
            this.encoding = encoding.toLowerCase();
        }
    }

    private static final HashMap<String, StreamData> fileStreams = new HashMap<>();

    private static final List<String> ENCODINGS = Arrays.asList("ascii","utf8","base64");

    RNFetchBlobFS(ReactApplicationContext ctx) {
        this.mCtx = ctx;
    }

    /**
     * Write string with encoding to file
     * @param path Destination file path.
     * @param encoding Encoding of the string.
     * @param data Array passed from JS context.
     * @param promise RCT Promise
     */
    static void writeFile(String path, String encoding, String data, final boolean append, final Promise promise) {
        try {
            if (!ENCODINGS.contains(encoding.toLowerCase()) && !encoding.equalsIgnoreCase(RNFetchBlobConst.DATA_ENCODE_URI)) {
                promise.reject(
                    "EINVAL",
                    "Unrecognized encoding '" + encoding + "', should be one of 'base64', 'utf8', 'ascii' or '" + RNFetchBlobConst.DATA_ENCODE_URI + "'"
                );
                return;
            }

            int written;
            File f = new File(path);
            File dir = f.getParentFile();

            if(!f.exists()) {
                if(dir != null && !dir.exists()) {
                    if (!dir.mkdirs()) {
                        promise.reject("EUNSPECIFIED", "Failed to create parent directory of '" + path + "'");
                        return;
                    }
                }
                if(!f.createNewFile()) {
                    promise.reject("ENOENT", "File '" + path + "' does not exist and could not be created");
                    return;
                }
            }

            FileOutputStream fout = new FileOutputStream(f, append);
            // write data from a file
            if(encoding.equalsIgnoreCase(RNFetchBlobConst.DATA_ENCODE_URI)) {
                String normalizedData = normalizePath(data);
                File src = new File(normalizedData);
                if (!src.exists()) {
                    promise.reject("ENOENT", "No such file '" + path + "' " + "('" + normalizedData + "')");
                    fout.close();
                    return;
                }
                FileInputStream fin = new FileInputStream(src);
                byte[] buffer = new byte [10240];
                int read;
                written = 0;
                while((read = fin.read(buffer)) > 0) {
                    fout.write(buffer, 0, read);
                    written += read;
                }
                fin.close();
            }
            else {
                byte[] bytes = stringToBytes(data, encoding);
                fout.write(bytes);
                written = bytes.length;
            }
            fout.close();
            promise.resolve(written);
        } catch (FileNotFoundException e) {
            // According to https://docs.oracle.com/javase/7/docs/api/java/io/FileOutputStream.html
            promise.reject("ENOENT", "File '" + path + "' does not exist and could not be created, or it is a directory");
        } catch (Exception e) {
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
        }
    }

    /**
     * Write array of bytes into file
     * @param path Destination file path.
     * @param data Array passed from JS context.
     * @param promise RCT Promise
     */
    static void writeFile(String path, ReadableArray data, final boolean append, final Promise promise) {
        try {
            File f = new File(path);
            File dir = f.getParentFile();

            if(!f.exists()) {
                if(dir != null && !dir.exists()) {
                    if (!dir.mkdirs()) {
                        promise.reject("ENOTDIR", "Failed to create parent directory of '" + path + "'");
                        return;
                    }
                }
                if(!f.createNewFile()) {
                    promise.reject("ENOENT", "File '" + path + "' does not exist and could not be created");
                    return;
                }
            }

            FileOutputStream os = new FileOutputStream(f, append);
            byte[] bytes = new byte[data.size()];
            for(int i=0;i<data.size();i++) {
                bytes[i] = (byte) data.getInt(i);
            }
            os.write(bytes);
            os.close();
            promise.resolve(data.size());
        } catch (FileNotFoundException e) {
            // According to https://docs.oracle.com/javase/7/docs/api/java/io/FileOutputStream.html
            promise.reject("ENOENT", "File '" + path + "' does not exist and could not be created");
        } catch (Exception e) {
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
        }
    }

    /**
     * Read file with a buffer that has the same size as the target file.
     * @param path  Path of the file.
     * @param encoding  Encoding of read stream.
     * @param promise  JS promise
     */
    static void readFile(String path, String encoding, final Promise promise) {
        try {
            if (!ENCODINGS.contains(encoding.toLowerCase())) {
                promise.reject("EINVAL", "Unrecognized encoding `" + encoding + "`, should be one of `base64`, `utf8`, `ascii`");
                return;
            }

            String resolved = normalizePath(path);
            if(resolved != null) {
                path = resolved;
            }

            byte[] bytes;
            int bytesRead;
            int length;  // max. array length limited to "int", also see https://stackoverflow.com/a/10787175/544779

            if(resolved != null && resolved.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
                String assetName = path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                // This fails should an asset file be >2GB
                length = (int) RNFetchBlob.RCTContext.getAssets().openFd(assetName).getLength();
                bytes = new byte[length];
                InputStream in = RNFetchBlob.RCTContext.getAssets().open(assetName);
                bytesRead = in.read(bytes, 0, length);
                in.close();
            }
            // issue 287
            else if(resolved == null) {
                InputStream in = RNFetchBlob.RCTContext.getContentResolver().openInputStream(Uri.parse(path));
                if(in == null) {
                    throw new FileNotFoundException();
                }
                bytesRead = 0;
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                while(true) {
                    int n = in.read(buf);
                    if( n < 0 ) break;
                    bytesRead += n;
                    baos.write(buf, 0, n);
                }
                length = bytesRead;
                bytes = baos.toByteArray();
                in.close();
            }
            else {
                File f = new File(path);
                length = (int) f.length();
                bytes = new byte[length];
                FileInputStream in = new FileInputStream(f);
                bytesRead = in.read(bytes);
                in.close();
            }

            if (bytesRead < length) {
                promise.reject("EUNSPECIFIED", "Read only " + bytesRead + " bytes of " + length);
                return;
            }

            switch (encoding.toLowerCase()) {
                case "base64" :
                    promise.resolve(Base64.encodeToString(bytes, Base64.NO_WRAP));
                    break;
                case "ascii" :
                    WritableArray asciiResult = Arguments.createArray();
                    for (byte b : bytes) {
                        asciiResult.pushInt((int) b);
                    }
                    promise.resolve(asciiResult);
                    break;
                case "utf8" :
                    promise.resolve(new String(bytes));
                    break;
            }
        }
        catch(FileNotFoundException err) {
            String msg = err.getLocalizedMessage();
            if (msg.contains("EISDIR")) {
                promise.reject("EISDIR", "Expecting a file but '" + path + "' is a directory; " +  msg);
            } else {
                promise.reject("ENOENT", "No such file '" + path + "'; " + msg);
            }
        }
        catch(Exception err) {
            promise.reject("EUNSPECIFIED", err.getLocalizedMessage());
        }

    }

    /**
     * Static method that returns system folders to JS context
     * @param ctx   React Native application context
     */
    static Map<String, Object> getSystemfolders(ReactApplicationContext ctx) {
        Map<String, Object> res = new HashMap<>();

        res.put("DocumentDir", ctx.getFilesDir().getAbsolutePath());
        res.put("CacheDir", ctx.getCacheDir().getAbsolutePath());
        res.put("DCIMDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM).getAbsolutePath());
        res.put("PictureDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES).getAbsolutePath());
        res.put("MusicDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC).getAbsolutePath());
        res.put("DownloadDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath());
        res.put("MovieDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES).getAbsolutePath());
        res.put("RingtoneDir", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_RINGTONES).getAbsolutePath());
        String state;
        state = Environment.getExternalStorageState();
        if (state.equals(Environment.MEDIA_MOUNTED)) {
            res.put("SDCardDir", Environment.getExternalStorageDirectory().getAbsolutePath());
            final File externalFilesDir = ctx.getExternalFilesDir(null);
            if (externalFilesDir == null) {
                res.put("SDCardApplicationDir", null);
            } else {
                res.put("SDCardApplicationDir", externalFilesDir.getParentFile().getAbsolutePath());
            }
        }
        res.put("MainBundleDir", ctx.getApplicationInfo().dataDir);
        return res;
    }

    /**
     * Static method that returns a temp file path
     * @param taskId    An unique string for identify
     * @return String
     */
    static String getTmpPath(String taskId) {
        return RNFetchBlob.RCTContext.getFilesDir() + "/RNFetchBlobTmp_" + taskId;
    }

    /**
     * Create a file stream for reading
     * @param path  File stream target path
     * @param encoding  File stream decoder, should be one of `base64`, `utf8`, `ascii`
     * @param callback JS context callback
     */
    static void readStream(String path, String encoding, Callback callback) {
        if (!ENCODINGS.contains(encoding.toLowerCase())) {
            callback.invoke("EINVAL", "Unrecognized encoding `" + encoding + "`, should be one of `base64`, `utf8`, `ascii`");
            return;
        }

        InputStream fs;

        try {
            String resolved = normalizePath(path);
            if(resolved != null) {
                path = resolved;
            }

            if(resolved != null && path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
                fs = RNFetchBlob.RCTContext.getAssets().open(path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, ""));
            }
            // fix issue 287
            else if(resolved == null) {
                fs = RNFetchBlob.RCTContext.getContentResolver().openInputStream(Uri.parse(path));
            }
            else {
                fs = new FileInputStream(new File(path));
            }

            String streamId = UUID.randomUUID().toString();
            fileStreams.put(streamId, new StreamData(fs, null, encoding));
            callback.invoke(null, null, streamId);
        } catch (FileNotFoundException err) {
            callback.invoke("ENOENT", "No such file '" + path + "'");
        } catch (Exception err) {
            callback.invoke("EUNSPECIFIED", "Failed to create read stream at path `" + path + "`; " + err.getLocalizedMessage());
        }
    }

    /**
     * Write a chunk of data into a file stream.
     * @param streamId File stream ID
     * @param bufferSize Amount of data to read in bytes
     * @param callback JS context callback
     */
    static void readChunk(String streamId, int bufferSize, Callback callback) {
        try {
            StreamData d = Objects.requireNonNull(fileStreams.get(streamId), "No stream found with id " + streamId);

            int chunkSize = d.encoding.equals("base64") ? 4095 : 4096;
            if(bufferSize > 0) {
                chunkSize = bufferSize;
            }

            byte[] buffer = new byte[chunkSize];

            int cursor = d.readStreamInstance.read(buffer);
            if (cursor == -1) {
                // Close automatically
                d.readStreamInstance.close();
                fileStreams.remove(streamId);
                callback.invoke(null, null, null);
                return;
            }

            switch(d.encoding) {
                case "utf8": {
                    CharsetEncoder encoder = Charset.forName("UTF-8").newEncoder();
                    encoder.encode(ByteBuffer.wrap(buffer).asCharBuffer());
                    String chunk = new String(buffer, 0, cursor);
                    callback.invoke(null, null, chunk);
                    break;
                }
                case "ascii": {
                    WritableArray chunk = Arguments.createArray();
                    for(int i = 0; i < cursor; i++) {
                        chunk.pushInt((int) buffer[i]);
                    }
                    callback.invoke(null, null, chunk);
                    break;
                }
                case "base64":
                    if(cursor < chunkSize) {
                        byte[] copy = new byte[cursor];
                        System.arraycopy(buffer, 0, copy, 0, cursor);
                        callback.invoke(null, null, Base64.encodeToString(copy, Base64.NO_WRAP));
                    } else {
                        callback.invoke(null, null, Base64.encodeToString(buffer, Base64.NO_WRAP));
                    }
                    break;
            }
        } catch (Exception err) {
            callback.invoke("EUNSPECIFIED", err.getLocalizedMessage());
        }
    }

    /**
     * Create a write stream and store its instance in RNFetchBlobFS.fileStreams
     * @param path  Target file path
     * @param encoding  Should be one of `base64`, `utf8`, `ascii`
     * @param append  Flag represents if the file stream overwrite existing content
     * @param callback  Callback
     */
    static void writeStream(final String path, final String encoding, final boolean append, final Callback callback) {
        if (!ENCODINGS.contains(encoding.toLowerCase())) {
            callback.invoke("EINVAL", "Unrecognized encoding `" + encoding + "`, should be one of `base64`, `utf8`, `ascii`");
            return;
        }

        try {
            File dest = new File(path);
            File dir = dest.getParentFile();

            if(!dest.exists()) {
                if(dir != null && !dir.exists()) {
                    if (!dir.mkdirs()) {
                        callback.invoke("ENOTDIR", "Failed to create parent directory of '" + path + "'");
                        return;
                    }
                }

                if(!dest.createNewFile()) {
                    callback.invoke("ENOENT", "File '" + path + "' does not exist and could not be created");
                    return;
                }
            } else if(dest.isDirectory()) {
                callback.invoke("EISDIR", "Expecting a file but '" + path + "' is a directory");
                return;
            }

            OutputStream fs = new FileOutputStream(path, append);
            String streamId = UUID.randomUUID().toString();
            fileStreams.put(streamId, new StreamData(null, fs, encoding));
            callback.invoke(null, null, streamId);
        } catch(Exception err) {
            callback.invoke("EUNSPECIFIED", "Failed to create write stream at path `" + path + "`; " + err.getLocalizedMessage());
        }
    }

    /**
     * Write a chunk of data into a file stream.
     * @param streamId File stream ID
     * @param data  Data chunk in string format
     * @param callback JS context callback
     */
    static void writeChunk(String streamId, String data, Callback callback) {
        try {
            StreamData d = Objects.requireNonNull(fileStreams.get(streamId), "No stream found with id " + streamId);
            byte[] chunk = RNFetchBlobFS.stringToBytes(data, d.encoding);
            d.writeStreamInstance.write(chunk);
            callback.invoke();
        } catch (Exception e) {
            callback.invoke(e.getLocalizedMessage());
        }
    }

    /**
     * Write data using ascii array
     * @param streamId File stream ID
     * @param data  Data chunk in ascii array format
     * @param callback JS context callback
     */
    static void writeArrayChunk(String streamId, ReadableArray data, Callback callback) {
        try {
            StreamData d = Objects.requireNonNull(fileStreams.get(streamId), "No stream found with id " + streamId);
            byte[] chunk = new byte[data.size()];
            for(int i =0; i< data.size();i++) {
                chunk[i] = (byte) data.getInt(i);
            }
            d.writeStreamInstance.write(chunk);
            callback.invoke();
        } catch (Exception e) {
            callback.invoke(e.getLocalizedMessage());
        }
    }

    /**
     * Close file read or write stream by ID
     * @param streamId Stream ID
     * @param callback JS context callback
     */
    static void closeStream(String streamId, Callback callback) {
        try {
            StreamData d = fileStreams.get(streamId);
            if (d == null) {
                callback.invoke();
                return;
            }
            fileStreams.remove(streamId);
            if (d.readStreamInstance != null) {
                d.readStreamInstance.close();
            }
            if (d.writeStreamInstance != null) {
                d.writeStreamInstance.close();
            }
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
            RNFetchBlobFS.deleteRecursive(new File(path));
            callback.invoke(null, true);
        } catch(Exception err) {
            callback.invoke(err.getLocalizedMessage(), false);
        }
    }

    private static void deleteRecursive(File fileOrDirectory) throws IOException {
        if (fileOrDirectory.isDirectory()) {
            File[] files = Objects.requireNonNull(
                    fileOrDirectory.listFiles(),
                    "Received null trying to list files of directory '" + fileOrDirectory + "'"
            );
            for (File child : files) {
                deleteRecursive(child);
            }
        }
        boolean result = fileOrDirectory.delete();
        if (!result) {
            throw new IOException("Failed to delete '" + fileOrDirectory + "'");
        }
    }

    /**
     * Make a folder
     * @param path  Source path
     * @param promise  JS promise
     */
    static void mkdir(String path, Promise promise) {
        File dest = new File(path);
        if(dest.exists()) {
            promise.reject("EEXIST", dest.isDirectory() ? "Folder" : "File" + " '" + path + "' already exists");
            return;
        }
        try {
            boolean result = dest.mkdirs();
            if (!result) {
                promise.reject("EUNSPECIFIED", "mkdir failed to create some or all directories in '" + path + "'");
                return;
            }
        } catch (Exception e) {
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
            return;
        }
        promise.resolve(true);
    }

    /**
     * Copy file to destination path
     * @param path Source path
     * @param dest Target path
     * @param callback  JS context callback
     */
    static void cp(String path, String dest, Callback callback) {
        path = normalizePath(path);
        InputStream in = null;
        OutputStream out = null;

        try {
            if(!isPathExists(path)) {
                callback.invoke("Source file at path`" + path + "` does not exist");
                return;
            }
            if(!new File(dest).exists()) {
                boolean result = new File(dest).createNewFile();
                if (!result) {
                    callback.invoke("Destination file at '" + dest + "' already exists");
                    return;
                }
            }

            in = inputStreamFromPath(path);
            out = new FileOutputStream(dest);

            byte[] buf = new byte[10240];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
        } catch (Exception err) {
            callback.invoke(err.getLocalizedMessage());
        } finally {
            try {
                if (in != null) {
                    in.close();
                }
                if (out != null) {
                    out.close();
                }
                callback.invoke();
            } catch (Exception e) {
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
            callback.invoke("Source file at path `" + path + "` does not exist");
            return;
        }
        try {
            boolean result = src.renameTo(new File(dest));
            if (!result) {
                callback.invoke("mv failed for unknown reasons");
                return;
            }
        } catch (Exception e) {
            callback.invoke(e.getLocalizedMessage());
            return;
        }
        callback.invoke();
    }

    /**
     * Check if the path exists, also check if it is a folder when exists.
     * @param path Path to check
     * @param callback  JS context callback
     */
    static void exists(String path, Callback callback) {
        if(isAsset(path)) {
            try {
                String filename = path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                com.RNFetchBlob.RNFetchBlob.RCTContext.getAssets().openFd(filename);
                callback.invoke(true, false);
            } catch (IOException e) {
                callback.invoke(false, false);
            }
        }
        else {
            path = normalizePath(path);
            boolean exist = new File(path).exists();
            boolean isDir = new File(path).isDirectory();
            callback.invoke(exist, isDir);
        }
    }

    /**
     * List content of folder
     * @param path  Target folder
     * @param promise  JS context promise
     */
    static void ls(String path, Promise promise) {
        try {
            path = normalizePath(path);
            File src = new File(path);
            if (!src.exists()) {
                promise.reject("ENOENT", "No such file '" + path + "'");
                return;
            }
            if (!src.isDirectory()) {
                promise.reject("ENOTDIR", "Not a directory '" + path + "'");
                return;
            }
            String[] files = new File(path).list();
            WritableArray arg = Arguments.createArray();
            // File => list(): "If this abstract pathname does not denote a directory, then this method returns null."
            // We excluded that possibility above - ignore the "can produce NullPointerException" warning of the IDE.
            for (String i : files) {
                arg.pushString(i);
            }
            promise.resolve(arg);
        } catch (Exception e) {
            e.printStackTrace();
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
        }
    }

    /**
     * Create a file by slicing given file path
     * @param path   Source file path
     * @param dest  Destination of created file
     * @param start Start byte offset in source file
     * @param end   End byte offset
     */
    static void slice(String path, String dest, int start, int end, Promise promise) {
        try {
            path = normalizePath(path);
            File source = new File(path);
            if(source.isDirectory()){
                promise.reject("EISDIR", "Expecting a file but '" + path + "' is a directory");
                return;
            }
            if(!source.exists()){
                promise.reject("ENOENT", "No such file '" + path + "'");
                return;
            }
            int size = (int) source.length();
            int max = Math.min(size, end);
            int expected = max - start;
            int now = 0;
            FileInputStream in = new FileInputStream(new File(path));
            FileOutputStream out = new FileOutputStream(new File(dest));
            int skipped = (int) in.skip(start);
            if (skipped != start) {
                promise.reject("EUNSPECIFIED", "Skipped " + skipped + " instead of the specified " + start + " bytes, size is " + size);
                return;
            }
            byte[] buffer = new byte[10240];
            while(now < expected) {
                int read = in.read(buffer, 0, 10240);
                int remain = expected - now;
                if(read <= 0) {
                    break;
                }
                out.write(buffer, 0, Math.min(remain, read));
                now += read;
            }
            in.close();
            out.flush();
            out.close();
            promise.resolve(dest);
        } catch (Exception e) {
            e.printStackTrace();
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
        }
    }

    static void lstat(String path, final Callback callback) {
        path = normalizePath(path);

        new AsyncTask<String, Integer, Integer>() {
            @Override
            protected Integer doInBackground(String ...args) {
                WritableArray res = Arguments.createArray();
                if(args[0] == null) {
                    callback.invoke("the path specified for lstat is either `null` or `undefined`.");
                    return 0;
                }
                File src = new File(args[0]);
                if(!src.exists()) {
                    callback.invoke("failed to lstat path `" + args[0] + "` because it does not exist");
                    return 0;
                }
                if(src.isDirectory()) {
                    String [] files = src.list();
                    if (files == null) {
                        callback.invoke("failed to lstat path `" + args[0] + "`, failed to get a list of files in this directory (reason unknown)");
                    } else {
                        for(String p : files) {
                            res.pushMap(statFile(src.getPath() + "/" + p));
                        }
                    }
                }
                else {
                    res.pushMap(statFile(src.getAbsolutePath()));
                }
                callback.invoke(null, res);
                return 0;
            }
        }.execute(path);
    }

    /**
     * show status of a file or directory
     * @param path  Path
     * @param callback  Callback
     */
    static void stat(String path, Callback callback) {
        try {
            path = normalizePath(path);
            WritableMap result = statFile(path);
            if(result == null)
                callback.invoke("failed to stat path `" + path + "` because it does not exist or it is not a folder", null);
            else
                callback.invoke(null, result);
        } catch(Exception err) {
            callback.invoke(err.getLocalizedMessage());
        }
    }

    /**
     * Basic stat method
     * @param path  Path
     * @return Stat  Result of a file or path
     */
    static WritableMap statFile(String path) {
        try {
            path = normalizePath(path);
            WritableMap stat = Arguments.createMap();
            if(isAsset(path)) {
                String name = path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                AssetFileDescriptor fd = RNFetchBlob.RCTContext.getAssets().openFd(name);
                stat.putString("filename", name);
                stat.putString("path", path);
                stat.putString("type", "asset");
                stat.putString("size", String.valueOf(fd.getLength()));
                stat.putInt("lastModified", 0);
            }
            else {
                File target = new File(path);
                if (!target.exists()) {
                    return null;
                }
                stat.putString("filename", target.getName());
                stat.putString("path", target.getPath());
                stat.putString("type", target.isDirectory() ? "directory" : "file");
                stat.putString("size", String.valueOf(target.length()));
                String lastModified = String.valueOf(target.lastModified());
                stat.putString("lastModified", lastModified);

            }
            return stat;
        } catch(Exception err) {
            return null;
        }
    }

    /**
     * Media scanner scan file
     * @param path  Path to file
     * @param mimes  Array of MIME type strings
     * @param callback  Callback for results
     */
    void scanFile(String [] path, String[] mimes, final Callback callback) {
        try {
            MediaScannerConnection.scanFile(mCtx, path, mimes, new MediaScannerConnection.OnScanCompletedListener() {
                @Override
                public void onScanCompleted(String s, Uri uri) {
                    callback.invoke(null, true);
                }
            });
        } catch(Exception err) {
            callback.invoke(err.getLocalizedMessage(), null);
        }
    }

    /**
     * @param path  Path to file
     * @param algorithm  Hash algorithm
     * @param promise Promise for Javascript
     */
    static void hash(String path, String algorithm, Promise promise) {
        try {
            String resolved = normalizePath(path);
            if(resolved != null) {
                path = resolved;
            }

            InputStream inputStream;

            if(resolved != null && path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
                inputStream = RNFetchBlob.RCTContext.getAssets().open(path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, ""));
            }
            else if(resolved == null) {
                inputStream = RNFetchBlob.RCTContext.getContentResolver().openInputStream(Uri.parse(path));
            }
            else {
                File file = new File(path);

                if (file.isDirectory()) {
                    promise.reject("EISDIR", "Expecting a file but '" + path + "' is a directory");
                    return;
                }

                if (!file.exists()) {
                    promise.reject("ENOENT", "No such file '" + path + "'");
                    return;
                }

                inputStream = new FileInputStream(file);
            }

            if (inputStream == null) {
                promise.reject("ENOENT", "No such file '" + path + "', (failed to create a read-stream)");
                return;
            }

            Map<String, String> algorithms = new HashMap<>();

            algorithms.put("md5", "MD5");
            algorithms.put("sha1", "SHA-1");
            algorithms.put("sha224", "SHA-224");
            algorithms.put("sha256", "SHA-256");
            algorithms.put("sha384", "SHA-384");
            algorithms.put("sha512", "SHA-512");

            if (!algorithms.containsKey(algorithm)) {
                promise.reject("EINVAL", "Invalid algorithm '" + algorithm + "', must be one of md5, sha1, sha224, sha256, sha384, sha512");
                return;
            }

            MessageDigest md = MessageDigest.getInstance(algorithms.get(algorithm));

            byte[] buffer = new byte[16384];  // use 16 KB chunks, quite arbitrarily

            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                md.update(buffer, 0, read);
            }

            StringBuilder hexString = new StringBuilder();
            for (byte digestByte : md.digest()) {
                hexString.append(String.format("%02x", digestByte));
            }

            promise.resolve(hexString.toString());
        } catch (Exception e) {
            e.printStackTrace();
            promise.reject("EUNSPECIFIED", e.getLocalizedMessage());
        }
    }

    /**
     * Create new file at path
     * @param path The destination path of the new file.
     * @param data Initial data of the new file.
     * @param encoding Encoding of initial data.
     * @param promise Promise for Javascript
     */
    static void createFile(String path, String data, String encoding, Promise promise) {
        try {
            if (!ENCODINGS.contains(encoding.toLowerCase()) && !encoding.equalsIgnoreCase(RNFetchBlobConst.DATA_ENCODE_URI)) {
                promise.reject("EINVAL", "Unrecognized encoding '" + encoding + "', should be one of 'base64', 'utf8', 'ascii', ");
                return;
            }
            File dest = new File(path);
            boolean created = dest.createNewFile();
            if(encoding.equalsIgnoreCase(RNFetchBlobConst.DATA_ENCODE_URI)) {
                String orgPath = data.replace(RNFetchBlobConst.FILE_PREFIX, "");
                File src = new File(orgPath);
                if(!src.exists()) {
                    promise.reject("ENOENT", "Source file : " + data + " does not exist");
                    return ;
                }
                FileInputStream fin = new FileInputStream(src);
                OutputStream ostream = new FileOutputStream(dest);
                byte[] buffer = new byte[10240];
                int read = fin.read(buffer);
                while (read > 0) {
                    ostream.write(buffer, 0, read);
                    read = fin.read(buffer);
                }
                fin.close();
                ostream.close();
            } else {
                if (!created) {
                    promise.reject("EEXIST", "File '" + path + "' already exists");
                    return;
                }
                OutputStream ostream = new FileOutputStream(dest);
                ostream.write(RNFetchBlobFS.stringToBytes(data, encoding));
            }
            promise.resolve(path);
        } catch(Exception err) {
            promise.reject("EUNSPECIFIED", err.getLocalizedMessage());
        }
    }

    /**
     * Create file for ASCII encoding
     * @param path  Path of new file.
     * @param data  Content of new file
     * @param promise  JS Promise
     */
    static void createFileASCII(String path, ReadableArray data, Promise promise) {
        try {
            File dest = new File(path);
            boolean created = dest.createNewFile();
            if(!created) {
                promise.reject("EEXIST", "File at path '" + path + "' already exists");
                return;
            }
            OutputStream ostream = new FileOutputStream(dest);
            byte[] chunk = new byte[data.size()];
            for(int i=0; i<data.size(); i++) {
                chunk[i] = (byte) data.getInt(i);
            }
            ostream.write(chunk);
            promise.resolve(path);
        } catch(Exception err) {
            promise.reject("EUNSPECIFIED", err.getLocalizedMessage());
        }
    }

    static void df(Callback callback) {
        StatFs stat = new StatFs(Environment.getDataDirectory().getPath());

        WritableMap args = Arguments.createMap();

        args.putString("internal_free", String.valueOf(stat.getFreeBytes()));
        args.putString("internal_total", String.valueOf(stat.getTotalBytes()));
        StatFs statEx = new StatFs(Environment.getExternalStorageDirectory().getPath());
        args.putString("external_free", String.valueOf(statEx.getFreeBytes()));
        args.putString("external_total", String.valueOf(statEx.getTotalBytes()));

        callback.invoke(null ,args);
    }

    /**
     * Remove files in session.
     * @param paths An array of file paths.
     * @param callback JS contest callback
     */
    static void removeSession(ReadableArray paths, final Callback callback) {
        AsyncTask<ReadableArray, Integer, Integer> task = new AsyncTask<ReadableArray, Integer, Integer>() {
            @Override
            protected Integer doInBackground(ReadableArray ...paths) {
                try {
                    ArrayList<String> failuresToDelete = new ArrayList<>();
                    for (int i = 0; i < paths[0].size(); i++) {
                        String fileName = paths[0].getString(i);
                        File f = new File(fileName);
                        if (f.exists()) {
                            boolean result = f.delete();
                            if (!result) {
                                failuresToDelete.add(fileName);
                            }
                        }
                    }
                    if (failuresToDelete.isEmpty()) {
                        callback.invoke(null, true);
                    } else {
                        StringBuilder listString = new StringBuilder();
                        listString.append("Failed to delete: ");
                        for (String s : failuresToDelete) {
                            listString.append(s).append(", ");
                        }
                        callback.invoke(listString.toString());
                    }
                } catch(Exception err) {
                    callback.invoke(err.getLocalizedMessage());
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
        switch (encoding.toLowerCase()) {
            case "base64" :
                return Base64.decode(data, Base64.NO_WRAP);
            case "ascii" :
                return data.getBytes(Charset.forName("US-ASCII"));
            case "utf8" :
                return data.getBytes(Charset.forName("UTF-8"));
        }

        throw new IllegalArgumentException("Invalid encoding '" + encoding + "'");
    }

    /**
     * Get input stream of the given path, when the path is a string starts with bundle-assets://
     * the stream is created by Assets Manager, otherwise use FileInputStream.
     * @param path The file to open stream
     * @return InputStream instance
     * @throws IOException If the given file does not exist or is a directory FileInputStream will throw a FileNotFoundException
     */
    private static InputStream inputStreamFromPath(String path) throws IOException {
        if (path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
            return RNFetchBlob.RCTContext.getAssets().open(path.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, ""));
        }
        return new FileInputStream(new File(path));
    }

    /**
     * Check if the asset or the file exists
     * @param path A file path URI string
     * @return A boolean value represents if the path exists.
     */
    private static boolean isPathExists(String path) {
        if(path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
            try {
                RNFetchBlob.RCTContext.getAssets().open(path.replace(com.RNFetchBlob.RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, ""));
            } catch (IOException e) {
                return false;
            }
            return true;
        }
        else {
            return new File(path).exists();
        }

    }

    static boolean isAsset(String path) {
        return path != null && path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET);
    }

    /**
     * Normalize the path, remove URI scheme (xxx://) so that we can handle it.
     * @param path URI string.
     * @return Normalized string
     */
    static String normalizePath(String path) {
        if(path == null)
            return null;
        if(!path.matches("\\w+:.*"))
            return path;
        if(path.startsWith("file://")) {
            return path.replace("file://", "");
        }

        Uri uri = Uri.parse(path);
        if(path.startsWith(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET)) {
            return path;
        }
        else
            return PathResolver.getRealPathFromURI(RNFetchBlob.RCTContext, uri);
    }

}
