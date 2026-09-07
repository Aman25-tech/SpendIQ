









import json
import urllib.request

import pytest

import server as ai


def make_payload(n=10):

    amounts = [60, 80, 100, 120, 150, 400, 450, 500, 900, 12000]
    cats = ["Food", "Travel", "Food", "Entertainment", "Food", "Travel",
            "Food", "Shopping", "Electronics", "Shopping"]
    expenses = [
        {
            "amount": amounts[i % len(amounts)],
            "category": cats[i % len(cats)],
            "date": f"2026-09-{i % 27 + 1:02d}",
        }
        for i in range(n)
    ]
    return {
        "currency": "INR",
        "monthlyBudget": 50000,
        "now": "2026-09-05",
        "months": [
            {"offset": 0, "incomes": [{"amount": 27000}], "expenses": expenses},
            {
                "offset": -1,
                "incomes": [{"amount": 26000}],
                "expenses": [
                    {"amount": 400, "category": "Food", "date": "2026-08-05"},
                    {"amount": 300, "category": "Travel", "date": "2026-08-06"},
                ],
            },
            {
                "offset": -2,
                "incomes": [{"amount": 24000}],
                "expenses": [
                    {"amount": 500, "category": "Food", "date": "2026-07-05"},
                    {"amount": 220, "category": "Travel", "date": "2026-07-06"},
                ],
            },
        ],
    }


@pytest.fixture
def client():
    return ai.app.test_client()


def force_rules(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "rules")
    monkeypatch.delenv("AI_MODEL", raising=False)



def test_rules_provider_returns_insights(monkeypatch, client):
    force_rules(monkeypatch)
    r = client.post("/analyze", json=make_payload())
    assert r.status_code == 200
    body = r.get_json()
    assert body["meta"]["provider"] == "rules"
    assert body["meta"]["computed"] is True
    assert len(body["insights"]) > 0
    for ins in body["insights"]:
        assert ins["type"] and ins["title"] and ins["summary"]
        assert ins["severity"] in ai.SEVERITIES
        assert "suggestion" in ins
    assert "explanation" not in body
    assert "recommendations" not in body


def test_analyze_with_empty_data(monkeypatch, client):
    force_rules(monkeypatch)
    payload = make_payload()
    payload["months"] = [{"offset": 0, "expenses": [], "incomes": []}]
    r = client.post("/analyze", json=payload)
    body = r.get_json()
    assert body["success"] is True
    assert isinstance(body["insights"], list)
    assert body["meta"]["computed"] is True



def test_segments_return_clusters(monkeypatch, client):
    force_rules(monkeypatch)
    r = client.post("/segment", json=make_payload(10))
    body = r.get_json()
    assert body["success"] is True
    if body["meta"]["provider"] == "unavailable":
        pytest.skip("scikit-learn not installed")
    assert body["meta"]["provider"] == "sklearn-kmeans"
    assert len(body["segments"]) >= 1
    for seg in body["segments"]:
        assert {"label", "count", "avg", "share_pct", "top_categories"} <= set(seg)
        assert seg["count"] >= 1
        assert 0 <= seg["share_pct"] <= 100


def test_segments_empty_when_too_few_transactions(client):
    r = client.post("/segment", json=make_payload(2))
    body = r.get_json()
    assert body["segments"] == []



def test_forecast_is_deterministic_and_valid(client):
    r1 = client.post("/forecast", json=make_payload())
    r2 = client.post("/forecast", json=make_payload())
    b1, b2 = r1.get_json(), r2.get_json()
    assert b1["success"] is True
    assert b1["totalForecast"] > 0
    assert b1["budgetStatus"] in ("over", "within", "no_budget")
    assert isinstance(b1["categories"], list)
    assert b1 == b2



def test_openai_provider_falls_back_when_unreachable(monkeypatch, client):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("AI_BASE_URL", "http://127.0.0.1:9/v1")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fake")
    r = client.post("/analyze", json=make_payload())
    body = r.get_json()
    assert body["meta"]["provider"] == "openai"
    assert body["meta"]["fallback"] == "rules"
    assert len(body["insights"]) > 0



def test_normalize_parses_fenced_json():
    content = (
        "```json\n"
        '{"insights":[{"type":"warning","title":"T","summary":"Soc","severity":"warning",'
        '"suggestion":"Act"}],"explanation":"Why","recommendations":["A","B"]}\n'
        "```"
    )
    out = ai.normalize_llm_response(content)
    assert out["explanation"] == "Why"
    assert out["recommendations"] == ["A", "B"]
    assert out["insights"][0]["severity"] == "warning"
    assert out["insights"][0]["suggestion"] == "Act"


def test_normalize_extracts_json_from_prose():
    content = 'Sure thing! Here you go:\n{"insights":[],"explanation":"later","recommendations":[]}'
    out = ai.normalize_llm_response(content)
    assert out["explanation"] == "later"


def test_normalize_rejects_garbage():
    assert ai.normalize_llm_response("I cannot do that.") is None
    assert ai.normalize_llm_response("") is None
    assert ai.normalize_llm_response(None) is None
    assert ai.normalize_llm_response("{}") is None


def test_normalize_skips_malformed_severity():
    content = (
        '{"insights":[{"summary":"ok","severity":"CRITICAL"}],'
        '"explanation":"why","recommendations":[]}'
    )
    out = ai.normalize_llm_response(content)
    assert out["insights"][0]["severity"] == "info"



@pytest.mark.llm
def test_llama_provider_end_to_end(monkeypatch, client):
    try:
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=4)
    except Exception:
        pytest.skip("Ollama not reachable on localhost:11434 — install it and pull llama3.2")

    monkeypatch.setenv("AI_PROVIDER", "llama")
    monkeypatch.setenv("AI_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("AI_MODEL", "llama3.2")
    r = client.post("/analyze", json=make_payload(8))
    body = r.get_json()
    assert body["meta"]["provider"] == "llama"
    if "fallback" in body["meta"]:
        pytest.skip("live model call failed this run (network / parse)")
    assert body.get("explanation"), "LLM should return an explanation"
    assert len(body.get("recommendations", [])) >= 1, "LLM should return recommendations"