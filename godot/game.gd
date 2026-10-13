extends Node2D
## 할머니의 수첩, Godot 판. 웹의 것(docs/water/)을 옮기는 중이다. 지금 있는 것은 홍대의 앞 절반이다:
## 할머니의 쪽 → 홍대입구역(소리로 출구 찾기) → 낮의 거리(아이돌의 공연) → 지하 연습실의 문 앞.
## 글, 장면의 자리, 요금은 웹의 것이 한 벌이고 tools/godot-data.mjs 가 data/ 로 뽑는다. 여기는 화면과 빛만 놓는다.
## 장면의 나무는 이 스크립트가 세운다. 손대지 않고 돌려 보려면: godot --path godot -- --demo

const Fonts := preload("res://fonts.gd")

const VIEW := 720.0        # 화면의 너비이자 걷는 틀의 높이
const WORLD := 2160.0      # 긴 그림의 너비(가로 3, 세로 1)
const STILL := 480.0       # 가까이 본 그림(가로 3, 세로 2)의 높이
const SPEED := 396.0       # 한 초에 걷는 거리. 웹의 것과 같다(틀 너비의 55%)
const FEET := 655.0        # 유이의 발이 닿는 높이

const INK := Color("3b2a1a")
const PAPER := Color("f6f0e2")
const NOTE := Color("f2e6c8")
const RED := Color("c8553d")
const SOFT := Color("8a7a66")
const NAVY := Color("24365f")
const GOLD := Color("e2a93b")
const LABEL := Color("8a4a2a")
const WARM := Color(1.0, 0.8, 0.52)
const SUN := Color(1.0, 0.93, 0.7)

# 걸음의 차례. 웹의 docs/trip/core/trip.js 의 nextStep 과 같다.
const NEXT := { "hdPage": "hdExit", "hdExit": "hdStreet", "hdStreet": "hdDoor", "hdDoor": "hdSoon", "hdSoon": "hdSoon" }
const ITEMS := ["exit", "word", "idol", "photo", "sign"]
# 홍대입구역의 계단과 거기서 들리는 것. 기타 소리가 나는 계단은 하나다.
const STAIRS := { "stairsA": "hdStairsA", "stairsB": "hdStairsB", "corridor": "hdCorridor", "stairsC": "hdStairsC" }
const SOUND := "stairsC"
# 처음부터 고리가 없는 누를 곳(읽을 거리)
const QUIET := { "hdStation": ["gates", "board", "shop"], "hdStreet": ["canopy", "photo", "guitar", "record"] }

# 장면마다의 빛. sky 는 화면을 물들이는 빛이고, lights 는 [가로 %, 세로 %, 색, 크기, 세기, 가로 늘임, 세로 늘임] 이다.
# 그림은 맑은 낮으로 받았다. 빛은 여기서 얹는다. 어둑하게 하지 않는다.
const LIGHT := {
	"hdStation": { "sky": Color(0.82, 0.84, 0.92), "lights": [
		[30.8, 40.0, SUN, 3.0, 0.55, 0.7, 1.3], [74.8, 40.0, SUN, 3.0, 0.55, 0.7, 1.3], [96.6, 40.0, SUN, 3.0, 0.55, 0.7, 1.3],
		[40.2, 52.0, WARM, 2.6, 0.3], [49.6, 52.0, WARM, 2.6, 0.3], [58.6, 52.0, WARM, 2.6, 0.3] ] },
	"hdStreet": { "sky": Color(1.0, 0.96, 0.9), "lights": [
		[14.8, 60.0, WARM, 3.0, 0.16], [26.0, 60.0, WARM, 3.0, 0.16], [42.0, 60.0, WARM, 3.0, 0.16], [71.8, 60.0, WARM, 3.0, 0.16], [90.0, 60.0, WARM, 3.0, 0.16],
		[48.6, 44.0, SUN, 2.4, 0.3], [64.0, 44.0, SUN, 2.4, 0.3] ] },
	"hd-idol": { "sky": Color(1.0, 0.96, 0.9), "lights": [[2.6, 22.0, SUN, 3.4, 0.5], [97.4, 22.0, SUN, 3.4, 0.5]] },
	"hd-door": { "sky": Color(0.7, 0.7, 0.84), "lights": [[50.0, 5.0, WARM, 4.2, 0.85], [50.0, 73.0, WARM, 2.2, 0.7, 2.6, 0.3]] },
}
# 거리 공연을 보고 돌아오면 해가 기운다. 가게의 창이 밝아진다.
const DUSK := Color(0.9, 0.8, 0.82)

