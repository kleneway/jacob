import { NextResponse } from "next/server";

export async function GET() {
  // Basic static data; future implementation can dynamically analyze codebase
  const data = {
    colors: [
      "beige",
      "dark-beige",
      "dark-blue",
      "light-blue",
      "navy-blue",
      "github-blue",
      "github-green",
      "aurora",
      "blossom",
      "meadow",
      "sunset",
    ],
    typography: {
      fonts: ["Inter var", "Lexend", "Gooper", "Figtree", "Crimson Text"],
    },
    uiElements: [
      "Button",
      "FormField",
      "DataTable",
      "DropdownMenu",
      "Table",
      "AnimatedShinyText",
      "BorderBeam",
      "DotPattern",
      "FlickeringGrid",
      "Meteors",
    ],
  };

  return NextResponse.json(data);
}
