"""
Error handling utilities and exit codes for CLI.

Exit Codes:
  0: Success
  1: General error
  2: Configuration error
  3: Repository error
  5: File system error
"""

import click


EXIT_GENERAL_ERROR = 1
EXIT_CONFIG_ERROR = 2
EXIT_REPOSITORY_ERROR = 3
EXIT_FILESYSTEM_ERROR = 5


class CodeWikiError(Exception):
    """Base exception for CodeWiki CLI errors."""

    def __init__(self, message: str, exit_code: int = EXIT_GENERAL_ERROR):
        self.message = message
        self.exit_code = exit_code
        super().__init__(self.message)


class ConfigurationError(CodeWikiError):
    """Configuration-related errors."""

    def __init__(self, message: str):
        super().__init__(message, EXIT_CONFIG_ERROR)


class RepositoryError(CodeWikiError):
    """Repository-related errors."""

    def __init__(self, message: str):
        super().__init__(message, EXIT_REPOSITORY_ERROR)


class FileSystemError(CodeWikiError):
    """File system-related errors."""

    def __init__(self, message: str):
        super().__init__(message, EXIT_FILESYSTEM_ERROR)


def handle_error(error: Exception, verbose: bool = False) -> int:
    if isinstance(error, CodeWikiError):
        click.secho(f"\nError: {error.message}", fg="red", err=True)
        return error.exit_code
    else:
        click.secho(f"\nUnexpected error: {error}", fg="red", err=True)
        if verbose:
            import traceback
            click.echo(traceback.format_exc(), err=True)
        return EXIT_GENERAL_ERROR
