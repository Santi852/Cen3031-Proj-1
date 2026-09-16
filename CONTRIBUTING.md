# Configuration management and team workflow

## Source of truth

GitHub stores the team's source code, project documents, dependency manifests and lockfiles, database migrations, and safe example configuration. `main` is the integration branch (the branch referred to as "Master" in the assignment). The project is currently in planning; application setup commands will be added with the scaffold.

## Making a change

1. Select or create a GitHub issue with an owner and acceptance criteria.
2. Update your local `main`, then create a short-lived branch such as `feature/weekly-leaderboard`, `fix/score-duplicates`, or `docs/project-proposal`.
3. Make focused commits. Do not commit credentials, generated build output, or installed dependencies.
4. Run checks appropriate to the change. Documentation changes require content/link review; application changes require the relevant tests and build once available.
5. Open a pull request into `main`. Link the issue and explain the change and validation.
6. Obtain at least one approving review from another teammate and resolve review comments. New changes after approval need another review under the team's stale-approval rule.
7. Merge only after required reviews/checks pass. Close the issue and move its project item to Done after verifying delivery.

## Configuration and dependencies

- Record the selected runtime version and exact dependency versions when scaffolding.
- Commit dependency lockfiles and database migrations along with related code changes.
- Keep actual credentials in ignored local environment files or approved secret storage. Commit only a placeholder environment example.
- Document every required variable and migration/setup step. A second teammate should verify the setup instructions.
- Review dependency and schema changes in pull requests; describe compatibility and migration impact.

## Branch protection

`main` is reported as protected by GitHub. The team-provided screenshot shows required pull requests, one approving review, and dismissal of stale approvals when new commits are pushed. The repository owner should verify these are saved and that force pushes/deletions are not allowed. Do not bypass the review workflow. Add required automated checks after the application scaffold and CI jobs exist; no application CI is claimed at this planning stage.

## Project management

Use the [StackSprint - LeetCode Productivity App board](https://github.com/users/matiascamaran/projects/1) with these stages:

| Status | Meaning |
| --- | --- |
| Backlog | Captured work awaiting prioritization |
| Ready | Scope, owner, and acceptance criteria are clear; dependencies are resolved |
| In progress | The owner is actively working on it |
| In review | A deliverable or pull request is awaiting review |
| Done | Acceptance criteria are verified and the approved change is merged, when applicable |

Link repository issues to the board. Assign one accountable owner per issue; other members can help. Review progress and risks daily and report blockers within 24 hours. Set dates from the course schedule rather than estimating an unknown submission deadline.

## Recovery and milestones

Revert a problematic merged change through a new reviewed pull request. Coordinate conflicting edits with the affected teammates. Tag agreed course milestones so the team can reproduce submitted versions. Track risks and responses in [the proposal](docs/PROJECT_PROPOSAL.md).
