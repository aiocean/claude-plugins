"""Configuration commands for CodeIndex CLI."""

import json
import sys
import click
from typing import Optional

from codeindex.cli.config_manager import ConfigManager
from codeindex.cli.models.config import AgentInstructions
from codeindex.cli.utils.errors import (
    ConfigurationError,
    handle_error,
    EXIT_CONFIG_ERROR,
)
from codeindex.cli.utils.validation import parse_patterns


@click.group(name="config")
def config_group():
    """Manage CodeIndex configuration."""
    pass


@config_group.command(name="show")
@click.option("--json", "output_json", is_flag=True, help="Output in JSON format")
def config_show(output_json: bool):
    """Display current configuration."""
    try:
        manager = ConfigManager()
        if not manager.load():
            click.secho("\nNo configuration found.", fg="yellow", err=True)
            click.echo("Run 'codeindex config agent' to set file patterns.")
            sys.exit(EXIT_CONFIG_ERROR)

        config = manager.get_config()
        if output_json:
            output = {
                "default_output": config.default_output if config else "docs",
                "agent_instructions": config.agent_instructions.to_dict() if config and config.agent_instructions else {},
                "config_file": str(manager.config_file_path),
            }
            click.echo(json.dumps(output, indent=2))
        else:
            click.echo()
            click.secho("CodeIndex Configuration", fg="blue", bold=True)
            click.echo("=" * 40)
            click.echo()
            if config:
                click.echo(f"  Default Output: {config.default_output}")
            click.echo()
            click.secho("File Patterns", fg="cyan", bold=True)
            if config and config.agent_instructions and not config.agent_instructions.is_empty():
                agent = config.agent_instructions
                if agent.include_patterns:
                    click.echo(f"  Include: {', '.join(agent.include_patterns)}")
                if agent.exclude_patterns:
                    click.echo(f"  Exclude: {', '.join(agent.exclude_patterns)}")
            else:
                click.secho("  Using defaults (no custom patterns)", fg="yellow")
            click.echo()
            click.echo(f"Config file: {manager.config_file_path}")
            click.echo()

    except Exception as e:
        sys.exit(handle_error(e))


@config_group.command(name="agent")
@click.option("--include", "-i", type=str, default=None, help="Comma-separated file patterns to include (e.g., '*.cs,*.py')")
@click.option("--exclude", "-e", type=str, default=None, help="Comma-separated patterns to exclude (e.g., '*Tests*,*Specs*')")
@click.option("--clear", is_flag=True, help="Clear all patterns")
def config_agent(include: Optional[str], exclude: Optional[str], clear: bool):
    """
    Configure default file patterns for analysis.

    Examples:

    \b
    $ codeindex config agent --include "*.cs"
    $ codeindex config agent --exclude "*Tests*,*Specs*,test_*"
    $ codeindex config agent --clear
    """
    try:
        manager = ConfigManager()
        manager.load()  # OK if not found, will create

        if manager.get_config() is None:
            from codeindex.cli.models.config import Configuration
            manager._config = Configuration()

        config = manager.get_config()

        if clear:
            config.agent_instructions = AgentInstructions()
            manager.save()
            click.secho("\nPatterns cleared.", fg="green")
            return

        if not any([include, exclude]):
            click.echo()
            click.secho("File Patterns", fg="blue", bold=True)
            click.echo("=" * 40)
            agent = config.agent_instructions
            if agent and not agent.is_empty():
                if agent.include_patterns:
                    click.echo(f"  Include: {', '.join(agent.include_patterns)}")
                if agent.exclude_patterns:
                    click.echo(f"  Exclude: {', '.join(agent.exclude_patterns)}")
            else:
                click.secho("  No patterns configured", fg="yellow")
            click.echo("\nUse 'codeindex config agent --help' for usage.")
            return

        current = config.agent_instructions or AgentInstructions()
        if include is not None:
            current.include_patterns = parse_patterns(include) if include else None
        if exclude is not None:
            current.exclude_patterns = parse_patterns(exclude) if exclude else None

        config.agent_instructions = current
        manager.save()

        click.echo()
        if include:
            click.secho(f"Include: {parse_patterns(include)}", fg="green")
        if exclude:
            click.secho(f"Exclude: {parse_patterns(exclude)}", fg="green")
        click.secho("\nPatterns updated.", fg="green", bold=True)

    except ConfigurationError as e:
        click.secho(f"\nError: {e.message}", fg="red", err=True)
        sys.exit(e.exit_code)
    except Exception as e:
        sys.exit(handle_error(e))
