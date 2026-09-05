"""A small, honest RAG evaluation framework.

Retrieval quality is measured directly (was the expected source document
among the top-k retrieved chunks?) — a real, unambiguous signal. Answer
faithfulness has no equally rigorous local signal available, so it's
measured with a second Gemini call acting as a judge; every result carries
`faithfulness_method` explicitly labeling this as a heuristic, and a score
is only ever produced when the judge's own reply parses cleanly as a
number — never fabricated when it doesn't.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import chat_logic
import config
import rag
from db import get_db
from deps import get_current_user, get_gemini_client, not_found
from models import Document, DocumentStatus, EvalCase, User
from schemas import EvalCaseCreate, EvalCaseOut, EvalCaseResult, EvalRunRequest, EvalRunResult

router = APIRouter(prefix="/eval", tags=["evaluation"])

JUDGE_PROMPT_TEMPLATE = (
    "You are grading whether an AI-generated answer is faithful to (fully "
    "supported by) an expected reference answer for a document-QA system. "
    "Reply with ONLY a single number from 0 to 1 (0 = not faithful at all, "
    "1 = fully faithful), no other text.\n\n"
    "Question: {question}\n"
    "Expected reference answer: {expected}\n"
    "Actual answer: {actual}\n"
)

_SCORE_RE = re.compile(r"(?:0(?:\.\d+)?|1(?:\.0+)?)")


def _get_owned_case(db: Session, case_id: int, user: User) -> EvalCase:
    case = db.get(EvalCase, case_id)
    if case is None or case.user_id != user.id:
        raise not_found("Eval case")
    return case


@router.post("/cases", response_model=EvalCaseOut, status_code=status.HTTP_201_CREATED)
def create_case(req: EvalCaseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.expected_source_document_id is not None:
        doc = db.get(Document, req.expected_source_document_id)
        if doc is None or doc.user_id != current_user.id:
            raise not_found("Document")

    case = EvalCase(
        user_id=current_user.id,
        question=req.question,
        expected_answer=req.expected_answer,
        expected_source_document_id=req.expected_source_document_id,
        expected_page=req.expected_page,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/cases", response_model=list[EvalCaseOut])
def list_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(EvalCase).filter(EvalCase.user_id == current_user.id).order_by(EvalCase.created_at.desc()).all()


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = _get_owned_case(db, case_id, current_user)
    db.delete(case)
    db.commit()


@router.post("/run", response_model=EvalRunResult)
def run_eval(
    req: EvalRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    gemini_client=Depends(get_gemini_client),
):
    query = db.query(EvalCase).filter(EvalCase.user_id == current_user.id)
    if req.case_ids:
        query = query.filter(EvalCase.id.in_(req.case_ids))
    cases = query.all()
    if not cases:
        raise HTTPException(status_code=400, detail="No eval cases to run")
    if gemini_client is None:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server")

    all_ready_ids = [
        d.id
        for d in db.query(Document)
        .filter(Document.user_id == current_user.id, Document.status == DocumentStatus.ready)
        .all()
    ]

    results: list[EvalCaseResult] = []
    hits: list[bool] = []

    for case in cases:
        chunks = rag.retrieve_chunks(case.question, current_user.id, document_ids=all_ready_ids or None)
        retrieved_document_ids = list({c["document_id"] for c in chunks})

        retrieval_hit = None
        if case.expected_source_document_id is not None:
            retrieval_hit = case.expected_source_document_id in retrieved_document_ids
            hits.append(retrieval_hit)

        prompt = chat_logic.build_prompt(case.question, chunks, has_scope=bool(all_ready_ids))
        answer = chat_logic.generate_full_answer(gemini_client, config.GEMINI_MODEL, prompt)

        faithfulness_score = None
        faithfulness_method = None
        if case.expected_answer:
            faithfulness_method = "gemini-self-judge, not a rigorous eval"
            judge_prompt = JUDGE_PROMPT_TEMPLATE.format(
                question=case.question, expected=case.expected_answer, actual=answer
            )
            judge_reply = chat_logic.generate_full_answer(gemini_client, config.GEMINI_MODEL, judge_prompt)
            match = _SCORE_RE.search(judge_reply.strip())
            if match:
                faithfulness_score = float(match.group())

        results.append(
            EvalCaseResult(
                case_id=case.id,
                question=case.question,
                retrieved_document_ids=retrieved_document_ids,
                retrieval_hit=retrieval_hit,
                faithfulness_score=faithfulness_score,
                faithfulness_method=faithfulness_method,
                answer=answer,
            )
        )

    hit_rate = (sum(hits) / len(hits)) if hits else None
    return EvalRunResult(results=results, retrieval_hit_rate=hit_rate)
