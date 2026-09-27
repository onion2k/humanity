// Serves each era's art as a file of its own at /art/<era>-<part>.svg. A file
// the page points to is fetched only when the browser comes to draw it, so a
// reader downloads an era's art as they near its chapter, not all of it on
// arrival as they would if it were written into the page or the stylesheet.
import type { APIRoute, GetStaticPaths } from "astro";
import { ART, ART_PARTS, artFile, artFileName } from "../../art.ts";
import { ERA_IDS } from "../../eras.ts";

export const getStaticPaths = (() =>
  ERA_IDS.flatMap((era) =>
    ART_PARTS.map((part) => ({
      params: { name: artFileName(era, part) },
      props: { file: artFile(ART[era][part]) },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute<{ file: string }> = ({ props }) =>
  new Response(props.file, { headers: { "Content-Type": "image/svg+xml" } });
