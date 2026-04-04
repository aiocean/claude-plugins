# Authorization at Scale — Zanzibar and ReBAC

> "RBAC breaks when your permissions model starts asking 'who owns this?' instead of 'what role do you have?'" — Carta Engineering

## The Problem

Authorization is one of those problems that seems trivially simple until the moment it isn't. In the beginning: users have roles, roles have permissions, you check the role. A user is an admin, or a viewer, or an editor. Straightforward. Ship it.

Then the product grows. Users share documents. A document can be shared with specific people, or with everyone in a team, or with the whole organization, or with a link. A folder's permissions should cascade to its contents — unless a file has been explicitly shared differently. A team member can edit team documents but only view documents from other teams, unless they have been individually granted write access to specific cross-team documents. The product manager asks: "Can we make it so that sharing a project with a contractor gives them access to all the files in the project, but not the billing information?"

Your RBAC (Role-Based Access Control) implementation, which was so clean six months ago, is now a patchwork of special cases, permission inheritance logic, and database queries that are getting slower as the user table grows. The real question is no longer "what role does this user have?" but "what is the relationship between this user and this resource?" RBAC cannot express that question cleanly.

In 2019, Google published the Zanzibar paper — describing the authorization system that Google has operated since 2016 across products including Drive, YouTube, Calendar, Photos, and Cloud. Zanzibar handles trillions of access control list (ACL) entries across tens of Google products and processes millions of authorization checks per second with sub-10ms p95 latency. The paper describes not just Google's implementation but a general model — Relationship-Based Access Control (ReBAC) — that has since been implemented in open-source systems (SpiceDB, OpenFGA, Ory Keto) and adopted across the industry. Understanding why Google built Zanzibar and what problem it solves is essential context for anyone building authorization into products that grow beyond simple role models.

## Core Concept

**The Zanzibar Data Model**

Zanzibar represents authorization state as a set of relationship tuples. Each tuple expresses a single relationship between a user (or userset) and an object:

```
<object>#<relation>@<user>

Examples:
doc:readme#viewer@user:alice          — alice is a viewer of doc:readme
doc:readme#editor@user:bob            — bob is an editor of doc:readme
doc:readme#viewer@group:eng#member    — members of group:eng are viewers of doc:readme
folder:proj#viewer@user:alice         — alice is a viewer of folder:proj
doc:readme#parent@folder:proj         — doc:readme's parent is folder:proj
```

These tuples are stored in a distributed, globally replicated database. At Google's scale, this amounts to trillions of tuples across tens of products.

**Namespace Configuration: The Policy Language**

The semantics of relationships — what it means to be a "viewer" of a document, whether "editor" implies "viewer" — are defined in namespace configuration. This is the policy language:

```python
# Namespace configuration for a document system
name: "doc"
relation {
  name: "owner"
}
relation {
  name: "editor"
  userset_rewrite {
    union {
      child { _this {} }           # direct editors
      child { computed_userset {   # owners are also editors
        relation: "owner"
      }}
    }
  }
}
relation {
  name: "viewer"
  userset_rewrite {
    union {
      child { _this {} }           # direct viewers
      child { computed_userset {   # editors are also viewers
        relation: "editor"
      }}
      child { tuple_to_userset {   # viewers of parent folder
        tupleset { relation: "parent" }
        computed_userset { relation: "viewer" }
      }}
    }
  }
}
```

This configuration expresses:
1. Owners are editors (role hierarchy)
2. Editors are viewers (role hierarchy)
3. Viewers of the parent folder are viewers of this document (inheritance)

These rules, combined with the tuple data, enable Zanzibar to answer "can user:alice view doc:readme?" by traversing the relationship graph.

**The Check Algorithm**

Zanzibar's check algorithm is a recursive graph traversal. To check `doc:readme#viewer@user:alice`:

