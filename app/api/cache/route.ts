import { NextResponse } from "next/server";
import { nseService } from "@/lib/nse-service";

export async function DELETE() {
  try {
    await nseService.clearCache();
    return NextResponse.json({ success: true, message: "Cache cleared successfully" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
