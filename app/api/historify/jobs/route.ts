import { NextRequest, NextResponse } from "next/server";
import { getJobs, createJob } from "@/lib/historify/scheduler";

export async function GET() {
    return NextResponse.json(getJobs());
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        createJob(body);
        return NextResponse.json({ success: true, jobs: getJobs() });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
