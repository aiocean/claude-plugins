from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Set
from datetime import datetime



class Node(BaseModel):
    id: str

    name: str
    
    component_type: str
    
    file_path: str
    
    relative_path: str
    
    depends_on: Set[str] = set()
    
    source_code: Optional[str] = None
    
    start_line: int = 0

    end_line: int = 0
    
    has_docstring: bool = False
    
    docstring: str = ""
    
    parameters: Optional[List[str]] = None

    node_type: Optional[str] = None  

    base_classes: Optional[List[str]] = None

    class_name: Optional[str] = None

    display_name: Optional[str] = None

    component_id: Optional[str] = None

    # Graph metrics
    pagerank: float = 0.0
    fan_in: int = 0
    fan_out: int = 0
    instability: float = 0.0
    is_hub: bool = False
    community_id: int = -1
    tfidf_keywords: List[tuple] = []
    complexity_score: float = 0.0
    betweenness_centrality: float = 0.0
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    nloc: int = 0
    token_count: int = 0
    parameter_count: int = 0
    maintainability_index: float = 100.0

    # Advanced analysis fields (language-agnostic names, populated by Go analyzer first)
    implements_interfaces: List[str] = []
    spawns_goroutines: bool = False
    uses_channels: bool = False
    uses_select: bool = False
    returns_error: bool = False
    has_defers: bool = False
    has_panic: bool = False
    is_exported: bool = False

    def get_display_name(self) -> str:
        return self.display_name or self.name


class CallRelationship(BaseModel):
    caller: str

    callee: str

    call_line: Optional[int] = None

    is_resolved: bool = False

    relationship_type: str = "calls"  # "calls" | "implements" | "embeds"


class Repository(BaseModel):
    url: str

    name: str

    clone_path: str
    
    analysis_id: str
