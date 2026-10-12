extends Node2D
## 명동 거리 한 장면. 웹의 것(docs/water/)과 같은 세 겹의 그림 위를 유이가 좌우로 걷는다.
## 그림의 빈 데를 누르면 그리로 걷고, 누르고 있으면 계속 걷는다. 수레와 탑은 눌러서 말을 듣는다.
## 웹의 것에 없는 것: 늦게 뒤따르는 카메라, 지는 은행잎, 수레의 김, 저녁과 밤의 빛, 등불, 불 켜진 탑.

const WORLD := 2160.0      # 가운데 겹의 너비
const VIEW := 720.0        # 그림 틀의 너비이자 높이
const SPEED := 396.0       # 한 초에 걷는 거리. 웹의 것과 같다(틀 너비의 55%)
const Fonts := preload("res://fonts.gd")
const FAR_ONLY := 2        # 빛의 가림: 먼 겹만

# 때: 낮, 저녁, 밤. sky 는 화면 전체를 물들이는 빛, 나머지는 등불의 세기다. next 는 단추에 적을 다음 때다.
const TIMES := [
	{ "sky": Color(1, 1, 1), "lamp": 0.0, "window": 0.0, "tower": 0.0, "city": 0.0, "next": "저녁으로", "say": "다시 낮이야." },
	{ "sky": Color(0.56, 0.54, 0.74), "lamp": 0.75, "window": 0.5, "tower": 0.45, "city": 0.3, "next": "밤으로", "say": "해가 진다. 가게마다 불이 켜졌어." },
	{ "sky": Color(0.2, 0.24, 0.46), "lamp": 0.8, "window": 0.95, "tower": 1.0, "city": 1.2, "next": "낮으로", "say": "밤이다. 산 위의 탑에 불이 들어왔어." },
]

# 누를 곳. 수레는 가운데 겹의 자리, 탑은 먼 겹 그림(1536 x 1024)의 자리다.
const CART := Rect2(1447, 274, 324, 360)
const TOWER := Rect2(430, 205, 170, 225)
# 탑(먼 겹 그림의 자리): 뾰족한 끝, 둥근 전망대, 기둥의 가운데
const TOWER_TIP := Vector2(514, 246)
const TOWER_DECK := Vector2(514, 316)
const TOWER_SHAFT := Vector2(514, 356)
# 밤에 불이 켜지는 먼 도시의 창들(먼 겹 그림의 자리)
const CITY := [Vector2(120, 640), Vector2(300, 720), Vector2(430, 610), Vector2(640, 700), Vector2(760, 600),
	Vector2(900, 690), Vector2(1010, 560), Vector2(1150, 650), Vector2(1290, 720), Vector2(1420, 610)]
# 저녁에 불이 켜지는 창: 옷 가게, 가방 가게, 찻집, 수레, 화장품 가게
const WINDOWS := [Vector2(370, 420), Vector2(800, 440), Vector2(1200, 430), Vector2(1620, 440), Vector2(1976, 420)]

@onready var daylight: CanvasModulate = $Daylight
@onready var camera: Camera2D = $Camera
@onready var far_picture: Sprite2D = $Far/Picture
@onready var yui: AnimatedSprite2D = $Mid/Yui
@onready var steam: CPUParticles2D = $Mid/Steam
@onready var lamp: PointLight2D = $Near/Lamp
@onready var leaves: CPUParticles2D = $Near/Leaves
@onready var say: Label = $UI/Say
@onready var dusk_button: Button = $UI/Dusk

var target_x := 173.0
var held := false
var time := 0                # TIMES 의 몇째인가
var arriving := ""          # 걸어가서 만질 곳
var window_lights: Array[PointLight2D] = []
var tower_lights: Array[PointLight2D] = []
var city_lights: Array[PointLight2D] = []
var beacon: PointLight2D
var halo: PointLight2D       # 탑을 감싸는 옅은 달무리


