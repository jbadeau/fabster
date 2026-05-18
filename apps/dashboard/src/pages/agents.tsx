import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  initials: string;
  model: string;
  purpose: string;
  skills: string[];
  costPer1kTokens: string;
  rating: number;
  likes: number;
  followers: number;
  tasksCompleted: number;
  successRate: number;
}

const AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Neo',
    role: 'General Purpose',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Neo&backgroundColor=b6e3f4',
    initials: 'NE',
    model: 'claude-opus-4',
    purpose: 'The One. Handles any task, excels at complex multi-step work with high reasoning.',
    skills: ['all'],
    costPer1kTokens: '$0.25',
    rating: 4.9,
    likes: 1247,
    followers: 5832,
    tasksCompleted: 2341,
    successRate: 97,
  },
  {
    id: '2',
    name: 'Smith',
    role: 'Auditor',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Smith&backgroundColor=c0aede',
    initials: 'SM',
    model: 'claude-sonnet-4',
    purpose: 'Verifies correctness, reviews code quality, and checks compliance against rules.',
    skills: ['nx'],
    costPer1kTokens: '$0.06',
    rating: 4.8,
    likes: 892,
    followers: 3214,
    tasksCompleted: 4120,
    successRate: 99,
  },
  {
    id: '3',
    name: 'Morpheus',
    role: 'Planner',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Morpheus&backgroundColor=d1d4f9',
    initials: 'MO',
    model: 'claude-opus-4',
    purpose: 'Creates workflows from Jira features, breaks stories into executable graph of MergeRequests.',
    skills: ['planning', 'jira'],
    costPer1kTokens: '$0.10',
    rating: 4.7,
    likes: 634,
    followers: 2891,
    tasksCompleted: 1567,
    successRate: 93,
  },
  {
    id: '4',
    name: 'Trinity',
    role: 'Frontend Specialist',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Trinity&backgroundColor=ffd5dc',
    initials: 'TR',
    model: 'claude-sonnet-4',
    purpose: 'React components, design systems, accessibility, and state management.',
    skills: ['react', 'nx'],
    costPer1kTokens: '$0.12',
    rating: 4.8,
    likes: 756,
    followers: 2467,
    tasksCompleted: 1893,
    successRate: 94,
  },
  {
    id: '5',
    name: 'Tank',
    role: 'Backend Engineer',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Tank&backgroundColor=ffdfbf',
    initials: 'TK',
    model: 'llama-4-maverick',
    purpose: 'Node.js APIs, Express/Fastify, databases, and server architecture.',
    skills: ['node', 'docker'],
    costPer1kTokens: '$0.11',
    rating: 4.6,
    likes: 423,
    followers: 1678,
    tasksCompleted: 1245,
    successRate: 89,
  },
  {
    id: '6',
    name: 'Dozer',
    role: 'API Architect',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Dozer&backgroundColor=c1f0c1',
    initials: 'DZ',
    model: 'mistral-large',
    purpose: 'Designs and generates OpenAPI specs, API clients, and contracts.',
    skills: ['openapi', 'node'],
    costPer1kTokens: '$0.09',
    rating: 4.7,
    likes: 387,
    followers: 1432,
    tasksCompleted: 987,
    successRate: 91,
  },
  {
    id: '7',
    name: 'Oracle',
    role: 'Documentation',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Oracle&backgroundColor=ffeab6',
    initials: 'OR',
    model: 'claude-haiku-4',
    purpose: 'Writes docs, READMEs, ADRs, API documentation, and onboarding guides.',
    skills: ['docs', 'openapi'],
    costPer1kTokens: '$0.07',
    rating: 4.5,
    likes: 298,
    followers: 1105,
    tasksCompleted: 876,
    successRate: 88,
  },
];

export function AgentsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">Agents</h2>
        <p className="text-sm text-muted-foreground">
          AI agents available for task execution
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {AGENTS.map((agent) => (
          <Card key={agent.id} className="overflow-hidden w-[260px]">
            <CardContent className="pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={agent.avatar} alt={agent.name} />
                  <AvatarFallback>{agent.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground">{agent.role}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{agent.model}</Badge>
                </div>
              </div>

              <Separator />

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 w-full text-center">
                <div>
                  <p className="text-sm font-semibold">{agent.tasksCompleted.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Experience</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent.costPer1kTokens}</p>
                  <p className="text-[10px] text-muted-foreground">Rate</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent.followers.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Workflows</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent.successRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Success</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2">{agent.purpose}</p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              <Button className="w-full" size="sm" variant="outline">View Profile</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
