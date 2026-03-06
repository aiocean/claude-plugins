#!/usr/bin/env python3
"""
Analyze metrics from Prometheus or CloudWatch and detect anomalies.
Supports: rate of change analysis, spike detection, trend analysis.
"""

import argparse
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import statistics

try:
    import requests
except ImportError:
    print("⚠️  Warning: 'requests' library not found. Install with: pip install requests")
    sys.exit(1)

try:
    import boto3
except ImportError:
    boto3 = None


class MetricAnalyzer:
    def __init__(self, source: str, endpoint: Optional[str] = None, region: str = "us-east-1"):
        self.source = source
        self.endpoint = endpoint
        self.region = region
        if source == "cloudwatch" and boto3:
            self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        elif source == "cloudwatch" and not boto3:
            print("⚠️  boto3 not installed. Install with: pip install boto3")
            sys.exit(1)

    def query_prometheus(self, query: str, hours: int = 24) -> List[Dict]:
        """Query Prometheus for metric data."""
        if not self.endpoint:
            print("❌ Prometheus endpoint required")
            sys.exit(1)

        try:
            # Query range for last N hours
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)

            params = {
                'query': query,
                'start': start_time.timestamp(),
                'end': end_time.timestamp(),
                'step': '5m'  # 5-minute resolution
            }

            response = requests.get(f"{self.endpoint}/api/v1/query_range", params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            if data['status'] != 'success':
                print(f"❌ Prometheus query failed: {data}")
                return []

            return data['data']['result']

        except Exception as e:
            print(f"❌ Error querying Prometheus: {e}")
            return []

    def query_cloudwatch(self, namespace: str, metric_name: str, dimensions: Dict[str, str],
                         hours: int = 24, stat: str = "Average") -> List[Dict]:
        """Query CloudWatch for metric data."""
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)

            dimensions_list = [{'Name': k, 'Value': v} for k, v in dimensions.items()]

            response = self.cloudwatch.get_metric_statistics(
                Namespace=namespace,
                MetricName=metric_name,
                Dimensions=dimensions_list,
                StartTime=start_time,
                EndTime=end_time,
                Period=300,  # 5-minute intervals
                Statistics=[stat]
            )

            return sorted(response['Datapoints'], key=lambda x: x['Timestamp'])

        except Exception as e:
            print(f"❌ Error querying CloudWatch: {e}")
            return []

    def detect_anomalies(self, values: List[float], sensitivity: float = 2.0) -> Dict[str, Any]:
        """Detect anomalies using standard deviation method."""
        if len(values) < 10:
            return {
                "anomalies_detected": False,
                "message": "Insufficient data points for anomaly detection"
            }

        mean = statistics.mean(values)
        stdev = statistics.stdev(values)
        threshold_upper = mean + (sensitivity * stdev)
        threshold_lower = mean - (sensitivity * stdev)

        anomalies = []
        for i, value in enumerate(values):
            if value > threshold_upper or value < threshold_lower:
                anomalies.append({
                    "index": i,
                    "value": value,
                    "deviation": abs(value - mean) / stdev if stdev > 0 else 0
                })

        return {
            "anomalies_detected": len(anomalies) > 0,
            "count": len(anomalies),
            "anomalies": anomalies,
            "stats": {
                "mean": mean,
                "stdev": stdev,
                "threshold_upper": threshold_upper,
                "threshold_lower": threshold_lower,
                "total_points": len(values)
            }
        }

    def analyze_trend(self, values: List[float]) -> Dict[str, Any]:
        """Analyze trend using simple linear regression."""
        if len(values) < 2:
            return {"trend": "unknown", "message": "Insufficient data"}

        n = len(values)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(values) / n

        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return {"trend": "flat", "slope": 0}

        slope = numerator / denominator

        # Determine trend direction
        if abs(slope) < 0.01 * y_mean:  # Less than 1% change per interval
            trend = "stable"
        elif slope > 0:
            trend = "increasing"
        else:
            trend = "decreasing"

        return {
            "trend": trend,
            "slope": slope,
            "rate_of_change": (slope / y_mean * 100) if y_mean != 0 else 0
        }


