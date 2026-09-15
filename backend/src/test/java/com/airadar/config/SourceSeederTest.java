package com.airadar.config;

import com.airadar.domain.SourceType;
import com.airadar.packs.PackImportService;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SourceSeederTest {

    @TempDir
    Path tempDir;

    private SourceRepository sourceRepository;
    private SourceSeeder seeder;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        sourceRepository = mock(SourceRepository.class);
        seeder = new SourceSeeder(mock(PackImportService.class), sourceRepository, mapper);
    }

    @Test
    void createsDisabledZhihuWhenCliMissing() {
        when(sourceRepository.findFirstByType(SourceType.ZHIHU)).thenReturn(Optional.empty());
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.ensureZhihu("/no/such/zhihu-cli", p -> false);

        var captor = org.mockito.ArgumentCaptor.forClass(SourceEntity.class);
        verify(sourceRepository).save(captor.capture());
        SourceEntity saved = captor.getValue();
        assertFalse(saved.isEnabled());
        assertEquals("知乎推荐", saved.getName());
        assertEquals("/no/such/zhihu-cli", readCliPath(saved));
    }

    @Test
    void createsEnabledZhihuWhenCliPresent() {
        when(sourceRepository.findFirstByType(SourceType.ZHIHU)).thenReturn(Optional.empty());
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Path cli = tempDir.resolve("zhihu");
        seeder.ensureZhihu(cli.toString(), p -> true);

        var captor = org.mockito.ArgumentCaptor.forClass(SourceEntity.class);
        verify(sourceRepository).save(captor.capture());
        assertTrue(captor.getValue().isEnabled());
        assertEquals(cli.toString(), readCliPath(captor.getValue()));
    }

    @Test
    void doesNotOverwriteWorkingCustomCliPath() throws Exception {
        SourceEntity existing = existingZhihu("/opt/custom/zhihu", true);
        when(sourceRepository.findFirstByType(SourceType.ZHIHU)).thenReturn(Optional.of(existing));

        Predicate<String> onlyCustom = p -> "/opt/custom/zhihu".equals(p);
        seeder.ensureZhihu("/Users/sunliang/workspace/own/zhihu-cli-go/zhihu", onlyCustom);

        verify(sourceRepository, never()).save(any());
        assertEquals("/opt/custom/zhihu", readCliPath(existing));
    }

    @Test
    void repairsMissingPathWhenPreferredReady() throws Exception {
        SourceEntity existing = existingZhihu("/gone/zhihu", true);
        when(sourceRepository.findFirstByType(SourceType.ZHIHU)).thenReturn(Optional.of(existing));
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.ensureZhihu("/now/present/zhihu", p -> "/now/present/zhihu".equals(p));

        verify(sourceRepository).save(existing);
        assertEquals("/now/present/zhihu", readCliPath(existing));
        assertTrue(existing.isEnabled());
    }

    private SourceEntity existingZhihu(String cliPath, boolean enabled) throws Exception {
        SourceEntity entity = new SourceEntity();
        entity.setId(9L);
        entity.setName("知乎推荐");
        entity.setType(SourceType.ZHIHU);
        entity.setEnabled(enabled);
        var config = mapper.createObjectNode();
        config.put("cliPath", cliPath);
        config.put("limit", 5);
        entity.setConfigJson(mapper.writeValueAsString(config));
        return entity;
    }

    private String readCliPath(SourceEntity entity) {
        try {
            JsonNode node = mapper.readTree(entity.getConfigJson());
            return node.path("cliPath").asText("");
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }
}
