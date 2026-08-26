import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const WORKFLOW_RELATIVE_PATH = ".github/workflows/pi-review.yml";

export const WORKFLOW_CONTENT = `name: Pi review

on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: pi-review-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      PI_OFFLINE: "1"
      PI_SKIP_VERSION_CHECK: "1"

    steps:
      - name: Check out pull request
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check out Pi configuration
        uses: actions/checkout@v4
        with:
          repository: yrahul3910/dotfiles
          path: .pi-review-config

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install Pi
        run: npm install --global --ignore-scripts @earendil-works/pi-coding-agent

      - name: Configure Pi with Stow
        shell: bash
        run: |
          sudo apt-get update
          sudo apt-get install --yes stow
          pi_home="\${RUNNER_TEMP}/pi-review-home"
          mkdir -p "\${pi_home}/.pi" "\${pi_home}/.agents"
          stow --dir=".pi-review-config" --target="\${pi_home}/.pi" .pi
          stow --dir=".pi-review-config" --target="\${pi_home}/.agents" .agents

      - name: Review pull request
        id: review
        shell: bash
        env:
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
          HOME: \${{ runner.temp }}/pi-review-home
          MODAL_API_KEY: \${{ secrets.MODAL_API_KEY }}
        run: |
          if [[ -z "\${MODAL_API_KEY}" ]]; then
            echo "The MODAL_API_KEY repository secret is not configured" >&2
            exit 1
          fi

          diff_path="\${RUNNER_TEMP}/pi-pr.diff"
          review_path="\${RUNNER_TEMP}/pi-review.md"
          git diff --no-ext-diff --unified=80 "\${BASE_SHA}...\${HEAD_SHA}" > "\${diff_path}"

          pi \
            --print \
            --no-session \
            --no-extensions \
            --approve \
            --tools read,grep,find,ls \
            "Review this pull request. Use every applicable available skill, especially code-style and language-specific guidance. The piped input is the PR diff and the checkout contains the proposed code. Focus on concrete correctness, security, maintainability, and regression risks. Do not execute code or claim checks ran. Return GitHub Markdown with findings ordered by severity and precise file and line references. If there are no substantive findings, say so. Keep the review under 6,000 characters." \
            < "\${diff_path}" \
            > "\${review_path}"

          if [[ ! -s "\${review_path}" ]]; then
            echo "Pi returned an empty review" >&2
            exit 1
          fi

      - name: Publish review
        shell: bash
        env:
          GH_TOKEN: \${{ github.token }}
          PR_NUMBER: \${{ github.event.pull_request.number }}
        run: |
          review_path="\${RUNNER_TEMP}/pi-review.md"
          comment_path="\${RUNNER_TEMP}/pi-review-comment.md"
          {
            printf '%s\\n\\n' '<!-- pi-review -->' '## Pi review'
            cat "\${review_path}"
          } > "\${comment_path}"

          comment_id="$(
            gh api --paginate \
              "/repos/\${GITHUB_REPOSITORY}/issues/\${PR_NUMBER}/comments" \
              --jq '.[] | select(.user.login == "github-actions[bot]" and (.body | startswith("<!-- pi-review -->"))) | .id' \
              | tail -n 1
          )"

          if [[ -n "\${comment_id}" ]]; then
            gh api --method PATCH \
              "/repos/\${GITHUB_REPOSITORY}/issues/comments/\${comment_id}" \
              --raw-field "body=$(<"\${comment_path}")"
          else
            gh api --method POST \
              "/repos/\${GITHUB_REPOSITORY}/issues/\${PR_NUMBER}/comments" \
              --raw-field "body=$(<"\${comment_path}")"
          fi
`;

export type InstallResult =
    | { kind: "created"; path: string }
    | { kind: "replaced"; path: string }
    | { kind: "unchanged"; path: string }
    | { kind: "cancelled"; path: string };

export async function installWorkflow(
    repoRoot: string,
    confirmReplace: (path: string) => Promise<boolean>,
): Promise<InstallResult> {
    const workflowPath = join(repoRoot, WORKFLOW_RELATIVE_PATH);
    const existing = existsSync(workflowPath)
        ? await readFile(workflowPath, "utf8")
        : null;

    if (existing === WORKFLOW_CONTENT) {
        return { kind: "unchanged", path: workflowPath };
    }

    if (existing !== null && !(await confirmReplace(workflowPath))) {
        return { kind: "cancelled", path: workflowPath };
    }

    await mkdir(dirname(workflowPath), { recursive: true });
    await writeFile(workflowPath, WORKFLOW_CONTENT, "utf8");

    return {
        kind: existing === null ? "created" : "replaced",
        path: workflowPath,
    };
}

export default function prReview(pi: ExtensionAPI) {
    pi.registerCommand("install-pi-review", {
        description:
            "Add the Pi pull-request review workflow to this repository",
        handler: async (_args, ctx) => {
            const gitRootResult = await pi.exec(
                "git",
                ["rev-parse", "--show-toplevel"],
                { cwd: ctx.cwd, timeout: 5_000 },
            );

            if (gitRootResult.code !== 0) {
                ctx.ui.notify(
                    "The current directory is not inside a Git repository",
                    "error",
                );
                return;
            }

            const repoRoot = gitRootResult.stdout.trim();
            if (!repoRoot) {
                ctx.ui.notify("Git did not return a repository root", "error");
                return;
            }

            const result = await installWorkflow(repoRoot, (path) =>
                ctx.ui.confirm(
                    "Replace existing Pi review workflow?",
                    relative(repoRoot, path),
                ),
            );

            if (result.kind === "cancelled") {
                ctx.ui.notify("Pi review setup cancelled", "info");
                return;
            }

            const verb =
                result.kind === "unchanged" ? "Already configured" : "Wrote";
            ctx.ui.notify(
                `${verb} ${relative(repoRoot, result.path)}. Add MODAL_API_KEY as a repository Actions secret.`,
                "info",
            );
        },
    });
}
