import { type NextRequest, NextResponse } from 'next/server';
import { createJob, deleteJob, getAllJobs, JOB_TEMPLATES, runJobNow, toggleJob } from '@/lib/historify/scheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    jobs: await getAllJobs(),
    templates: JOB_TEMPLATES,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action ?? 'create';

    if (action === 'create') {
      const id = body.id ?? `job-${Date.now()}`;
      const job = await createJob({ ...body, id });
      return NextResponse.json({ success: true, job, jobs: await getAllJobs() });
    }

    if (action === 'delete') {
      const ok = await deleteJob(body.id);
      return NextResponse.json({ success: ok, jobs: await getAllJobs() });
    }

    if (action === 'toggle') {
      const job = await toggleJob(body.id);
      return NextResponse.json({ success: !!job, job, jobs: await getAllJobs() });
    }

    if (action === 'run') {
      const result = await runJobNow(body.id);
      return NextResponse.json({ success: true, result, jobs: await getAllJobs() });
    }

    if (action === 'template') {
      const template = JOB_TEMPLATES.find((t) => t.name === body.templateName);
      if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      const id = `job-${Date.now()}`;
      const job = await createJob({ ...template.config, id });
      return NextResponse.json({ success: true, job, jobs: await getAllJobs() });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
