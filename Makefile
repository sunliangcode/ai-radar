# AI Radar — common contributor commands (GNU make / BSD make).
# Run `make help` for targets.

.PHONY: help check status health health-llm doctor connectors delivery-channels pack-list pack-validate stop install backup smoke cli-help docker-build

help:
	@echo "AI Radar targets"
	@echo "  make install            ./install.sh (one-box)"
	@echo "  make stop               ./stop.sh"
	@echo "  make status             ./scripts/status.sh (ports + soft SPI catalogs)"
	@echo "  make health             ./bin/ai-radar health (JSON)"
	@echo "  make health-llm         ./bin/ai-radar health-llm (live LLM probe)"
	@echo "  make doctor             ./bin/ai-radar doctor (prereq + health JSON; soft modelPresent + SPI catalogs)"
	@echo "  make connectors         ./bin/ai-radar connectors (SPI catalog; BUILTIN_CONNECTOR_PAIRS / BUILTIN_CONNECTOR_FIELDS)"
	@echo "  make delivery-channels  ./bin/ai-radar delivery-channels (BUILTIN_DELIVERY_SETTINGS)"
	@echo "  make pack-list          ./bin/ai-radar pack list"
	@echo "  make pack-validate FILE=path  ./bin/ai-radar pack validate FILE"
	@echo "  make check              ./scripts/check.sh (CI-parity)"
	@echo "  make backup             ./scripts/backup.sh (AI_RADAR_DB / BACKUP_KEEP)"
	@echo "  make smoke              ./scripts/smoke-extensibility.sh (needs :8080)"
	@echo "  make docker-build       docker compose build (argos + daily-hot + app)"
	@echo "  make cli-help           ./bin/ai-radar help"
	@echo ""
	@echo "Docs: docs/README.md · docs/cli.md · docs/extensibility.md · docs/release.md"

install:
	./install.sh

stop:
	./stop.sh

status:
	./scripts/status.sh

health:
	./bin/ai-radar health

health-llm:
	./bin/ai-radar health-llm

doctor:
	./bin/ai-radar doctor

connectors:
	./bin/ai-radar connectors

delivery-channels:
	./bin/ai-radar delivery-channels

pack-list:
	./bin/ai-radar pack list

pack-validate:
	@test -n "$(FILE)" || (echo "Usage: make pack-validate FILE=examples/packs/demo-local.json" >&2; exit 2)
	./bin/ai-radar pack validate "$(FILE)"

check:
	./scripts/check.sh

backup:
	./scripts/backup.sh

smoke:
	./scripts/smoke-extensibility.sh

docker-build:
	docker compose build

cli-help:
	./bin/ai-radar help
