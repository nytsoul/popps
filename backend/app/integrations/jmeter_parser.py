"""
ShopScale — JMeter Report Parser
Parses JTL (CSV) and XML JMeter result files, computes performance metrics.
"""
from __future__ import annotations

import csv
import io
import math
import statistics
from dataclasses import dataclass, field
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class JMeterSample:
    """Single JMeter test sample."""
    timestamp: int  # epoch ms
    elapsed: int  # response time ms
    label: str
    response_code: str
    response_message: str
    success: bool
    bytes_received: int = 0
    sent_bytes: int = 0
    thread_name: str = ""
    data_type: str = ""
    url: str = ""
    latency: int = 0
    connect_time: int = 0


@dataclass
class JMeterMetrics:
    """Computed performance metrics from JMeter samples."""
    sample_count: int = 0
    successful_count: int = 0
    failed_count: int = 0
    error_percentage: float = 0.0
    mean_response_time: float = 0.0
    median_response_time: float = 0.0
    p90_response_time: float = 0.0
    p95_response_time: float = 0.0
    min_response_time: float = 0.0
    max_response_time: float = 0.0
    throughput: float = 0.0  # requests/sec
    mean_latency: float = 0.0
    mean_connect_time: float = 0.0
    total_bytes_received: int = 0
    total_bytes_sent: int = 0
    duration_seconds: float = 0.0
    response_code_distribution: dict[str, int] = field(default_factory=dict)
    label_metrics: dict[str, dict[str, Any]] = field(default_factory=dict)
    timeline: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "sample_count": self.sample_count,
            "successful_count": self.successful_count,
            "failed_count": self.failed_count,
            "error_percentage": round(self.error_percentage, 2),
            "mean_response_time_ms": round(self.mean_response_time, 2),
            "median_response_time_ms": round(self.median_response_time, 2),
            "p90_response_time_ms": round(self.p90_response_time, 2),
            "p95_response_time_ms": round(self.p95_response_time, 2),
            "min_response_time_ms": round(self.min_response_time, 2),
            "max_response_time_ms": round(self.max_response_time, 2),
            "throughput_rps": round(self.throughput, 2),
            "mean_latency_ms": round(self.mean_latency, 2),
            "mean_connect_time_ms": round(self.mean_connect_time, 2),
            "total_bytes_received": self.total_bytes_received,
            "total_bytes_sent": self.total_bytes_sent,
            "duration_seconds": round(self.duration_seconds, 2),
            "response_code_distribution": self.response_code_distribution,
            "label_metrics": self.label_metrics,
            "timeline": self.timeline,
        }


def _percentile(sorted_data: list[float], p: float) -> float:
    """Calculate percentile from sorted data."""
    if not sorted_data:
        return 0.0
    k = (len(sorted_data) - 1) * p / 100
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1


def parse_jtl_csv(content: str) -> list[JMeterSample]:
    """Parse JTL CSV format (Apache JMeter standard output)."""
    samples = []
    reader = csv.DictReader(io.StringIO(content))

    # Validate required columns
    required_fields = {"timeStamp", "elapsed", "label", "responseCode", "success"}
    if reader.fieldnames is None:
        raise ValueError("Empty or invalid JTL file: no header row found")

    fieldnames = set(reader.fieldnames)
    missing = required_fields - fieldnames
    if missing:
        raise ValueError(f"Missing required JTL columns: {', '.join(sorted(missing))}")

    for row_num, row in enumerate(reader, start=2):
        try:
            success_val = row.get("success", "").strip().lower()
            sample = JMeterSample(
                timestamp=int(row["timeStamp"]),
                elapsed=int(row["elapsed"]),
                label=row["label"],
                response_code=row["responseCode"],
                response_message=row.get("responseMessage", ""),
                success=success_val in ("true", "1", "yes"),
                bytes_received=int(row.get("bytes", 0) or 0),
                sent_bytes=int(row.get("sentBytes", 0) or 0),
                thread_name=row.get("threadName", ""),
                data_type=row.get("dataType", ""),
                url=row.get("URL", ""),
                latency=int(row.get("Latency", 0) or 0),
                connect_time=int(row.get("Connect", 0) or 0),
            )
            samples.append(sample)
        except (ValueError, KeyError) as e:
            logger.warning(f"Skipping malformed JTL row {row_num}", error=str(e))
            continue

    if not samples:
        raise ValueError("No valid samples found in JTL file")

    return samples


