extends SceneTree
## data/click/ 의 줄거리를 쪽마다 흉내 내어 돌린다. 머리 없이:
##   Godot --headless --path godot --script res://tests/test_click_story.gd

const Rules := preload("res://click_rules.gd")
const DIR := "res://data/click/"
# 쪽마다의 길 시험. 쪽에 매이지 않는 시험은 모든 쪽에 돈다.
const OWN := {
	"alley": ["test_alley_paths", "test_alley_repeat", "test_alley_buy_first", "test_alley_must_reply", "test_alley_every_pair"],
	"myeongdong": ["test_md_paths", "test_md_photo_before_hint", "test_md_repeat", "test_md_reply_lines", "test_md_bag_fits", "test_md_photo_seen"],
}
const SHARED := ["test_wrong_pairs", "test_everyone_speaks", "test_targets_exist", "test_font_has_glyphs"]

var chapters := {}               # 쪽의 이름 → 줄거리
var raw := {}                    # 쪽의 이름 → 파일의 글
var data: Dictionary             # 지금 시험하는 쪽
var fails := 0


func _init() -> void:
	for file: String in DirAccess.get_files_at(DIR):
		if not file.ends_with(".json"):
			continue
		var name := file.get_basename()
		raw[name] = FileAccess.get_file_as_string(DIR + file)
		var read: Variant = JSON.parse_string(raw[name])
		if not read is Dictionary:
			printerr("%s is broken" % file)
			quit(1)
			return
		chapters[name] = read
	if not chapters.has("alley"):
		printerr("data/click/alley.json is missing")
		quit(1)
		return
	for name: String in OWN:
		check(chapters.has(name), "data/click/%s.json is missing" % name)
	for name: String in chapters:
		data = chapters[name]
		for test: String in SHARED + OWN.get(name, []):
			var before := fails
			call(test)
			print(("ok   " if fails == before else "FAIL ") + name + " " + test)
	var before := fails
	test_chapters_isolated()
	print(("ok   " if fails == before else "FAIL ") + "test_chapters_isolated")
	print("%d failed" % fails)
	quit(fails)


func check(ok: bool, what: String) -> void:
	if not ok:
		fails += 1
		printerr("  " + what)


# 놀이 한 판. moves 는 ["tap", 대상] 이나 ["give", 물건, 대상]. picks 는 고를 말이 뜰 때마다 고를 차례.
func play(story: Dictionary, moves: Array, picks: Array) -> Dictionary:
	var game := { "state": { "flags": [] as Array[String], "bag": [] as Array[String] }, "place": story.first,
		"said": [], "shown": [], "ended": false, "stuck": "" }
	game.state.flags.assign(story.start.flags)
	game.state.bag.assign(story.start.bag)
	var queue := picks.duplicate()
	for move: Array in moves:
		if game.ended:
			game.stuck = "moved after the end: %s" % [move]
			break
		var target: String = move[-1]
		if not _here(story, game.place).has(target):
			game.stuck = "%s is not in %s" % [target, game.place]
			break
		var item: String = move[1] if move[0] == "give" else ""
		var rule := Rules.find(story.rules, move[0], target, item, game.state)
		var out := Rules.run(rule.do, game.state) if not rule.is_empty() else Rules.fallback(story, move[0], target, item)
		_obey(story, game, out, queue)
	return game


# 그 곳에서 누를 수 있는 것.
func _here(story: Dictionary, place: String) -> Array:
	var ids := []
	for spot: Dictionary in story.spots[place]:
		ids.append(spot.id)
	for who: String in story.people:
		var one: Dictionary = story.people[who]
		if one.place == place and one.get("tap", true):
			ids.append(who)
	return ids


func _obey(story: Dictionary, game: Dictionary, out: Array, queue: Array) -> void:
	for one: Array in out:
		match one[0]:
			"say":
				game.said.append(one)
			"show":
				game.shown.append(one[1])
			"ask":
				var pick: int = queue.pop_front()
				_obey(story, game, Rules.run(one[1][pick][1], game.state), queue)
			"goto":
				game.place = one[1]
				var rule := Rules.find(story.rules, "enter", one[1], "", game.state)
				if not rule.is_empty():
					_obey(story, game, Rules.run(rule.do, game.state), queue)
			"end":
				game.ended = true


func _targets() -> Array:
	var all := []
	for place: String in data.places:
		all.append_array(_here(data, place))
	return all


# ── 모든 쪽 ─────────────────────────────────────────────────────────

# 사람에게 건네는 짝은 모두 제 대꾸가 있다. 사물에는 두루 쓰는 대꾸("*")로도 된다.
func test_wrong_pairs() -> void:
	for item: String in data.items:
		for target: String in _targets().filter(func(t: String) -> bool: return data.people.has(t)):
			var ruled: bool = data.rules.any(func(r: Dictionary) -> bool:
				return r.on == "give" and r.target == target and r.get("item", "") == item)
			if not ruled:
				check(data.wrong.has(item + ">" + target), "no reply for %s>%s" % [item, target])


