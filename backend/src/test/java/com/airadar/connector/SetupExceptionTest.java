package com.airadar.connector;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SetupExceptionTest {

    @Test
    void classifiesToolchainAndGit() {
        assertEquals("setup_git_missing", SetupException.classifyInstall("git clone failed: fatal").code());
        assertEquals("setup_toolchain_missing", SetupException.classifyInstall("uv exit 127: not found").code());
        assertEquals("setup_install_failed", SetupException.classifyInstall("build failed: boom").code());
    }

    @Test
    void conflictIs409() {
        assertEquals(409, SetupException.conflict("busy").httpStatus());
        assertEquals("setup_busy", SetupException.conflict("busy").code());
    }
}