func _ready() -> void:
	var glow := _soft_dot(128)
	lamp.texture = glow
	lamp.texture_scale = 3.2
	var warm := Color(1, 0.8, 0.52)
	for at: Vector2 in WINDOWS:
		window_lights.append(_light($Mid, at, glow, warm, 3.6))
	# 탑: 전망대의 푸른 빛, 기둥을 타고 내리는 빛, 탑을 감싸는 옅은 달무리, 끝의 붉은 깜빡이
	# 먼 겹의 빛은 먼 겹에만 닿는다(빛의 가림 2번). 그러지 않으면 탑의 빛이 앞의 나무와 가게까지 밝힌다.
	far_picture.light_mask = FAR_ONLY
	var cool := Color(0.5, 0.86, 1)
	tower_lights.append(_light(far_picture, TOWER_DECK, glow, cool, 0.5, Vector2.ONE, FAR_ONLY))
	tower_lights.append(_light(far_picture, TOWER_SHAFT, glow, cool, 0.9, Vector2(0.2, 1.2), FAR_ONLY))
	halo = _light(far_picture, TOWER_DECK, glow, Color(0.6, 0.8, 1), 1.7, Vector2.ONE, FAR_ONLY)
	beacon = _light(far_picture, TOWER_TIP, glow, Color(1, 0.3, 0.25), 0.3, Vector2.ONE, FAR_ONLY)
	for at: Vector2 in CITY:
		city_lights.append(_light(far_picture, at, glow, warm, 0.38, Vector2.ONE, FAR_ONLY))
	var font := Fonts.SLICES[0]
	font.fallbacks.assign(Fonts.SLICES.slice(1))
	say.add_theme_font_override(&"font", font)
	dusk_button.add_theme_font_override(&"font", font)
	_set_up_leaves()
	_set_up_steam(glow)
	dusk_button.pressed.connect(_next_time)
	camera.position.x = _camera_goal()
	camera.reset_smoothing()
	_blink()
	if "--demo" in OS.get_cmdline_user_args():
		_demo()


func _process(delta: float) -> void:
	if held:
		target_x = clampf(get_global_mouse_position().x, 0.04 * WORLD, 0.96 * WORLD)
	var gap := target_x - yui.position.x
	var step := SPEED * delta
	if absf(gap) <= step:
		yui.position.x = target_x
		if yui.animation != &"stand":
			yui.play(&"stand")
			_arrived()
	else:
		yui.position.x += signf(gap) * step
		yui.flip_h = gap > 0     # 옆모습의 그림은 왼쪽을 본다
		if yui.animation != &"walk":
			yui.play(&"walk")
	camera.position.x = _camera_goal()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and event.position.y < VIEW:
			_press(event.position)
		else:
			held = false


# 화면의 at 을 눌렀다. 탑은 그 자리에서 말하고, 수레는 걸어가서 말하고, 빈 데는 그리로 걷는다.
func _press(at: Vector2) -> void:
	var on_far := far_picture.get_global_transform_with_canvas().affine_inverse() * at
	var on_mid := get_canvas_transform().affine_inverse() * at
	if CART.has_point(on_mid):
		arriving = "cart"
		target_x = CART.get_center().x
	elif TOWER.has_point(on_far) and not _covered(on_mid):
		_say("탑이 왼쪽에 보여. 2004년 사진에는 오른쪽에 있었는데. 사진은 여기서 찍은 게 아니야.")
	else:
		arriving = ""
		held = true


# 가운데 겹의 가게가 그 자리를 가리고 있는가. 가게 그림의 투명한 데가 하늘이다.
func _covered(on_mid: Vector2) -> bool:
	var picture: Sprite2D = $Mid/Picture
	return picture.is_pixel_opaque(picture.to_local(on_mid))


func _arrived() -> void:
	if arriving == "cart":
		_say("계란빵이다. 달걀이 통째로 들었어. 따끈하고 달다.")
	arriving = ""


func _camera_goal() -> float:
	return clampf(yui.position.x - VIEW / 2.0, 0.0, WORLD - VIEW)


func _say(text: String) -> void:
	say.text = text
	say.modulate.a = 0.0
	create_tween().tween_property(say, "modulate:a", 1.0, 0.25)


# 낮 → 저녁 → 밤 → 낮. 그림은 그대로이고 빛만 바뀐다.
func _next_time() -> void:
	time = (time + 1) % TIMES.size()
	var now: Dictionary = TIMES[time]
	dusk_button.text = now.next
	var tween := create_tween().set_parallel().set_trans(Tween.TRANS_SINE)
	tween.tween_property(daylight, "color", now.sky, 1.6)
	tween.tween_property(lamp, "energy", now.lamp, 1.6)
	for light in window_lights:
		tween.tween_property(light, "energy", now.window, 1.6)
	for light in tower_lights:
		tween.tween_property(light, "energy", now.tower * 1.6, 1.6)
	tween.tween_property(halo, "energy", now.tower * 0.35, 1.6)
	for light in city_lights:
		tween.tween_property(light, "energy", now.city, 1.6)
	_say(now.say)


