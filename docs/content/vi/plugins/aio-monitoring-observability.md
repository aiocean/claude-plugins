---
title: "aio-monitoring-observability"
description: "Chiến lược, triển khai và troubleshoot monitoring và observability. Thiết kế metric (Golden Signals, RED/USE), distributed tracing (OpenTelemetry), alerting, SLO, dashboard, log aggregation và lựa chọn công cụ. Gồm 7 script tự động và template production-ready."
document_type: "plugin"
version: "1.0.8"
install: "/plugin install aio-monitoring-observability@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-monitoring-observability@aiocean-plugins` · `v1.0.8`

# aio-monitoring-observability

Chiến lược, triển khai và troubleshoot monitoring và observability. Thiết kế metric (Golden Signals, RED/USE), distributed tracing (OpenTelemetry), alerting, SLO, dashboard, log aggregation và lựa chọn công cụ.

## Cài đặt

```bash
/plugin install aio-monitoring-observability@aiocean-plugins
```

## Tính năng

- Thiết kế metric bằng Golden Signals (latency, traffic, errors, saturation), phương pháp RED và USE
- Lập kế hoạch và triển khai distributed tracing với OpenTelemetry
- Định nghĩa SLO và error budget
- Thiết kế alert rule giảm noise
- Thiết kế pipeline log aggregation
- Chọn và so sánh công cụ observability (Prometheus, Grafana, Jaeger, Loki, v.v.)
- 7 script tự động cho các tác vụ observability thường gặp

## Yêu cầu

- python3

## Skills (1)

- [**aio-monitoring-observability**](/vi/plugins/aio-monitoring-observability/aio-monitoring-observability) — Thiết kế metric, alert, dashboard và SLO theo best practice monitoring (Four Golden Signals, phương pháp RED/USE).
