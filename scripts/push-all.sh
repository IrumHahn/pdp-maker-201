#!/usr/bin/env bash

set -euo pipefail

branch="${1:-main}"
primary_remote="${PRIMARY_REMOTE:-origin}"
mirror_remote="${MIRROR_REMOTE:-local201}"

echo "Pushing ${branch} to ${primary_remote}..."
git push "${primary_remote}" "${branch}"

echo "Pushing ${branch} to ${mirror_remote}..."
git push "${mirror_remote}" "${branch}"

echo "Done. ${branch} is now synced to ${primary_remote} and ${mirror_remote}."
