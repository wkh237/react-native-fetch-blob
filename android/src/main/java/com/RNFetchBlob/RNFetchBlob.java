package com.RNFetchBlob;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.SparseArray;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

// Cookies
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.network.ForwardingCookieHandler;
import com.facebook.react.modules.network.CookieJarContainer;
import com.facebook.react.modules.network.OkHttpClientProvider;

import okhttp3.OkHttpClient;
import okhttp3.JavaNetCookieJar;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static android.app.Activity.RESULT_OK;
import static com.RNFetchBlob.RNFetchBlobConst.GET_CONTENT_INTENT;

public class RNFetchBlob extends ReactContextBaseJavaModule {

    private final OkHttpClient mClient;

    static ReactApplicationContext RCTContext;

    // static LinkedBlockingQueue<Runnable> fsTaskQueue = new LinkedBlockingQueue<>();
    private static final LinkedBlockingQueue<Runnable> taskQueue = new LinkedBlockingQueue<>();
    private static final ThreadPoolExecutor threadPool = new ThreadPoolExecutor(5, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);
    private static final SparseArray<Promise> promiseTable = new SparseArray<>();
    private static boolean ActionViewVisible = false;

    public RNFetchBlob(ReactApplicationContext reactContext) {

        super(reactContext);

        mClient = OkHttpClientProvider.getOkHttpClient();
        ForwardingCookieHandler mCookieHandler = new ForwardingCookieHandler(reactContext);
        CookieJarContainer mCookieJarContainer = (CookieJarContainer) mClient.cookieJar();
        mCookieJarContainer.setCookieJar(new JavaNetCookieJar(mCookieHandler));

        RCTContext = reactContext;
        reactContext.addActivityEventListener(new ActivityEventListener() {
            @Override
            public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
                if(requestCode == GET_CONTENT_INTENT && resultCode == RESULT_OK) {
                    Uri d = Objects.requireNonNull(data.getData());
                    promiseTable.get(GET_CONTENT_INTENT).resolve(d.toString());
                    promiseTable.remove(GET_CONTENT_INTENT);
                }
            }

            @Override
            public void onNewIntent(Intent intent) {

            }
        });
    }

    @Override
    public String getName() {
        return "RNFetchBlob";
    }

    @Override
    public Map<String, Object> getConstants() {
        return RNFetchBlobFS.getSystemfolders(this.getReactApplicationContext());
    }

    @ReactMethod
    public void createFile(final String path, final String content, final String encode, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFile(path, content, encode, promise);
            }
        });
    }

    @ReactMethod
    public void createFileASCII(final String path, final ReadableArray dataArray, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFileASCII(path, dataArray, promise);
            }
        });

    }

    @ReactMethod
    public void actionViewIntent(String path, String mime, final Promise promise) {
        try {
            Intent intent= new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(Uri.parse("file://" + path), mime);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            this.getReactApplicationContext().startActivity(intent);
            ActionViewVisible = true;

            final LifecycleEventListener listener = new LifecycleEventListener() {
                @Override
                public void onHostResume() {
                    if(ActionViewVisible)
                        promise.resolve(null);
                    RCTContext.removeLifecycleEventListener(this);
                }

                @Override
                public void onHostPause() {

                }

                @Override
                public void onHostDestroy() {

                }
            };
            RCTContext.addLifecycleEventListener(listener);
        } catch(Exception ex) {
            promise.reject("EUNSPECIFIED", ex.getLocalizedMessage());
        }
    }

    @ReactMethod
    public void unlink(String path, Callback callback) {
        RNFetchBlobFS.unlink(path, callback);
    }

    @ReactMethod
    public void mkdir(String path, Promise promise) {
        RNFetchBlobFS.mkdir(path, promise);
    }

    @ReactMethod
    public void exists(String path, Callback callback) {
        RNFetchBlobFS.exists(path, callback);
    }

    @ReactMethod
    public void cp(final String path, final String dest, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.cp(path, dest, callback);
            }
        });

    }

    @ReactMethod
    public void mv(String path, String dest, Callback callback) {
        RNFetchBlobFS.mv(path, dest, callback);
    }

    @ReactMethod
    public void ls(String path, Promise promise) {
        RNFetchBlobFS.ls(path, promise);
    }

    @ReactMethod
    public void readStream(final String path, final String encoding, final Callback callback) {
        RNFetchBlobFS.readStream(path, encoding, callback);
    }

    @ReactMethod
    public void readChunk(final String streamId, final int bufferSize, final Callback callback) {
        RNFetchBlobFS.readChunk(streamId, bufferSize, callback);
    }

    @ReactMethod
    public void writeStream(final String path, final String encode, final boolean append, final Callback callback) {
        RNFetchBlobFS.writeStream(path, encode, append, callback);
    }

    @ReactMethod
    public void writeChunk(final String streamId, final String data, final Callback callback) {
        RNFetchBlobFS.writeChunk(streamId, data, callback);
    }

    @ReactMethod
    public void writeArrayChunk(final String streamId, final ReadableArray dataArray, final Callback callback) {
        RNFetchBlobFS.writeArrayChunk(streamId, dataArray, callback);
    }

    @ReactMethod
    public void closeStream(final String streamId, final Callback callback) {
        RNFetchBlobFS.closeStream(streamId, callback);
    }

    @ReactMethod
    public void removeSession(ReadableArray paths, Callback callback) {
        RNFetchBlobFS.removeSession(paths, callback);
    }

    @ReactMethod
    public void readFile(final String path, final String encoding, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.readFile(path, encoding, promise);
            }
        });
    }

    @ReactMethod
    public void writeFileArray(final String path, final ReadableArray data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, data, append, promise);
            }
        });
    }

    @ReactMethod
    public void writeFile(final String path, final String encoding, final String data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, encoding, data, append, promise);
            }
        });

    }

    @ReactMethod
    public void lstat(String path, Callback callback) {
        RNFetchBlobFS.lstat(path, callback);
    }

    @ReactMethod
    public void stat(String path, Callback callback) {
        RNFetchBlobFS.stat(path, callback);
    }

    @ReactMethod
    public void scanFile(final ReadableArray pairs, final Callback callback) {
        final ReactApplicationContext ctx = this.getReactApplicationContext();
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                int size = pairs.size();
                String [] p = new String[size];
                String [] m = new String[size];
                for(int i=0;i<size;i++) {
                    ReadableMap pair = pairs.getMap(i);
                    if(pair.hasKey("path")) {
                        p[i] = pair.getString("path");
                        if(pair.hasKey("mime"))
                            m[i] = pair.getString("mime");
                        else
                            m[i] = null;
                    }
                }
                new RNFetchBlobFS(ctx).scanFile(p, m, callback);
            }
        });

    }

    @ReactMethod
    public void hash(final String path, final String algorithm, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.hash(path, algorithm, promise);
            }
        });
    }

    @ReactMethod
    public void cancelRequest(String taskId, Callback callback) {
        try {
            RNFetchBlobReq.cancelTask(taskId);
            callback.invoke(null, taskId);
        } catch (Exception ex) {
            callback.invoke(ex.getLocalizedMessage(), null);
        }
    }

    @ReactMethod
    public void slice(String src, String dest, int start, int end, Promise promise) {
        RNFetchBlobFS.slice(src, dest, start, end, promise);
    }

    @ReactMethod
    public void enableProgressReport(String taskId, int interval, int count) {
        RNFetchBlobProgressConfig config = new RNFetchBlobProgressConfig(true, interval, count, RNFetchBlobProgressConfig.ReportType.Download);
        RNFetchBlobReq.progressReport.put(taskId, config);
    }

    @ReactMethod
    public void df(final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.df(callback);
            }
        });
    }


    @ReactMethod
    public void enableUploadProgressReport(String taskId, int interval, int count) {
        RNFetchBlobProgressConfig config = new RNFetchBlobProgressConfig(true, interval, count, RNFetchBlobProgressConfig.ReportType.Upload);
        RNFetchBlobReq.uploadProgressReport.put(taskId, config);
    }

    @ReactMethod
    public void fetchBlob(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, body, null, mClient, callback).run();
}

    @ReactMethod
    public void fetchBlobForm(ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, null, body, mClient, callback).run();
    }

    @ReactMethod
    public void getContentIntent(String mime, Promise promise) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        if(mime != null)
            i.setType(mime);
        else
            i.setType("*/*");
        promiseTable.put(GET_CONTENT_INTENT, promise);
        this.getReactApplicationContext().startActivityForResult(i, GET_CONTENT_INTENT, null);

    }

    @ReactMethod
    public void addCompleteDownload (ReadableMap config, Promise promise) {
        DownloadManager dm = Objects.requireNonNull((DownloadManager) RCTContext.getSystemService(Context.DOWNLOAD_SERVICE));
        String path = RNFetchBlobFS.normalizePath(config.getString("path"));
        if(path == null) {
            promise.reject("EINVAL", "RNFetchblob.addCompleteDownload can not resolve URI:" + config.getString("path"));
            return;
        }
        try {
            WritableMap stat = Objects.requireNonNull(RNFetchBlobFS.statFile(path));
            dm.addCompletedDownload(
                    config.hasKey("title") ? config.getString("title") : "",
                    config.hasKey("description") ? config.getString("description") : "",
                    true,
                    config.hasKey("mime") ? config.getString("mime") : null,
                    path,
                    Long.valueOf(stat.getString("size")),
                    config.hasKey("showNotification") && config.getBoolean("showNotification")
            );
            promise.resolve(null);
        }
        catch(Exception ex) {
            promise.reject("EUNSPECIFIED", ex.getLocalizedMessage());
        }

    }

}
