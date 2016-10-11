package com.RNFetchBlob;

/**
 * Created by wkh237 on 2016/9/24.
 */
public class RNFetchBlobProgressConfig {

    public enum ReportType {
        Upload,
        Download
    };

    long lastTick = 0;
    int tick = 0;
    int count = -1;
    public int interval = -1;
    public boolean enable = false;
    public ReportType type = ReportType.Download;

    RNFetchBlobProgressConfig(boolean report, int interval, int count, ReportType type) {
        this.enable = report;
        this.interval = interval;
        this.type = type;
        this.count = count;
    }

    public boolean shouldReport(float progress) {
        boolean checkCount = true;
        if(count > 0 && progress > 0)
            checkCount = Math.floor(progress*count)> tick;
        boolean result = (System.currentTimeMillis() - lastTick> interval) && enable && checkCount;
        if(result) {
            tick++;
            lastTick = System.currentTimeMillis();
        }
        return result;
    }

}
