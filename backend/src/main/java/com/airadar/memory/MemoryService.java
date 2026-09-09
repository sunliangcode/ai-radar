package com.airadar.memory;

import com.airadar.api.ApiTimes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MemoryService {

    private final MemoryRepository repository;

    public MemoryService(MemoryRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void remember(String kind, String refType, Long refId, String title, String payloadJson) {
        MemoryEntity e = new MemoryEntity();
        e.setKind(kind);
        e.setRefType(refType);
        e.setRefId(refId);
        e.setTitle(title);
        e.setPayloadJson(payloadJson);
        repository.save(e);
    }

    @Transactional(readOnly = true)
    public String recentHints() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(m -> m.getKind() + ": " + (m.getTitle() == null ? "" : m.getTitle()))
                .collect(Collectors.joining("\n"));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRecent() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream().map(m -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", m.getId());
            dto.put("kind", m.getKind());
            dto.put("refType", m.getRefType());
            dto.put("refId", m.getRefId());
            dto.put("title", m.getTitle());
            dto.put("createdAt", ApiTimes.iso(m.getCreatedAt()));
            return dto;
        }).toList();
    }
}
