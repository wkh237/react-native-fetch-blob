package com.RNFetchBlob.Utils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.HttpUrl;

/**
 * Created by wkh237on 2016/10/14.
 */



public class RNFBCookieJar implements CookieJar {

    static final HashMap<String, List<Cookie>> cookieStore = new HashMap<>();
    private List<Cookie> cookies;

    @Override
    public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
        cookieStore.put(url.host(), cookies);
    }

    @Override
    public List<Cookie> loadForRequest(HttpUrl url) {
        List<Cookie> cookies = cookieStore.get(url.host());
        return cookies != null ? cookies : new ArrayList<Cookie>();
    }

    public static WritableArray getCookies(String host) {
        HttpUrl url = HttpUrl.parse(host);
        List<Cookie> cookies = null;
        if(url != null) {
            cookies = cookieStore.get(url.host());
        }
        WritableArray cookieList = Arguments.createArray();
        if(cookies != null) {
            for(Cookie c : cookies){
                cookieList.pushString(c.toString());
            }
            return cookieList;
        }
        return null;
    }
}
