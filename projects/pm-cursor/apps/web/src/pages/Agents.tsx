import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { 
  Bot, 
  Plus, 
  Play,
  Pause,
  Settings,
  MoreVertical,
  Cpu,
  MessageSquare,
  CheckCircle2
} from 'lucide-react'
import { api } from '../lib/api'

interface Agent {
  id: string
  name: string
  description: string | null
  type: 'planner' | 'executor' | 'reviewer' | 'custom'
  status: 'active' | 'paused' | 'error'
  config: {
    model?: string
    temperature?: number
    autoExecute?: boolean
  }
  capabilities: Array<{
    name: string
    description: string
    enabled: boolean
  }>
  metrics: {
    tasksCompleted?: number
    tasksCreated?: number
    successRate?: number
  }
  createdAt: string
}

export function Agents() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    type: 'custom' as const,
    projectId: '',
  })

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<Agent[]> => {
      const res = await api.get('/agents')
      return res.data.data || []
    },
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects')
      return res.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAgent) => {
      const res = await api.post('/agents', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreating(false)
      setNewAgent({ name: '', description: '', type: 'custom', projectId: '' })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'paused' : 'active'
      const res = await api.patch(`/agents/${id}`, { status: newStatus })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'planner':
        return <MessageSquare className="w-5 h-5" />
      case 'executor':
        return <CheckCircle2 className="w-5 h-5" />
      case 'reviewer':
        return <Settings className="w-5 h-5" />
      default:
        return <Bot className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      planner: 'bg-blue-100 text-blue-700',
      executor: 'bg-green-100 text-green-700',
      reviewer: 'bg-purple-100 text-purple-700',
      custom: 'bg-gray-100 text-gray-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-1">Configure and manage your AI project assistants</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Create Agent Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create New AI Agent</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name *</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Task Planner Bot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  placeholder="What does this agent do?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newAgent.type}
                    onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="planner">Planner</option>
                    <option value="executor">Executor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                  <select
                    value={newAgent.projectId}
                    onChange={(e) => setNewAgent({ ...newAgent, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select project</option>
                    {projects?.map((project: any) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(newAgent)}
                disabled={!newAgent.name || !newAgent.projectId || createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading agents...</p>
        </div>
      ) : agents?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bot className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
          <p className="text-gray-500 mt-2">Create your first AI agent to assist with project management</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents?.map((agent) => (
            <div key={agent.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(agent.type)}`}>
                    {getTypeIcon(agent.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStatusMutation.mutate({ id: agent.id, status: agent.status })}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={agent.status === 'active' ? 'Pause agent' : 'Activate agent'}
                  >
                    {agent.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {agent.description && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{agent.description}</p>
              )}

              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor(agent.type)}`}>
                  {agent.type}
                </span>
                {agent.config?.model && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {agent.config.model}
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{agent.metrics?.tasksCompleted || 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{agent.metrics?.tasksCreated || 0}</p>
                  <p className="text-xs text-gray-500">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.round((agent.metrics?.successRate || 1) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">Success</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
