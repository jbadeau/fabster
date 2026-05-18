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
  avatar: string;
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
    name: 'Smith',
    avatar: 'SM',
    adapter: 'claude-code',
    purpose: 'Full-stack developer — builds frontends, backends, and APIs end-to-end',
    skills: ['nx', 'openapi', 'react', 'node', 'docker'],
    costPerTask: '$0.12',
    rating: 4.8,
    likes: 342,
    followers: 1289,
    tasksCompleted: 847,
    successRate: 92,
  },
  {
    id: '2',
    name: 'Jones',
    avatar: 'JO',
    adapter: 'claude-code',
    purpose: 'API specialist — designs and implements REST APIs with OpenAPI specs',
    skills: ['node', 'openapi', 'docker'],
    costPerTask: '$0.08',
    rating: 4.6,
    likes: 198,
    followers: 756,
    tasksCompleted: 423,
    successRate: 88,
  },
  {
    id: '3',
    name: 'Neo',
    avatar: 'NE',
    adapter: 'codex',
    purpose: 'Infrastructure engineer — Terraform, Kubernetes, CI/CD pipelines',
    skills: ['terraform', 'kubernetes', 'docker'],
    costPerTask: '$0.15',
    rating: 4.9,
    likes: 512,
    followers: 2103,
    tasksCompleted: 1205,
    successRate: 95,
  },
  {
    id: '4',
    name: 'Ada',
    avatar: 'AD',
    adapter: 'claude-code',
    purpose: 'Frontend specialist — React components, design systems, and accessibility',
    skills: ['react', 'nx'],
    costPerTask: '$0.10',
    rating: 4.7,
    likes: 275,
    followers: 934,
    tasksCompleted: 562,
    successRate: 91,
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {AGENTS.map((agent) => (
          <Card key={agent.id} className="text-center">
            <CardHeader className="items-center pb-2">
              <Avatar className="h-16 w-16 text-lg">
                <AvatarFallback>{agent.avatar}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-2">{agent.name}</CardTitle>
              <CardDescription className="line-clamp-2">{agent.purpose}</CardDescription>
              <Badge variant="outline" className="mt-1">{agent.adapter}</Badge>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="flex justify-center gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{agent.rating}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span className="font-semibold">{agent.likes}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="font-semibold">{agent.followers}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </div>

              <Separator />

              {/* Cost + Performance */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    <span className="font-semibold">{agent.costPerTask}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">per task</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{agent.tasksCompleted}</p>
                  <p className="text-xs text-muted-foreground">tasks</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{agent.successRate}%</p>
                  <p className="text-xs text-muted-foreground">success</p>
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {agent.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
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
