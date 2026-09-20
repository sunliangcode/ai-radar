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
    void createsNamedRssWhenMissing() {
        when(sourceRepository.findFirstByName("IT之家")).thenReturn(Optional.empty());
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.ensureNamedRss("IT之家", "https://www.ithome.com/rss/");

        var captor = org.mockito.ArgumentCaptor.forClass(SourceEntity.class);
        verify(sourceRepository).save(captor.capture());
        SourceEntity saved = captor.getValue();
        assertTrue(saved.isEnabled());
        assertEquals("IT之家", saved.getName());
        assertEquals(SourceType.RSS, saved.getType());
    }

    @Test
    void doesNotRecreateExistingNamedRss() {
        SourceEntity existing = new SourceEntity();
        existing.setId(12L);
        existing.setName("IT之家");
        existing.setType(SourceType.RSS);
        when(sourceRepository.findFirstByName("IT之家")).thenReturn(Optional.of(existing));

        seeder.ensureNamedRss("IT之家", "https://www.ithome.com/rss/");

        verify(sourceRepository, never()).save(any());
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
    void createsCliDomesticSourcesWhenMissing() {
        when(sourceRepository.findFirstByType(SourceType.WEIBO)).thenReturn(Optional.empty());
        when(sourceRepository.findFirstByType(SourceType.BILIBILI)).thenReturn(Optional.empty());
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.ensureOpenSourceCli(SourceType.WEIBO, "微博热搜", "weibo", 20, p -> false);
        seeder.ensureOpenSourceCli(SourceType.BILIBILI, "B站热门", "bili", 20, p -> true);

        var captor = org.mockito.ArgumentCaptor.forClass(SourceEntity.class);
        verify(sourceRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertFalse(captor.getAllValues().get(0).isEnabled());
        assertTrue(captor.getAllValues().get(1).isEnabled());
        assertEquals(SourceType.BILIBILI, captor.getAllValues().get(1).getType());
    }

    @Test
    void disablesRemovedHomemadeConnectors() {
        SourceEntity juejin = new SourceEntity();
        juejin.setId(7L);
        juejin.setType(SourceType.JUEJIN);
        juejin.setEnabled(true);
        when(sourceRepository.findFirstByType(SourceType.JUEJIN)).thenReturn(Optional.of(juejin));
        when(sourceRepository.findFirstByType(SourceType.CSDN)).thenReturn(Optional.empty());
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.disableRemovedConnectors(SourceType.JUEJIN, SourceType.CSDN);

        assertFalse(juejin.isEnabled());
        verify(sourceRepository).save(juejin);
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

    @Test
    void repairsBroken36krFeedUrl() throws Exception {
        SourceEntity existing = new SourceEntity();
        existing.setId(3L);
        existing.setName("36氪");
        existing.setType(SourceType.RSS);
        existing.setConfigJson("{\"feedUrl\":\"https://36kr.com/feed\"}");
        when(sourceRepository.findFirstByName("36氪")).thenReturn(Optional.of(existing));
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.repairNamedRssFeedUrl("36氪", "https://36kr.com/feed", "https://www.36kr.com/feed");

        var captor = org.mockito.ArgumentCaptor.forClass(SourceEntity.class);
        verify(sourceRepository).save(captor.capture());
        JsonNode config = mapper.readTree(captor.getValue().getConfigJson());
        assertEquals("https://www.36kr.com/feed", config.path("feedUrl").asText());
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
