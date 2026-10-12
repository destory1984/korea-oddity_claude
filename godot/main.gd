extends Node2D
## 명동 거리 한 장면. 웹의 것(docs/water/)과 같은 세 겹의 그림 위를 유이가 좌우로 걷는다.
## 그림의 빈 데를 누르면 그리로 걷고, 누르고 있으면 계속 걷는다. 수레와 탑은 눌러서 말을 듣는다.
## 웹의 것에 없는 것: 늦게 뒤따르는 카메라, 지는 은행잎, 수레의 김, 저녁의 빛과 등불.

const WORLD := 2160.0      # 가운데 겹의 너비
const VIEW := 720.0        # 그림 틀의 너비이자 높이
const SPEED := 396.0       # 한 초에 걷는 거리. 웹의 것과 같다(틀 너비의 55%)
const DAY := Color(1, 1, 1)
const EVENING := Color(0.56, 0.54, 0.74)

# 누를 곳. 수레는 가운데 겹의 자리, 탑은 먼 겹 그림(1536 x 1024)의 자리다.
const CART := Rect2(1447, 274, 324, 360)
const TOWER := Rect2(430, 205, 170, 225)
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
var evening := false
var arriving := ""          # 걸어가서 만질 곳
var window_lights: Array[PointLight2D] = []


func _ready() -> void:
	var glow := _soft_dot(128)
	lamp.texture = glow
	lamp.texture_scale = 4.0
	for at: Vector2 in WINDOWS:
		var light := PointLight2D.new()
		light.texture = glow
		light.texture_scale = 3.6
		light.color = Color(1, 0.8, 0.52)
		light.energy = 0.0
		light.position = at
		$Mid.add_child(light)
		window_lights.append(light)
	_set_up_leaves()
	_set_up_steam(glow)
	dusk_button.pressed.connect(_toggle_evening)
	camera.position.x = _camera_goal()
	camera.reset_smoothing()
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


func _toggle_evening() -> void:
	evening = not evening
	dusk_button.text = "낮으로" if evening else "저녁으로"
	var tween := create_tween().set_parallel().set_trans(Tween.TRANS_SINE)
	tween.tween_property(daylight, "color", EVENING if evening else DAY, 1.6)
	tween.tween_property(lamp, "energy", 0.75 if evening else 0.0, 1.6)
	for light in window_lights:
		tween.tween_property(light, "energy", 0.5 if evening else 0.0, 1.6)
	_say("해가 진다. 가게마다 불이 켜졌어." if evening else "다시 낮이야.")


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
	_toggle_evening()
	await _shot("4-evening", 2.2)
	target_x = 500.0
	await _shot("5-evening-lamp", 3.2)
	get_tree().quit()


func _shot(name_: String, wait: float) -> void:
	await get_tree().create_timer(wait).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://shots/%s.png" % name_)
