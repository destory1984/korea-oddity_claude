#!/bin/bash
# 맛보기의 시험을 모두 돌린다. GODOT 에 Godot 콘솔판의 경로를 둔다.
cd "$(dirname "$0")/../.." || exit 1
fail=0
for t in test_click_rules test_click_story; do
  out=$(timeout 60 "$GODOT" --headless --path godot --script "res://tests/$t.gd" 2>&1)
  echo "$out" | grep -E "^(ok|FAIL|  |[0-9]+ failed)"
  echo "$out" | grep -q "^0 failed" || fail=1
done
exit $fail