var text := {}
var scenes := {}
var lang := "ko"

var step := "hdPage"
var closeup := ""            # "idol" 이면 거리 공연을 가까이 보는 중이다
var found: Array[String] = []
var tried: Array[String] = []
var exit_misses := 0
var saw_idol := false
var knocks := 0

var turn := 0                # 화면을 다시 그릴 때마다 는다. 앞 화면이 걸어 둔 시계를 버리는 데 쓴다
var busy := false
var walking := false         # 걷는 장면인가
var held := false
var arriving := ""
var target_x := 150.0
var last_scene := ""
var frame_h := 0.0
var marks := {}              # 누를 곳의 이름 → { rect, say, ring, sign }

var daylight: CanvasModulate
var camera: Camera2D
var stage: Node2D
var picture: Sprite2D
var lights: Node2D
var rings: Node2D
var yui: AnimatedSprite2D
var leaves: Array[CPUParticles2D] = []
var glow: GradientTexture2D
var ring: GradientTexture2D
var backdrop: ColorRect
var place: Label
var dots: HBoxContainer
var column: VBoxContainer
var bubble: PanelContainer
var bubble_text: Label
var face: AtlasTexture


func _ready() -> void:
	text = JSON.parse_string(FileAccess.get_file_as_string("res://data/text.json"))
	scenes = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes.json"))
	glow = _soft_dot(128)
	ring = _ring(64)
	_build_stage()
	_build_ui()
	_show()
	if "--demo" in OS.get_cmdline_user_args():
		_demo()


func t(key: String, values := {}) -> String:
	var line: String = text[lang].get(key, key)
	for name: String in values:
		line = line.replace("{%s}" % name, str(values[name]))
	return line


# ── 장면의 나무 ─────────────────────────────────────────────────────

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
	lights = Node2D.new()
	stage.add_child(lights)
	rings = Node2D.new()
	stage.add_child(rings)

	var sheet: Texture2D = load("res://art/yui-walk.png")
	var frames := SpriteFrames.new()
	frames.remove_animation(&"default")
	frames.add_animation(&"stand")
	frames.add_frame(&"stand", _cut(sheet, Rect2(137, 0, 137, 260)))
	frames.add_animation(&"walk")
	frames.set_animation_speed(&"walk", 7.7)
	for i in 4:
		frames.add_frame(&"walk", _cut(sheet, Rect2(137 * i, 0, 137, 260)))
	yui = AnimatedSprite2D.new()
	yui.sprite_frames = frames
	yui.animation = &"stand"
	yui.scale = Vector2(1.2, 1.2)      # 웹의 것과 같다: 틀 높이의 43.5%
	yui.offset = Vector2(0, -130)
	yui.position = Vector2(150, FEET)
	stage.add_child(yui)
	face = _cut(load("res://art/yui-stand.png"), Rect2(0, 0, 146, 150))


func _cut(sheet: Texture2D, region: Rect2) -> AtlasTexture:
	var part := AtlasTexture.new()
	part.atlas = sheet
	part.region = region
	return part


