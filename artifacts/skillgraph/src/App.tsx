import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  FileText,
  Layers3,
  LayoutDashboard,
  Menu,
  Network,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Zap,
} from 'lucide-react';
import {
  useAnalyzeJobDescription,
  useAnalyzeSkillGraph,
  type JobAnalysis,
  type SkillGraphAnalysis,
  type SkillLevel,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const STORAGE = {
  career: 'skillgraph-career',
  skills: 'skillgraph-skills',
  analysis: 'skillgraph-analysis',
  progress: 'skillgraph-roadmap-progress',
  projects: 'skillgraph-projects',
  job: 'skillgraph-job-analysis',
  description: 'skillgraph-job-description',
  dashboard: 'skillgraph-dashboard',
};

const careers = ['Frontend Engineer', 'Data Analyst', 'Product Designer', 'Product Manager', 'Cloud Engineer'];
const baseSkills: SkillLevel[] = [
  { name: 'Problem solving', level: 'Working', score: 62, status: 'Developing' },
  { name: 'JavaScript', level: 'Working', score: 58, status: 'Developing' },
  { name: 'Communication', level: 'Strong', score: 76, status: 'Strong' },
  { name: 'System design', level: 'New', score: 33, status: 'Priority gap' },
  { name: 'Testing & quality', level: 'New', score: 28, status: 'Priority gap' },
  { name: 'Data literacy', level: 'Working', score: 49, status: 'Developing' },
];

const fallbackAnalysis: SkillGraphAnalysis = {
  readiness: 61,
  strongSkills: ['Communication', 'Problem solving'],
  developingSkills: ['JavaScript', 'Data literacy'],
  priorityGaps: ['System design', 'Testing & quality'],
  whyGapsMatter: 'The next level of this role is less about knowing one more tool and more about making reliable decisions across a system. Building and explaining your work will close the distance fastest.',
  recommendedFocus: 'Build one small product end-to-end, then make its trade-offs visible.',
  nextActions: ['Choose a focused build brief', 'Add tests before adding features', 'Write a short architecture note'],
  roadmap: [
    { week: 1, topic: 'Systems thinking', why: 'Move from feature thinking to understanding how the parts interact.', skills: ['System design', 'Problem solving'], activity: 'Sketch the architecture for a small web product and explain two trade-offs.', effort: '3–4 hrs' },
    { week: 2, topic: 'Quality loops', why: 'Reliable work compounds trust in a hiring loop.', skills: ['Testing & quality', 'JavaScript'], activity: 'Add unit and integration tests to your current project.', effort: '4–5 hrs' },
    { week: 3, topic: 'Ship the proof', why: 'A finished, legible project is stronger evidence than another tutorial.', skills: ['Communication', 'JavaScript'], activity: 'Deploy a polished project and publish a concise case study.', effort: '5–6 hrs' },
    { week: 4, topic: 'Tell the story', why: 'Turn your new capability into language a hiring team can recognize.', skills: ['Communication', 'Data literacy'], activity: 'Run a mock review and refine your portfolio narrative.', effort: '2–3 hrs' },
  ],
  projects: [
    { title: 'Signal Board', difficulty: 'Intermediate', description: 'A decision dashboard that turns noisy product events into a clear weekly brief.', skills: ['JavaScript', 'Data literacy', 'Testing & quality'], why: 'Shows that you can shape data into decisions, not just render a UI.', stack: ['TypeScript', 'React', 'SQLite'], outcome: 'A live product brief with tested data states' },
    { title: 'Architecture Notes', difficulty: 'Focused', description: 'A small collaborative notes app where every important choice is documented beside the code.', skills: ['System design', 'Communication'], why: 'Makes invisible engineering judgment visible to a reviewer.', stack: ['React', 'Node', 'Postgres'], outcome: 'A case study with diagrams and trade-offs' },
    { title: 'Quality Lab', difficulty: 'Practical', description: 'A deliberately tiny app built around failure states, test coverage, and thoughtful recovery.', skills: ['Testing & quality', 'Problem solving'], why: 'Demonstrates mature habits through a compact, inspectable build.', stack: ['Vitest', 'Playwright', 'React'], outcome: 'A testable product with a quality narrative' },
  ],
};

const fallbackJob: JobAnalysis = {
  role: 'Frontend Engineer',
  requiredSkills: ['React', 'JavaScript', 'Testing', 'Accessibility', 'Communication'],
  preferredSkills: ['TypeScript', 'Design systems', 'Performance'],
  technologies: ['React', 'TypeScript', 'Git', 'REST APIs'],
  experienceExpectations: 'The role expects someone who can own a feature from a rough brief through a reliable, accessible release.',
  keywords: ['ownership', 'component architecture', 'testing', 'user experience', 'collaboration'],
  covered: ['JavaScript', 'Communication', 'React'],
  partiallyCovered: ['TypeScript', 'Testing'],
  missing: ['Accessibility', 'Performance'],
  recommendedActions: ['Add an accessibility pass to your next project', 'Show a tested feature in your portfolio', 'Use ownership language in your resume bullets'],
};

type Profile = {
  career: string;
  skills: SkillLevel[];
  analysis: SkillGraphAnalysis | null;
  progress: number[];
  projects: string[];
  job: JobAnalysis | null;
  description: string;
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function fallbackFor(career: string) {
  return { ...fallbackAnalysis, recommendedFocus: `Build evidence for ${career} by completing one small product end-to-end, then make the trade-offs visible.` };
}

function statusFor(score: number) {
  return score >= 70 ? 'Strong' : score >= 45 ? 'Developing' : 'Priority gap';
}

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [career, setCareer] = useState(() => readStorage(STORAGE.career, careers[0]));
  const [skills, setSkills] = useState<SkillLevel[]>(() => readStorage(STORAGE.skills, baseSkills));
  const [analysis, setAnalysis] = useState<SkillGraphAnalysis | null>(() => readStorage(STORAGE.analysis, null));
  const [progress, setProgress] = useState<number[]>(() => readStorage(STORAGE.progress, []));
  const [projects, setProjects] = useState<string[]>(() => readStorage(STORAGE.projects, []));
  const [job, setJob] = useState<JobAnalysis | null>(() => readStorage(STORAGE.job, null));
  const [description, setDescription] = useState(() => readStorage(STORAGE.description, ''));
  const [toast, setToast] = useState('');
  const skillMutation = useAnalyzeSkillGraph();
  const jobMutation = useAnalyzeJobDescription();

  useEffect(() => { localStorage.setItem(STORAGE.career, JSON.stringify(career)); }, [career]);
  useEffect(() => { localStorage.setItem(STORAGE.skills, JSON.stringify(skills)); }, [skills]);
  useEffect(() => { localStorage.setItem(STORAGE.analysis, JSON.stringify(analysis)); }, [analysis]);
  useEffect(() => { localStorage.setItem(STORAGE.progress, JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem(STORAGE.projects, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(STORAGE.job, JSON.stringify(job)); }, [job]);
  useEffect(() => { localStorage.setItem(STORAGE.description, JSON.stringify(description)); }, [description]);
  useEffect(() => { localStorage.setItem(STORAGE.dashboard, JSON.stringify({ lastRoute: location })); }, [location]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadDemo = () => {
    const demo = fallbackFor('Frontend Engineer');
    setCareer('Frontend Engineer');
    setSkills(baseSkills);
    setAnalysis(demo);
    setProgress([0]);
    setProjects([demo.projects[0].title]);
    setJob(fallbackJob);
    setDescription('We are looking for a frontend engineer to build accessible React interfaces, collaborate with product and design, and ship reliable features with strong testing habits.');
    setToast('Demo profile loaded');
    setLocation('/dashboard');
  };
  const reset = () => {
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    setCareer(careers[0]); setSkills(baseSkills); setAnalysis(null); setProgress([]); setProjects([]); setJob(null); setDescription('');
    setToast('Profile reset');
    setLocation('/');
  };
  const runAnalysis = () => {
    skillMutation.mutate(
      { data: { career, skills } },
      {
        onSuccess: (result) => { setAnalysis(result); setProgress([]); setToast('Your skill graph is ready'); setLocation('/analysis'); },
        onError: () => { setAnalysis(fallbackFor(career)); setProgress([]); setToast('Demo analysis loaded while AI is unavailable'); setLocation('/analysis'); },
      },
    );
  };
  const analyzeJob = () => {
    jobMutation.mutate(
      { data: { career, skills, jobDescription: description } },
      { onSuccess: (result) => { setJob(result); setToast('Job description mapped'); }, onError: () => { setJob(fallbackJob); setToast('Demo comparison loaded while AI is unavailable'); } },
    );
  };

  return (
    <Shell career={career} onLoadDemo={loadDemo} onReset={reset}>
      <Switch>
        <Route path="/" component={() => <Home onLoadDemo={loadDemo} />} />
        <Route path="/assessment" component={() => <Assessment career={career} setCareer={setCareer} skills={skills} setSkills={setSkills} onAnalyze={runAnalysis} pending={skillMutation.isPending} />} />
        <Route path="/analysis" component={() => <AnalysisPage analysis={analysis} career={career} onLoadDemo={loadDemo} />} />
        <Route path="/skillgraph" component={() => <SkillGraph analysis={analysis} skills={skills} career={career} onLoadDemo={loadDemo} />} />
        <Route path="/roadmap" component={() => <Roadmap analysis={analysis} progress={progress} setProgress={setProgress} onLoadDemo={loadDemo} />} />
        <Route path="/projects" component={() => <Projects analysis={analysis} projects={projects} setProjects={setProjects} onLoadDemo={loadDemo} />} />
        <Route path="/job-analyzer" component={() => <JobAnalyzer career={career} skills={skills} job={job} description={description} setDescription={setDescription} onAnalyze={analyzeJob} pending={jobMutation.isPending} onLoadDemo={loadDemo} />} />
        <Route path="/dashboard" component={() => <Dashboard analysis={analysis} career={career} progress={progress} projects={projects} onLoadDemo={loadDemo} />} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
      {toast && <div className="toast-note" data-testid="status-toast">{toast}</div>}
    </Shell>
  );
}

function Shell({ children, career, onLoadDemo, onReset }: { children: ReactNode; career: string; onLoadDemo: () => void; onReset: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: '/dashboard', label: 'Command center', icon: LayoutDashboard },
    { href: '/assessment', label: 'Assessment', icon: Target },
    { href: '/analysis', label: 'Profile analysis', icon: Sparkles },
    { href: '/skillgraph', label: 'Skill graph', icon: Network },
    { href: '/roadmap', label: 'Roadmap', icon: Compass },
    { href: '/projects', label: 'Projects', icon: Layers3 },
    { href: '/job-analyzer', label: 'Job analyzer', icon: BriefcaseBusiness },
  ];
  const links = (mobile = false) => (
    <nav className="nav-group">
      <div className="nav-heading">Navigate</div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`nav-link ${location === href ? 'active' : ''}`} onClick={() => mobile && setMobileOpen(false)}>
          <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
        </Link>
      ))}
      <div className="nav-heading">Workspace</div>
      <Link href="/about" data-testid="link-about" className={`nav-link ${location === '/about' ? 'active' : ''}`} onClick={() => mobile && setMobileOpen(false)}><UserRound size={16} strokeWidth={1.8} /><span>About SkillGraph</span></Link>
    </nav>
  );
  return (
    <div className="app-bg">
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark"><Network size={17} /></span><span><span className="brand-name">SkillGraph</span><span className="brand-sub">Career intelligence</span></span></Link>
          {links()}
          <div className="sidebar-bottom">
            <button className="nav-link" onClick={onLoadDemo} data-testid="button-load-demo"><Zap size={16} /><span>Load demo profile</span></button>
            <button className="nav-link" onClick={onReset} data-testid="button-reset-profile"><RotateCcw size={16} /><span>Start over</span></button>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="mobile-menu">
              <button className="btn btn-quiet" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu" aria-label="Open navigation"><Menu size={20} /></button>
              <Link href="/" className="brand" data-testid="link-mobile-brand"><span className="brand-mark"><Network size={15} /></span><span className="brand-name">SkillGraph</span></Link>
            </div>
            <div className="topbar-meta"><span className="status-dot">Personal workspace</span><span className="tag info">{career}</span></div>
          </header>
          {mobileOpen && <div className="surface card-pad" style={{ margin: '12px 17px 0' }}>{links(true)}<div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 13, paddingTop: 10 }}><button className="nav-link" onClick={onLoadDemo} data-testid="button-mobile-demo"><Zap size={16} /><span>Load demo profile</span></button><button className="nav-link" onClick={onReset} data-testid="button-mobile-reset"><RotateCcw size={16} /><span>Start over</span></button></div></div>}
          {children}
        </main>
      </div>
    </div>
  );
}