def print_results(results: Dict[str, Any]):
    """Pretty print analysis results."""
    print("\n" + "="*60)
    print("📊 METRIC ANALYSIS RESULTS")
    print("="*60)

    if "error" in results:
        print(f"\n❌ Error: {results['error']}")
        return

    print(f"\n📈 Data Points: {results.get('data_points', 0)}")

    # Trend analysis
    if "trend" in results:
        trend_emoji = {"increasing": "📈", "decreasing": "📉", "stable": "➡️"}.get(results["trend"]["trend"], "❓")
        print(f"\n{trend_emoji} Trend: {results['trend']['trend'].upper()}")
        if "rate_of_change" in results["trend"]:
            print(f"   Rate of Change: {results['trend']['rate_of_change']:.2f}% per interval")

    # Anomaly detection
    if "anomalies" in results:
        anomaly_data = results["anomalies"]
        if anomaly_data["anomalies_detected"]:
            print(f"\n⚠️  ANOMALIES DETECTED: {anomaly_data['count']}")
            print(f"   Mean: {anomaly_data['stats']['mean']:.2f}")
            print(f"   Std Dev: {anomaly_data['stats']['stdev']:.2f}")
            print(f"   Threshold: [{anomaly_data['stats']['threshold_lower']:.2f}, {anomaly_data['stats']['threshold_upper']:.2f}]")

            print("\n   Top Anomalies:")
            for anomaly in sorted(anomaly_data['anomalies'], key=lambda x: x['deviation'], reverse=True)[:5]:
                print(f"   • Index {anomaly['index']}: {anomaly['value']:.2f} ({anomaly['deviation']:.2f}σ)")
        else:
            print("\n✅ No anomalies detected")

    print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze metrics from Prometheus or CloudWatch",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Prometheus: Analyze request rate
  python3 analyze_metrics.py prometheus \\
    --endpoint http://localhost:9090 \\
    --query 'rate(http_requests_total[5m])' \\
    --hours 24

  # CloudWatch: Analyze CPU utilization
  python3 analyze_metrics.py cloudwatch \\
    --namespace AWS/EC2 \\
    --metric CPUUtilization \\
    --dimensions InstanceId=i-1234567890abcdef0 \\
    --hours 48
        """
    )

    parser.add_argument('source', choices=['prometheus', 'cloudwatch'],
                       help='Metric source')
    parser.add_argument('--endpoint', help='Prometheus endpoint URL')
    parser.add_argument('--query', help='PromQL query')
    parser.add_argument('--namespace', help='CloudWatch namespace')
    parser.add_argument('--metric', help='CloudWatch metric name')
    parser.add_argument('--dimensions', help='CloudWatch dimensions (key=value,key2=value2)')
    parser.add_argument('--hours', type=int, default=24, help='Hours of data to analyze (default: 24)')
    parser.add_argument('--sensitivity', type=float, default=2.0,
                       help='Anomaly detection sensitivity (std deviations, default: 2.0)')
    parser.add_argument('--region', default='us-east-1', help='AWS region (default: us-east-1)')

    args = parser.parse_args()

    analyzer = MetricAnalyzer(args.source, args.endpoint, args.region)

    # Query metrics
    if args.source == 'prometheus':
        if not args.query:
            print("❌ --query required for Prometheus")
            sys.exit(1)

        print(f"🔍 Querying Prometheus: {args.query}")
        results = analyzer.query_prometheus(args.query, args.hours)

        if not results:
            print("❌ No data returned")
            sys.exit(1)

        # Extract values from first result series
        values = [float(v[1]) for v in results[0].get('values', [])]

    elif args.source == 'cloudwatch':
        if not all([args.namespace, args.metric, args.dimensions]):
            print("❌ --namespace, --metric, and --dimensions required for CloudWatch")
            sys.exit(1)

        dims = dict(item.split('=') for item in args.dimensions.split(','))

        print(f"🔍 Querying CloudWatch: {args.namespace}/{args.metric}")
        results = analyzer.query_cloudwatch(args.namespace, args.metric, dims, args.hours)

        if not results:
            print("❌ No data returned")
            sys.exit(1)

        values = [point['Average'] for point in results]

    # Analyze metrics
    analysis_results = {
        "data_points": len(values),
        "trend": analyzer.analyze_trend(values),
        "anomalies": analyzer.detect_anomalies(values, args.sensitivity)
    }

    print_results(analysis_results)


if __name__ == "__main__":
    main()
