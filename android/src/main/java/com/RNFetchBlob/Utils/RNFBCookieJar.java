package com.RNFetchBlob.Utils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Set;

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

    public static void removeCookies(String domain) {
        if(domain != null && domain.length() > 0) {
            if(cookieStore.containsKey(domain))
                cookieStore.remove(domain);
        }
        else
            cookieStore.clear();
    }

    public static WritableMap getCookies(String host) {
        Set<String> domains = cookieStore.keySet();
        WritableMap cookieMap = Arguments.createMap();
        if(host.length() > 0 && cookieStore.containsKey(host)) {
            domains.clear();
            domains.add(host);
        }
        // no domain specified, return all cookies
        for(String key : domains) {
            WritableArray cookiesInDomain = Arguments.createArray();
            for(Cookie c: cookieStore.get(key)){
                cookiesInDomain.pushString(c.toString());
            }
            cookieMap.putArray(key, cookiesInDomain);
        }

        return cookieMap;
    }
}
