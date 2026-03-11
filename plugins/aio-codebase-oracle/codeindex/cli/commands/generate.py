"""Generate command — runs static analysis on a codebase."""

import sys
import logging
import time
from pathlib import Path
from typing import Optional
import click

from codeindex.cli.config_manager import ConfigManager
from codeindex.cli.utils.errors import RepositoryError, handle_error
from codeindex.cli.utils.repo_validator import validate_repository, is_git_repository
from codeindex.cli.utils.logging import create_logger
from codeindex.cli.utils.validation import parse_patterns
from codeindex.config import Config


@click.command(name="generate")
@click.option("--output", "-o", type=click.Path(), default="docs", help="Output directory (default: ./docs)")
@click.option("--include", "-i", type=str, default=None, help="Comma-separated file patterns to include (e.g., '*.cs,*.py')")
@click.option("--exclude", "-e", type=str, default=None, help="Comma-separated patterns to exclude (e.g., '*Tests*,test_*')")
@click.option("--verbose", "-v", is_flag=True, help="Show detailed progress")
@click.pass_context
def generate_command(ctx, output: str, include: Optional[str], exclude: Optional[str], verbose: bool):
    """
    Run static analysis on the current repository.

    Generates dependency graphs, graph metrics, codebase map,
    complexity scores, and architectural violation reports.

    Examples:

    \b
    $ codeindex generate
    $ codeindex generate -o analysis_output
    $ codeindex generate --include "*.cs" --exclude "*Tests*"
    """
    logger = create_logger(verbose=verbose)
    start_time = time.time()

    if verbose:
        logging.basicConfig(level=logging.DEBUG, format="%(message)s")
    else:
        logging.basicConfig(level=logging.INFO, format="%(message)s")

    try:
        # Step 1: Validate repository
        logger.step("Validating repository...", 1, 3)
        repo_path = Path.cwd()
        repo_path, languages = validate_repository(repo_path)
        logger.success(f"Repository: {repo_path.name}")
        if verbose:
            logger.debug(f"Languages: {', '.join(f'{lang} ({count})' for lang, count in languages)}")

        # Step 2: Resolve patterns from config + CLI
        config_manager = ConfigManager()
        config_manager.load()
        stored = config_manager.get_config()

        include_patterns = parse_patterns(include) if include else (
            stored.agent_instructions.include_patterns if stored and stored.agent_instructions else None
        )
        exclude_patterns = parse_patterns(exclude) if exclude else (
            stored.agent_instructions.exclude_patterns if stored and stored.agent_instructions else None
        )

        output_dir = Path(output).expanduser().resolve()

        config = Config.from_cli(
            repo_path=str(repo_path),
            output_dir=str(output_dir),
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
        )

        # Step 3: Run static analysis
        logger.step("Running static analysis...", 2, 3)
        click.echo()

        from codeindex.analyzer import DependencyGraphBuilder
        from codeindex.reporting.codebase_map_generator import generate_codebase_map
        from codeindex.reporting.graph_viewer_generator import generate_graph_viewer
        from codeindex.reporting.arch_rules import evaluate_rules
        from codeindex.utils import file_manager

        file_manager.ensure_directory(str(output_dir))

        builder = DependencyGraphBuilder(config)
        components, leaf_nodes = builder.build_dependency_graph()

        click.echo(f"  Parsed {len(components)} components, {len(leaf_nodes)} leaf nodes")

        # Codebase map
        commit_id = None
        if is_git_repository(repo_path):
            try:
                from codeindex.cli.utils.repo_validator import get_git_commit_hash
                commit_id = get_git_commit_hash(repo_path)
            except Exception:
                pass

        generate_codebase_map(
            components=components,
            working_dir=str(output_dir),
            commit_id=commit_id,
            repo_path=str(repo_path),
            circular_deps=builder.circular_deps,
            temporal_couplings=builder.temporal_couplings,
            arch_violations=evaluate_rules(components, builder.circular_deps, builder.temporal_couplings),
        )

        # Interactive graph viewer
        graph_path = generate_graph_viewer(str(output_dir))

        # Copy doc templates to output directory
        from codeindex.templates import TEMPLATES_DIR
        import shutil

        templates_dest = output_dir / "templates"
        if templates_dest.exists():
            shutil.rmtree(templates_dest)
        shutil.copytree(TEMPLATES_DIR, templates_dest, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "__init__.py"))
        click.echo(f"  Templates:     {templates_dest}")

        # Summary
        logger.step("Done.", 3, 3)
        elapsed = time.time() - start_time

        click.echo()
        click.secho("Analysis complete!", fg="green", bold=True)
        click.echo()
        click.echo(f"  Components:    {len(components)}")
        click.echo(f"  Leaf nodes:    {len(leaf_nodes)}")
        click.echo(f"  Circular deps: {len(builder.circular_deps)}")
        click.echo(f"  Temporal pairs:{len(builder.temporal_couplings)}")
        click.echo(f"  Time:          {int(elapsed)}s")
        click.echo()
        click.echo(f"  Output:        {output_dir}")
        if graph_path:
            click.echo(f"  Graph viewer:  {graph_path}")
        click.echo()

    except RepositoryError as e:
        logger.error(e.message)
        sys.exit(e.exit_code)
    except KeyboardInterrupt:
        click.echo("\n\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        sys.exit(handle_error(e, verbose=verbose))
