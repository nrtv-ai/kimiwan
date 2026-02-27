import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RotateCcw, Sparkles, Clock3 } from 'lucide-react'
import { api } from '../lib/api'

interface ApprovalItem {
  id: string
  projectId: string
  agentId: string
  actionType: string
  status: 'applied_pending_approval' | 'approved' | 'rolled_back' | 'failed' | 'running'
  result: {
    result?: string
    tasksCreated?: number
  }
  createdAt: string
}

export function Approvals() {
  const queryClient = useQueryClient()

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: async (): Promise<ApprovalItem[]> => {
      const res = await api.get('/approvals?status=applied_pending_approval')
      return res.data.data || []
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/approvals/${id}/approve`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/approvals/${id}/rollback`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-gray-600 mt-1">Agent actions are auto-applied first, then approved or rolled back here.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading approval items...</p>
        </div>
      ) : approvals?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No pending approvals</h3>
          <p className="text-gray-500 mt-2">Agent actions waiting for review will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {approvals?.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      {item.actionType}
                    </span>
                    <span className="text-xs text-gray-500">#{item.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-2">
                    {item.result?.result || 'Agent action completed and awaiting review.'}
                  </p>
                  {item.result?.tasksCreated ? (
                    <p className="text-xs text-gray-500 mt-1">Tasks created: {item.result.tasksCreated}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveMutation.mutate(item.id)}
                    disabled={approveMutation.isPending || rollbackMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => rollbackMutation.mutate(item.id)}
                    disabled={approveMutation.isPending || rollbackMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rollback
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