func _build_ui() -> void:
	var ui := CanvasLayer.new()
	add_child(ui)
	var font: FontFile = Fonts.SLICES[0]
	font.fallbacks.assign(Fonts.SLICES.slice(1))
	var theme := Theme.new()
	theme.default_font = font
	theme.default_font_size = 32
	var root := Control.new()
	root.theme = theme
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(root)

	backdrop = ColorRect.new()
	backdrop.color = PAPER
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(backdrop)

	place = Label.new()
	place.position = Vector2(18, 14)
	place.add_theme_font_size_override(&"font_size", 28)
	place.add_theme_color_override(&"font_color", INK)
	place.add_theme_stylebox_override(&"normal", _box(Color(1, 1, 1, 0.86), 20, 16, 6))
	root.add_child(place)

	dots = HBoxContainer.new()
	dots.position = Vector2(VIEW - 18 - 5 * 34 - 4 * 8, 18)
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


# ── 화면을 그린다 ───────────────────────────────────────────────────

func _show() -> void:
	turn += 1
	busy = false
	held = false
	arriving = ""
	for child in column.get_children():
		column.remove_child(child)
		child.queue_free()
	bubble = null
	if closeup == "idol":
		_still("hd-idol", "hdIdolTitle")
		_talk("hdIdolSay", { "idol": t("idolName") })
		_button("back", _back_to_street)
	else:
		match step:
			"hdPage":
				_no_stage("hdPlace")
				_paper("hdPlace", "gWhen", [["gHow", t("hdHowText")], ["gLost", t("hdLostText")], ["gTip", t("hdTipText")],
					["hdSawLabel", t("hdSawText", { "band": t("bandName") })]], "sign")
				_talk("hdYui")
				_button("hdStart", _next)
			"hdExit":
				_walk("hdStation", "hdStationTitle")
				_talk("hdStationYui")
			"hdStreet":
				_walk("hdStreet", "hdStreetTitle")
				_talk("hdStreetBack" if saw_idol else "hdStreetYui")
				if saw_idol:
					_sunset()
			"hdDoor":
				knocks = 0
				_still("hd-door", "hdDoorTitle")
				_talk("hdDoorYui")
				_button("hdKnock", _knock)
			"hdSoon":
				_still("hd-door", "hdDoorTitle")
				_paper("", "", [["", t("hdSoonText")]], "")
				_note(t("hdSoonNote"))
				_button("restart", _restart, true)
	_note(t("note"))
	_draw_dots()
	backdrop.position = Vector2(0, frame_h)
	backdrop.size = Vector2(VIEW, 6000)
	column.position = Vector2(24, frame_h + 24 if frame_h > 0 else 84)


func _no_stage(title: String) -> void:
	walking = false
	stage.visible = false
	frame_h = 0.0
	place.text = t(title)
	daylight.color = Color.WHITE
	camera.limit_right = int(VIEW)
	camera.position = Vector2.ZERO
	camera.reset_smoothing()
	_clear_stage()


func _clear_stage() -> void:
	for node in lights.get_children() + rings.get_children():
		node.queue_free()
	for one in leaves:
		one.queue_free()
	leaves.clear()
	marks.clear()


# 긴 그림 하나를 놓고 유이를 세운다.
func _walk(name: String, title: String) -> void:
	var scene: Dictionary = scenes[name]
	_clear_stage()
	walking = true
	stage.visible = true
	yui.visible = true
	frame_h = VIEW
	place.text = t(title)
	var art: Texture2D = load("res://art/%s.webp" % scene.art)
	picture.texture = art
	picture.scale = Vector2(WORLD / art.get_width(), VIEW / art.get_height())
	if last_scene != name:
		yui.position.x = scene.start / 100.0 * WORLD
		yui.flip_h = scene.start < 50
		last_scene = name
	target_x = yui.position.x
	camera.limit_left = 0
	camera.limit_right = int(WORLD)
	camera.position = Vector2(_camera_goal(), 0)
	camera.reset_smoothing()
	_light_up(name, Vector2(WORLD, VIEW))
	for spot: Dictionary in scene.spots:
		var rect := Rect2(spot.x / 100.0 * WORLD, spot.y / 100.0 * VIEW, spot.w / 100.0 * WORLD, spot.h / 100.0 * VIEW)
		var mark := { "rect": rect, "say": spot.get("say", ""), "ring": null, "sign": null }
		if STAIRS.has(spot.id):
			mark.sign = _sign(rect, t("hdStairs"), tried.has(spot.id))
		elif not QUIET.get(name, []).has(spot.id) and not _done(spot.id):
			mark.ring = _ring_at(rect.get_center())
		marks[spot.id] = mark
	if name == "hdStreet":
		_add_leaves(Vector2(745, 150))
		_add_leaves(Vector2(2090, 150))


