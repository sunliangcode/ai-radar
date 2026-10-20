package com.airadar.connector;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProbeResultClassifyTest {

    @Test
    void authFailuresMapToNeedCookie() {
        assertEquals(ProbeResult.NEED_COOKIE, ProbeResult.fromCliFailure("not_authenticated").state());
        assertEquals(ProbeResult.NEED_COOKIE, ProbeResult.fromCliFailure("未登录").state());
        assertEquals(ProbeResult.NEED_COOKIE, ProbeResult.fromCliFailure("需要登录").state());
        assertEquals(ProbeResult.NEED_COOKIE, ProbeResult.fromCliFailure("Authentication failed / zhihu login").state());
        assertEquals(ProbeResult.NEED_COOKIE, ProbeResult.fromCliFailure("HTTP 401").state());
    }

    @Test
    void missingBinaryMapsToCliMissing() {
        assertEquals(ProbeResult.CLI_MISSING, ProbeResult.fromCliFailure("Cannot run program \"bili\": error=2, No such file").state());
        assertEquals(ProbeResult.CLI_MISSING, ProbeResult.fromCliFailure("bili: command not found").state());
    }

    @Test
    void otherErrorsMapToFailed() {
        assertEquals(ProbeResult.FAILED, ProbeResult.fromCliFailure("timed out").state());
        assertEquals(ProbeResult.FAILED, ProbeResult.fromCliFailure("parse failed").state());
        assertEquals(ProbeResult.FAILED, ProbeResult.fromCliFailure("").state());
    }

    @Test
    void okFactory() {
        assertEquals(ProbeResult.OK, ProbeResult.ok().state());
        assertEquals("", ProbeResult.ok().reason());
    }
}
