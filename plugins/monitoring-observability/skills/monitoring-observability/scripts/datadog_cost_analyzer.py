#!/usr/bin/env python3
"""
Analyze Datadog usage and identify cost optimization opportunities.
Helps find waste in custom metrics, logs, APM, and infrastructure monitoring.
"""

import argparse
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict

try:
    import requests
except ImportError:
    print("⚠️  Warning: 'requests' library not found. Install with: pip install requests")
    sys.exit(1)

try:
    from tabulate import tabulate
except ImportError:
    tabulate = None


class DatadogCostAnalyzer:
    # Pricing (as of 2024-2025)
    PRICING = {
        'infrastructure_pro': 15,  # per host per month
        'infrastructure_enterprise': 23,
        'custom_metric': 0.01,  # per metric per month (first 100 free per host)
        'log_ingestion': 0.10,  # per GB ingested per month
        'apm_host': 31,  # APM Pro per host per month
        'apm_span': 1.70,  # per million indexed spans
    }

    def __init__(self, api_key: str, app_key: str, site: str = "datadoghq.com"):
        self.api_key = api_key
        self.app_key = app_key
        self.site = site
        self.base_url = f"https://api.{site}"
        self.headers = {
            'DD-API-KEY': api_key,
            'DD-APPLICATION-KEY': app_key,
            'Content-Type': 'application/json'
        }

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make API request to Datadog."""
        try:
            url = f"{self.base_url}{endpoint}"
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ API Error: {e}")
            return {}

    def get_usage_metrics(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get usage metrics for specified date range."""
        endpoint = "/api/v1/usage/summary"
        params = {
            'start_month': start_date,
            'end_month': end_date,
            'include_org_details': 'true'
        }

        data = self._make_request(endpoint, params)
        return data.get('usage', [])

    def get_custom_metrics(self) -> Dict[str, Any]:
        """Get custom metrics usage and identify high-cardinality metrics."""
        endpoint = "/api/v1/usage/timeseries"

        # Get last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        params = {
            'start_hr': int(start_date.timestamp()),
            'end_hr': int(end_date.timestamp())
        }

        data = self._make_request(endpoint, params)

        if not data:
            return {'metrics': [], 'total_count': 0}

        # Extract custom metrics info
        usage_data = data.get('usage', [])

        metrics_summary = {
            'total_custom_metrics': 0,
            'avg_custom_metrics': 0,
            'billable_metrics': 0
        }

        for day in usage_data:
            if 'timeseries' in day:
                for ts in day['timeseries']:
                    if ts.get('metric_category') == 'custom':
                        metrics_summary['total_custom_metrics'] = max(
                            metrics_summary['total_custom_metrics'],
                            ts.get('num_custom_timeseries', 0)
                        )

        # Calculate billable (first 100 free)
        metrics_summary['billable_metrics'] = max(0, metrics_summary['total_custom_metrics'] - 100)

        return metrics_summary

    def get_infrastructure_hosts(self) -> Dict[str, Any]:
        """Get infrastructure host count and breakdown."""
        endpoint = "/api/v1/usage/hosts"

        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        params = {
            'start_hr': int(start_date.timestamp()),
            'end_hr': int(end_date.timestamp())
        }

        data = self._make_request(endpoint, params)

        if not data:
            return {'total_hosts': 0}

        usage = data.get('usage', [])

        host_summary = {
            'total_hosts': 0,
            'agent_hosts': 0,
            'aws_hosts': 0,
            'azure_hosts': 0,
            'gcp_hosts': 0,
            'container_count': 0
        }

        for day in usage:
            host_summary['total_hosts'] = max(host_summary['total_hosts'], day.get('host_count', 0))
            host_summary['agent_hosts'] = max(host_summary['agent_hosts'], day.get('agent_host_count', 0))
            host_summary['aws_hosts'] = max(host_summary['aws_hosts'], day.get('aws_host_count', 0))
            host_summary['azure_hosts'] = max(host_summary['azure_hosts'], day.get('azure_host_count', 0))
            host_summary['gcp_hosts'] = max(host_summary['gcp_hosts'], day.get('gcp_host_count', 0))
            host_summary['container_count'] = max(host_summary['container_count'], day.get('container_count', 0))

        return host_summary

    def get_log_usage(self) -> Dict[str, Any]:
        """Get log ingestion and retention usage."""
        endpoint = "/api/v1/usage/logs"

        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        params = {
            'start_hr': int(start_date.timestamp()),
            'end_hr': int(end_date.timestamp())
        }

        data = self._make_request(endpoint, params)

        if not data:
            return {'total_gb': 0, 'daily_avg_gb': 0}

        usage = data.get('usage', [])

        total_ingested = 0
        days_count = len(usage)

        for day in usage:
            total_ingested += day.get('ingested_events_bytes', 0)

        total_gb = total_ingested / (1024**3)  # Convert to GB
        daily_avg_gb = total_gb / max(days_count, 1)

        return {
            'total_gb': total_gb,
            'daily_avg_gb': daily_avg_gb,
            'monthly_projected_gb': daily_avg_gb * 30
        }

    def get_unused_monitors(self) -> List[Dict[str, Any]]:
        """Find monitors that haven't alerted in 30+ days."""
        endpoint = "/api/v1/monitor"

        data = self._make_request(endpoint)

        if not data:
            return []

        monitors = data if isinstance(data, list) else []

        unused = []
        now = datetime.now()

        for monitor in monitors:
            # Check if monitor has triggered recently
            overall_state = monitor.get('overall_state')
            modified = monitor.get('modified', '')

            # If monitor has been in OK state and not modified in 30+ days
            try:
                if modified:
                    mod_date = datetime.fromisoformat(modified.replace('Z', '+00:00'))
                    days_since_modified = (now - mod_date.replace(tzinfo=None)).days

                    if days_since_modified > 30 and overall_state in ['OK', 'No Data']:
                        unused.append({
                            'name': monitor.get('name', 'Unknown'),
                            'id': monitor.get('id'),
                            'days_since_modified': days_since_modified,
                            'state': overall_state
                        })
            except:
                pass

        return unused

    def calculate_costs(self, usage_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate estimated monthly costs."""
        costs = {
            'infrastructure': 0,
            'custom_metrics': 0,
            'logs': 0,
            'apm': 0,
            'total': 0
        }

        # Infrastructure (assuming Pro tier)
        if 'hosts' in usage_data:
            costs['infrastructure'] = usage_data['hosts'].get('total_hosts', 0) * self.PRICING['infrastructure_pro']

        # Custom metrics
        if 'custom_metrics' in usage_data:
            billable = usage_data['custom_metrics'].get('billable_metrics', 0)
            costs['custom_metrics'] = billable * self.PRICING['custom_metric']

        # Logs
        if 'logs' in usage_data:
            monthly_gb = usage_data['logs'].get('monthly_projected_gb', 0)
            costs['logs'] = monthly_gb * self.PRICING['log_ingestion']

        costs['total'] = sum(costs.values())

        return costs

    def get_recommendations(self, usage_data: Dict[str, Any]) -> List[str]:
        """Generate cost optimization recommendations."""
        recommendations = []

        # Custom metrics recommendations
        if 'custom_metrics' in usage_data:
            billable = usage_data['custom_metrics'].get('billable_metrics', 0)
            if billable > 500:
                savings = (billable * 0.3) * self.PRICING['custom_metric']  # Assume 30% reduction possible
                recommendations.append({
                    'category': 'Custom Metrics',
                    'issue': f'High custom metric count: {billable:,} billable metrics',
                    'action': 'Review metric tags for high cardinality, consider aggregating or dropping unused metrics',
                    'potential_savings': f'${savings:.2f}/month'
                })

        # Container vs VM recommendations
        if 'hosts' in usage_data:
            hosts = usage_data['hosts'].get('total_hosts', 0)
            containers = usage_data['hosts'].get('container_count', 0)

            if containers > hosts * 10:  # Many containers per host
                savings = hosts * 0.2 * self.PRICING['infrastructure_pro']
                recommendations.append({
                    'category': 'Infrastructure',
                    'issue': f'{containers:,} containers running on {hosts} hosts',
                    'action': 'Consider using container monitoring instead of host-based (can be 50-70% cheaper)',
                    'potential_savings': f'${savings:.2f}/month'
                })

        # Unused monitors
        if 'unused_monitors' in usage_data:
            count = len(usage_data['unused_monitors'])
            if count > 10:
                recommendations.append({
                    'category': 'Monitors',
                    'issue': f'{count} monitors unused for 30+ days',
                    'action': 'Delete or disable unused monitors to reduce noise and improve performance',
                    'potential_savings': 'Operational efficiency'
                })

        # Log volume recommendations
        if 'logs' in usage_data:
            monthly_gb = usage_data['logs'].get('monthly_projected_gb', 0)
            if monthly_gb > 100:
                savings = (monthly_gb * 0.4) * self.PRICING['log_ingestion']  # 40% reduction
                recommendations.append({
                    'category': 'Logs',
                    'issue': f'High log volume: {monthly_gb:.1f} GB/month projected',
                    'action': 'Review log sources, implement sampling for debug logs, exclude health checks',
                    'potential_savings': f'${savings:.2f}/month'
                })

        # Migration recommendation if costs are high
        costs = self.calculate_costs(usage_data)
        if costs['total'] > 5000:
            oss_cost = usage_data['hosts'].get('total_hosts', 0) * 15  # Rough estimate for self-hosted
            savings = costs['total'] - oss_cost
            recommendations.append({
                'category': 'Strategic',
                'issue': f'Total monthly cost: ${costs["total"]:.2f}',
                'action': 'Consider migrating to open-source stack (Prometheus + Grafana + Loki)',
                'potential_savings': f'${savings:.2f}/month (~{(savings/costs["total"]*100):.0f}% reduction)'
            })

        return recommendations


def print_usage_summary(usage_data: Dict[str, Any]):
    """Print usage summary."""
    print("\n" + "="*70)
    print("📊 DATADOG USAGE SUMMARY")
    print("="*70)

    # Infrastructure
    if 'hosts' in usage_data:
        hosts = usage_data['hosts']
        print(f"\n🖥️  Infrastructure:")
        print(f"   Total Hosts: {hosts.get('total_hosts', 0):,}")
        print(f"   Agent Hosts: {hosts.get('agent_hosts', 0):,}")
        print(f"   AWS Hosts: {hosts.get('aws_hosts', 0):,}")
        print(f"   Azure Hosts: {hosts.get('azure_hosts', 0):,}")
        print(f"   GCP Hosts: {hosts.get('gcp_hosts', 0):,}")
        print(f"   Containers: {hosts.get('container_count', 0):,}")

    # Custom Metrics
    if 'custom_metrics' in usage_data:
        metrics = usage_data['custom_metrics']
        print(f"\n📈 Custom Metrics:")
        print(f"   Total: {metrics.get('total_custom_metrics', 0):,}")
        print(f"   Billable: {metrics.get('billable_metrics', 0):,} (first 100 free)")

    # Logs
    if 'logs' in usage_data:
        logs = usage_data['logs']
        print(f"\n📝 Logs:")
        print(f"   Daily Average: {logs.get('daily_avg_gb', 0):.2f} GB")
        print(f"   Monthly Projected: {logs.get('monthly_projected_gb', 0):.2f} GB")

    # Unused Monitors
    if 'unused_monitors' in usage_data:
        print(f"\n🔔 Unused Monitors:")
        print(f"   Count: {len(usage_data['unused_monitors'])}")


def print_cost_breakdown(costs: Dict[str, float]):
    """Print cost breakdown."""
    print("\n" + "="*70)
    print("💰 ESTIMATED MONTHLY COSTS")
    print("="*70)

    print(f"\n   Infrastructure Monitoring: ${costs['infrastructure']:,.2f}")
    print(f"   Custom Metrics:            ${costs['custom_metrics']:,.2f}")
    print(f"   Log Management:            ${costs['logs']:,.2f}")
    print(f"   APM:                       ${costs['apm']:,.2f}")
    print(f"   " + "-"*40)
    print(f"   TOTAL:                     ${costs['total']:,.2f}/month")
    print(f"                              ${costs['total']*12:,.2f}/year")


def print_recommendations(recommendations: List[Dict]):
    """Print recommendations."""
    print("\n" + "="*70)
    print("💡 COST OPTIMIZATION RECOMMENDATIONS")
    print("="*70)

    total_savings = 0

    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. {rec['category']}")
        print(f"   Issue: {rec['issue']}")
        print(f"   Action: {rec['action']}")
        print(f"   Potential Savings: {rec['potential_savings']}")

        # Extract savings amount if it's a dollar value
        if '$' in rec['potential_savings']:
            try:
                amount = float(rec['potential_savings'].replace('$', '').replace('/month', '').replace(',', ''))
                total_savings += amount
            except:
                pass

    if total_savings > 0:
        print(f"\n{'='*70}")
        print(f"💵 Total Potential Monthly Savings: ${total_savings:,.2f}")
        print(f"💵 Total Potential Annual Savings:  ${total_savings*12:,.2f}")
        print(f"{'='*70}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze Datadog usage and identify cost optimization opportunities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze current usage
  python3 datadog_cost_analyzer.py \\
    --api-key DD_API_KEY \\
    --app-key DD_APP_KEY

  # Use environment variables
  export DD_API_KEY=your_api_key
  export DD_APP_KEY=your_app_key
  python3 datadog_cost_analyzer.py

  # Specify site (for EU)
  python3 datadog_cost_analyzer.py --site datadoghq.eu

Required Datadog Permissions:
  - usage_read
  - monitors_read
        """
    )

    parser.add_argument('--api-key',
                       default=os.environ.get('DD_API_KEY'),
                       help='Datadog API key (or set DD_API_KEY env var)')
    parser.add_argument('--app-key',
                       default=os.environ.get('DD_APP_KEY'),
                       help='Datadog Application key (or set DD_APP_KEY env var)')
    parser.add_argument('--site',
                       default='datadoghq.com',
                       help='Datadog site (default: datadoghq.com, EU: datadoghq.eu)')

    args = parser.parse_args()

    if not args.api_key or not args.app_key:
        print("❌ Error: API key and Application key required")
        print("   Set via --api-key and --app-key flags or DD_API_KEY and DD_APP_KEY env vars")
        sys.exit(1)

    print("🔍 Analyzing Datadog usage...")
    print("   This may take 30-60 seconds...\n")

    analyzer = DatadogCostAnalyzer(args.api_key, args.app_key, args.site)

    # Gather usage data
    usage_data = {}

    print("   ⏳ Fetching infrastructure usage...")
    usage_data['hosts'] = analyzer.get_infrastructure_hosts()

    print("   ⏳ Fetching custom metrics...")
    usage_data['custom_metrics'] = analyzer.get_custom_metrics()

    print("   ⏳ Fetching log usage...")
    usage_data['logs'] = analyzer.get_log_usage()

    print("   ⏳ Finding unused monitors...")
    usage_data['unused_monitors'] = analyzer.get_unused_monitors()

    # Calculate costs
    costs = analyzer.calculate_costs(usage_data)

    # Generate recommendations
    recommendations = analyzer.get_recommendations(usage_data)

    # Print results
    print_usage_summary(usage_data)
    print_cost_breakdown(costs)
    print_recommendations(recommendations)

    print("\n" + "="*70)
    print("✅ Analysis complete!")
    print("="*70)


if __name__ == "__main__":
    main()
