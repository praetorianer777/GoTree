VERSION ?= $(shell cat VERSION)-dev
LDFLAGS := -s -w -X main.version=$(VERSION)

.PHONY: dev dev-api dev-web build web test clean

# Runs the API on :8080 and Vite on :5173 (which proxies /api to the API).
dev:
	@$(MAKE) -j2 dev-api dev-web

dev-api:
	go run ./cmd/gotree

dev-web:
	cd web && npm run dev

web:
	cd web && npm ci --no-audit --no-fund && npm run build

build: web
	CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o gotree ./cmd/gotree

test:
	./run-tests.sh

clean:
	rm -f gotree
	find web/dist -mindepth 1 ! -name .gitkeep -delete
