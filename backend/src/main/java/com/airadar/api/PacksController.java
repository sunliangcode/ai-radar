package com.airadar.api;

import com.airadar.packs.PackImportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/packs")
public class PacksController {

    private final PackImportService packImportService;

    public PacksController(PackImportService packImportService) {
        this.packImportService = packImportService;
    }

    @PostMapping("/import")
    public Map<String, Object> importPack(@RequestBody Map<String, Object> body) {
        String packId = body.get("packId") == null ? null : String.valueOf(body.get("packId"));
        String path = body.get("path") == null ? null : String.valueOf(body.get("path"));
        return packImportService.importPack(packId, path);
    }
}
