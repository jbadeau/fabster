import { Star, Heart, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  initials: string;
  adapter: string;
  purpose: string;
  skills: string[];
  costPerTask: string;
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
    avatar: 'https://avatars.githubusercontent.com/u/124599?v=4',
    initials: 'NE',
    adapter: 'claude-code',
    purpose: 'The One. Handles any task, excels at complex multi-step work with high reasoning.',
    skills: ['nx', 'react', 'node', 'openapi', 'docker', 'terraform'],
    costPerTask: '$0.25',
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
    avatar: 'https://avatars.githubusercontent.com/u/339208?v=4',
    initials: 'SM',
    adapter: 'claude-code',
    purpose: 'Verifies correctness, reviews code quality, and checks compliance against rules.',
    skills: ['nx'],
    costPerTask: '$0.06',
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
    avatar: 'https://avatars.githubusercontent.com/u/1024025?v=4',
    initials: 'MO',
    adapter: 'claude-code',
    purpose: 'Creates workflows from Jira features, breaks stories into executable graph of MergeRequests.',
    skills: ['planning', 'jira'],
    costPerTask: '$0.10',
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
    avatar: 'https://avatars.githubusercontent.com/u/8186664?v=4',
    initials: 'TR',
    adapter: 'claude-code',
    purpose: 'React components, design systems, accessibility, and state management.',
    skills: ['react', 'nx'],
    costPerTask: '$0.12',
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
    avatar: 'https://avatars.githubusercontent.com/u/6764957?v=4',
    initials: 'TK',
    adapter: 'claude-code',
    purpose: 'Node.js APIs, Express/Fastify, databases, and server architecture.',
    skills: ['node', 'docker'],
    costPerTask: '$0.11',
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
    avatar: 'https://avatars.githubusercontent.com/u/4060187?v=4',
    initials: 'DZ',
    adapter: 'claude-code',
    purpose: 'Designs and generates OpenAPI specs, API clients, and contracts.',
    skills: ['openapi', 'node'],
    costPerTask: '$0.09',
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
    avatar: 'https://avatars.githubusercontent.com/u/11247099?v=4',
    initials: 'OR',
    adapter: 'claude-code',
    purpose: 'Writes docs, READMEs, ADRs, API documentation, and onboarding guides.',
    skills: ['docs', 'openapi'],
    costPerTask: '$0.07',
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
          <Card key={agent.id} className="text-center w-[200px]">
            <CardHeader className="items-center pb-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-lg">{agent.initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-2">{agent.name}</CardTitle>
              <p className="text-xs font-medium text-muted-foreground">{agent.role}</p>
              <CardDescription className="line-clamp-2 mt-1">{agent.purpose}</CardDescription>
              <Badge variant="outline" className="mt-1">{agent.adapter}</Badge>
            </CardHeader>

            <CardContent className="space-y-3 px-3">
              {/* Stats */}
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{agent.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  <span className="font-semibold">{agent.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="font-semibold">{agent.followers}</span>
                </div>
              </div>

              <Separator />

              {/* Cost + Performance */}
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="font-semibold">{agent.costPerTask}</span>
                </div>
                <span className="font-semibold">{agent.tasksCompleted.toLocaleString()} tasks</span>
                <span className="font-semibold">{agent.successRate}%</span>
              </div>

              <Separator />

              {/* Skills */}
              <div className="flex flex-wrap justify-center gap-1">
                {agent.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
