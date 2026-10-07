// 해의 자리와 뜨고 지는 시각. 그 자리(위도, 경도)와 날로 셈한다.
// 미국 해양대기청(NOAA)의 태양 계산식을 옮겼다. 뜨고 지는 시각은 1분 안팎으로 맞는다(tests/sun.test.mjs).
// 화면과 브라우저를 모른다. 보통 스크립트라 시험판(파일로 연 것)과 Node 시험이 함께 쓴다.
// 날은 2026년 1월 1일을 0으로 센 번호다. 시각은 세계시(UTC)의 분이다. 한국 시각은 540분을 더한다.

const SUN_RAD = Math.PI / 180;
const SUN_JD_2026 = 2461041.5;   // 2026.1.1 0시(UTC)의 율리우스일

// 그날 정오 무렵 해의 적위(도)와 균시차(분)
function sunOfDay(day) {
  const T = (SUN_JD_2026 + day + 0.5 - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * SUN_RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * SUN_RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * SUN_RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * SUN_RAD);
  const tilt = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * SUN_RAD);
  const decl = Math.asin(Math.sin(tilt * SUN_RAD) * Math.sin(lambda * SUN_RAD)) / SUN_RAD;
  const y = Math.tan(tilt / 2 * SUN_RAD) ** 2;
  const eot = 4 / SUN_RAD * (y * Math.sin(2 * L0 * SUN_RAD) - 2 * e * Math.sin(M * SUN_RAD)
    + 4 * e * y * Math.sin(M * SUN_RAD) * Math.cos(2 * L0 * SUN_RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * SUN_RAD) - 1.25 * e * e * Math.sin(2 * M * SUN_RAD));
  return { decl, eot };
}

// 뜨는 시각, 남중 시각, 지는 시각(UTC의 분). 해의 윗가장자리가 지평선에 닿는 때다(대기 굴절을 넣어 -0.833도).
function sunTimes(lat, lon, day) {
  const { decl, eot } = sunOfDay(day);
  const cosH = Math.cos(90.833 * SUN_RAD) / (Math.cos(lat * SUN_RAD) * Math.cos(decl * SUN_RAD)) - Math.tan(lat * SUN_RAD) * Math.tan(decl * SUN_RAD);
  const half = Math.acos(Math.max(-1, Math.min(1, cosH))) / SUN_RAD * 4;
  const noon = 720 - 4 * lon - eot;
  return { rise: noon - half, noon, set: noon + half };
}

// 그 시각 해의 높이(도, 지평선 위가 +)와 방위(도, 북 0 → 동 90 → 남 180 → 서 270)
function sunAt(lat, lon, day, utcMinutes) {
  const { decl, eot } = sunOfDay(day);
  let ha = (utcMinutes + eot + 4 * lon) / 4 - 180;   // 시간각(도). 남중이 0, 오후가 +
  ha = ((ha + 180) % 360 + 360) % 360 - 180;
  const cosZ = Math.sin(lat * SUN_RAD) * Math.sin(decl * SUN_RAD) + Math.cos(lat * SUN_RAD) * Math.cos(decl * SUN_RAD) * Math.cos(ha * SUN_RAD);
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZ)));
  const a = Math.acos(Math.max(-1, Math.min(1, (Math.sin(lat * SUN_RAD) * Math.cos(zen) - Math.sin(decl * SUN_RAD)) / (Math.cos(lat * SUN_RAD) * Math.sin(zen))))) / SUN_RAD;
  return { alt: 90 - zen / SUN_RAD, az: ha > 0 ? (a + 180) % 360 : (540 - a) % 360 };
}

// 분 → "17:28". zone: 세계시에 더할 분(한국 540)
function clockText(utcMinutes, zone = 540) {
  const m = ((Math.round(utcMinutes + zone) % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

if (typeof module !== "undefined") module.exports = { sunOfDay, sunTimes, sunAt, clockText };
