import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { defaultSettings, type Data } from "./types";
export async function getData(): Promise<Data> {
  const data: Data = {
    products: [],
    creations: [],
    options: [],
    settings: defaultSettings,
    logoVideo: existsSync(
      join(
        process.cwd(),
        "public/media/Animate_logo_with_camera_movement_20261009010416.mp4",
      ),
    ),
    staticLogo: existsSync(join(process.cwd(), "public/media/logo.png")),
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const results = await Promise.all([
      db.from("products").select("*").eq("active", true).order("name"),
      db.from("creations").select("*").eq("active", true).order("sort_order"),
      db.from("options").select("*").eq("active", true).order("label"),
      db.from("settings").select("*").eq("id", "main").maybeSingle(),
    ]);
    for (const r of results)
      if (r.error)
        throw new Error("Não foi possível carregar os dados da confeitaria.");
    data.products = results[0].data ?? [];
    data.creations = results[1].data ?? [];
    data.options = results[2].data ?? [];
    data.settings = results[3].data ?? defaultSettings;
  }
  const names = [
    "Six_cupcakes_in_a_row_20261008230455",
    "Filming_cake_in_studio_20261008230229",
    "Camera_orbiting_cake_20261008225218",
    "Cake_reveal_commercial_shot_20261008230939",
    "criacao-mi-20261009-182650",
    "criacao-mi-20261009-182429",
    "criacao-mi-20261009-182321",
    "criacao-mi-20261009-181952",
    "Cake_pull-back_reveal_shot_720p_20261009014130",
    "criacao-mi-20261009-181831",

  ];
  for (const [i, name] of names.entries())
    if (
      (existsSync(join(process.cwd(), `public/media/${name}.mp4`)) || existsSync(join(process.cwd(), `public/media/${name}.jpg`))) &&
      !data.creations.some((c) => c.id === name || c.video_url === `/media/${name}.mp4` || c.image_url === `/media/${name}.jpg`)
    )
      data.creations.push({
        id: name,
        title: `Criação Bolos da Mi ${i + 1}`,
        description: "Uma criação do nosso portfólio.",
        video_url: existsSync(join(process.cwd(), `public/media/${name}.mp4`)) ? `/media/${name}.mp4` : null,
        image_url: existsSync(join(process.cwd(), `public/media/${name}.jpg`))
          ? `/media/${name}.jpg`
          : null,
        active: true,
        sort_order: i,
      });
  return data;
}