# 가까이 본 그림 한 장. 유이는 걷지 않는다.
func _still(art_name: String, title: String) -> void:
	_clear_stage()
	walking = false
	stage.visible = true
	yui.visible = false
	frame_h = STILL
	place.text = t(title)
	var art: Texture2D = load("res://art/%s.webp" % art_name)
	picture.texture = art
	picture.scale = Vector2(VIEW / art.get_width(), STILL / art.get_height())
	camera.limit_right = int(VIEW)
	camera.position = Vector2.ZERO
	camera.reset_smoothing()
	_light_up(art_name, Vector2(VIEW, STILL))
	if art_name == "hd-idol":
		_add_leaves(Vector2(90, 40))
		_add_leaves(Vector2(640, 40))


# 그 누를 곳에서 얻을 것을 이미 얻었는가.
func _done(id: String) -> bool:
	return (id == "posters" and found.has("word")) or (id == "stage" and found.has("idol"))


# ── 빛 ──────────────────────────────────────────────────────────────

func _light_up(name: String, size: Vector2) -> void:
	var set_up: Dictionary = LIGHT.get(name, { "sky": Color.WHITE, "lights": [] })
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
	if name == "hd-door":
		_pulse(lights.get_child(1) as PointLight2D)


# 문틈의 빛이 안에서 들리는 노래의 박자로 흔들린다.
func _pulse(light: PointLight2D) -> void:
	var tween := light.create_tween().set_loops().set_trans(Tween.TRANS_SINE)
	tween.tween_property(light, "energy", 1.0, 0.42)
	tween.tween_property(light, "energy", 0.5, 0.42)


# 해가 기운다. 하늘이 살구빛으로 물들고 가게의 창이 밝아진다. 그림은 그대로다.
func _sunset() -> void:
	var tween := create_tween().set_parallel().set_trans(Tween.TRANS_SINE)
	tween.tween_property(daylight, "color", DUSK, 2.4)
	for light: PointLight2D in lights.get_children():
		tween.tween_property(light, "energy", light.energy * 2.6, 2.4)


func _soft_dot(size: int) -> GradientTexture2D:
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 1))
	fade.set_color(1, Color(1, 1, 1, 0))
	return _radial(fade, size)


# 누를 곳을 알리는 흰 고리.
func _ring(size: int) -> GradientTexture2D:
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 0.3))
	fade.set_color(1, Color(1, 1, 1, 0))
	fade.add_point(0.62, Color(1, 1, 1, 0.3))
	fade.add_point(0.7, Color(1, 1, 1, 1))
	fade.add_point(0.86, Color(1, 1, 1, 1))
	fade.add_point(0.93, Color(1, 1, 1, 0))
	return _radial(fade, size)


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
	rings.add_child(one)
	var tween := one.create_tween().set_loops().set_trans(Tween.TRANS_SINE)
	tween.tween_property(one, "scale", Vector2(1.18, 1.18), 1.1)
	tween.tween_property(one, "scale", Vector2(0.9, 0.9), 1.1)
	return one


