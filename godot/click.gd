extends Node2D
## 눌러 푸는 어드벤처의 맛보기: 연습실이 있는 골목 하나.
## 그림을 누르면 유이가 그리로 걷고, 사람이나 물건을 누르면 그 앞에서 만진다. 가방의 물건을 집어 들고 누르면 건넨다.
## 줄거리는 쪽마다 data/click/<쪽>.json 에 있고(--click=<쪽>, 웹은 ?click=<쪽>. 이름이 없으면 alley), 규칙을 고르고 상태를 바꾸는 일은 click_rules.gd 가 한다.
## 화면의 짜임과 빛은 game.gd 의 것을 따른다(값이 같다).

const Fonts := preload("res://fonts.gd")
const Rules := preload("res://click_rules.gd")

const VIEW := 720.0        # 화면의 너비이자 걷는 틀의 높이
const WORLD := 2160.0      # 긴 그림의 너비(가로 3, 세로 1)
const STILL := 480.0       # 가까이 본 그림(가로 3, 세로 2)의 높이
const SPEED := 396.0       # 한 초에 걷는 거리
const FEET := 655.0        # 사람들의 발이 닿는 높이
const YUI_FEET := 679.0    # 유이는 조금 앞(화면 아래쪽)에 선다. 사람들과 겹쳐도 앞에 보인다
const YUI_H := 312.0       # 유이의 키(그림 260 × 1.2)
const SLOT := 88.0         # 가방 칸 하나의 크기
const SLOTS := 5         # 명동에서 한때 다섯을 든다

const INK := Color("3b2a1a")
const PAPER := Color("f6f0e2")
const RED := Color("c8553d")
const SOFT := Color("8a7a66")
const NAVY := Color("24365f")
const GOLD := Color("e2a93b")
const LABEL := Color("8a4a2a")
const WARM := Color(1.0, 0.8, 0.52)
const SUN := Color(1.0, 0.93, 0.7)

# 빛은 game.gd 의 LIGHT 에서 이 두 장면의 것을 옮겼다.
const LIGHT := {
	"hd-street": { "sky": Color(1.0, 0.96, 0.9), "lights": [
		[14.8, 60.0, WARM, 3.0, 0.16], [26.0, 60.0, WARM, 3.0, 0.16], [42.0, 60.0, WARM, 3.0, 0.16], [71.8, 60.0, WARM, 3.0, 0.16], [90.0, 60.0, WARM, 3.0, 0.16],
		[48.6, 44.0, SUN, 2.4, 0.3], [64.0, 44.0, SUN, 2.4, 0.3]] },
	"hd-door": { "sky": Color(0.7, 0.7, 0.84), "lights": [[50.0, 5.0, WARM, 4.2, 0.85], [50.0, 73.0, WARM, 2.2, 0.7, 2.6, 0.3]] },
}

var data: Dictionary
var chapter := "alley"
var state: Dictionary
var place := ""
var held := ""                   # 집어 든 물건. 없으면 ""
var queue: Array = []            # 아직 화면에 옮기지 않은 명령
var busy := false                # 말이나 고를 말이 떠 있어 그림을 눌러도 아무 일이 없다
var walking := false             # 걷는 장면인가
var target_x := 0.0
var arriving := ""               # 걸어가서 닿으면 만질 것
var frame_h := 0.0
var turns := {}                  # 대상마다 기본 대꾸를 몇 번 했나(고양이의 자세를 돌린다)
var marks := {}                  # 누를 것의 이름 → Rect2(그림 위의 자리)
var shown_bag: Array[String] = []
var rings := {}                  # 누를 것의 이름 → 그 흰 고리(키보드로 고르면 금빛이 된다)
var picked_id := ""              # 키보드로 고른 누를 것
var picked_button := 0           # 말이 떠 있을 때 키보드로 고른 단추
var key_hint: Label

var daylight: CanvasModulate
var camera: Camera2D
var stage: Node2D
var picture: Sprite2D
var props: Node2D
var lights: Node2D
var yui: AnimatedSprite2D
var glow: GradientTexture2D
var ring: GradientTexture2D
var faces := {}
var root: Control
var backdrop: ColorRect
var title: Label
var bag: HBoxContainer
var dots: HBoxContainer
var column: VBoxContainer


func _ready() -> void:
	chapter = _chapter_name()
	data = JSON.parse_string(FileAccess.get_file_as_string("res://data/click/%s.json" % chapter))
	glow = _radial(_fade([[0.0, 1.0], [1.0, 0.0]]), 128)
	ring = _radial(_fade([[0.0, 0.3], [0.62, 0.3], [0.7, 1.0], [0.86, 1.0], [0.93, 0.0], [1.0, 0.0]]), 64)
	_build_stage()
	_build_ui()
	_restart()
	if Array(OS.get_cmdline_user_args()).any(func(a: String) -> bool: return a.begins_with("--click-demo")):
		_demo()