function Home({ onLoadDemo }: { onLoadDemo: () => void }) {
  return <div className="page fade-in">
    <section className="hero">
      <div>
        <div className="eyebrow">Career clarity, with a next move</div>
        <h1 className="hero-title">Turn your <span className="text-gradient">potential</span> into a plan.</h1>
        <p className="hero-copy">SkillGraph maps what you know to where you want to go. See your real gaps, understand why they matter, and build the evidence that gets you there.</p>
        <div className="hero-actions"><Link href="/assessment" className="btn btn-primary" data-testid="button-start-assessment">Start your assessment <ArrowRight size={15} /></Link><button className="btn btn-secondary" onClick={onLoadDemo} data-testid="button-home-demo">Explore the demo <Play size={14} /></button></div>
        <div className="hero-note"><CheckCircle2 size={14} /> Built for students and career switchers who want a clear next move.</div>
      </div>
      <div className="hero-visual">
        <div className="command-preview">
          <div className="preview-bar"><span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" /><span className="preview-url">skillgraph / command-center</span></div>
          <div className="preview-body"><div className="preview-kicker">Your readiness snapshot</div><div className="preview-title">Frontend Engineer</div><div className="preview-grid"><div className="preview-card tall"><div className="preview-card-label">Readiness</div><div className="readiness"><div className="readiness-ring">61%</div><div><strong style={{ display: 'block', fontSize: '.78rem' }}>On your way</strong><span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.62rem' }}>2 priority gaps</span></div></div><div className="mini-lines"><span className="mini-line accent" /><span className="mini-line" /><span className="mini-line cyan" /><span className="mini-line" /></div></div><div className="preview-card"><div className="preview-card-label">Next focus</div><strong style={{ display: 'block', fontSize: '.73rem', marginTop: 11 }}>Systems thinking</strong><span style={{ color: 'hsl(var(--muted-foreground))', display: 'block', fontSize: '.61rem', lineHeight: 1.5, marginTop: 6 }}>Build proof, not just knowledge.</span></div><div className="preview-card"><div className="preview-card-label">Roadmap</div><strong style={{ display: 'block', fontSize: '.73rem', marginTop: 11 }}>Week 01 <span style={{ color: 'hsl(var(--accent))' }}>active</span></strong></div></div></div>
        </div>
        <div className="float-tag"><span>01</span>Priority gaps, explained</div><div className="float-tag bottom"><span>→</span>One next action</div>
      </div>
    </section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">One connected system</div><h2 className="section-title">From uncertainty to evidence.</h2></div><p className="section-copy">Every part of SkillGraph feeds the next, so your assessment becomes a living plan instead of another score.</p></div><div className="feature-grid"><div className="surface feature-card"><span className="feature-icon"><Network size={18} /></span><span className="feature-number">01 / MAP</span><h3>See the shape of your skills.</h3><p>Translate self-knowledge into a visual graph of strengths, developing skills, and the gaps that deserve your attention.</p></div><div className="surface feature-card"><span className="feature-icon"><TrendingUp size={18} /></span><span className="feature-number">02 / FOCUS</span><h3>Know why a gap matters.</h3><p>No vague advice. Get context and an order of operations for the skills closest to your target role.</p></div><div className="surface feature-card"><span className="feature-icon"><BookOpen size={18} /></span><span className="feature-number">03 / BUILD</span><h3>Make proof as you learn.</h3><p>Turn each priority into a project with a clear outcome, stack, and story you can take into an interview.</p></div></div></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">The flow</div><h2 className="section-title">A better way to start.</h2></div></div><div className="steps"><div className="step"><span className="step-number">01</span><h3>Choose a direction</h3><p>Start with the role you are curious about, not a perfect five-year plan.</p></div><div className="step"><span className="step-number">02</span><h3>Get an honest read</h3><p>Rate what you know and let the graph show where your effort has the most leverage.</p></div><div className="step"><span className="step-number">03</span><h3>Take the next move</h3><p>Follow a focused roadmap, ship the proof, and compare yourself to real job descriptions.</p></div></div></section>
    <footer className="footer"><span>SkillGraph · Career intelligence for the next chapter</span><Link href="/about" data-testid="link-home-about">About the creator <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></footer>
  </div>;
}

