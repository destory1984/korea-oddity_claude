extends SceneTree
## data/click.json 의 줄거리를 흉내 내어 돌린다. 머리 없이:
##   Godot --headless --path godot --script res://tests/test_click_story.gd

const Rules := preload("res://click_rules.gd")
const TARGETS := ["clerk", "rider", "cat", "board", "door", "store", "singer"]

var data: Dictionary
var fails := 0


func _init() -> void:
	var read: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/click.json"))
	if not read is Dictionary:
		printerr("data/click.json is missing or broken")
		quit(1)
		return
	data = read
	for name: String in ["test_paths", "test_repeat", "test_wrong_pairs", "test_everyone_speaks", "test_targets_exist"]:
		var before := fails
		call(name)
		print(("ok   " if fails == before else "FAIL ") + name)
	print("%d failed" % fails)
	quit(fails)


func check(ok: bool, what: String) -> void:
	if not ok:
		fails += 1
		printerr("  " + what)


# 놀이 한 판. moves 는 ["tap", 대상] 이나 ["give", 물건, 대상]. picks 는 고를 말이 뜰 때마다 고를 차례.
func play(moves: Array, picks: Array) -> Dictionary:
	var game := { "state": { "flags": [] as Array[String], "bag": [] as Array[String] }, "place": "alley",
		"said": [], "ended": false, "stuck": "" }
	game.state.flags.assign(data.start.flags)
	game.state.bag.assign(data.start.bag)
	var queue := picks.duplicate()
	for move: Array in moves:
		if game.ended:
			game.stuck = "moved after the end: %s" % [move]
			break
		var target: String = move[-1]
		if not _here(game.place).has(target):
			game.stuck = "%s is not in %s" % [target, game.place]
			break
		var item: String = move[1] if move[0] == "give" else ""
		var rule := Rules.find(data.rules, move[0], target, item, game.state)
		var out := Rules.run(rule.do, game.state) if not rule.is_empty() else Rules.fallback(data, move[0], target, item)
		_obey(game, out, queue)
	return game


func _here(place: String) -> Array:
	var ids := []
	for spot: Dictionary in data.spots[place]:
		ids.append(spot.id)
	for who: String in data.people:
		if data.people[who].place == place:
			ids.append(who)
	return ids


func _obey(game: Dictionary, out: Array, queue: Array) -> void:
	for one: Array in out:
		match one[0]:
			"say":
				game.said.append(one)
			"ask":
				var pick: int = queue.pop_front()
				_obey(game, Rules.run(one[1][pick][1], game.state), queue)
			"goto":
				game.place = one[1]
				var rule := Rules.find(data.rules, "enter", one[1], "", game.state)
				if not rule.is_empty():
					_obey(game, Rules.run(rule.do, game.state), queue)
			"end":
				game.ended = true


func test_paths() -> void:
	# A: 설계서의 차례
	var a := play([["tap", "door"], ["tap", "clerk"], ["give", "card", "clerk"], ["tap", "rider"], ["tap", "board"],
		["give", "drinks", "singer"]], [1])
	check(a.ended and a.stuck == "", "A ends (%s)" % a.stuck)
	check(a.state.flags.has("gaveDrinks"), "A gave drinks")
	# B: 기사 먼저, 음료 없이
	var b := play([["tap", "rider"], ["tap", "board"], ["tap", "singer"]], [1])
	check(b.ended and b.stuck == "", "B ends (%s)" % b.stuck)
	check(not b.state.flags.has("gaveDrinks"), "B gave nothing")
	check(b.said.any(func(s: Array) -> bool: return s[1] == "y" and "빈손" in s[2]), "B: Yui is empty-handed")
	# C: 헤맴
	var c := play([["tap", "board"], ["tap", "rider"], ["tap", "board"], ["tap", "board"], ["tap", "singer"]], [0, 1])
	check(c.ended and c.stuck == "", "C ends (%s)" % c.stuck)


func test_repeat() -> void:
	var g := play([["tap", "clerk"], ["give", "card", "clerk"], ["give", "card", "clerk"]], [])
	check(g.state.bag.count("drinks") == 1, "one box of drinks")
	check(g.state.bag.has("card"), "the card stays")
	var last: Array = g.said[-1]
	check(g.said.count(last) == 1, "the second give says something new: %s" % [last])
	var r := play([["tap", "rider"], ["tap", "rider"]], [])
	check(r.said[-1] != r.said[0], "the rider's second word differs")


func test_wrong_pairs() -> void:
	for item: String in data.items:
		for target: String in TARGETS:
			var ruled: bool = data.rules.any(func(r: Dictionary) -> bool:
				return r.on == "give" and r.target == target and r.get("item", "") == item)
			if not ruled:
				check(data.wrong.has(item + ">" + target), "no reply for %s>%s" % [item, target])
	for pair: String in ["drinks>cat", "drinks>clerk", "card>cat", "card>rider"]:
		check(data.wrong.has(pair), "must have %s" % pair)


func test_everyone_speaks() -> void:
	for target: String in TARGETS:
		check(data.idle.has(target) and data.idle[target].size() >= 1, "idle for " + target)
	check(data.idle.cat.size() >= 2, "the cat has two poses or more")


func test_targets_exist() -> void:
	var all := []
	for place: String in data.places:
		all.append_array(_here(place))
	for rule: Dictionary in data.rules:
		check(rule.on == "enter" and data.places.has(rule.target) or all.has(rule.target), "unknown target " + rule.target)
	for line: Array in data.idle.values().reduce(func(acc: Array, x: Array) -> Array: return acc + x, []) + data.wrong.values():
		check(data.who.has(line[0]), "unknown speaker " + str(line[0]))