# 고를 쪽. 컴퓨터는 --click=<쪽> 이나 --click-demo=<쪽>, 웹은 ?click=<쪽>. 없거나 모르는 이름이면 alley.
func _chapter_name() -> String:
	var name := ""
	for arg: String in OS.get_cmdline_user_args():
		if arg.begins_with("--click") and "=" in arg:
			name = arg.get_slice("=", 1)
	if OS.has_feature("web"):
		var query := str(JavaScriptBridge.eval("new URLSearchParams(location.search).get('click') || ''", true))
		if query != "":
			name = query
	if name == "":
		return "alley"
	if not FileAccess.file_exists("res://data/click/%s.json" % name):
		push_error("no chapter %s" % name)
		return "alley"
	return name


func _restart() -> void:
	state = { "flags": [] as Array[String], "bag": [] as Array[String] }
	state.flags.assign(data.start.flags)
	state.bag.assign(data.start.bag)
	held = ""
	turns.clear()
	shown_bag.clear()
	shown_bag.assign(state.bag)
	_draw_bag()
	_enter(data.first)


# ── 장면 ────────────────────────────────────────────────────────────

func _build_stage() -> void:
	daylight = CanvasModulate.new()
	add_child(daylight)
	camera = Camera2D.new()
	camera.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 5.0
	add_child(camera)
	stage = Node2D.new()
	add_child(stage)
	picture = Sprite2D.new()
	picture.centered = false
	stage.add_child(picture)
	props = Node2D.new()
	stage.add_child(props)
	lights = Node2D.new()
	stage.add_child(lights)

	var sheet: Texture2D = load("res://art/yui-walk.png")
	var cell := Vector2(sheet.get_width() / 4.0, sheet.get_height())     # 걷는 네 컷이 가로로 나란하다
	var frames := SpriteFrames.new()
	frames.remove_animation(&"default")
	frames.add_animation(&"stand")
	frames.add_frame(&"stand", _cut(sheet, Rect2(Vector2(cell.x, 0), cell)))
	frames.add_animation(&"walk")
	frames.set_animation_speed(&"walk", 7.7)
	for i in 4:
		frames.add_frame(&"walk", _cut(sheet, Rect2(Vector2(cell.x * i, 0), cell)))
	yui = AnimatedSprite2D.new()
	yui.sprite_frames = frames
	yui.animation = &"stand"
	yui.scale = Vector2(1.2, 1.2)
	yui.offset = Vector2(0, -cell.y / 2.0)
	stage.add_child(yui)
	faces["y"] = _cut(load("res://art/yui-stand.png"), Rect2(0, 0, 122, 112))     # 선 모습(122 × 328)의 머리
	faces["f"] = load("res://art/singer-f-face.png")


func _cut(sheet: Texture2D, region: Rect2) -> AtlasTexture:
	var part := AtlasTexture.new()
	part.atlas = sheet
	part.region = region
	return part


# 곳 하나를 세운다. 그 곳에 들어설 때의 규칙("enter")이 있으면 그 말을, 없으면 그 곳의 첫마디를 띄운다.
func _enter(key: String) -> void:
	place = key
	var where: Dictionary = data.places[key]
	for node in lights.get_children() + props.get_children():
		node.queue_free()
	marks.clear()
	rings.clear()
	verb_tags.clear()
	picked_id = ""
	arriving = ""
	walking = where.kind == "walk"
	yui.visible = walking
	title.text = where.title
	var art: Texture2D = load("res://art/%s.webp" % where.art)
	picture.texture = art
	var size := Vector2(WORLD, VIEW) if walking else Vector2(VIEW, STILL)
	frame_h = size.y
	picture.scale = size / art.get_size()
	if walking:
		yui.position = Vector2(where.start / 100.0 * WORLD, YUI_FEET)
		yui.flip_h = true
		yui.play(&"stand")
		target_x = yui.position.x
	camera.limit_left = 0
	camera.limit_right = int(size.x)
	camera.position = Vector2(_camera_goal(), 0)
	camera.reset_smoothing()
	_light_up(where.art, size)
	for spot: Dictionary in data.spots[key]:
		var rect := Rect2(spot.x / 100.0 * size.x, spot.y / 100.0 * size.y, spot.w / 100.0 * size.x, spot.h / 100.0 * size.y)
		marks[spot.id] = rect
		if spot.has("label"):
			_sign(rect, spot.label)
		rings[spot.id] = _ring_at(rect.get_center())
	for who: String in data.people:
		if data.people[who].place == key:
			_stand(who)
	backdrop.position = Vector2(0, frame_h)
	# 가방과 얻을 것은 그림 밖, 말 칸의 맨 위에 둔다. 그림 위에 두면 탑 같은 누를 것을 가린다
	bag.position = Vector2(VIEW - 14 - SLOTS * SLOT - (SLOTS - 1) * 8, frame_h + 10)
	column.position = Vector2(24, frame_h + 10 + SLOT + 14)
	_show_hint()
	_draw_dots()
	var rule := Rules.find(data.rules, "enter", key, "", state)
	if rule.is_empty():
		_clear_column()
		if where.has("say"):
			column.add_child(_talk_row("y", where.say))
		busy = false
	else:
		_obey(Rules.run(rule.do, state))


