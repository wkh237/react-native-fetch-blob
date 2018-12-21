package com.RNFetchBlob;

/**
 * Created by wkh237 on 2016/9/24.
 */
public class RNFetchBlobProgressConfig {

    enum ReportType {
        Upload,
        Download
    }

    private long lastTick = 0;
    private int tick = 0;
    private final int count;
    private final int interval;
    private final boolean enable;
    private ReportType type;

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
