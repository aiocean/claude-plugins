"""Main CLI application for CodeIndex."""

import sys
import click

from codeindex import __version__


@click.group()
@click.version_option(version=__version__, prog_name="CodeIndex CLI")
@click.pass_context
def cli(ctx):
    """
    CodeIndex: Static analysis for codebases.

    Generates dependency graphs, metrics, and architectural reports
    for Python, Java, JavaScript, TypeScript, C, C++, C#, Go, and PHP.
    """
    ctx.ensure_object(dict)


@cli.command()
def version():
    """Display version information."""
    click.echo(f"CodeIndex CLI v{__version__}")
    click.echo("Static codebase analysis tool")


from codeindex.cli.commands.config import config_group
from codeindex.cli.commands.generate import generate_command

cli.add_command(config_group)
cli.add_command(generate_command, name="generate")


def main():
    """Entry point for the CLI."""
    try:
        cli(obj={})
    except KeyboardInterrupt:
        click.echo("\n\nInterrupted by user", err=True)
        sys.exit(130)
    except Exception as e:
        click.secho(f"\nError: {e}", fg="red", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