func test_everyone_speaks() -> void:
	for target: String in _targets():
		check(data.idle.has(target) and data.idle[target].size() >= 1, "idle for " + target)


func test_targets_exist() -> void:
	var all := _targets()
	check(data.places.has(data.first), "first place %s" % data.first)
	for rule: Dictionary in data.rules:
		check(rule.on == "enter" and data.places.has(rule.target) or all.has(rule.target), "unknown target " + rule.target)
	for line: Array in data.idle.values().reduce(func(acc: Array, x: Array) -> Array: return acc + x, []) + data.wrong.values():
		check(data.who.has(line[0]), "unknown speaker " + str(line[0]))


# 개구 글꼴에 없는 글자(말줄임표, 가운뎃점)는 웹에서 네모로 나온다.
func test_font_has_glyphs() -> void:
	var name: String = chapters.find_key(data)
	for ch: String in ["…", "·"]:
		check(not raw[name].contains(ch), "%s has U+%04X" % [name, ch.unicode_at(0)])


# 한 판을 끝까지 두어도 다음 판은 줄거리의 처음 그대로 시작한다.
func test_chapters_isolated() -> void:
	var alley: Dictionary = chapters.alley
	var done := play(alley, [["tap", "rider"], ["tap", "board"], ["tap", "singer"]], [1])
	check(done.ended, "the alley ends")
	var fresh := play(alley, [], [])
	check(fresh.place == alley.first, "starts at first")
	check(fresh.state.flags == alley.start.flags and fresh.state.bag == alley.start.bag, "starts with start state")
	for name: String in chapters:
		var other := play(chapters[name], [], [])
		check(other.state.bag == chapters[name].start.bag, "%s starts with its own bag" % name)


# ── 골목 ────────────────────────────────────────────────────────────

func test_alley_paths() -> void:
	# A: 설계서의 차례
	var a := play(data, [["tap", "door"], ["tap", "clerk"], ["give", "card", "clerk"], ["tap", "rider"], ["tap", "board"],
		["give", "drinks", "singer"]], [1])
	check(a.ended and a.stuck == "", "A ends (%s)" % a.stuck)
	check(a.state.flags.has("gaveDrinks"), "A gave drinks")
	# B: 기사 먼저, 음료 없이
	var b := play(data, [["tap", "rider"], ["tap", "board"], ["tap", "singer"]], [1])
	check(b.ended and b.stuck == "", "B ends (%s)" % b.stuck)
	check(not b.state.flags.has("gaveDrinks"), "B gave nothing")
	check(b.said.any(func(s: Array) -> bool: return s[1] == "y" and "빈손" in s[2]), "B: Yui is empty-handed")
	# C: 헤맴
	var c := play(data, [["tap", "board"], ["tap", "rider"], ["tap", "board"], ["tap", "board"], ["tap", "singer"]], [0, 1])
	check(c.ended and c.stuck == "", "C ends (%s)" % c.stuck)


func test_alley_repeat() -> void:
	var g := play(data, [["tap", "clerk"], ["give", "card", "clerk"], ["give", "card", "clerk"]], [])
	check(g.state.bag.count("drinks") == 1, "one box of drinks")
	check(g.state.bag.has("card"), "the card stays")
	var last: Array = g.said[-1]
	check(g.said.count(last) == 1, "the second give says something new: %s" % [last])
	var r := play(data, [["tap", "rider"], ["tap", "rider"]], [])
	check(r.said[-1] != r.said[0], "the rider's second word differs")


# 음료를 먼저 사고 문이나 알바를 누르면, 빈손이라거나 아직 안 골랐다는 말이 나오지 않는다.
func test_alley_buy_first() -> void:
	var g := play(data, [["give", "card", "clerk"], ["tap", "door"], ["tap", "clerk"]], [])
	var after: Array = g.said.slice(g.said.size() - 2)
	for line: Array in after:
		check(not ("빈손" in line[2] or "안 고르" in line[2]), "contradicts the drinks in the bag: %s" % line[2])
	var d := play(data, [["give", "card", "clerk"], ["tap", "door"], ["tap", "rider"], ["tap", "board"], ["give", "drinks", "singer"]], [1])
	check(d.ended and d.state.flags.has("gaveDrinks"), "buy-first path ends with the gift (%s)" % d.stuck)


func test_alley_must_reply() -> void:
	for pair: String in ["drinks>cat", "drinks>clerk", "card>cat", "card>rider"]:
		check(data.wrong.has(pair), "must have %s" % pair)
	check(data.idle.cat.size() >= 2, "the cat has two poses or more")


