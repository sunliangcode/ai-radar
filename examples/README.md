# Examples

Sample artifacts for contributors — **not** shipped as product defaults.

| Path | Purpose |
| --- | --- |
| [packs/demo-local.json](packs/demo-local.json) | Minimal FIXTURE pack for the [15-minute pack walkthrough](../docs/sources.md#15-minute-pack-walkthrough) |

Import without rebuilding the jar:

```bash
./bin/ai-radar pack validate examples/packs/demo-local.json
./bin/ai-radar pack import demo-local --path examples/packs/demo-local.json
```

Do not copy throwaway packs into `packs/sources/` unless you intend them as built-in import ids.

CI (`shared/pack-files-sync.test.mjs`) validates this demo pack and every `packs/sources/*.json` with the same schema as `./bin/ai-radar pack validate`.