# 계단 위의 안내판. 들어 본 계단은 흐려진다.
func _sign(rect: Rect2, words: String, off: bool) -> Label:
	var one := Label.new()
	one.text = words
	one.theme = column.get_parent().theme
	one.add_theme_font_size_override(&"font_size", 22)
	one.add_theme_color_override(&"font_color", Color.WHITE)
	one.add_theme_stylebox_override(&"normal", _box(NAVY, 4, 10, 4))
	one.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	one.custom_minimum_size = Vector2(rect.size.x, 0)
	one.position = rect.position
	one.light_mask = 0
	one.mouse_filter = Control.MOUSE_FILTER_IGNORE
	one.modulate = Color(0.75, 0.75, 0.75, 0.75) if off else Color.WHITE
	rings.add_child(one)
	return one


# 은행잎이 진다. 잎은 그림이 아니라 노란 조각이다.
func _add_leaves(at: Vector2) -> void:
	var leaf := GradientTexture2D.new()
	var flat := Gradient.new()
	flat.set_color(0, Color(1, 1, 1, 1))
	flat.set_color(1, Color(1, 1, 1, 0.9))
	leaf.gradient = flat
	leaf.width = 14
	leaf.height = 9
	var one := CPUParticles2D.new()
	one.texture = leaf
	one.position = at
	one.amount = 9
	one.lifetime = 7.0
	one.preprocess = 7.0
	one.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	one.emission_rect_extents = Vector2(150, 90)
	one.direction = Vector2(0.35, 1)
	one.spread = 30.0
	one.gravity = Vector2(6, 22)
	one.initial_velocity_min = 25.0
	one.initial_velocity_max = 55.0
	one.angular_velocity_min = -120.0
	one.angular_velocity_max = 120.0
	one.angle_max = 360.0
	one.scale_amount_min = 0.7
	one.scale_amount_max = 1.4
	one.color = Color(0.98, 0.78, 0.2, 0.95)
	stage.add_child(one)
	leaves.append(one)


# ── 걷기 ────────────────────────────────────────────────────────────

func _process(delta: float) -> void:
	if not walking:
		return
	if held and not busy:
		target_x = clampf(get_global_mouse_position().x, 0.04 * WORLD, 0.96 * WORLD)
	var gap := target_x - yui.position.x
	var move := SPEED * delta
	if absf(gap) <= move:
		yui.position.x = target_x
		if yui.animation != &"stand":
			yui.play(&"stand")
		if arriving != "":
			var id := arriving
			arriving = ""
			_act(id)
	else:
		yui.position.x += signf(gap) * move
		yui.flip_h = gap > 0     # 옆모습의 그림은 왼쪽을 본다
		if yui.animation != &"walk":
			yui.play(&"walk")
	if walking:     # 닿아서 가까이 본 그림으로 바뀌었으면 카메라를 유이에게 돌려놓지 않는다
		camera.position.x = _camera_goal()


func _camera_goal() -> float:
	return clampf(yui.position.x - VIEW / 2.0, 0.0, WORLD - VIEW)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and walking and not busy and event.position.y < frame_h:
			_press(get_canvas_transform().affine_inverse() * event.position)
		elif not event.pressed:
			held = false


# 그림의 at 을 눌렀다. 누를 곳이면 거기까지 걸어가서 만지고, 빈 데면 그리로 걷는다.
func _press(at: Vector2) -> void:
	for id: String in marks:
		var rect: Rect2 = marks[id].rect
		if rect.has_point(at):
			_go_to(id)
			return
	arriving = ""
	held = true


func _go_to(id: String) -> void:
	held = false
	arriving = id
	var rect: Rect2 = marks[id].rect
	target_x = clampf(rect.get_center().x, 0.04 * WORLD, 0.96 * WORLD)


# 누를 곳에 닿았다.
func _act(id: String) -> void:
	var mark: Dictionary = marks[id]
	if step == "hdExit" and STAIRS.has(id):
		_listen(id)
	elif step == "hdExit" and id == "posters":
		_gain("word")
		_seen(mark)
		_say("hdPosters")
	elif step == "hdStreet" and id == "stage":
		_gain("idol")
		saw_idol = true
		closeup = "idol"
		_show()
	elif step == "hdStreet" and id == "down":
		_say("hdDown")
		busy = true
		_after(1.6, _next)
	elif mark.say != "":
		_say(mark.say)


