import { type NextRequest, NextResponse } from 'next/server';
import {
  getAllJobs,
  createJob,
  deleteJob,
  toggleJob,
  runJobNow,
  JOB_TEMPLATES,
} from '@/lib/historify/scheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    jobs: getAllJobs(),
    templates: JOB_TEMPLATES,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action ?? 'create';

    if (action === 'create') {
      const id = body.id ?? `job-${Date.now()}`;
      const job = createJob({ ...body, id });
      return NextResponse.json({ success: true, job, jobs: getAllJobs() });
    }

    if (action === 'delete') {
      const ok = deleteJob(body.id);
      return NextResponse.json({ success: ok, jobs: getAllJobs() });
    }

    if (action === 'toggle') {
      const job = toggleJob(body.id);
      return NextResponse.json({ success: !!job, job, jobs: getAllJobs() });
    }

    if (action === 'run') {
      const result = await runJobNow(body.id);
      return NextResponse.json({ success: true, result, jobs: getAllJobs() });
    }

    if (action === 'template') {
      const template = JOB_TEMPLATES.find((t) => t.name === body.templateName);
      if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      const id = `job-${Date.now()}`;
      const job = createJob({ ...template.config, id });
      return NextResponse.json({ success: true, job, jobs: getAllJobs() });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
