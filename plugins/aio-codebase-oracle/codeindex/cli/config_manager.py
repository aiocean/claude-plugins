"""Configuration manager for CodeIndex."""

import json
from pathlib import Path
from typing import Optional

from codeindex.cli.models.config import Configuration
from codeindex.cli.utils.errors import ConfigurationError, FileSystemError
from codeindex.cli.utils.fs import ensure_directory, safe_write, safe_read

CONFIG_DIR = Path.home() / ".codeindex"
CONFIG_FILE = CONFIG_DIR / "config.json"
CONFIG_VERSION = "1.0"


class ConfigManager:
    """Manages CodeIndex configuration stored in ~/.codeindex/config.json."""

    def __init__(self):
        self._config: Optional[Configuration] = None

    def load(self) -> bool:
        if not CONFIG_FILE.exists():
            return False
        try:
            content = safe_read(CONFIG_FILE)
            data = json.loads(content)
            self._config = Configuration.from_dict(data)
            return True
        except (json.JSONDecodeError, FileSystemError) as e:
            raise ConfigurationError(f"Failed to load configuration: {e}")

    def save(self, default_output: Optional[str] = None):
        try:
            ensure_directory(CONFIG_DIR)
        except FileSystemError as e:
            raise ConfigurationError(f"Cannot create config directory: {e}")

        if self._config is None:
            if CONFIG_FILE.exists():
                self.load()
            else:
                self._config = Configuration()

        if default_output is not None:
            self._config.default_output = default_output

        config_data = {"version": CONFIG_VERSION, **self._config.to_dict()}
        try:
            safe_write(CONFIG_FILE, json.dumps(config_data, indent=2))
        except FileSystemError as e:
            raise ConfigurationError(f"Failed to save configuration: {e}")

    def get_config(self) -> Optional[Configuration]:
        return self._config

    def is_configured(self) -> bool:
        return self._config is not None

    def clear(self):
        if CONFIG_FILE.exists():
            CONFIG_FILE.unlink()
        self._config = None

    @property
    def config_file_path(self) -> Path:
        return CONFIG_FILE