# 임시 인물: 둥근 덩어리와 이름표. 그림을 받으면 바꾼다.
# 사람을 세운다. 그림(art)이 있으면 그 그림을, 없으면 임시 덩어리를. "tap": false 면 그림만 서고 누를 수 없다.
func _stand(who: String) -> void:
	var one: Dictionary = data.people[who]
	var h: float = YUI_H * one.height
	var path := "res://art/%s.png" % one.get("art", "")
	var rect: Rect2
	if one.has("art") and ResourceLoader.exists(path):
		var body := Sprite2D.new()
		body.texture = load(path)
		body.centered = false
		var k := h / body.texture.get_height()
		body.scale = Vector2(k, k)
		var w := body.texture.get_width() * k
		body.position = Vector2(one.x / 100.0 * WORLD - w / 2.0, FEET - h + 6)
		props.add_child(body)
		rect = Rect2(body.position, Vector2(w, h))
	else:
		if one.has("art"):
			push_error("no picture %s" % path)
		var w := h * (0.3 if h > 150.0 else 1.5)
		var body := Panel.new()
		var box := _box(Color(Color(one.get("color", "#c9b48a")), 0.82), int(w / 2.2), 0, 0, Color(INK, 0.35), 3)
		body.add_theme_stylebox_override(&"panel", box)
		body.size = Vector2(w, h)
		body.position = Vector2(one.x / 100.0 * WORLD - w / 2.0, FEET - h + 6)
		body.mouse_filter = Control.MOUSE_FILTER_IGNORE
		props.add_child(body)
		rect = Rect2(body.position, body.size)
	if not one.get("tap", true):
		return
	var body := rect
	var tag := _sign(Rect2(body.position + Vector2(-30, -40), Vector2(body.size.x + 60, 0)), data.who[who].name)
	tag.add_theme_stylebox_override(&"normal", _box(Color(1, 1, 1, 0.86), 14, 10, 2))
	tag.add_theme_color_override(&"font_color", INK)
	marks[who] = body
	rings[who] = _ring_at(body.get_center())


func _light_up(art: String, size: Vector2) -> void:
	var set_up: Dictionary = LIGHT.get(art, { "sky": Color.WHITE, "lights": [] })
	daylight.color = set_up.sky
	for one: Array in set_up.lights:
		var light := PointLight2D.new()
		light.texture = glow
		light.position = Vector2(one[0] / 100.0 * size.x, one[1] / 100.0 * size.y)
		light.color = one[2]
		light.texture_scale = one[3]
		light.energy = one[4]
		if one.size() > 6:
			light.scale = Vector2(one[5], one[6])
		lights.add_child(light)


func _fade(points: Array) -> Gradient:
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array(points.map(func(p: Array) -> float: return p[0]))
	fade.colors = PackedColorArray(points.map(func(p: Array) -> Color: return Color(1, 1, 1, p[1])))
	return fade


func _radial(fade: Gradient, size: int) -> GradientTexture2D:
	var dot := GradientTexture2D.new()
	dot.gradient = fade
	dot.width = size
	dot.height = size
	dot.fill = GradientTexture2D.FILL_RADIAL
	dot.fill_from = Vector2(0.5, 0.5)
	dot.fill_to = Vector2(1.0, 0.5)
	return dot


func _ring_at(at: Vector2) -> Sprite2D:
	var one := Sprite2D.new()
	one.texture = ring
	one.position = at
	one.light_mask = 0
	props.add_child(one)
	var tween := one.create_tween().set_loops().set_trans(Tween.TRANS_SINE)
	tween.tween_property(one, "scale", Vector2(1.18, 1.18), 1.1)
	tween.tween_property(one, "scale", Vector2(0.9, 0.9), 1.1)
	return one


func _sign(rect: Rect2, words: String) -> Label:
	var one := Label.new()
	one.text = words
	one.theme = root.theme
	one.add_theme_font_size_override(&"font_size", 22)
	one.add_theme_color_override(&"font_color", Color.WHITE)
	one.add_theme_stylebox_override(&"normal", _box(NAVY, 4, 10, 4))
	one.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	one.custom_minimum_size = Vector2(maxf(rect.size.x, 90.0), 0)
	one.position = Vector2(rect.get_center().x - one.custom_minimum_size.x / 2.0, rect.position.y)
	one.light_mask = 0
	one.mouse_filter = Control.MOUSE_FILTER_IGNORE
	props.add_child(one)
	return one


# ── 걷기와 누르기 ───────────────────────────────────────────────────

func _process(delta: float) -> void:
	if not walking:
		return
	var way := _held_way()
	if way != 0 and not busy:      # ← → 나 A D 를 누르고 있는 동안 걷는다
		arriving = ""
		target_x = clampf(yui.position.x + way * 80.0, 0.04 * WORLD, 0.96 * WORLD)
	var gap := target_x - yui.position.x
	var move := SPEED * delta
	if absf(gap) <= move:
		yui.position.x = target_x
		if yui.animation != &"stand":
			yui.play(&"stand")
		if arriving != "":
			var id := arriving
			arriving = ""
			_touch(id)
	else:
		yui.position.x += signf(gap) * move
		yui.flip_h = gap > 0     # 옆모습의 그림은 왼쪽을 본다
		if yui.animation != &"walk":
			yui.play(&"walk")
	camera.position.x = _camera_goal()