func test_alley_every_pair() -> void:
	for item: String in data.items:
		for target: String in _targets():
			var ruled: bool = data.rules.any(func(r: Dictionary) -> bool:
				return r.on == "give" and r.target == target and r.get("item", "") == item)
			if not ruled:
				check(data.wrong.has(item + ">" + target), "no reply for %s>%s" % [item, target])


# ── 명동 ────────────────────────────────────────────────────────────

const MD_STREET := [["tap", "ajumma"], ["give", "bill", "clerk"], ["give", "coins", "ajumma"], ["tap", "ajumma"],
	["give", "photo", "tower"], ["tap", "down"]]


func _all_goals(g: Dictionary) -> bool:
	return ["exit", "bread", "clue", "sticker"].all(func(k: String) -> bool: return g.state.flags.has("got:" + k))


func test_md_paths() -> void:
	var a := play(data, [["tap", "board"], ["tap", "exit6"]] + MD_STREET, [0])
	check(a.ended and a.stuck == "", "A ends (%s)" % a.stuck)
	check(_all_goals(a), "A has all four: %s" % [a.state.flags])
	check(a.state.bag.has("bread"), "A keeps the bread")
	var b := play(data, [["tap", "exit3"], ["tap", "back"], ["tap", "exit6"]] + MD_STREET, [0])
	check(b.ended and b.stuck == "", "B ends (%s)" % b.stuck)
	check(b.state.flags.has("wrongExit"), "B went out at 3")
	var c := play(data, [["tap", "exit6"]] + MD_STREET, [2])
	check(c.ended and c.stuck == "", "C ends (%s)" % c.stuck)
	check(not c.state.flags.has("helpedFamily") and not c.state.flags.has("got:sticker"), "C told the wrong way")


func test_md_photo_before_hint() -> void:
	var g := play(data, [["tap", "exit6"], ["give", "photo", "tower"]], [])
	check(not g.state.flags.has("got:clue"), "no clue before the hint")
	check(g.said.any(func(s: Array) -> bool: return s[1] == "y" and "탑은 보이는데" in s[2]), "Yui wonders")
	var h := play(data, [["tap", "exit6"], ["give", "photo", "tower"]] + MD_STREET.slice(0, 5), [])
	check(h.state.flags.has("got:clue"), "clue after the hint")


func test_md_repeat() -> void:
	var g := play(data, [["tap", "exit6"], ["give", "bill", "clerk"], ["give", "bill", "clerk"], ["give", "coins", "ajumma"],
		["give", "coins", "ajumma"]], [])
	check(g.state.bag.count("bread") == 1, "one bread")
	check(g.state.bag.count("coins") == 0 and g.state.bag.count("bill") == 0, "money spent once: %s" % [g.state.bag])
	var clerk: Array = g.said.filter(func(s: Array) -> bool: return s[1] == "clerk")
	check(clerk.size() >= 2 and clerk[-1] != clerk[0], "the clerk says something new the second time")
	var twice := play(data, [["tap", "exit3"], ["tap", "back"], ["tap", "exit3"], ["tap", "back"]], [])
	check(twice.state.flags.count("wrongExit") == 1, "wrongExit once")


func test_md_reply_lines() -> void:
	var a := play(data, [["tap", "exit6"]] + MD_STREET, [0])
	var ra := Rules.reply(data, a.state)
	check(ra.size() == 3 and "출구는 맞게" in ra[0] and "탑이 오른쪽" in ra[1] and "도왔다니" in ra[2], "A reply %s" % [ra])
	var b := play(data, [["tap", "exit3"], ["tap", "back"], ["tap", "exit6"]] + MD_STREET, [1])
	var rb := Rules.reply(data, b.state)
	check(rb.size() == 2 and "너도 3번으로" in rb[0], "B reply %s" % [rb])


# 가방의 칸(click.gd 의 SLOTS)보다 물건이 많아지면 끝의 것이 보이지 않는다.
func test_md_bag_fits() -> void:
	var slots: int = load("res://click.gd").get_script_constant_map().SLOTS
	var g := play(data, [["tap", "exit6"]] + MD_STREET, [0])
	check(g.state.bag.size() <= slots, "bag holds %d, slots %d" % [g.state.bag.size(), slots])


# 단서가 "사진에선 탑이 오른쪽"이니, 놀이하는 이가 사진을 직접 본다.
func test_md_photo_seen() -> void:
	var photo: Dictionary = data.items.photo
	check(photo.has("art") and ResourceLoader.exists("res://art/%s.webp" % photo.art), "the photo item has a picture")
	var g := play(data, [["tap", "exit6"]] + MD_STREET.slice(0, 5), [])
	check(g.shown.has("photo-2004"), "the photo is shown big before the clue: %s" % [g.shown])
