# Extending connectors

AI Radar discovers source connectors as Spring beans implementing `SourceConnector`.

## Contract

```java
public interface SourceConnector {
  String typeCode();                 // stored in sources.type
  SourceType type();                 // built-in enum; add FIXTURE-style values for in-repo plugins
  ConnectorDescriptor descriptor();  // UI/docs metadata
  List<RawItem> fetch(FetchContext ctx);
}
```

- Throw unchecked exceptions on hard failures. The orchestrator isolates per-source errors.
- Return an empty list when there is nothing new.
- Prefer absolute/canonical URLs; the pipeline will normalize.

## Steps to add a connector

1. Create a `@Component` under `com.airadar.connector` (or your module scanned by Spring).
2. Implement `type()` / `typeCode()` with a unique code (e.g. `ARXIV`).
3. If the code is new, add it to `SourceType` enum (current persistence uses the enum).
4. Override `descriptor()` with config field definitions.
5. Restart the app. Create a source via UI/API with matching `type` and `config`.

## Example: FixtureConnector

`FixtureConnector` (`type=FIXTURE`) reads JSON from classpath/file:

```json
{ "path": "fixtures/demo-events.json" }
```

See `backend/src/main/java/com/airadar/connector/FixtureConnector.java`.

## Registration

`ConnectorRegistry` indexes beans by `typeCode()`. `PipelineOrchestrator` resolves connectors through the registry — no core pipeline edits required for a new bean.
