package com.RNFetchBlob;

import okhttp3.MediaType;

/**
 * Created by wkh237 on 2016/7/11.
 */
public class RNFetchBlobConst {
    public static final String EVENT_UPLOAD_PROGRESS = "RNFetchBlobProgress-upload";
    public static final String EVENT_PROGRESS = "RNFetchBlobProgress";
    public static final String FILE_PREFIX = "RNFetchBlob-file://";
    public static final MediaType MIME_OCTET = MediaType.parse("application/octet-stream");
    public static final MediaType MIME_MULTIPART = MediaType.parse("multipart/form-data");
	public static final MediaType MIME_ENCODED = MediaType.parse("application/x-www-form-urlencoded");
    public static final String FILE_PREFIX_BUNDLE_ASSET = "bundle-assets://";
    public static final String FILE_PREFIX_CONTENT = "content://";
    public static final String DATA_ENCODE_URI = "uri";
    public static final String DATA_ENCODE_BASE64 = "base64";
    public static final String DATA_ENCODE_UTF8 = "utf8";
}