function Assessment({ career, setCareer, skills, setSkills, onAnalyze, pending }: { career: string; setCareer: (v: string) => void; skills: SkillLevel[]; setSkills: (v: SkillLevel[]) => void; onAnalyze: () => void; pending: boolean }) {
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">01 / Assessment</div><h1 className="page-title">Start with where you are.</h1><p className="page-copy">Choose a direction, then give each skill an honest signal. This is a private baseline, not a test you can fail.</p></div><span className="tag info">2 minutes</span></div><div className="two-col"><div className="surface card-pad"><div className="card-heading"><div><h2>Target career</h2><p>We will tune your graph and roadmap to this direction.</p></div><Target size={19} color="hsl(var(--primary))" /></div><div className="field"><label className="field-label" htmlFor="career-select">I am exploring</label><select id="career-select" className="select" value={career} onChange={(e) => setCareer(e.target.value)} data-testid="select-career">{careers.map((item) => <option key={item}>{item}</option>)}</select></div><div className="notice"><CircleHelp size={15} /> Choose the role that feels most useful right now. You can change it later without losing your progress.</div></div><div className="surface card-pad"><div className="card-heading"><div><h2>How familiar are you?</h2><p>Move the signal. Your first instinct is enough.</p></div><SlidersIcon /></div><div>{skills.map((skill, index) => <div className="field" key={skill.name}><div style={{ display: 'flex', justifyContent: 'space-between' }}><label className="field-label" htmlFor={`skill-${index}`}>{skill.name}</label><span className="mono" style={{ color: 'hsl(var(--primary))', fontSize: '.67rem' }}>{skill.score}%</span></div><input id={`skill-${index}`} className="range" type="range" min="0" max="100" value={skill.score} onChange={(e) => { const next = [...skills]; const score = Number(e.target.value); next[index] = { ...skill, score, status: statusFor(score), level: score < 40 ? 'New' : score < 70 ? 'Working' : 'Strong' }; setSkills(next); }} data-testid={`input-skill-${index}`} /></div>)}</div><button className="btn btn-primary" style={{ width: '100%', marginTop: 5 }} onClick={onAnalyze} disabled={pending} data-testid="button-generate-analysis">{pending ? 'Reading your profile…' : 'Generate my skill graph'} <ArrowRight size={15} /></button></div></div></div>;
}