# 계단 앞에서 귀를 기울인다. 기타 소리가 나는 계단이면 올라간다.
func _listen(id: String) -> void:
	if id == SOUND:
		_gain("exit")
		_say(STAIRS[id])
		busy = true
		_after(1.8, _next)
	elif tried.has(id):
		_say("hdTried")
	else:
		tried.append(id)
		exit_misses += 1
		(marks[id].sign as Label).modulate = Color(0.75, 0.75, 0.75, 0.75)
		_say(STAIRS[id], true)


func _seen(mark: Dictionary) -> void:
	if mark.ring != null:
		mark.ring.queue_free()
		mark.ring = null


func _gain(id: String) -> void:
	if not found.has(id):
		found.append(id)
		_draw_dots()


func _next() -> void:
	step = NEXT[step]
	_show()


func _back_to_street() -> void:
	closeup = ""
	_show()


# 두 번 머뭇거리고 세 번째에 두드린다.
func _knock() -> void:
	knocks += 1
	if knocks < 3:
		_say("hdHesitate1" if knocks == 1 else "hdHesitate2", true)
		return
	_say("hdKnocked")
	busy = true
	for child in column.get_children():
		if child is Button:
			child.disabled = true
	_after(1.5, _next)


func _restart() -> void:
	step = "hdPage"
	closeup = ""
	found.clear()
	tried.clear()
	exit_misses = 0
	saw_idol = false
	last_scene = ""
	_show()


# sec 초 뒤에 부른다. 그 사이에 화면을 다시 그렸으면 부르지 않는다.
func _after(sec: float, then: Callable) -> void:
	var mine := turn
	await get_tree().create_timer(sec).timeout
	if mine == turn:
		then.call()


# ── 그림 아래의 종이: 유이의 말, 단추, 할머니의 쪽 ─────────────────────

func _talk(key: String, values := {}) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override(&"separation", 14)
	var head := TextureRect.new()
	head.texture = face
	head.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	head.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	head.custom_minimum_size = Vector2(96, 100)
	head.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	row.add_child(head)
	bubble = PanelContainer.new()
	bubble.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bubble.add_theme_stylebox_override(&"panel", _bubble_box(false))
	bubble_text = Label.new()
	bubble_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bubble_text.add_theme_font_size_override(&"font_size", 34)
	bubble_text.add_theme_color_override(&"font_color", Color("1b1730"))
	bubble_text.text = t(key, values)
	bubble.add_child(bubble_text)
	row.add_child(bubble)
	column.add_child(row)


func _bubble_box(warn: bool) -> StyleBoxFlat:
	var box := _box(Color("fde9b8") if warn else Color.WHITE, 22, 24, 16, Color(0.231, 0.165, 0.102, 0.15), 2)
	box.corner_radius_bottom_left = 4
	return box


func _say(key: String, warn := false) -> void:
	if bubble == null:
		return
	bubble_text.text = t(key)
	bubble.add_theme_stylebox_override(&"panel", _bubble_box(warn))
	bubble.modulate.a = 0.0
	bubble.create_tween().tween_property(bubble, "modulate:a", 1.0, 0.25)


