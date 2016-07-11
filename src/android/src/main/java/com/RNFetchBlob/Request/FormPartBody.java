package com.RNFetchBlob.Request;

import com.RNFetchBlob.RNFetchBlobConst;
import com.RNFetchBlob.RNFetchBlobFS;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.loopj.android.http.Base64;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.RequestBody;

/**
 * Created by wkh237 on 2016/7/12.
 */
public class FormPartBody {

    public String fieldName;
    public String filename;
    public RequestBody partBody;
    public String stringBody;

    public FormPartBody(ReactApplicationContext ctx, ReadableMap field) {
        String data = field.getString("data");
        String name = field.getString("name");
        RequestBody partBody;
        if (field.hasKey("filename")) {
            MediaType mime = field.hasKey("type") ?
                    MediaType.parse(field.getString("type")) : RNFetchBlobConst.MIME_OCTET;
            String filename = field.getString("filename");
            // upload from storage
            if (data.startsWith(RNFetchBlobConst.FILE_PREFIX)) {
                String orgPath = data.substring(RNFetchBlobConst.FILE_PREFIX.length());
                orgPath = RNFetchBlobFS.normalizePath(orgPath);
                // path starts with content://
                if (RNFetchBlobFS.isAsset(orgPath)) {
                    try {
                        String assetName = orgPath.replace(RNFetchBlobConst.FILE_PREFIX_BUNDLE_ASSET, "");
                        InputStream in = ctx.getAssets().open(assetName);
                        long length = ctx.getAssets().openFd(assetName).getLength();
                        byte[] bytes = new byte[(int) length];
                        in.read(bytes, 0, (int) length);
                        in.close();
                        partBody = RequestBody.create(mime, bytes, 0, (int) length);
                    } catch (IOException e) {
                        partBody = null;
                    }
                } else {
                    File file = new File(RNFetchBlobFS.normalizePath(orgPath));
                    partBody = RequestBody.create(mime, file);
                }
            }
            // base64 embedded file content
            else {
                byte[] bytes = Base64.decode(data, 0);
                partBody = RequestBody.create(mime, bytes, 0, bytes.length);
            }
            this.filename = filename;
            this.fieldName = name;
            this.partBody = partBody;
        }
        // data field
        else {
            this.fieldName = name;
            this.stringBody = field.getString("data");
        }
    }
}