func _camera_goal() -> float:
	if not walking:
		return 0.0
	return clampf(yui.position.x - VIEW / 2.0, 0.0, WORLD - VIEW)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if event.position.y < frame_h:
			press(get_canvas_transform().affine_inverse() * event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		key(event.keycode)


# ── 키보드 ──────────────────────────────────────────────────────────
# ← → (A D) 걷기, ↑ ↓ (W S) 누를 것 고르기, Enter 나 스페이스 하기, 1 → 5 가방의 칸, Esc 내려놓기.
# 말이 떠 있으면 ← → 로 단추를 고르고 Enter 로 누른다. 고를 말은 1 → 3 으로도 고른다.

func _held_way() -> int:
	var way := 0
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		way -= 1
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		way += 1
	return way


func _buttons() -> Array:
	return column.find_children("*", "Button", true, false).filter(func(c: Node) -> bool: return not c.is_queued_for_deletion())


func key(code: int) -> void:
	var buttons := _buttons()
	var number := code - KEY_1 if code >= KEY_1 and code <= KEY_9 else -1
	if not buttons.is_empty() and (busy or queue.is_empty()):
		match code:
			KEY_LEFT, KEY_A, KEY_UP, KEY_W:
				picked_button = posmod(picked_button - 1, buttons.size())
				_light_button()
				return
			KEY_RIGHT, KEY_D, KEY_DOWN, KEY_S:
				picked_button = posmod(picked_button + 1, buttons.size())
				_light_button()
				return
			KEY_ENTER, KEY_KP_ENTER, KEY_SPACE:
				var one: Button = buttons[clampi(picked_button, 0, buttons.size() - 1)]
				picked_button = 0
				one.pressed.emit()
				return
		if number >= 0 and busy and number < buttons.size():
			picked_button = 0
			(buttons[number] as Button).pressed.emit()
			return
	if busy:
		return
	match code:
		KEY_UP, KEY_W:
			_pick_target(-1)
		KEY_DOWN, KEY_S:
			_pick_target(1)
		KEY_ENTER, KEY_KP_ENTER, KEY_SPACE:
			if picked_id != "" and marks.has(picked_id):
				press((marks[picked_id] as Rect2).get_center())
		KEY_E:
			if held != "":
				examine(held)
			elif not state.bag.is_empty():
				examine(state.bag[0])
		KEY_ESCAPE:
			if held != "":
				held = ""
				_draw_bag()
		_:
			if number >= 0 and number < state.bag.size():
				pick(state.bag[number])


# 화면에 보이는 누를 것을 왼쪽에서 오른쪽 차례로 하나씩 고른다.
func _pick_target(step: int) -> void:
	var left := camera.position.x if walking else 0.0
	var seen := marks.keys().filter(func(id: String) -> bool:
		var x := (marks[id] as Rect2).get_center().x
		return x >= left and x <= left + VIEW)
	if seen.is_empty():
		return
	seen.sort_custom(func(a: String, b: String) -> bool: return marks[a].get_center().x < marks[b].get_center().x)
	var at := seen.find(picked_id)
	picked_id = seen[posmod(at + step, seen.size()) if at >= 0 else (0 if step > 0 else seen.size() - 1)]
	for id: String in rings:
		var one := rings[id] as Sprite2D
		one.modulate = Color(1.0, 0.62, 0.1) if id == picked_id else Color.WHITE
		one.self_modulate.a = 1.0
		one.z_index = 1 if id == picked_id else 0
	_show_hint()


# 그림 왼쪽 아래의 키 안내. 키로 고른 것이 있으면 그 이름을 앞에 붙인다.
const KEYS := "←→ 걷기  ↑↓ 고르기  Enter 하기  1-5 가방  E 살펴보기  Esc 내려놓기"


func _show_hint() -> void:
	var name := _target_name(picked_id)
	key_hint.text = ("고름: %s   " % name if name != "" else "") + KEYS


func _target_name(id: String) -> String:
	if id == "":
		return ""
	if data.who.has(id):
		return data.who[id].name
	for spot: Dictionary in data.spots.get(place, []):
		if spot.id == id:
			return data.get("names", {}).get(id, spot.get("label", id))
	return id


func _light_button() -> void:
	var buttons := _buttons()
	for i in buttons.size():
		(buttons[i] as Button).modulate = Color(1.0, 0.86, 0.55) if i == picked_button else Color.WHITE


# 그림의 at 을 눌렀다. 사람이나 물건이면 그 앞까지 걸어가서 만지고, 빈 데면 든 것을 내려놓고 그리로 걷는다.
func press(at: Vector2) -> void:
	if busy:
		return
	var hit := ""
	for id: String in marks:      # 사람이 자리보다 뒤에 들어가므로 뒤에서부터 본다
		if (marks[id] as Rect2).has_point(at):
			hit = id
	if hit == "":
		if held != "":
			held = ""
			_draw_bag()
		arriving = ""
		if walking:
			target_x = clampf(at.x, 0.04 * WORLD, 0.96 * WORLD)
		return
	if not walking:
		_touch(hit)
		return
	arriving = hit
	var x := (marks[hit] as Rect2).get_center().x
	if data.people.has(hit):       # 사람 앞에 선다. 겹쳐 서지 않는다
		x -= 110.0 if yui.position.x < x else -110.0
	target_x = clampf(x, 0.04 * WORLD, 0.96 * WORLD)


# 닿았다. 든 것이 있으면 건네고, 없으면 만진다.
func _touch(id: String) -> void:
	var act := "give" if held != "" else "tap"
	var item := held
	held = ""
	_draw_bag()
	if walking:
		yui.flip_h = (marks[id] as Rect2).get_center().x > yui.position.x
	var rule := Rules.find(data.rules, act, id, item, state)
	if rule.is_empty():
		var turn: int = turns.get(id, 0)
		turns[id] = turn + 1
		_obey(Rules.fallback(data, act, id, item, turn))
	else:
		_obey(Rules.run(rule.do, state))


# ── 명령을 화면에 옮긴다 ────────────────────────────────────────────

func _obey(commands: Array) -> void:
	queue = commands + queue
	_next()


# 다음 명령 하나. 말은 "다음"으로 넘기고, 마지막 말은 단추 없이 남겨 두고 다시 걸을 수 있게 한다.
func _next() -> void:
	picked_button = 0
	_draw_bag()
	if queue.is_empty():
		busy = false
		return
	busy = true
	var one: Array = queue.pop_front()
	match one[0]:
		"say":
			_clear_column()
			column.add_child(_talk_row(one[1], one[2]))
			if queue.is_empty():
				busy = false
			else:
				_button("다음", _next)
		"show":      # 그림 한 장을 말 칸에 크게 띄운다(2004년 사진 같은 것). "다음"으로 넘긴다
			_clear_column()
			var picture := TextureRect.new()
			picture.texture = load("res://art/%s.webp" % one[1])
			picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			picture.custom_minimum_size = Vector2(VIEW - 48, 300)
			column.add_child(picture)
			_button("다음", _next)
		"ask":
			for row in column.get_children():
				if row is Button:
					row.queue_free()
			var row := HBoxContainer.new()      # 고를 말은 한 줄에 나란히. 세로로 쌓으면 키가 짧은 손전화에서 화면 밖으로 밀린다
			row.add_theme_constant_override(&"separation", 10)
			column.add_child(row)
			for pick: Array in one[1]:
				_button(pick[0], _picked.bind(pick[1]), true, row)
		"goto":
			var rest := queue
			queue = []
			_enter(one[1])
			queue += rest
			if not busy:
				_next()
		"end":
			queue.clear()
			_clear_column()
			column.add_child(_reply_paper())
			_button("처음부터", _restart)


func _picked(actions: Array) -> void:
	_obey(Rules.run(actions, state))


# 고를 말이나 "다음"을 차례로 누른다(시연이 쓴다).
func choose(index: int) -> void:
	var buttons := column.find_children("*", "Button", true, false).filter(func(c: Node) -> bool: return not c.is_queued_for_deletion())
	(buttons[index] as Button).pressed.emit()


# ── 가방 ────────────────────────────────────────────────────────────

func pick(item: String) -> void:
	if busy or not state.bag.has(item):
		return
	held = "" if held == item else item
	_draw_bag()


# 칸을 오른쪽 단추로 누르거나 손가락으로 길게 누르면 살펴본다.
var press_started := -1.0


func _slot_input(event: InputEvent, item: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
		examine(item)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			press_started = Time.get_ticks_msec() / 1000.0
			var mine := press_started
			await get_tree().create_timer(0.5).timeout
			if press_started == mine:      # 0.5초를 떼지 않고 눌렀다
				press_started = -1.0
				examine(item)
		else:
			press_started = -1.0


# 물건을 크게 보고 설명을 읽는다. 그림이 있으면 그림을, 없으면 색 동그라미를.
func examine(item: String) -> void:
	if busy or not state.bag.has(item):
		return
	var info: Dictionary = data.items[item]
	held = ""
	busy = true
	_clear_column()
	var art := "res://art/%s.webp" % info.get("art", "")
	var picture := TextureRect.new()
	picture.texture = load(art) if info.has("art") and ResourceLoader.exists(art) else _dot(Color(info.color), 160)
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.custom_minimum_size = Vector2(VIEW - 48, 260 if info.has("art") else 140)
	column.add_child(picture)
	column.add_child(_talk_row("y", info.get("about", info.name)))
	_button("다음", _next)
	_draw_bag()


# 물건을 들었으면 보이는 고리마다 "건네기", "대 보기" 같은 글을 단다.
var verb_tags: Array[Label] = []


func _show_verbs() -> void:
	for tag in verb_tags:
		tag.queue_free()
	verb_tags.clear()
	if held == "" or busy:
		return
	for id: String in marks:
		var at: Vector2 = (marks[id] as Rect2).get_center()
		var tag := _sign(Rect2(at + Vector2(-60, 36), Vector2(120, 0)), Rules.verb(data, id))
		tag.add_theme_stylebox_override(&"normal", _box(GOLD, 12, 8, 2))
		tag.add_theme_color_override(&"font_color", INK)
		tag.add_theme_font_size_override(&"font_size", 20)
		verb_tags.append(tag)


func _draw_bag() -> void:
	for slot in bag.get_children():
		bag.remove_child(slot)
		slot.queue_free()
	for i in SLOTS:
		var slot := Button.new()
		slot.custom_minimum_size = Vector2(SLOT, SLOT)
		slot.focus_mode = Control.FOCUS_NONE
		slot.pivot_offset = Vector2(SLOT, SLOT) / 2.0
		var item: String = state.bag[i] if i < state.bag.size() else ""
		var lit := item != "" and item == held
		var box := _box(Color(1, 1, 1, 0.86 if item != "" else 0.4), 18, 4, 6, GOLD if lit else Color(INK, 0.3), 5 if lit else 2)
		for look: StringName in [&"normal", &"hover", &"pressed", &"disabled", &"focus"]:
			slot.add_theme_stylebox_override(look, box)
		if item != "":
			var info: Dictionary = data.items[item]
			var art := "res://art/%s.webp" % info.get("art", "")
			if info.has("art") and ResourceLoader.exists(art):
				slot.icon = load(art)
				slot.expand_icon = true
			else:
				slot.icon = _dot(Color(info.color), 40)
			slot.text = info.name
			slot.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
			slot.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
			slot.add_theme_font_size_override(&"font_size", 17)
			for look: StringName in [&"font_color", &"font_hover_color", &"font_pressed_color"]:
				slot.add_theme_color_override(look, INK)
			slot.pressed.connect(pick.bind(item))
			slot.gui_input.connect(_slot_input.bind(item))
			if not shown_bag.has(item):      # 새로 들어온 것은 한 번 통통 튄다
				var tween := slot.create_tween().set_trans(Tween.TRANS_BACK)
				tween.tween_property(slot, "scale", Vector2(1.25, 1.25), 0.18)
				tween.tween_property(slot, "scale", Vector2.ONE, 0.25)
		else:
			slot.disabled = true
		bag.add_child(slot)
	shown_bag.assign(state.bag)
	_draw_dots()
	_show_verbs()


func _draw_dots() -> void:
	for dot in dots.get_children():
		dots.remove_child(dot)
		dot.queue_free()
	var goals: Array = data.get("goals", [])
	for goal: Dictionary in goals:
		var got := Rules.has(state, "got:" + goal.id)
		var one := Panel.new()
		one.custom_minimum_size = Vector2(30, 30)
		one.tooltip_text = goal.name
		one.add_theme_stylebox_override(&"panel", _box(GOLD if got else Color(1, 1, 1, 0.7), 15, 0, 0, Color(INK, 0.35), 2))
		dots.add_child(one)
	dots.position = Vector2(24, bag.position.y + (SLOT - 30) / 2.0)


# 할머니의 답장. 줄은 표시에 따라 갈린다(click_rules.gd 의 reply).
func _reply_paper() -> PanelContainer:
	var paper := PanelContainer.new()
	paper.add_theme_stylebox_override(&"panel", _box(Color("fbf6ea"), 10, 28, 22, Color(INK, 0.2), 2))
	var inside := VBoxContainer.new()
	inside.add_theme_constant_override(&"separation", 8)
	for words: String in Rules.reply(data, state):
		inside.add_child(_line(words, 32, INK))
	if data.has("reply"):
		var sign := _line("할머니가", 28, SOFT)
		sign.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		inside.add_child(sign)
	paper.add_child(inside)
	return paper


func _dot(color: Color, size: int) -> GradientTexture2D:
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array([0.0, 0.8, 0.9])
	fade.colors = PackedColorArray([color, color, Color(color, 0.0)])
	return _radial(fade, size)


# ── 화면의 틀과 말 ──────────────────────────────────────────────────

func _build_ui() -> void:
	var ui := CanvasLayer.new()
	add_child(ui)
	var font: FontFile = Fonts.SLICES[0]
	font.fallbacks.assign(Fonts.SLICES.slice(1))
	var theme := Theme.new()
	theme.default_font = font
	theme.default_font_size = 32
	root = Control.new()
	root.theme = theme
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(root)

	backdrop = ColorRect.new()
	backdrop.color = PAPER
	backdrop.size = Vector2(VIEW, 6000)
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(backdrop)

	title = Label.new()
	title.position = Vector2(18, 14)
	title.add_theme_font_size_override(&"font_size", 28)
	title.add_theme_color_override(&"font_color", INK)
	title.add_theme_stylebox_override(&"normal", _box(Color(1, 1, 1, 0.86), 20, 16, 6))
	root.add_child(title)

	bag = HBoxContainer.new()
	bag.add_theme_constant_override(&"separation", 8)
	bag.position = Vector2(VIEW - 14 - SLOTS * SLOT - (SLOTS - 1) * 8, 14 + 52)
	root.add_child(bag)

	key_hint = Label.new()      # 키보드로 하는 법. 그림의 왼쪽 아래 귀퉁이
	key_hint.text = KEYS
	key_hint.add_theme_font_size_override(&"font_size", 18)
	key_hint.add_theme_color_override(&"font_color", INK)
	key_hint.add_theme_stylebox_override(&"normal", _box(Color(1, 1, 1, 0.7), 10, 10, 3))
	key_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(key_hint)
	key_hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT, Control.PRESET_MODE_MINSIZE, 14)      # 화면 맨 아래

	dots = HBoxContainer.new()      # 이 쪽에서 얻을 것. 얻으면 금빛으로 찬다
	dots.add_theme_constant_override(&"separation", 8)
	root.add_child(dots)

	column = VBoxContainer.new()
	column.custom_minimum_size = Vector2(VIEW - 48, 0)
	column.size = Vector2(VIEW - 48, 0)
	column.add_theme_constant_override(&"separation", 18)
	root.add_child(column)


func _box(color: Color, radius: int, pad_x: int, pad_y: int, border := Color(0, 0, 0, 0), width := 0) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(radius)
	box.content_margin_left = pad_x
	box.content_margin_right = pad_x
	box.content_margin_top = pad_y
	box.content_margin_bottom = pad_y
	box.border_color = border
	box.set_border_width_all(width)
	return box


func _clear_column() -> void:
	for child in column.get_children():
		column.remove_child(child)
		child.queue_free()


func _face(who: String) -> Texture2D:
	if faces.has(who):
		return faces[who]
	var path := "res://art/%s.png" % data.people.get(who, {}).get("face", "")
	if data.people.get(who, {}).has("face") and ResourceLoader.exists(path):
		faces[who] = load(path)
		return faces[who]
	var color := Color(data.people[who].color) if data.people.has(who) else Color("c9b48a")
	faces[who] = _dot(color, 96)
	return faces[who]


func _talk_row(who: String, words: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override(&"separation", 14)
	var head := TextureRect.new()
	head.texture = _face(who)
	head.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	head.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	head.custom_minimum_size = Vector2(96, 100)
	head.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	row.add_child(head)
	var bubble := PanelContainer.new()
	bubble.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var box := _box(Color(data.who[who].color), 22, 24, 16, Color(0.231, 0.165, 0.102, 0.15), 2)
	box.corner_radius_bottom_left = 4
	bubble.add_theme_stylebox_override(&"panel", box)
	var inside := VBoxContainer.new()
	inside.add_theme_constant_override(&"separation", 2)
	if data.who[who].name != "":
		inside.add_child(_line(data.who[who].name, 24, LABEL))
	inside.add_child(_line(words, 34, Color("1b1730")))
	bubble.add_child(inside)
	row.add_child(bubble)
	row.modulate.a = 0.0
	row.create_tween().tween_property(row, "modulate:a", 1.0, 0.25)
	return row


# plain 이면 고를 말: 줄의 너비를 나눠 갖고 키가 80 이상이다.
func _button(words: String, then: Callable, plain := false, into: Container = null) -> void:
	var one := Button.new()
	one.text = words
	one.focus_mode = Control.FOCUS_NONE
	one.size_flags_horizontal = Control.SIZE_EXPAND_FILL if plain else Control.SIZE_SHRINK_CENTER
	if plain:
		one.custom_minimum_size = Vector2(0, 80)
		one.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var color := NAVY if plain else RED
	one.add_theme_font_size_override(&"font_size", 26 if plain else 32)
	for look: StringName in [&"font_color", &"font_hover_color", &"font_pressed_color", &"font_focus_color"]:
		one.add_theme_color_override(look, color)
	var pad := 12 if plain else 44
	var box := _box(Color(1, 1, 1, 0.55), 40, pad, 16, color, 3)
	for look: StringName in [&"normal", &"hover", &"disabled", &"focus"]:
		one.add_theme_stylebox_override(look, box)
	one.add_theme_stylebox_override(&"pressed", _box(Color(1, 1, 1, 0.9), 40, pad, 16, color, 3))
	one.pressed.connect(then)
	(into if into != null else column).add_child(one)


func _line(words: String, size: int, color: Color) -> Label:
	var one := Label.new()
	one.text = words
	one.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	one.add_theme_font_size_override(&"font_size", size)
	one.add_theme_color_override(&"font_color", color)
	return one


# ── 시연: 손대지 않고 끝까지 돌며 화면을 찍는다(godot/shots/c*.png) ──

var shots := 0


func _demo() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://shots"))
	if chapter == "myeongdong":
		await _demo_myeongdong()
	else:
		await _demo_alley()
	print("click demo: chapter=", chapter, " place=", place, " flags=", state.flags, " bag=", state.bag, " ask_bottom=", ask_bottom, " ask_fits=", ask_bottom <= 1040.0)
	get_tree().quit()


func _demo_myeongdong() -> void:
	await _through("md-start")
	await _go("exit3")
	await _through("md-wrong")
	press(marks["back"].get_center())
	await _through("md-back")
	await _go("board")
	await _through("md-board")
	await _go("exit6")
	await _through("md-street")
	await _go("ajumma")
	await _through("md-queue")
	pick("photo")
	await _go("tower")
	await _through("md-tower-early")
	pick("bill")
	await _go("clerk")
	await _through("md-change")
	pick("sample")
	await _go("ajumma")
	await _through("md-sample")
	pick("coins")
	await _go("ajumma")
	await _through("md-bread")
	await _go("ajumma")
	await _through("md-photo")
	pick("photo")
	await _shot("md-photo-held", 0.3)
	await _go("tower")
	await _through("md-clue")
	await _go("down")
	await _through("md-ask")
	_measure_ask()
	choose(0)
	await _through("md-end")


func _demo_alley() -> void:
	await _keyboard_check()
	await _shot("first", 0.8)
	await _go("cat")
	await _shot("cat-1", 0.6)
	await _go("cat")
	await _shot("cat-2", 0.6)
	await _go("door")
	await _shot("door-shaky", 0.6)
	await _through("door-note")
	press(Vector2(0.5 * WORLD, 500))        # 걷는 중에 다른 데를 누른다
	await get_tree().create_timer(0.6).timeout
	await _go("clerk")
	await _shot("clerk", 0.4)
	await _through("clerk-card-hint")
	pick("card")
	await _shot("card-held", 0.3)
	press(Vector2(0.4 * WORLD, 500))        # 들고 빈 데를 누르면 내려놓고 걷는다
	await _shot("card-dropped", 1.2)
	pick("card")
	await _go("clerk")
	await _through("bought")
	pick("drinks")
	await _go("cat")
	await _shot("drinks-to-cat", 0.6)
	await _go("rider")
	await _through("rider")
	await _go("board")
	await _through("board-ask")
	_measure_ask()
	choose(0)
	await _through("board-wrong")
	await _go("board")
	await _through("board-ask-again")
	choose(1)
	await _through("door-open")
	pick("drinks")
	await _shot("drinks-held-open", 0.3)
	press(marks["singer"].get_center())
	await _through("end")


# 고를 말의 아래 끝이 기준 높이 1040 안에 드는가. 키가 짧은 손전화(아이폰 SE의 사파리, 1052쯤)에서도 보이게.
var ask_bottom := 0.0


func _measure_ask() -> void:
	for child: Control in column.get_children():
		ask_bottom = maxf(ask_bottom, child.get_global_rect().end.y)


# 키보드만으로: 오른쪽으로 걷고, 누를 것을 고르고, Enter 로 만지고, Enter 로 말을 넘기고, 숫자로 가방을 집는다.
func _keyboard_check() -> void:
	var start_x := yui.position.x
	_hold(KEY_D, true)
	await get_tree().create_timer(0.8).timeout
	_hold(KEY_D, false)
	await get_tree().create_timer(0.2).timeout
	var walked := yui.position.x - start_x
	key(KEY_DOWN)
	var first := picked_id
	await _shot("key-picked", 0.3)
	key(KEY_ENTER)
	while arriving != "":
		await get_tree().process_frame
	await _shot("key-touched", 0.5)
	while not _buttons().is_empty():
		key(KEY_ENTER)
		await get_tree().create_timer(0.2).timeout
	key(KEY_1)
	var held_one := held
	var tags := verb_tags.size()
	await _shot("key-held-verbs", 0.3)
	key(KEY_ESCAPE)
	key(KEY_E)
	var looked := busy
	await _shot("key-examine", 0.4)
	key(KEY_ENTER)
	print("keyboard: walked=", walked, " picked=", first, " held=", held_one, " verb_tags=", tags, " examined=", looked, " after=", held, " busy=", busy)
	_restart()
	await get_tree().create_timer(0.3).timeout


func _hold(code: int, down: bool) -> void:
	var one := InputEventKey.new()
	one.keycode = code
	one.physical_keycode = code
	one.pressed = down
	Input.parse_input_event(one)


# 그 앞까지 걸어가 닿을 때까지 기다린다.
func _go(id: String) -> void:
	press(marks[id].get_center())
	while arriving != "":
		await get_tree().process_frame
	await get_tree().create_timer(0.1).timeout


# "다음"이 있는 동안 넘기며 찍는다. 고를 말이 뜨거나 말이 끝나면 멈춘다.
func _through(name_: String) -> void:
	var i := 0
	while true:
		await _shot("%s-%d" % [name_, i], 0.5)
		var next := column.get_children().filter(func(c: Node) -> bool:
			return c is Button and not c.is_queued_for_deletion() and c.text == "다음")
		if next.is_empty():
			return
		(next[0] as Button).pressed.emit()
		i += 1


func _shot(name_: String, wait: float) -> void:
	await get_tree().create_timer(wait).timeout
	await RenderingServer.frame_post_draw
	shots += 1
	get_viewport().get_texture().get_image().save_png("res://shots/c%02d-%s.png" % [shots, name_])
