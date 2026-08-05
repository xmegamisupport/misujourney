/**
 * Fabibee Avatar Collection — the single source of truth for the selectable
 * avatars. `profiles.avatar` stores an avatar ID (e.g. "cool"); anything not in
 * this registry (legacy emoji like "🙂"/"🌿", system travelers) is rendered
 * as-is by <Avatar>. Adding an avatar = drop the webp in public/assets/avatars
 * and append an entry here.
 */
export interface AvatarDef {
  id: string;
  name: string;
  nameZh: string;
  file: string;
}

// Display order for the picker (Smile is the default/first).
export const AVATAR_LIST: AvatarDef[] = [
  { id: "smile", name: "Smile", nameZh: "微笑", file: "/assets/avatars/14-smile.webp" },
  { id: "cool", name: "Cool", nameZh: "墨镜", file: "/assets/avatars/05-cool.webp" },
  { id: "star", name: "Star Eyes", nameZh: "星星眼", file: "/assets/avatars/13-star.webp" },
  { id: "music", name: "Music", nameZh: "音乐", file: "/assets/avatars/10-music.webp" },
  { id: "sporty", name: "Sporty", nameZh: "运动", file: "/assets/avatars/08-sporty.webp" },
  { id: "hydrate", name: "Hydrate", nameZh: "喝水", file: "/assets/avatars/03-hydrate.webp" },
  { id: "foodie", name: "Foodie", nameZh: "吃货", file: "/assets/avatars/06-foodie.webp" },
  { id: "boba", name: "Boba", nameZh: "奶茶", file: "/assets/avatars/11-boba.webp" },
  { id: "icecream", name: "Ice Cream", nameZh: "冰淇淋", file: "/assets/avatars/12-icecream.webp" },
  { id: "explorer", name: "Explorer", nameZh: "探索", file: "/assets/avatars/07-explorer.webp" },
  { id: "singer", name: "Singer", nameZh: "唱歌", file: "/assets/avatars/04-singer.webp" },
  { id: "graduate", name: "Graduate", nameZh: "毕业", file: "/assets/avatars/02-graduate.webp" },
  { id: "hero", name: "Hero", nameZh: "小英雄", file: "/assets/avatars/01-hero.webp" },
  { id: "sleepy", name: "Sleepy", nameZh: "睡觉", file: "/assets/avatars/09-sleepy.webp" },
];

export const AVATARS: Record<string, AvatarDef> = Object.fromEntries(AVATAR_LIST.map((a) => [a.id, a]));

/** The branded default assigned to new customers. */
export const DEFAULT_AVATAR_ID = "smile";

export function getAvatarDef(value: string | null | undefined): AvatarDef | undefined {
  return value ? AVATARS[value] : undefined;
}