function SlidersIcon() { return <BarChart3 size={19} color="hsl(var(--primary))" />; }

function AnalysisPage({ analysis, career, onLoadDemo }: { analysis: SkillGraphAnalysis | null; career: string; onLoadDemo: () => void }) {
  if (!analysis) return <div className="page fade-in"><Empty title="Your graph is waiting." copy="Complete the assessment to turn your current skills into a focused profile analysis." action="Go to assessment" href="/assessment" onLoadDemo={onLoadDemo} /></div>;
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">02 / Profile analysis</div><h1 className="page-title">Here is your signal.</h1><p className="page-copy">A grounded read on your current position for <strong style={{ color: 'hsl(var(--foreground))' }}>{career}</strong>, with the context to decide what matters next.</p></div><Link href="/skillgraph" className="btn btn-secondary" data-testid="button-view-skillgraph">Open skill graph <Network size={15} /></Link></div><div className="surface card-pad" style={{ marginBottom: 18 }}><div className="analysis-hero"><div className="readiness-large"><span className="readiness-number">{analysis.readiness}%</span><span className="readiness-label">readiness</span></div><div><div className="eyebrow">Your current read</div><h2 style={{ fontSize: '1.45rem', letterSpacing: '-.05em', margin: '9px 0' }}>{analysis.recommendedFocus}</h2><p className="page-copy">{analysis.whyGapsMatter}</p></div></div></div><div className="three-col" style={{ marginBottom: 18 }}><SkillList title="Strong signals" items={analysis.strongSkills} tone="good" icon={<Check size={14} />} /><SkillList title="Developing" items={analysis.developingSkills} tone="info" icon={<TrendingUp size={14} />} /><SkillList title="Priority gaps" items={analysis.priorityGaps} tone="warn" icon={<AlertCircle size={14} />} /></div><div className="two-col"><div className="surface card-pad"><div className="card-heading"><div><h2>Your next three moves</h2><p>Small actions that create visible momentum.</p></div><ArrowRight size={17} color="hsl(var(--accent))" /></div><div className="list">{analysis.nextActions.map((action, index) => <div className="list-item" key={action}><span className="mono" style={{ color: 'hsl(var(--primary))', fontSize: '.68rem' }}>0{index + 1}</span><span data-testid={`text-next-action-${index}`}>{action}</span></div>)}</div></div><div className="surface card-pad"><div className="card-heading"><div><h2>Build toward it</h2><p>Your roadmap starts with a proof point.</p></div><BookOpen size={17} color="hsl(var(--primary))" /></div><p className="page-copy" style={{ fontSize: '.78rem' }}>The projects below are selected to turn your priority gaps into evidence a hiring team can inspect.</p><Link href="/roadmap" className="btn btn-primary" style={{ marginTop: 16 }} data-testid="button-analysis-roadmap">View my roadmap <ArrowRight size={15} /></Link></div></div></div>;
}

