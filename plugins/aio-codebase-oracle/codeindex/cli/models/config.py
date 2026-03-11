"""Configuration data models for CodeIndex CLI."""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class AgentInstructions:
    """File filtering instructions for static analysis."""
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None

    def to_dict(self) -> dict:
        result = {}
        if self.include_patterns:
            result['include_patterns'] = self.include_patterns
        if self.exclude_patterns:
            result['exclude_patterns'] = self.exclude_patterns
        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'AgentInstructions':
        return cls(
            include_patterns=data.get('include_patterns'),
            exclude_patterns=data.get('exclude_patterns'),
        )

    def is_empty(self) -> bool:
        return not any([self.include_patterns, self.exclude_patterns])


@dataclass
class Configuration:
    """CodeIndex configuration stored in ~/.codeindex/config.json."""
    default_output: str = "docs"
    agent_instructions: AgentInstructions = field(default_factory=AgentInstructions)

    def to_dict(self) -> dict:
        result = {'default_output': self.default_output}
        if self.agent_instructions and not self.agent_instructions.is_empty():
            result['agent_instructions'] = self.agent_instructions.to_dict()
        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'Configuration':
        agent_instructions = AgentInstructions()
        if 'agent_instructions' in data:
            agent_instructions = AgentInstructions.from_dict(data['agent_instructions'])
        return cls(
            default_output=data.get('default_output', 'docs'),
            agent_instructions=agent_instructions,
        )

    def is_complete(self) -> bool:
        return True
