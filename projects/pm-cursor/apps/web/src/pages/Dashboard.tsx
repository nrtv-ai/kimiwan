import { useQuery } from '@tanstack/react-query'
import { 
  FolderKanban, 
  CheckSquare, 
  Bot, 
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { api } from '../lib/api'

interface Stats {
  totalProjects: number
  activeTasks: number
  activeAgents: number
  completionRate: number
}

interface RecentTask {
  id: string
  title: string
  status: string
  priority: string
  projectName: string
}

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<Stats> => {
      // TODO: Replace with actual API endpoints when available
      const [projectsRes, tasksRes, agentsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/agents'),
      ])
      
      const projects = projectsRes.data.data || []
      const tasks = tasksRes.data.data || []
      const agents = agentsRes.data.data || []
      
      const completedTasks = tasks.filter((t: any) => t.status === 'done').length
      const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
      
      return {
        totalProjects: projects.length,
        activeTasks: tasks.filter((t: any) => t.status !== 'done' && t.status !== 'cancelled').length,
        activeAgents: agents.filter((a: any) => a.status === 'active').length,
        completionRate,
      }
    },
  })

  const { data: recentTasks } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async (): Promise<RecentTask[]> => {
      const res = await api.get('/tasks?limit=5')
      return res.data.data?.slice(0, 5) || []
    },
  })

  const statCards = [
    { label: 'Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'bg-blue-500' },
    { label: 'Active Tasks', value: stats?.activeTasks || 0, icon: CheckSquare, color: 'bg-green-500' },
    { label: 'Active Agents', value: stats?.activeAgents || 0, icon: Bot, color: 'bg-purple-500' },
    { label: 'Completion Rate', value: `${stats?.completionRate || 0}%`, icon: TrendingUp, color: 'bg-orange-500' },
  ]

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      backlog: 'bg-gray-100 text-gray-700',
      todo: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      in_review: 'bg-purple-100 text-purple-700',
      done: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    }
    return colors[priority] || 'text-gray-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTasks?.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No tasks yet. Create your first task to get started.</p>
              </div>
            ) : (
              recentTasks?.map((task) => (
                <div key={task.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.projectName || 'No project'}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <AlertCircle className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <a
              href="/projects"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Create New Project</p>
                <p className="text-xs text-gray-500">Start a new project with AI assistance</p>
              </div>
            </a>

            <a
              href="/tasks"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Add Task</p>
                <p className="text-xs text-gray-500">Create a task and assign to team or AI</p>
              </div>
            </a>

            <a
              href="/agents"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Configure AI Agent</p>
                <p className="text-xs text-gray-500">Set up a new AI agent for your project</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
