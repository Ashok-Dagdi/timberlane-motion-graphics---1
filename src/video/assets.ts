/* Stock plates (Pexels CDN) sized for a 1080x1920 canvas. */

const pex = (id: number, file: string, w = 1080, h = 1920) =>
  `https://images.pexels.com/photos/${id}/${file}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

export const IMG = {
  livingHero: pex(31949939, "pexels-photo-31949939"),
  loungeCurve: pex(38874193, "pexels-photo-38874193"),
  kitchen: pex(38310800, "pexels-photo-38310800"),
  bedroom: pex(37468270, "pexels-photo-37468270"),
  wardrobe: pex(38697208, "pexels-photo-38697208"),
  luxeLiving: pex(34538315, "pexels-photo-34538315"),
  contemporary: pex(7722158, "pexels-photo-7722158"),
  leatherSofa: pex(5942741, "pexels-photo-5942741"),
  armchair: pex(13490219, "pexels-photo-13490219"),
  rustic: pex(30767894, "pexels-photo-30767894"),
  kitchen2: pex(6436783, "pexels-photo-6436783"),
  diningLight: pex(10117728, "pexels-photo-10117728"),
} as const;

export const VID = {
  sunlitFloor: "https://videos.pexels.com/video-files/34835401/14765990_1080_1920_30fps.mp4",
  minimalLiving: "https://videos.pexels.com/video-files/36030666/15279536_2160_3840_24fps.mp4",
} as const;

export const ALL_IMAGES = Object.values(IMG);

export const BRAND = {
  name: "TIMBERLANE",
  sub: "INTERIORS",
  url: "timberlane.co.in",
  phone: "+91 88846 51111",
  city: "BENGALURU",
  tagline: "Precision In Every Detail",
} as const;