def compute_metrics(samples: list[JMeterSample]) -> JMeterMetrics:
    """Compute performance metrics from parsed JMeter samples."""
    if not samples:
        return JMeterMetrics()

    metrics = JMeterMetrics()
    metrics.sample_count = len(samples)
    metrics.successful_count = sum(1 for s in samples if s.success)
    metrics.failed_count = metrics.sample_count - metrics.successful_count
    metrics.error_percentage = (metrics.failed_count / metrics.sample_count) * 100

    # Response times
    elapsed_times = sorted(s.elapsed for s in samples)
    metrics.mean_response_time = statistics.mean(elapsed_times)
    metrics.median_response_time = statistics.median(elapsed_times)
    metrics.p90_response_time = _percentile(elapsed_times, 90)
    metrics.p95_response_time = _percentile(elapsed_times, 95)
    metrics.min_response_time = min(elapsed_times)
    metrics.max_response_time = max(elapsed_times)

    # Latency and connect time
    latencies = [s.latency for s in samples if s.latency > 0]
    if latencies:
        metrics.mean_latency = statistics.mean(latencies)

    connect_times = [s.connect_time for s in samples if s.connect_time > 0]
    if connect_times:
        metrics.mean_connect_time = statistics.mean(connect_times)

    # Throughput
    timestamps = [s.timestamp for s in samples]
    min_ts = min(timestamps)
    max_ts = max(timestamps)
    metrics.duration_seconds = (max_ts - min_ts) / 1000.0
    if metrics.duration_seconds > 0:
        metrics.throughput = metrics.sample_count / metrics.duration_seconds

    # Bytes
    metrics.total_bytes_received = sum(s.bytes_received for s in samples)
    metrics.total_bytes_sent = sum(s.sent_bytes for s in samples)

    # Response code distribution
    code_dist: dict[str, int] = {}
    for s in samples:
        code_dist[s.response_code] = code_dist.get(s.response_code, 0) + 1
    metrics.response_code_distribution = code_dist

    # Per-label metrics
    labels: dict[str, list[JMeterSample]] = {}
    for s in samples:
        labels.setdefault(s.label, []).append(s)

    for label, label_samples in labels.items():
        label_elapsed = sorted(s.elapsed for s in label_samples)
        label_failed = sum(1 for s in label_samples if not s.success)
        metrics.label_metrics[label] = {
            "count": len(label_samples),
            "failed": label_failed,
            "error_pct": round(label_failed / max(1, len(label_samples)) * 100, 2),
            "mean_ms": round(statistics.mean(label_elapsed), 2),
            "median_ms": round(statistics.median(label_elapsed), 2),
            "p90_ms": round(_percentile(label_elapsed, 90), 2),
            "p95_ms": round(_percentile(label_elapsed, 95), 2),
            "min_ms": min(label_elapsed),
            "max_ms": max(label_elapsed),
        }

    # Timeline (1-second buckets for charts)
    if metrics.duration_seconds > 0:
        bucket_size_ms = max(1000, int(metrics.duration_seconds * 1000 / 100))  # ~100 buckets max
        current_bucket = min_ts
        while current_bucket <= max_ts:
            bucket_end = current_bucket + bucket_size_ms
            bucket_samples = [s for s in samples if current_bucket <= s.timestamp < bucket_end]
            if bucket_samples:
                metrics.timeline.append({
                    "time_ms": current_bucket,
                    "count": len(bucket_samples),
                    "mean_ms": round(statistics.mean(s.elapsed for s in bucket_samples), 2),
                    "errors": sum(1 for s in bucket_samples if not s.success),
                })
            current_bucket = bucket_end

    return metrics


def validate_jtl_content(content: str, max_size_bytes: int = 50 * 1024 * 1024) -> tuple[bool, str]:
    """Validate JTL file content before parsing."""
    if not content or not content.strip():
        return False, "Empty file"

    if len(content.encode("utf-8")) > max_size_bytes:
        return False, f"File exceeds maximum size of {max_size_bytes // (1024 * 1024)}MB"

    # Check for CSV header
    first_line = content.split("\n")[0].strip()
    if "timeStamp" not in first_line or "elapsed" not in first_line:
        return False, "File does not appear to be a valid JTL CSV file (missing required headers)"

    return True, "ok"