1. Look up all tuples where `doc:readme#viewer@...`
2. For each tuple, check if `user:alice` is in the referenced userset
3. Apply namespace configuration rules (owner → editor → viewer hierarchy)
4. Recursively check inherited permissions (parent folder's viewer list)
5. Return allow if any path resolves to `user:alice`, deny if none do

The challenge at Google's scale: this traversal could follow chains of many hops (user is in group, group is in org, org has viewer access to folder, folder contains document). Zanzibar's optimization is the "leopard" snapshot system — reads are served from a consistent snapshot of the tuple store with a "zookie" (consistency token) that ensures reads are consistent with recent writes.

**ReBAC vs. RBAC vs. ABAC**

Understanding when each model applies:

*RBAC (Role-Based Access Control)*: Users have roles, roles have permissions. "Alice is an admin, admins can delete documents." Works well when: permission sets are well-defined, users are assigned to static roles, and permissions do not depend on the relationship between the user and the specific resource.

RBAC breaks when: permissions depend on ownership or sharing ("Alice can edit documents she owns or that have been shared with her"), when role explosion occurs (you end up with "project-A-editor", "project-B-editor" roles for every project), or when permission inheritance across resource hierarchies is required.

*ABAC (Attribute-Based Access Control)*: Access decisions based on attributes of the user, resource, action, and environment. "Allow write access if user.department == resource.department AND time is business_hours." Works well when: permissions depend on multiple context attributes evaluated dynamically.

ABAC is powerful but policy management is complex — policies are difficult to audit, the attribute model must be carefully designed, and performance degrades as policies become complex.

*ReBAC (Relationship-Based Access Control)*: Access decisions based on the relationship graph between user and resource. "Alice can edit this document if she has an 'editor' relationship with it, directly or through group/folder inheritance." Works well when: permissions follow ownership and sharing patterns (Google Drive, GitHub, Figma, Notion), when resources are organized in hierarchies, and when access follows social graph structure.

ReBAC unifies what RBAC and ABAC try to do separately: it models role hierarchies (owner → editor → viewer) as relationship traversal and attribute-based rules as relationship predicates. The data model (tuples) is simpler than ABAC policy expressions while being more expressive than RBAC's flat role assignments.

## Deep Dive

### Zanzibar: Google's Consistent, Global Authorization System (2019)

The Zanzibar paper (Perm, Plank, Tarjan, Xu, Zhou — Google, published at USENIX ATC 2019) is the definitive treatment of authorization at internet scale. Its contribution is not a new authorization model — Relationship-Based Access Control (ReBAC) was described earlier in academic literature — but a production system design that demonstrates how to implement ReBAC at 2+ trillion ACL entries, 10 million+ check requests per second, and p95 latency under 10ms globally, with five-nines availability.

The paper's central design insight is the separation of authorization data from authorization logic. In traditional authorization systems, the rules and the data are entangled: a role assignment is both a data record and the mechanism that triggers a permission grant. Zanzibar separates them: the tuple store holds raw relationship facts (alice is an owner of document X), and the namespace configuration holds the rules that define what relationships imply what permissions (owners can read, write, and share; editors can read and write; viewers can read). A check query traverses the relationship graph defined by the tuple store according to the rules in the namespace configuration.

The consistency challenge the paper addresses is the "new enemy" problem: user A grants user B access to a document, and user B attempts to access the document immediately after. Without consistency guarantees, the permission check might execute on a replica that has not yet received the ACL write, returning "denied" despite the grant being committed. Zanzibar solves this with "zookies" — consistency tokens that encode a lower bound on the snapshot timestamp the tuple store replica must have processed before the check is valid. The client stores the zookie returned by the ACL write and includes it in the subsequent check request; the check request waits for the replica to reach the zookie's timestamp before executing.

This consistency mechanism has a direct implementation in the open-source Zanzibar systems: OpenFGA (Open Fine-Grained Authorization, open-sourced by Auth0/Okta in 2022) implements zookies as "ZedTokens" with the same semantics. SpiceDB (Authzed, 2021) implements them as "ZedTokens" with configurable consistency levels (full consistency, minimize latency, or best-effort). The consistency-latency trade-off is explicit: callers that need read-after-write consistency pay for a synchronous wait on the replicated timestamp; callers that tolerate stale reads get lower latency.

### RBAC, ABAC, and ReBAC: The Authorization Model Taxonomy

The authorization model taxonomy matters for understanding when Zanzibar-style ReBAC is appropriate and when simpler models suffice. Role-Based Access Control (RBAC), standardized in NIST 800-207 and earlier in the NIST RBAC model (Ferraiolo, Sandhu, Gavrila, Kuhn, Chandramouli, 2001), is the dominant enterprise authorization model: users are assigned to roles, roles are granted permissions on resources. RBAC is expressive for coarse-grained organizational access control (all members of the "finance" role can access financial reports) but becomes unwieldy when permissions depend on object-level relationships (a user can edit documents they created, or documents in projects they belong to).

Attribute-Based Access Control (ABAC), standardized in NIST SP 800-162 (2014), extends RBAC by evaluating policies against arbitrary attributes of the subject (user), resource, action, and environment. An ABAC policy: "users with attribute `department=finance` can access resources with attribute `classification=financial` during hours with attribute `timezone=business-hours`." ABAC is maximally flexible but computationally expensive at scale — every check requires evaluating policy conditions against the full attribute set, without the graph traversal optimization that Zanzibar applies to relationship lookups.

ReBAC resolves the RBAC expressiveness limitation for relationship-centric permissions through the tuple model: any permission that can be expressed as "user has relationship R to resource X, and relationship R implies permission P" is expressible in Zanzibar's model. The key class of problems where ReBAC wins over RBAC is user-generated content and collaborative tools — file sharing, project membership, comment threads — where the permission structure is defined by user actions (sharing a document creates a relationship tuple) rather than by administrator-assigned roles. The Zanzibar paper's taxonomy of use cases (Google Drive, YouTube, Maps, Cloud) all share this property: the authorization graph is built by user interactions, not by centralized administrator assignment.

### Open Policy Agent: Policy-as-Code for ABAC Workloads

Open Policy Agent (OPA), open-sourced by Styra in 2016 and accepted as a CNCF graduated project in 2021, addresses the ABAC implementation problem with a general-purpose policy engine and the Rego policy language. OPA's architecture is orthogonal to Zanzibar's: while Zanzibar optimizes for relationship graph traversal on a distributed tuple store, OPA optimizes for evaluating arbitrary policy logic against structured JSON documents.

The OPA data model separates policies (Rego rules), data (JSON documents that the policies query), and input (the authorization request, also a JSON document). A policy evaluation takes input + data → decision. OPA's Partial Evaluation optimization (described in the Styra engineering blog, 2018) allows policies to be pre-compiled against static data into residual queries that can be pushed down to databases — transforming a policy check from an application-level evaluation into a database filter clause. This is the mechanism behind OPA's integration with databases: a policy that says "users can access rows where `tenant_id = user.tenant_id`" is compiled into a SQL `WHERE tenant_id = ?` clause that the database evaluates at query time, eliminating the need to load all rows into the application layer for policy evaluation.

## Implementation Guide

**Step 1: Model Your Domain in Tuples**

Start by mapping your permission requirements to relationship tuples. Avoid the temptation to model everything — start with the core access patterns:

```
Domain: Project Management Tool

Objects: project, task, comment, user, team
Relations: owner, editor, viewer, member, parent

Tuples:
project:alpha#owner@user:alice
project:alpha#editor@user:bob
project:alpha#viewer@team:design#member
task:task-1#parent@project:alpha        (task belongs to project)
task:task-1#assignee@user:charlie
comment:c-1#parent@task:task-1          (comment belongs to task)
team:design#member@user:diana
```

Namespace config expressing inheritance:
```
# task: viewers of parent project can view tasks
task.viewer = {
  this |                              # direct viewers
  task.assignee |                     # assignees can view
  parent.(project.viewer)             # project viewers can view tasks
}
```

**Step 2: Choose Your ReBAC Implementation**

For production deployments, three open-source options:

*SpiceDB (Authzed)*: The most feature-complete Zanzibar implementation. gRPC and HTTP APIs. Strong consistency with optional request hedging. Schema language closely mirrors Zanzibar namespace config.

```bash
# Run SpiceDB locally
docker run --rm -p 50051:50051 authzed/spicedb serve \
  --grpc-preshared-key "somerandomkeyhere" \
  --datastore-engine memory  # use postgres/cockroachdb for production
```

*OpenFGA (Auth0/Okta)*: Open-source, CNCF sandbox project. Simpler schema language, strong community. HTTP-first API.

*Ory Keto*: Part of the Ory ecosystem (alongside Ory Hydra for OAuth, Ory Kratos for identity). Good integration with Ory's other products.

**Step 3: Write Authorization Checks**

```go
// Go: SpiceDB authorization checks
import (
    v1 "github.com/authzed/authzed-go/proto/authzed/api/v1"
    "github.com/authzed/authzed-go/v1"
)

type Authorizer struct {
    client *authzed.Client
}

func (a *Authorizer) CanViewTask(ctx context.Context, userID, taskID string) (bool, error) {
    resp, err := a.client.CheckPermission(ctx, &v1.CheckPermissionRequest{
        Resource: &v1.ObjectReference{
            ObjectType: "task",
            ObjectId:   taskID,
        },
        Permission: "view",
        Subject: &v1.SubjectReference{
            Object: &v1.ObjectReference{
                ObjectType: "user",
                ObjectId:   userID,
            },
        },
        // Include a zookie for consistency with recent writes
        Consistency: &v1.Consistency{
            Requirement: &v1.Consistency_AtLeastAsFresh{
                AtLeastAsFresh: zookie,
            },
        },
    })
    if err != nil {
        return false, err
    }
    return resp.Permissionship == v1.CheckPermissionResponse_PERMISSIONSHIP_HAS_PERMISSION, nil
}

// Batch check: list all tasks a user can view in a project
func (a *Authorizer) ListViewableTasks(ctx context.Context, userID string, taskIDs []string) ([]string, error) {
    // Use BulkCheckPermission for efficient batch authorization
    items := make([]*v1.BulkCheckPermissionRequestItem, len(taskIDs))
    for i, taskID := range taskIDs {
        items[i] = &v1.BulkCheckPermissionRequestItem{
            Resource: &v1.ObjectReference{ObjectType: "task", ObjectId: taskID},
            Permission: "view",
            Subject: &v1.SubjectReference{
                Object: &v1.ObjectReference{ObjectType: "user", ObjectId: userID},
            },
        }
    }
    resp, err := a.client.BulkCheckPermission(ctx, &v1.BulkCheckPermissionRequest{Items: items})
    if err != nil {
        return nil, err
    }

    var viewable []string
    for _, pair := range resp.Pairs {
        if pair.Item.Permissionship == v1.CheckPermissionResponse_PERMISSIONSHIP_HAS_PERMISSION {
            viewable = append(viewable, pair.Request.Resource.ObjectId)
        }
    }
    return viewable, nil
}
```

**Step 4: Tuple Lifecycle Management**

```python
# Python: managing relationship tuples on resource/membership changes
from authzed.api.v1 import (
    WriteRelationshipsRequest, RelationshipUpdate,
    Relationship, ObjectReference, SubjectReference,
    RelationshipUpdate
)

class AuthorizationService:
    def __init__(self, client):
        self.client = client

    async def share_project(self, project_id: str, user_id: str, role: str):
        """Grant user access to project with specified role."""
        await self.client.WriteRelationships(WriteRelationshipsRequest(
            updates=[RelationshipUpdate(
                operation=RelationshipUpdate.OPERATION_TOUCH,  # upsert
                relationship=Relationship(
                    resource=ObjectReference(object_type="project", object_id=project_id),
                    relation=role,  # "viewer", "editor", or "owner"
                    subject=SubjectReference(
                        object=ObjectReference(object_type="user", object_id=user_id)
                    )
                )
            )]
        ))

    async def remove_access(self, project_id: str, user_id: str, role: str):
        """Remove user's access to project."""
        await self.client.WriteRelationships(WriteRelationshipsRequest(
            updates=[RelationshipUpdate(
                operation=RelationshipUpdate.OPERATION_DELETE,
                relationship=Relationship(
                    resource=ObjectReference(object_type="project", object_id=project_id),
                    relation=role,
                    subject=SubjectReference(
                        object=ObjectReference(object_type="user", object_id=user_id)
                    )
                )
            )]
        ))

    async def add_team_member(self, team_id: str, user_id: str):
        """Add user to team — automatically grants team's project access."""
        await self.client.WriteRelationships(WriteRelationshipsRequest(
            updates=[RelationshipUpdate(
                operation=RelationshipUpdate.OPERATION_TOUCH,
                relationship=Relationship(
                    resource=ObjectReference(object_type="team", object_id=team_id),
                    relation="member",
                    subject=SubjectReference(
                        object=ObjectReference(object_type="user", object_id=user_id)
                    )
                )
            )]
        ))
```

**Step 5: The Zookie Consistency Pattern**

The most subtle Zanzibar concept is the zookie — a consistency token that ensures authorization checks reflect recent writes:

```go
// When creating a resource, store the zookie from the write
writeResp, err := client.WriteRelationships(ctx, writeRequest)
zookie := writeResp.WrittenAt  // store this with your resource record

// When checking authorization for that resource, pass the zookie
// This ensures the check sees the write even if served by a different replica
checkResp, err := client.CheckPermission(ctx, &CheckPermissionRequest{
    // ... resource, permission, subject ...
    Consistency: &Consistency{
        Requirement: &Consistency_AtLeastAsFresh{
            AtLeastAsFresh: zookie,
        },
    },
})
```

Without zookies, eventual consistency in distributed deployments can cause a user to create a resource and then immediately receive "permission denied" when trying to access it (the authorization replica hasn't caught up with the write). Zookies solve this by routing reads to replicas that have processed the relevant writes.

## When to Use / When NOT to Use

**ReBAC (Zanzibar model) is the right choice when:**
- Your product has sharing semantics — users share resources with specific other users or groups
- Resources are organized in hierarchies where permissions should inherit (folders → files, projects → tasks)
- You are experiencing RBAC role explosion — too many roles to manage
- Multiple products need to share authorization state (single source of truth for permissions)
- You need sub-10ms authorization checks at high volume (millions/second)

**Start with RBAC when:**
- Your permission model genuinely fits "users have roles, roles have permissions" with no ownership/sharing semantics
- You have a small team and simple permission requirements — ReBAC infrastructure has operational overhead
- You do not need cross-resource permission inheritance

**Use ABAC when:**
- Authorization depends heavily on dynamic context (time of day, network location, resource attributes) that doesn't fit relationship graph modeling
- Compliance frameworks (XACML-based) require attribute-based policy expression

**Why RBAC breaks at scale:**
The fundamental problem is role explosion. If you have 100 projects and users can have viewer/editor/owner access per project, expressing this in RBAC requires 300 roles (project-1-viewer, project-1-editor, project-1-owner, ... × 100). With custom access per resource, the role count grows to O(resources × roles), management becomes impossible, and permission auditing becomes intractable. ReBAC expresses the same model with tuples that scale linearly with actual access grants, not with the product of resources × roles.

## Common Mistakes

**Mistake 1: Modeling all permissions as RBAC before migrating to ReBAC**
Teams often start with RBAC, hit role explosion, then try to retrofit ReBAC. The migration is painful because RBAC role assignments must be translated to relationship tuples, and the permission semantics are often implicit in code rather than explicit in the model. Start with ReBAC if your product has any sharing or ownership semantics.

**Mistake 2: Putting authorization logic in application code alongside ReBAC**
The value of Zanzibar-style systems is centralizing authorization logic in the namespace configuration and tuple store. If your application code contains `if user.is_admin or resource.owner_id == user.id` checks alongside SpiceDB checks, you have two sources of truth and no single point of audit. Migrate all authorization checks to the centralized system.

**Mistake 3: Not handling the consistency problem**
Applications that ignore zookies/consistency tokens can exhibit race conditions: create resource → check permission → denied (replica hasn't caught up). This manifests as intermittent "permission denied" errors immediately after resource creation. Implement zookie-based consistency from the start.

**Mistake 4: Modeling too granularly**
Every tuple write has a cost. Modeling every possible relationship at the most granular level (individual column access, field-level permissions) creates enormous tuple volumes and complex traversal graphs. Model at the granularity that matches your product's actual permission boundaries, not theoretical maximum granularity.

**Mistake 5: No authorization audit log**
Every tuple write (grant/revoke) and every failed authorization check should be logged for audit. "Who had access to this document on January 15th?" is a question that compliance teams will ask. Without an audit log, you cannot answer it. Log all authorization state changes with timestamps, actors, and reasons.

## Connections

- **Zero Trust Architecture (Article 4, this volume)**: Zanzibar-style ReBAC is the authorization model that scales to Zero Trust's "verify every request explicitly" principle. Policy Enforcement Points evaluate authorization by querying the relationship graph.
- **Multi-Tenancy (Article 11, this volume)**: Tenant isolation in multi-tenant systems is a ReBAC problem — resources belong to tenants (a relationship), and cross-tenant access is denied by the absence of cross-tenant relationships.
- **AI-Native Architecture (Article 2, this volume)**: Agentic AI systems that take actions on behalf of users must check authorization for each tool call. Zanzibar-style systems enable fine-grained, auditable authorization for agent-driven actions.
- **Data Mesh (Article 1, this volume)**: Data product access control in a data mesh is a natural ReBAC problem — datasets have owners (a relationship), consumers have access grants (relationships), and data product access can inherit from organizational membership relationships.

## Key Insights

1. **RBAC is not wrong — it is limited.** Role-based access control is the right model for simple, flat permission structures where roles are well-defined and stable. The problem is that most real products eventually grow beyond this model. Understanding when to move from RBAC to ReBAC is more important than treating ReBAC as universally superior.

2. **The tuple data model is the key insight.** `<object>#<relation>@<user>` is deceptively simple. The expressiveness comes from the namespace configuration that defines what relationships mean and how they compose. The data model separates "what relationships exist" (tuples) from "what relationships mean" (namespace config) — enabling policy changes without data migrations.

3. **Google uses this for every product with access control.** The same data model that controls access to your Google Drive folder controls access to GCP resources, YouTube channels, and Calendar events. This unification is valuable: a change in organizational membership automatically propagates to all products that use it. Consider this when evaluating whether to build centralized authorization or per-service authorization.

4. **Performance at Zanzibar scale requires serious infrastructure.** SpiceDB and OpenFGA can handle millions of checks per second with proper infrastructure — but this requires distributed deployment, caching, and careful schema design. Start with a single-node deployment and scale based on measured load.

5. **Authorization as a service changes the security model.** When authorization is centralized in a SpiceDB or OpenFGA cluster, that service becomes a critical security component. It must be highly available (authorization service down = application down), highly secure (compromise = complete authorization bypass), and carefully monitored. Treat the authorization service with the same security rigor as your identity provider.

6. **The industry is converging on Zanzibar.** OpenFGA is a CNCF project. SpiceDB has significant enterprise adoption. AWS Cedar (Amazon's authorization language) shares conceptual DNA with Zanzibar's relationship model. The pattern has proven itself at Google's scale and is being adopted across the industry. Teams building authorization infrastructure today should be aware of this pattern even if they implement a simpler system initially.
