import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { 
  FolderKanban, 
  Plus, 
  CheckSquare,
  Bot,
  Calendar,
  MoreVertical,
  Sparkles,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { api } from '../lib/api'
import { format } from 'date-fns'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'archived' | 'completed'
  visibility: 'public' | 'private'
  targetDate: string | null
  createdAt: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  aiGenerated: boolean
}

interface Agent {
  id: string
  name: string
  type: string
  status: string
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'tasks' | 'agents' | 'insights'>('tasks')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAction, setAiAction] = useState<'breakdown' | 'status' | 'risks'>('breakdown')

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      const res = await api.get(`/projects/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: async (): Promise<Task[]> => {
      const res = await api.get(`/tasks?projectId=${id}`)
      return res.data.data || []
    },
    enabled: !!id,
  })

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['project-agents', id],
    queryFn: async (): Promise<Agent[]> => {
      const res = await api.get(`/agents?projectId=${id}`)
      return res.data.data || []
    },
    enabled: !!id,
  })

  const aiMutation = useMutation({
    mutationFn: async () => {
      // Find the first active agent to use
      const activeAgent = agents?.find(a => a.status === 'active')
      if (!activeAgent) {
        throw new Error('No active agent available')
      }
      
      const res = await api.post(`/agents/${activeAgent.id}/execute`, {
        action: aiAction,
        context: {
          projectId: id,
          prompt: aiPrompt,
          tasks: tasks,
        },
      })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', id] })
      setIsAiModalOpen(false)
      setAiPrompt('')
    },
  })

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

  const getAgentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      planner: 'bg-blue-100 text-blue-700',
      executor: 'bg-green-100 text-green-700',
      reviewer: 'bg-purple-100 text-purple-700',
      custom: 'bg-gray-100 text-gray-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
      </div>
    )
  }

  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
  const totalTasks = tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a 
          href="/projects" 
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </a>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Project Progress</span>
          <span className="text-sm font-medium text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-4 h-4" />
            {completedTasks} of {totalTasks} tasks completed
          </span>
          {project.targetDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Due {format(new Date(project.targetDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {(['tasks', 'agents', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
              <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
            {tasksLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : tasks?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No tasks yet. Create your first task or use AI Assist.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                        {task.aiGenerated && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">AI Agents</h2>
              <a 
                href="/agents"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Manage Agents
              </a>
            </div>
            {agentsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : agents?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No agents assigned to this project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getAgentTypeColor(agent.type)}`}>
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{agent.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getAgentTypeColor(agent.type)}`}>
                            {agent.type}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">Project Analysis</h3>
              </div>
              <p className="text-gray-600 text-sm">
                AI-powered insights will appear here once you have more project data. 
                Use the AI Assist button to generate task breakdowns, status summaries, and risk assessments.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Assist
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What would you like help with?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'breakdown', label: 'Task Breakdown', desc: 'Break down work into tasks' },
                    { value: 'status', label: 'Status Summary', desc: 'Summarize project status' },
                    { value: 'risks', label: 'Risk Analysis', desc: 'Identify potential risks' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAiAction(option.value as any)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        aiAction === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context (Optional)</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                  placeholder="e.g., Focus on frontend tasks, prioritize user-facing features..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => aiMutation.mutate()}
                disabled={aiMutation.isPending || agents?.filter(a => a.status === 'active').length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {aiMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {aiMutation.isPending ? 'Processing...' : 'Run AI Assist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