# 붉은 깜빡이는 탑에 불이 들어온 동안에만, 2초에 한 번 밝아졌다 꺼진다.
func _blink() -> void:
	var on: float = TIMES[time].tower
	var tween := create_tween()
	tween.tween_property(beacon, "energy", on * 1.4, 0.5)
	tween.tween_property(beacon, "energy", 0.0, 0.5)
	tween.tween_interval(1.0)
	tween.finished.connect(_blink)


func _light(on: Node, at: Vector2, glow: Texture2D, color: Color, size: float, stretch := Vector2.ONE, reach := 1) -> PointLight2D:
	var light := PointLight2D.new()
	light.texture = glow
	light.texture_scale = size
	light.scale = stretch
	light.color = color
	light.energy = 0.0
	light.range_item_cull_mask = reach
	light.position = at
	on.add_child(light)
	return light


# 가운데가 짙고 가장자리로 사라지는 둥근 점. 등불의 빛과 김에 쓴다.
func _soft_dot(size: int) -> GradientTexture2D:
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 1))
	fade.set_color(1, Color(1, 1, 1, 0))
	var dot := GradientTexture2D.new()
	dot.gradient = fade
	dot.width = size
	dot.height = size
	dot.fill = GradientTexture2D.FILL_RADIAL
	dot.fill_from = Vector2(0.5, 0.5)
	dot.fill_to = Vector2(1.0, 0.5)
	return dot


# 은행나무에서 잎이 진다. 잎은 그림이 아니라 노란 조각이다(견본이라 그렇다. 쓰려면 잎 그림을 주문한다).
func _set_up_leaves() -> void:
	var leaf := GradientTexture2D.new()
	var flat := Gradient.new()
	flat.set_color(0, Color(1, 1, 1, 1))
	flat.set_color(1, Color(1, 1, 1, 0.9))
	leaf.gradient = flat
	leaf.width = 14
	leaf.height = 9
	leaves.texture = leaf
	leaves.amount = 16
	leaves.lifetime = 7.0
	leaves.preprocess = 7.0
	leaves.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	leaves.emission_rect_extents = Vector2(300, 140)
	leaves.direction = Vector2(0.35, 1)
	leaves.spread = 30.0
	leaves.gravity = Vector2(6, 22)
	leaves.initial_velocity_min = 25.0
	leaves.initial_velocity_max = 55.0
	leaves.angular_velocity_min = -120.0
	leaves.angular_velocity_max = 120.0
	leaves.angle_min = 0.0
	leaves.angle_max = 360.0
	leaves.scale_amount_min = 0.7
	leaves.scale_amount_max = 1.4
	leaves.color = Color(0.98, 0.78, 0.2, 0.95)


func _set_up_steam(dot: Texture2D) -> void:
	var fade := Gradient.new()
	fade.set_color(0, Color(1, 1, 1, 0.42))
	fade.set_color(1, Color(1, 1, 1, 0))
	steam.texture = dot
	steam.amount = 12
	steam.lifetime = 2.6
	steam.preprocess = 2.6
	steam.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	steam.emission_rect_extents = Vector2(46, 4)
	steam.direction = Vector2(0, -1)
	steam.spread = 18.0
	steam.gravity = Vector2(0, -14)
	steam.initial_velocity_min = 16.0
	steam.initial_velocity_max = 34.0
	steam.scale_amount_min = 0.25
	steam.scale_amount_max = 0.6
	steam.color_ramp = fade


# 손대지 않고 걸려 보며 화면을 찍는다: godot --path godot -- --demo
func _demo() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://shots"))
	await _shot("1-start", 0.8)
	target_x = 800.0
	await _shot("2-tower", 2.6)
	_press(far_picture.get_global_transform_with_canvas() * TOWER.get_center())
	held = false
	print("tower said: ", say.text)
	target_x = 1500.0
	await _shot("3-cart", 2.6)
	_next_time()
	await _shot("4-evening", 2.2)
	_next_time()
	target_x = 800.0
	await _shot("5-night-tower", 3.4)
	target_x = 250.0
	await _shot("6-night-lamp", 2.6)
	get_tree().quit()


func _shot(name_: String, wait: float) -> void:
	await get_tree().create_timer(wait).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://shots/%s.png" % name_)