function SkillList({ title, items, tone, icon }: { title: string; items: string[]; tone: string; icon: ReactNode }) { return <div className="surface card-pad"><div className="card-heading"><h2>{title}</h2><span className={`tag ${tone}`}>{items.length} skills</span></div><div className="list">{items.map((item) => <div className="list-item" key={item}>{icon}<span>{item}</span></div>)}</div></div>; }

function SkillGraph({ analysis, skills, career, onLoadDemo }: { analysis: SkillGraphAnalysis | null; skills: SkillLevel[]; career: string; onLoadDemo: () => void }) {
  const [selected, setSelected] = useState(skills[0]?.name || '');
  if (!analysis) return <div className="page fade-in"><Empty title="Build your map first." copy="Your graph will show how your current skills connect to the target role." action="Start assessment" href="/assessment" onLoadDemo={onLoadDemo} /></div>;
  const graphSkills = skills.slice(0, 5);
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">03 / Skill graph</div><h1 className="page-title">See the distance.</h1><p className="page-copy">An interactive map of your current signals around <strong style={{ color: 'hsl(var(--foreground))' }}>{career}</strong>. Select a node to inspect its role in your path.</p></div><span className="tag info"><Network size={12} style={{ marginRight: 5 }} /> live map</span></div><div className="surface graph-wrap"><div className="graph-canvas"><div className="graph-lines"><span className="graph-line" /><span className="graph-line two" /><span className="graph-line three" /><span className="graph-line four" /></div><div className="graph-node center"><Network className="node-icon" size={21} /><span className="node-name">{career}</span><span className="node-score">{analysis.readiness}% ready</span></div><div className="graph-node top selected"><Target className="node-icon" size={18} /><span className="node-name">{analysis.priorityGaps[0] || 'Priority gap'}</span><span className="node-score">focus now</span></div>{graphSkills.map((skill, index) => { const positions = ['left-top', 'right-top', 'left-bottom', 'right-bottom']; return <button key={skill.name} className={`graph-node ${positions[index] || 'left-top'} ${selected === skill.name ? 'selected' : ''}`} onClick={() => setSelected(skill.name)} data-testid={`button-graph-node-${index}`}><BarChart3 className="node-icon" size={17} /><span className="node-name">{skill.name}</span><span className="node-score">{skill.score}% · {skill.status}</span></button>; })}</div></div><div className="surface card-pad" style={{ marginTop: 16 }}><div className="card-heading"><div><h2>{selected || 'Select a skill'}</h2><p>Why this signal belongs in your graph</p></div><span className="tag info">inspect</span></div><p className="page-copy" data-testid="text-selected-skill">A {skills.find((skill) => skill.name === selected)?.status.toLowerCase() || 'developing'} signal here affects how confidently you can take on the next layer of work. Use your roadmap to turn it into visible practice.</p></div></div>;
}

