import { useEffect, useState } from 'react'
import { listEvalCases, createEvalCase, deleteEvalCase, runEval } from '../api/evaluation'
import { listDocuments } from '../api/documents'
import EmptyState from '../components/common/EmptyState'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'

export default function Evaluation() {
  const [cases, setCases] = useState(null)
  const [documents, setDocuments] = useState([])
  const [question, setQuestion] = useState('')
  const [expectedAnswer, setExpectedAnswer] = useState('')
  const [expectedDocId, setExpectedDocId] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const toast = useToast()

  const load = () => {
    listEvalCases().then(setCases).catch(() => {})
    listDocuments().then(setDocuments).catch(() => {})
  }

  useEffect(load, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const created = await createEvalCase({
        question,
        expected_answer: expectedAnswer || null,
        expected_source_document_id: expectedDocId ? Number(expectedDocId) : null,
      })
      setCases((prev) => [created, ...(prev || [])])
      setQuestion('')
      setExpectedAnswer('')
      setExpectedDocId('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id) => {
    await deleteEvalCase(id)
    setCases((prev) => prev.filter((c) => c.id !== id))
  }

  const handleRun = async () => {
    setRunning(true)
    setResults(null)
    try {
      const res = await runEval(cases.map((c) => c.id))
      setResults(res)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  const docsById = Object.fromEntries(documents.map((d) => [d.id, d]))

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">RAG evaluation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          A small, manually-defined test set. Retrieval hit-rate is a direct measurement (was the expected
          source document actually retrieved?). Faithfulness uses a second Gemini call as a judge — a
          heuristic, not a rigorous benchmark, and is only shown when it parses cleanly.
        </p>
      </div>

      <form onSubmit={handleAdd} className="glass-panel rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add a test case</h2>
        <input
          required
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Expected answer (optional — enables faithfulness scoring)"
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={expectedDocId}
          onChange={(e) => setExpectedDocId(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Expected source document (optional — enables retrieval hit/miss)</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name}
            </option>
          ))}
        </select>
        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white">
          Add case
        </button>
      </form>

      {cases === null ? (
        <Spinner size={24} />
      ) : cases.length === 0 ? (
        <EmptyState title="No test cases yet" description="Add a few above, then run the evaluation." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Test cases ({cases.length})</h2>
            <button
              onClick={handleRun}
              disabled={running}
              className="text-sm px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white"
            >
              {running ? 'Running…' : 'Run evaluation'}
            </button>
          </div>

          <ul className="space-y-2">
            {cases.map((c) => {
              const result = results?.results.find((r) => r.case_id === c.id)
              return (
                <li key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{c.question}</p>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 shrink-0">
                      Delete
                    </button>
                  </div>
                  {c.expected_source_document_id && (
                    <p className="text-xs text-gray-400 mt-1">
                      expects: {docsById[c.expected_source_document_id]?.display_name || `document #${c.expected_source_document_id}`}
                    </p>
                  )}
                  {result && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                      {result.retrieval_hit !== null && (
                        <p className={`text-xs font-medium ${result.retrieval_hit ? 'text-emerald-600' : 'text-red-500'}`}>
                          Retrieval: {result.retrieval_hit ? 'hit' : 'miss'}
                        </p>
                      )}
                      {result.faithfulness_score !== null && result.faithfulness_score !== undefined && (
                        <p className="text-xs text-gray-500">
                          Faithfulness: {result.faithfulness_score.toFixed(2)}{' '}
                          <span className="text-gray-400">({result.faithfulness_method})</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500 italic">"{result.answer}"</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {results && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Retrieval hit rate:{' '}
              <span className="font-semibold">
                {results.retrieval_hit_rate !== null ? `${(results.retrieval_hit_rate * 100).toFixed(0)}%` : 'n/a'}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
