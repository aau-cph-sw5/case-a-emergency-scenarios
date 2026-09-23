#!/usr/bin/env bash
# Install the shared GitHub templates and a starting README into each product
# repository. Templates only take effect in the repository they live in, which is
# why they cannot simply sit in semester-docs.
#
#   ./push-templates.sh            all four products
#   CASE=D ./push-templates.sh     one product
#
# Safe to run more than once: existing files are updated, not duplicated.
set -uo pipefail
cd "$(dirname "$0")"

FILTER="${CASE:-}"
HUB=".."
ok=0; bad=0

b64() { base64 < "$1" | tr -d '\n'; }

put_file() {  # repo, path-in-repo, local file, commit message
  repo="$1"; path="$2"; local_file="$3"; msg="$4"
  [ -f "$local_file" ] || { echo "    ! missing $local_file"; bad=$((bad+1)); return; }
  sha=$(gh api "repos/$repo/contents/$path" --jq '.sha' 2>/dev/null)
  content=$(b64 "$local_file")
  if [ -n "$sha" ]; then
    gh api -X PUT "repos/$repo/contents/$path" \
      -f message="$msg" -f content="$content" -f sha="$sha" >/dev/null 2>&1
  else
    gh api -X PUT "repos/$repo/contents/$path" \
      -f message="$msg" -f content="$content" >/dev/null 2>&1
  fi
  if [ $? -eq 0 ]; then echo "    + $path"; ok=$((ok+1))
  else echo "    ! $path failed"; bad=$((bad+1)); fi
}

while IFS=$'\t' read -r kase repo; do
  [ -z "${repo:-}" ] && continue
  if [ -n "$FILTER" ] && [ "$kase" != "$FILTER" ]; then continue; fi
  echo "templates -> $repo"

  put_file "$repo" ".github/PULL_REQUEST_TEMPLATE.md" \
           "$HUB/.github/PULL_REQUEST_TEMPLATE.md" \
           "Add the shared pull request template"

  put_file "$repo" ".github/ISSUE_TEMPLATE/pbi.yml" \
           "$HUB/.github/ISSUE_TEMPLATE/pbi.yml" \
           "Add the product backlog item template"

  put_file "$repo" ".github/ISSUE_TEMPLATE/bug_report.yml" \
           "$HUB/.github/ISSUE_TEMPLATE/bug_report.yml" \
           "Add the defect report template"

  put_file "$repo" ".github/ISSUE_TEMPLATE/config.yml" \
           "$HUB/.github/ISSUE_TEMPLATE/config.yml" \
           "Point new issues at the documentation hub"

  put_file "$repo" "CONTRIBUTING.md" \
           "product-readme/CONTRIBUTING-pointer.md" \
           "Point contributors at the semester documentation hub"

  put_file "$repo" "README.md" \
           "product-readme/case-${kase}.md" \
           "Replace the placeholder README with the product README"

done < <(tail -n +2 repos.tsv)

echo
echo "templates: $ok written, $bad failed"
[ "$bad" -gt 0 ] && exit 1
exit 0