function Roadmap({ analysis, progress, setProgress, onLoadDemo }: { analysis: SkillGraphAnalysis | null; progress: number[]; setProgress: (v: number[]) => void; onLoadDemo: () => void }) {
  if (!analysis) return <div className="page fade-in"><Empty title="No roadmap yet." copy="Take the assessment and your first four weeks will be shaped around the gaps that matter." action="Start assessment" href="/assessment" onLoadDemo={onLoadDemo} /></div>;
  const completed = progress.length;
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">04 / Roadmap</div><h1 className="page-title">A plan with momentum.</h1><p className="page-copy">Four focused weeks. Each one turns a gap into a practice loop and a stronger story.</p></div><div style={{ minWidth: 170 }}><div className="label" style={{ marginBottom: 8 }}>Progress · {completed}/{analysis.roadmap.length}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${(completed / analysis.roadmap.length) * 100}%` }} /></div></div></div><div className="surface card-pad"><div className="card-heading"><div><h2>Your four-week sequence</h2><p>Completion is saved locally to this workspace.</p></div><span className="tag info">{completed === analysis.roadmap.length ? 'complete' : 'in motion'}</span></div>{analysis.roadmap.map((item, index) => <div className="roadmap-item" key={`${item.week}-${item.topic}`}><div className="week">W{String(item.week).padStart(2, '0')}</div><div><div className="roadmap-title">{item.topic}</div><div className="roadmap-why">{item.why}</div><div className="roadmap-meta">{item.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}<span className="tag info"><Clock3 size={11} style={{ marginRight: 4 }} /> {item.effort}</span></div><div style={{ color: 'hsl(var(--foreground))', fontSize: '.72rem', lineHeight: 1.5, marginTop: 12 }}><strong>Practice:</strong> {item.activity}</div></div><button className={`check-button ${progress.includes(index) ? 'done' : ''}`} onClick={() => setProgress(progress.includes(index) ? progress.filter((item) => item !== index) : [...progress, index])} data-testid={`button-complete-week-${item.week}`} aria-label={`Mark week ${item.week} complete`}>{progress.includes(index) ? <Check size={15} /> : <span style={{ height: 7, width: 7, border: '1px solid currentColor', borderRadius: 2 }} />}</button></div>)}</div></div>;
}

function Projects({ analysis, projects, setProjects, onLoadDemo }: { analysis: SkillGraphAnalysis | null; projects: string[]; setProjects: (v: string[]) => void; onLoadDemo: () => void }) {
  if (!analysis) return <div className="page fade-in"><Empty title="Projects come next." copy="Your project recommendations are tailored after the assessment, so they prove the skills you actually need." action="Start assessment" href="/assessment" onLoadDemo={onLoadDemo} /></div>;
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">05 / Projects</div><h1 className="page-title">Proof over promises.</h1><p className="page-copy">Small enough to ship. Specific enough to signal. Add a project to your roadmap when it earns a place in your next sprint.</p></div><span className="tag info">{projects.length} saved</span></div><div className="three-col">{analysis.projects.map((project) => { const added = projects.includes(project.title); return <div className="surface project-card" key={project.title}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="tag">{project.difficulty}</span><span className="mono" style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.59rem' }}>PROJECT</span></div><h3>{project.title}</h3><p>{project.description}</p><p style={{ color: 'hsl(var(--foreground))', marginTop: 4 }}><strong>Why it matters:</strong> {project.why}</p><div className="pill-list">{project.stack.map((tech) => <span className="tag info" key={tech}>{tech}</span>)}</div><div className="project-footer"><span className="project-outcome">{project.outcome}</span><button className={`btn ${added ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setProjects(added ? projects.filter((item) => item !== project.title) : [...projects, project.title])} data-testid={`button-project-${project.title.toLowerCase().replaceAll(' ', '-')}`}>{added ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add to roadmap</>}</button></div></div>; })}</div></div>;
}

