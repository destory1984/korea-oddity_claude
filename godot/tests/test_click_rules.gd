extends SceneTree
## click_rules.gd 의 시험. 머리 없이 돌린다:
##   Godot --headless --path godot --script res://tests/test_click_rules.gd

const Rules := preload("res://click_rules.gd")

var fails := 0


func _init() -> void:
	for name: String in ["test_has", "test_find_first_match", "test_find_give_needs_item", "test_find_not",
			"test_run_state", "test_run_commands", "test_fallback"]:
		var before := fails
		call(name)
		print(("ok   " if fails == before else "FAIL ") + name)
	print("%d failed" % fails)
	quit(fails)


func check(ok: bool, what: String) -> void:
	if not ok:
		fails += 1
		printerr("  " + what)


func fresh(flags: Array = [], bag: Array = []) -> Dictionary:
	var state := { "flags": [] as Array[String], "bag": [] as Array[String] }
	state.flags.assign(flags)
	state.bag.assign(bag)
	return state


func test_has() -> void:
	var s := fresh(["a"], ["card"])
	check(Rules.has(s, "a"), "flag a")
	check(Rules.has(s, "bag:card"), "bag card")
	check(not Rules.has(s, "b"), "no flag b")
	check(not Rules.has(s, "bag:drinks"), "no drinks")


func test_find_first_match() -> void:
	var rules := [
		{ "on": "tap", "target": "door", "need": ["x"], "do": [["set", "one"]] },
		{ "on": "tap", "target": "door", "do": [["set", "two"]] },
		{ "on": "tap", "target": "door", "do": [["set", "three"]] },
	]
	check(Rules.find(rules, "tap", "door", "", fresh()).do[0][1] == "two", "need not met skips the first")
	check(Rules.find(rules, "tap", "door", "", fresh(["x"])).do[0][1] == "one", "the first match wins")
	check(Rules.find(rules, "tap", "cat", "", fresh()).is_empty(), "no rule for cat")


func test_find_give_needs_item() -> void:
	var rules := [{ "on": "give", "target": "clerk", "item": "card", "do": [] }]
	check(not Rules.find(rules, "give", "clerk", "card", fresh()).is_empty(), "card fits")
	check(Rules.find(rules, "give", "clerk", "drinks", fresh()).is_empty(), "drinks does not")
	check(Rules.find(rules, "tap", "clerk", "", fresh()).is_empty(), "a tap is not a give")


func test_find_not() -> void:
	var rules := [{ "on": "give", "target": "clerk", "item": "card", "not": ["bag:drinks"], "do": [] }]
	check(not Rules.find(rules, "give", "clerk", "card", fresh([], ["card"])).is_empty(), "no drinks yet")
	check(Rules.find(rules, "give", "clerk", "card", fresh([], ["card", "drinks"])).is_empty(), "already has drinks")


func test_run_state() -> void:
	var s := fresh([], ["card"])
	var out := Rules.run([["give", "drinks"], ["give", "drinks"], ["set", "x"], ["set", "x"], ["take", "card"]], s)
	check(s.bag == ["drinks"], "bag is %s" % [s.bag])
	check(s.flags == ["x"], "flags are %s" % [s.flags])
	check(out.is_empty(), "no commands")


func test_run_commands() -> void:
	var out := Rules.run([["say", "y", "안녕"], ["set", "x"], ["goto", "open"]], fresh())
	check(out == [["say", "y", "안녕"], ["goto", "open"]], "commands are %s" % [out])


func test_fallback() -> void:
	var data := {
		"idle": { "cat": [["cat", "냥"], ["cat", "냐아"]] },
		"wrong": { "drinks>cat": ["cat", "상자에 들어간다"], "*": ["y", "그건 아닌 것 같아"] },
	}
	check(Rules.fallback(data, "tap", "cat", "") == [["say", "cat", "냥"]], "idle")
	check(Rules.fallback(data, "tap", "cat", "", 3) == [["say", "cat", "냐아"]], "idle turns round")
	check(Rules.fallback(data, "give", "cat", "drinks") == [["say", "cat", "상자에 들어간다"]], "own reply")
	check(Rules.fallback(data, "give", "clerk", "drinks") == [["say", "y", "그건 아닌 것 같아"]], "star")