func _button(key: String, then: Callable, plain := false) -> void:
	var one := Button.new()
	one.text = t(key)
	one.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	one.focus_mode = Control.FOCUS_NONE
	var color := SOFT if plain else RED
	one.add_theme_font_size_override(&"font_size", 26 if plain else 32)
	for state: StringName in [&"font_color", &"font_hover_color", &"font_pressed_color", &"font_focus_color"]:
		one.add_theme_color_override(state, color)
	one.add_theme_color_override(&"font_disabled_color", Color(color, 0.4))
	var box := _box(Color(1, 1, 1, 0.0 if plain else 0.55), 40, 44, 16, Color(color, 0.55 if plain else 1.0), 2 if plain else 3)
	for state: StringName in [&"normal", &"hover", &"disabled", &"focus"]:
		one.add_theme_stylebox_override(state, box)
	one.add_theme_stylebox_override(&"pressed", _box(Color(1, 1, 1, 0.9), 40, 44, 16, color, 3))
	one.pressed.connect(then)
	column.add_child(one)


func _note(words: String) -> void:
	var one := Label.new()
	one.text = words
	one.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	one.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	one.add_theme_font_size_override(&"font_size", 22)
	one.add_theme_color_override(&"font_color", SOFT)
	column.add_child(one)


# 할머니의 쪽. rows 는 [작은 제목의 열쇠, 글] 의 줄이다.
func _paper(title: String, when: String, rows: Array, sign_key: String) -> void:
	var sheet := PanelContainer.new()
	sheet.add_theme_stylebox_override(&"panel", _box(NOTE, 10, 30, 26))
	var lines := VBoxContainer.new()
	lines.add_theme_constant_override(&"separation", 6)
	sheet.add_child(lines)
	if title != "":
		lines.add_child(_line(t(title), 34, INK, HORIZONTAL_ALIGNMENT_CENTER))
		lines.add_child(_line(t(when), 24, SOFT, HORIZONTAL_ALIGNMENT_CENTER))
	for row: Array in rows:
		if row[0] != "":
			var gap := Control.new()
			gap.custom_minimum_size = Vector2(0, 8)
			lines.add_child(gap)
			lines.add_child(_line(t(row[0]), 26, LABEL))
		lines.add_child(_line(row[1], 34, INK))
	if sign_key != "":
		lines.add_child(_line(t(sign_key), 30, SOFT, HORIZONTAL_ALIGNMENT_RIGHT))
	column.add_child(sheet)


func _line(words: String, size: int, color: Color, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var one := Label.new()
	one.text = words
	one.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	one.horizontal_alignment = align
	one.add_theme_font_size_override(&"font_size", size)
	one.add_theme_color_override(&"font_color", color)
	return one


# 이 쪽에서 모으는 것 다섯. 얻은 것은 금빛으로 찬다.
func _draw_dots() -> void:
	for child in dots.get_children():
		dots.remove_child(child)
		child.queue_free()
	for id: String in ITEMS:
		var dot := Panel.new()
		dot.custom_minimum_size = Vector2(34, 34)
		var on := found.has(id)
		dot.add_theme_stylebox_override(&"panel", _box(GOLD if on else Color(1, 1, 1, 0.6), 17, 0, 0, Color(INK, 0.35), 2))
		dots.add_child(dot)


# ── 손대지 않고 돌려 보기 ────────────────────────────────────────────

func _demo() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://shots"))
	await _shot("g1-page", 0.8)
	_next()
	await _shot("g2-station", 0.8)
	_go_to("stairsB")
	await _shot("g3-wrong-stairs", 4.6)
	_go_to("posters")
	await _shot("g4-posters", 1.6)
	_go_to("stairsC")
	await _shot("g5-right-stairs", 2.6)
	await _shot("g6-street", 2.4)
	_go_to("stage")
	await _shot("g7-idol", 4.4)
	_back_to_street()
	await _shot("g8-sunset", 3.2)
	_go_to("down")
	await _shot("g9-down", 3.2)
	await _shot("g10-door", 2.2)
	_knock()
	await _shot("g11-hesitate", 0.6)
	_knock()
	_knock()
	await _shot("g12-open", 2.4)
	print("demo: step=", step, " found=", found, " misses=", exit_misses)
	get_tree().quit()


func _shot(name_: String, wait: float) -> void:
	await get_tree().create_timer(wait).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://shots/%s.png" % name_)
