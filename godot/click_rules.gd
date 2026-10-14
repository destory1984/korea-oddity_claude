extends RefCounted
## 눌러 푸는 맛보기의 규칙. 그림 없이 상태만 다룬다(tests/test_click_rules.gd 가 시험한다).
## 상태는 { "flags": Array[String], "bag": Array[String] } 이다.
## 규칙 한 줄은 { "on": "tap" | "give", "target", "item"?, "need"?, "not"?, "do" } 이고,
## need 와 not 의 "bag:열쇠" 는 가방에 그 물건이 있는가, 나머지는 표시가 섰는가를 본다.


static func has(state: Dictionary, cond: String) -> bool:
	if cond.begins_with("bag:"):
		return state.bag.has(cond.substr(4))
	return state.flags.has(cond)


# 맞는 첫 줄. 없으면 빈 것.
static func find(rules: Array, act: String, target: String, item: String, state: Dictionary) -> Dictionary:
	for rule: Dictionary in rules:
		if rule.on != act or rule.target != target:
			continue
		if act == "give" and rule.get("item", "") != item:
			continue
		if rule.get("need", []).any(func(c: String) -> bool: return not has(state, c)):
			continue
		if rule.get("not", []).any(func(c: String) -> bool: return has(state, c)):
			continue
		return rule
	return {}


# 할 일을 차례로 돈다. 상태를 바꾸는 일은 여기서 끝내고, 화면에 옮길 명령만 돌려준다.
static func run(actions: Array, state: Dictionary) -> Array:
	var out := []
	for one: Array in actions:
		match one[0]:
			"give":
				if not state.bag.has(one[1]):
					state.bag.append(one[1])
			"take":
				state.bag.erase(one[1])
			"set":
				if not state.flags.has(one[1]):
					state.flags.append(one[1])
			_:
				out.append(one)
	return out


# 맞는 줄이 없을 때의 대꾸. 누름이면 그 대상의 말을 turn 번째로 돌려 쓰고, 건넴이면 그 짝의 말, 없으면 "*".
static func fallback(data: Dictionary, act: String, target: String, item: String, turn := 0) -> Array:
	var line: Array
	if act == "tap":
		var lines: Array = data.idle.get(target, [])
		if lines.is_empty():
			return []
		line = lines[turn % lines.size()]
	else:
		line = data.wrong.get(item + ">" + target, data.wrong["*"])
	return [["say", line[0], line[1]]]


# 할머니의 답장. 표시에 맞는 줄을 차례대로. 답장이 없는 쪽은 끝의 글 한 줄.
static func reply(data: Dictionary, state: Dictionary) -> Array:
	if not data.has("reply"):
		return [data.end]
	var lines := []
	for line: Dictionary in data.reply:
		if line.get("need", []).any(func(c: String) -> bool: return not has(state, c)):
			continue
		if line.get("not", []).any(func(c: String) -> bool: return has(state, c)):
			continue
		lines.append(line.text)
	return lines


# 물건을 들었을 때 고리에 띄울 짧은 글. 사람에게는 건네고, 사물에는 써 본다. 줄거리의 verbs 가 앞선다.
static func verb(data: Dictionary, target: String) -> String:
	if data.get("verbs", {}).has(target):
		return data.verbs[target]
	return "건네기" if data.get("people", {}).has(target) else "써 보기"
