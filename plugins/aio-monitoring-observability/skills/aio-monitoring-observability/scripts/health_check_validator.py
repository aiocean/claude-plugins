#!/usr/bin/env python3
"""
Validate health check endpoints and analyze response quality.
Checks: response time, status code, response format, dependencies.
"""

import argparse
import sys
import time
import json
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("⚠️  Warning: 'requests' library not found. Install with: pip install requests")
    sys.exit(1)


class HealthCheckValidator:
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.results = []

    def validate_endpoint(self, url: str) -> Dict[str, Any]:
        """Validate a health check endpoint."""
        result = {
            "url": url,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "checks": [],
            "warnings": [],
            "errors": []
        }

        try:
            # Make request
            start_time = time.time()
            response = requests.get(url, timeout=self.timeout, verify=True)
            response_time = time.time() - start_time

            result["status_code"] = response.status_code
            result["response_time"] = response_time

            # Check 1: Status code
            if response.status_code == 200:
                result["checks"].append("✅ Status code is 200")
            else:
                result["errors"].append(f"❌ Unexpected status code: {response.status_code} (expected 200)")

            # Check 2: Response time
            if response_time < 1.0:
                result["checks"].append(f"✅ Response time: {response_time:.3f}s (< 1s)")
            elif response_time < 3.0:
                result["warnings"].append(f"⚠️  Slow response time: {response_time:.3f}s (should be < 1s)")
            else:
                result["errors"].append(f"❌ Very slow response time: {response_time:.3f}s (should be < 1s)")

            # Check 3: Content type
            content_type = response.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                result["checks"].append("✅ Content-Type is application/json")

                # Try to parse JSON
                try:
                    data = response.json()
                    result["response_data"] = data

                    # Check for common health check fields
                    self._validate_json_structure(data, result)

                except json.JSONDecodeError:
                    result["errors"].append("❌ Invalid JSON response")
            elif 'text/plain' in content_type:
                result["warnings"].append("⚠️  Content-Type is text/plain (JSON recommended)")
                result["response_data"] = response.text
            else:
                result["warnings"].append(f"⚠️  Unexpected Content-Type: {content_type}")

            # Check 4: Response headers
            self._validate_headers(response.headers, result)

        except requests.exceptions.Timeout:
            result["errors"].append(f"❌ Request timeout (> {self.timeout}s)")
            result["status_code"] = None
            result["response_time"] = None

        except requests.exceptions.ConnectionError:
            result["errors"].append("❌ Connection error (endpoint unreachable)")
            result["status_code"] = None
            result["response_time"] = None

        except requests.exceptions.SSLError:
            result["errors"].append("❌ SSL certificate validation failed")
            result["status_code"] = None
            result["response_time"] = None

        except Exception as e:
            result["errors"].append(f"❌ Unexpected error: {str(e)}")
            result["status_code"] = None
            result["response_time"] = None

        # Overall status
        if result["errors"]:
            result["overall_status"] = "UNHEALTHY"
        elif result["warnings"]:
            result["overall_status"] = "DEGRADED"
        else:
            result["overall_status"] = "HEALTHY"

        return result

    def _validate_json_structure(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Validate JSON health check structure."""
        # Check for status field
        if "status" in data:
            status = data["status"]
            if status in ["ok", "healthy", "up", "pass"]:
                result["checks"].append(f"✅ Status field present: '{status}'")
            else:
                result["warnings"].append(f"⚠️  Status field has unexpected value: '{status}'")
        else:
            result["warnings"].append("⚠️  Missing 'status' field (recommended)")

        # Check for version/build info
        if any(key in data for key in ["version", "build", "commit", "timestamp"]):
            result["checks"].append("✅ Version/build information present")
        else:
            result["warnings"].append("⚠️  No version/build information (recommended)")

        # Check for dependencies
        if "dependencies" in data or "checks" in data or "components" in data:
            result["checks"].append("✅ Dependency checks present")

            # Validate dependency structure
            deps = data.get("dependencies") or data.get("checks") or data.get("components")
            if isinstance(deps, dict):
                unhealthy_deps = []
                for name, info in deps.items():
                    if isinstance(info, dict):
                        dep_status = info.get("status", "unknown")
                        if dep_status not in ["ok", "healthy", "up", "pass"]:
                            unhealthy_deps.append(name)
                    elif isinstance(info, str):
                        if info not in ["ok", "healthy", "up", "pass"]:
                            unhealthy_deps.append(name)

                if unhealthy_deps:
                    result["warnings"].append(f"⚠️  Unhealthy dependencies: {', '.join(unhealthy_deps)}")
                else:
                    result["checks"].append(f"✅ All dependencies healthy ({len(deps)} checked)")
        else:
            result["warnings"].append("⚠️  No dependency checks (recommended for production services)")

        # Check for uptime/metrics
        if any(key in data for key in ["uptime", "metrics", "stats"]):
            result["checks"].append("✅ Metrics/stats present")

    def _validate_headers(self, headers: Dict[str, str], result: Dict[str, Any]):
        """Validate response headers."""
        # Check for caching headers
        cache_control = headers.get('Cache-Control', '')
        if 'no-cache' in cache_control or 'no-store' in cache_control:
            result["checks"].append("✅ Caching disabled (Cache-Control: no-cache)")
        else:
            result["warnings"].append("⚠️  Caching not explicitly disabled (add Cache-Control: no-cache)")

    def validate_multiple(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Validate multiple health check endpoints."""
        results = []
        for url in urls:
            print(f"🔍 Checking: {url}")
            result = self.validate_endpoint(url)
            results.append(result)
        return results


def print_result(result: Dict[str, Any], verbose: bool = False):
    """Print validation result."""
    status_emoji = {
        "HEALTHY": "✅",
        "DEGRADED": "⚠️",
        "UNHEALTHY": "❌"
    }

    print("\n" + "="*60)
    emoji = status_emoji.get(result["overall_status"], "❓")
    print(f"{emoji} {result['overall_status']}: {result['url']}")
    print("="*60)

    if result.get("status_code"):
        print(f"\n📊 Status Code: {result['status_code']}")
        print(f"⏱️  Response Time: {result['response_time']:.3f}s")

    # Print checks
    if result["checks"]:
        print(f"\n✅ Passed Checks:")
        for check in result["checks"]:
            print(f"   {check}")

    # Print warnings
    if result["warnings"]:
        print(f"\n⚠️  Warnings:")
        for warning in result["warnings"]:
            print(f"   {warning}")

    # Print errors
    if result["errors"]:
        print(f"\n❌ Errors:")
        for error in result["errors"]:
            print(f"   {error}")

    # Print response data if verbose
    if verbose and "response_data" in result:
        print(f"\n📄 Response Data:")
        if isinstance(result["response_data"], dict):
            print(json.dumps(result["response_data"], indent=2))
        else:
            print(result["response_data"])

    print("="*60)


def print_summary(results: List[Dict[str, Any]]):
    """Print summary of multiple validations."""
    print("\n" + "="*60)
    print("📊 HEALTH CHECK VALIDATION SUMMARY")
    print("="*60)

    healthy = sum(1 for r in results if r["overall_status"] == "HEALTHY")
    degraded = sum(1 for r in results if r["overall_status"] == "DEGRADED")
    unhealthy = sum(1 for r in results if r["overall_status"] == "UNHEALTHY")

    print(f"\n✅ Healthy:   {healthy}/{len(results)}")
    print(f"⚠️  Degraded:  {degraded}/{len(results)}")
    print(f"❌ Unhealthy: {unhealthy}/{len(results)}")

    if results:
        avg_response_time = sum(r.get("response_time", 0) for r in results if r.get("response_time")) / len(results)
        print(f"\n⏱️  Average Response Time: {avg_response_time:.3f}s")

    print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Validate health check endpoints",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check a single endpoint
  python3 health_check_validator.py https://api.example.com/health

  # Check multiple endpoints
  python3 health_check_validator.py \\
    https://api.example.com/health \\
    https://api.example.com/readiness

  # Verbose output with response data
  python3 health_check_validator.py https://api.example.com/health --verbose

  # Custom timeout
  python3 health_check_validator.py https://api.example.com/health --timeout 10

Best Practices Checked:
  ✓ Returns 200 status code
  ✓ Response time < 1 second
  ✓ Returns JSON format
  ✓ Contains 'status' field
  ✓ Includes version/build info
  ✓ Checks dependencies
  ✓ Includes metrics
  ✓ Disables caching
        """
    )

    parser.add_argument('urls', nargs='+', help='Health check endpoint URL(s)')
    parser.add_argument('--timeout', type=int, default=5, help='Request timeout in seconds (default: 5)')
    parser.add_argument('--verbose', action='store_true', help='Show detailed response data')

    args = parser.parse_args()

    validator = HealthCheckValidator(timeout=args.timeout)

    results = validator.validate_multiple(args.urls)

    # Print individual results
    for result in results:
        print_result(result, args.verbose)

    # Print summary if multiple endpoints
    if len(results) > 1:
        print_summary(results)


if __name__ == "__main__":
    main()