function JobAnalyzer({ career, skills, job, description, setDescription, onAnalyze, pending, onLoadDemo }: { career: string; skills: SkillLevel[]; job: JobAnalysis | null; description: string; setDescription: (v: string) => void; onAnalyze: () => void; pending: boolean; onLoadDemo: () => void }) {
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">06 / Job analyzer</div><h1 className="page-title">Read the room before you apply.</h1><p className="page-copy">Paste a job description and see the language you already cover, where you are close, and what to strengthen before the interview.</p></div><span className="tag info"><Search size={12} style={{ marginRight: 5 }} /> profile match</span></div><div className="two-col"><div className="surface card-pad"><div className="card-heading"><div><h2>Paste the role</h2><p>We compare it with your {career} profile.</p></div><FileText size={18} color="hsl(var(--primary))" /></div><div className="field"><label className="field-label" htmlFor="job-description">Job description</label><textarea id="job-description" className="textarea" placeholder="Paste the responsibilities, requirements, and preferred qualifications here…" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-job-description" /></div><button className="btn btn-primary" style={{ width: '100%' }} onClick={onAnalyze} disabled={pending || description.trim().length < 50} data-testid="button-analyze-job">{pending ? 'Comparing your profile…' : 'Analyze this role'} <ArrowRight size={15} /></button>{description.trim().length > 0 && description.trim().length < 50 && <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.68rem', marginTop: 9 }}>Add a little more context so the comparison is useful.</p>}</div><div className="job-results">{!job ? <div className="surface empty"><BriefcaseBusiness size={28} /><h3>Your comparison will land here.</h3><p>Paste a role on the left. SkillGraph will turn its requirements into a calm, actionable read.</p><button className="btn btn-secondary" onClick={onLoadDemo} data-testid="button-job-demo">Load demo profile</button></div> : <JobResult job={job} />}</div></div></div>;
}

function JobResult({ job }: { job: JobAnalysis }) {
  const match = Math.round((job.covered.length / Math.max(job.requiredSkills.length, 1)) * 100);
  return <><div className="surface job-hero"><div className="eyebrow">Role found</div><div className="job-role" data-testid="text-job-role">{job.role}</div><p className="page-copy" style={{ fontSize: '.75rem' }}>{job.experienceExpectations}</p><div className="match-row"><label>Fit signal</label><div className="match-bar"><span style={{ width: `${match}%` }} /></div><strong>{match}%</strong></div></div><div className="surface card-pad"><div className="card-heading"><div><h2>Coverage map</h2><p>What the description is asking for.</p></div><span className="tag info">{job.keywords.length} keywords</span></div><SkillList title="Covered" items={job.covered} tone="good" icon={<Check size={14} />} /><div style={{ height: 10 }} /><SkillList title="Partially covered" items={job.partiallyCovered} tone="info" icon={<TrendingUp size={14} />} /><div style={{ height: 10 }} /><SkillList title="Missing signal" items={job.missing} tone="warn" icon={<AlertCircle size={14} />} /></div><div className="surface card-pad"><div className="card-heading"><h2>Recommended actions</h2><Zap size={17} color="hsl(var(--accent))" /></div><div className="list">{job.recommendedActions.map((action, index) => <div className="list-item" key={action}><span className="mono" style={{ color: 'hsl(var(--primary))', fontSize: '.68rem' }}>0{index + 1}</span><span>{action}</span></div>)}</div></div></>;
}

function Dashboard({ analysis, career, progress, projects, onLoadDemo }: { analysis: SkillGraphAnalysis | null; career: string; progress: number[]; projects: string[]; onLoadDemo: () => void }) {
  if (!analysis) return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">Command center</div><h1 className="page-title">Make your next move visible.</h1><p className="page-copy">Your personal career command center is ready for a baseline. Start an assessment or explore with a demo profile.</p></div><div style={{ display: 'flex', gap: 8 }}><Link href="/assessment" className="btn btn-primary" data-testid="button-dashboard-assessment">Start assessment <ArrowRight size={15} /></Link><button className="btn btn-secondary" onClick={onLoadDemo} data-testid="button-dashboard-demo">Load demo</button></div></div><div className="surface empty"><Compass size={30} /><h3>No profile signal yet.</h3><p>Once you assess yourself, this space becomes the short list of what to do next.</p></div></div>;
  const roadmapPercent = Math.round((progress.length / Math.max(analysis.roadmap.length, 1)) * 100);
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">Command center</div><h1 className="page-title">Good morning. Keep moving.</h1><p className="page-copy">Your path toward <strong style={{ color: 'hsl(var(--foreground))' }}>{career}</strong>, distilled to the work that matters this week.</p></div><Link href="/assessment" className="btn btn-secondary" data-testid="button-dashboard-reassess"><RotateCcw size={14} /> Update assessment</Link></div><div className="stats-grid"><div className="surface stat-card"><div className="label">Readiness</div><div className="stat-value">{analysis.readiness}%</div><div className="stat-detail">a useful starting signal</div></div><div className="surface stat-card"><div className="label">Priority gaps</div><div className="stat-value">{analysis.priorityGaps.length}</div><div className="stat-detail">worth focused practice</div></div><div className="surface stat-card"><div className="label">Roadmap</div><div className="stat-value">{roadmapPercent}%</div><div className="stat-detail">{progress.length} of {analysis.roadmap.length} weeks complete</div></div><div className="surface stat-card"><div className="label">Projects saved</div><div className="stat-value">{projects.length}</div><div className="stat-detail">ready to turn into proof</div></div></div><div className="two-col"><div className="surface card-pad"><div className="card-heading"><div><h2>Today’s focus</h2><p>The highest-leverage thing in front of you.</p></div><span className="tag warn">now</span></div><div style={{ background: 'hsl(253 35% 16%)', border: '1px solid hsl(253 40% 29%)', borderRadius: 9, padding: 16 }}><div className="label" style={{ color: 'hsl(var(--primary))' }}>Next move</div><div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-.04em', margin: '8px 0' }}>{analysis.roadmap[progress.length]?.topic || 'Review your wins'}</div><p className="page-copy" style={{ fontSize: '.75rem' }}>{analysis.roadmap[progress.length]?.activity || 'Your four-week sequence is complete. Use Job Analyzer to choose the next role to target.'}</p><Link href={progress.length < analysis.roadmap.length ? '/roadmap' : '/job-analyzer'} className="btn btn-primary" style={{ marginTop: 15 }} data-testid="button-dashboard-focus">{progress.length < analysis.roadmap.length ? 'Open this week' : 'Compare a role'} <ArrowRight size={14} /></Link></div></div><div className="surface card-pad"><div className="card-heading"><div><h2>Signal summary</h2><p>What your profile is telling us.</p></div><BarChart3 size={17} color="hsl(var(--accent))" /></div><div className="list"><div className="list-item"><CheckCircle2 size={15} /><span><strong>{analysis.strongSkills[0]}</strong> is a strength to carry into your next project.</span></div><div className="list-item"><TrendingUp size={15} /><span><strong>{analysis.developingSkills[0] || 'Your developing skills'}</strong> gets stronger through repetition, not more tabs.</span></div><div className="list-item"><AlertCircle size={15} /><span><strong>{analysis.priorityGaps[0]}</strong> is the gap most likely to change your readiness.</span></div></div></div></div><div className="surface card-pad" style={{ marginTop: 18 }}><div className="card-heading"><div><h2>Continue the thread</h2><p>Your connected workspace.</p></div></div><div className="three-col"><Link href="/analysis" className="surface-soft card-pad" data-testid="link-dashboard-analysis"><Sparkles size={17} color="hsl(var(--primary))" /><div style={{ fontSize: '.8rem', fontWeight: 800, marginTop: 15 }}>Read your analysis</div><div className="stat-detail">Understand the why behind the gaps.</div></Link><Link href="/projects" className="surface-soft card-pad" data-testid="link-dashboard-projects"><BookOpen size={17} color="hsl(var(--primary))" /><div style={{ fontSize: '.8rem', fontWeight: 800, marginTop: 15 }}>Pick a proof project</div><div className="stat-detail">Make your learning inspectable.</div></Link><Link href="/job-analyzer" className="surface-soft card-pad" data-testid="link-dashboard-job"><BriefcaseBusiness size={17} color="hsl(var(--primary))" /><div style={{ fontSize: '.8rem', fontWeight: 800, marginTop: 15 }}>Check a real role</div><div className="stat-detail">Turn a job post into a strategy.</div></Link></div></div></div>;
}

function About() {
  return <div className="page fade-in"><div className="page-header"><div><div className="eyebrow">About SkillGraph</div><h1 className="page-title">A clearer way to change direction.</h1><p className="page-copy">Career planning should feel less like collecting advice and more like seeing your next move.</p></div></div><div className="about-grid"><div className="surface creator-card"><div className="creator-mark">SG</div><h2>Developed by Nagaraj Harwadekar</h2><div className="creator-role">CSE Student</div><p className="about-copy" style={{ marginTop: 24 }}>SkillGraph is an AI-powered career intelligence platform for students and career switchers. It maps your current skills to a target career, explains the gaps, turns them into a focused roadmap and projects, and compares job descriptions with your profile.</p><div className="quote-block" style={{ marginTop: 27 }}>The goal is not to predict your future. It is to make the next step easier to choose.</div></div><div><div className="surface card-pad" style={{ marginBottom: 18 }}><div className="eyebrow">Built for</div><h2 style={{ fontSize: '1.25rem', letterSpacing: '-.05em', margin: '11px 0 7px' }}>HackDevengers 2.0 — 2026</h2><p className="about-copy">A focused build for turning career uncertainty into a visible, personal system of action.</p></div><div className="surface card-pad"><div className="card-heading"><h2>What it keeps close</h2><Compass size={17} color="hsl(var(--primary))" /></div><div className="list"><div className="list-item"><Target size={15} /><span>One target career at a time.</span></div><div className="list-item"><Network size={15} /><span>Skills connected to context.</span></div><div className="list-item"><BookOpen size={15} /><span>Projects that become evidence.</span></div><div className="list-item"><BriefcaseBusiness size={15} /><span>Real roles, not abstract goals.</span></div></div></div></div></div></div>;
}

function Empty({ title, copy, action, href, onLoadDemo }: { title: string; copy: string; action: string; href: string; onLoadDemo: () => void }) {
  return <div className="surface empty"><CircleHelp size={30} /><h3>{title}</h3><p>{copy}</p><div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}><Link href={href} className="btn btn-primary" data-testid="button-empty-action">{action} <ArrowRight size={14} /></Link><button className="btn btn-secondary" onClick={onLoadDemo} data-testid="button-empty-demo"><Zap size={14} /> Load demo</button></div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppRouter /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;