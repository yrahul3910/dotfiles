"""Line-length limits for the rules that measure lines (SLOP014, SLOP017).

The project's own limit governs wrapping, not the overlay's bundled ruff config: a codebase formatted to 100 columns
should not be told to fill lines to 120. `WRAP_MARGIN` is how far below that limit a line must end before a rule treats
the break or split as needless, which keeps the rules quiet about lines that are merely close to full.
"""

import configparser
import tomllib
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

DEFAULT_LINE_LENGTH = 120
WRAP_MARGIN = 20


def _ruff_limit(config: Path) -> int | None:
    """Follow Ruff's explicit config inheritance without applying its default width."""
    seen: set[Path] = set()
    width: int | None = None

    while config not in seen:
        seen.add(config)
        data = tomllib.loads(config.read_text())
        settings = data.get("tool", {}).get("ruff", {}) if config.name == "pyproject.toml" else data

        if (limit := settings.get("lint", {}).get("pycodestyle", {}).get("max-line-length")) is not None:
            return int(limit)
        if width is None and (limit := settings.get("line-length")) is not None:
            width = int(limit)
        if not (parent := settings.get("extend")):
            return width

        config = (config.parent / parent).resolve()

    msg = f"Cyclic Ruff configuration inheritance: {config}"
    raise ValueError(msg)


def _ruff_config(directory: Path) -> Path | None:
    """Ignore pyproject files without Ruff settings when discovering the nearest config."""
    for name in (".ruff.toml", "ruff.toml", "pyproject.toml"):
        if not (config := directory / name).is_file():
            continue

        if name == "pyproject.toml" and "ruff" not in tomllib.loads(config.read_text()).get("tool", {}):
            continue

        return config

    return None


def line_length(path: Path) -> int:
    """Return the line-length limit the project explicitly configures for `path`, or `DEFAULT_LINE_LENGTH` without one.

    The search walks up from `path`'s directory and stops after the repository root, the first directory holding
    `.git`. In each directory a Ruff config comes first (`.ruff.toml`, `ruff.toml`, or a `pyproject.toml` with a
    `[tool.ruff]` table), then Flake8 (`.flake8`, `setup.cfg`, `tox.ini`), then Pylint (`[tool.pylint.format]` in
    `pyproject.toml`). Only the nearest Ruff config is consulted, as Ruff itself does: when it sets no limit, Ruff
    configs further up are ignored, though Flake8 and Pylint settings there still count. Within a Ruff config,
    `lint.pycodestyle.max-line-length` beats `line-length`, and `extend` chains are followed.

    A cyclic `extend` chain raises `ValueError`, and malformed TOML or INI raises its parser's error; neither is
    caught here, so a broken config fails the run instead of silently falling back.
    """
    ruff_found = False

    for directory in path.resolve().parents:
        if not ruff_found and (config := _ruff_config(directory)) is not None:
            ruff_found = True
            if (limit := _ruff_limit(config)) is not None:
                return limit

        for name in (".flake8", "setup.cfg", "tox.ini"):
            if (config := directory / name).is_file():
                settings = configparser.ConfigParser(interpolation=None)
                settings.read(config)
                if settings.has_option("flake8", "max-line-length"):
                    return settings.getint("flake8", "max-line-length")

        if (config := directory / "pyproject.toml").is_file():
            settings = tomllib.loads(config.read_text()).get("tool", {}).get("pylint", {}).get("format", {})
            if (limit := settings.get("max-line-length")) is not None:
                return int(limit)

        if (directory / ".git").exists():
            break

    return DEFAULT_LINE_LENGTH
