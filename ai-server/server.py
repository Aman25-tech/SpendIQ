






























import os
import json
import urllib.request

from flask import Flask, request, jsonify
from datetime import datetime
import calendar

import pandas as pd



try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import numpy as np
    HAVE_NUMPY = True
except ImportError:
    HAVE_NUMPY = False

try:
    from sklearn.cluster import KMeans
    HAVE_SKLEARN = True
except ImportError:
    HAVE_SKLEARN = False

app = Flask(__name__)

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}


BUDGET_LIMIT = 0.80

SEVERITIES = ("danger", "warning", "positive", "info")







class AiProvider:


    name = "base"

    def generate(self, engine):
        raise NotImplementedError


class RuleBasedProvider(AiProvider):


    name = "rules"

    def generate(self, engine):
        return {"insights": engine["insights"]}


class OpenAiCompatibleProvider(AiProvider):


    def __init__(self, name, base_url, model, api_key, json_mode):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.json_mode = json_mode

    def generate(self, engine):
        try:
            content = self._chat(build_llm_prompt(engine))
            if content is None:
                return None
            parsed = normalize_llm_response(content)
        except Exception as exc:
            print(f"[{self.name}] generate failed: {exc}")
            return None
        if parsed is None:
            return None
        return {
            "insights": parsed["insights"],
            "explanation": parsed["explanation"],
            "recommendations": parsed["recommendations"],
        }

    def _chat(self, prompt):
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 900,
        }
        if self.json_mode:
            payload["response_format"] = {"type": "json_object"}

        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"]
        except Exception as exc:
            print(f"[{self.name}] LLM call failed: {exc}")
            return None


def build_provider():

    kind = os.getenv("AI_PROVIDER", "rules").strip().lower()
    base_url = os.getenv("AI_BASE_URL", "").rstrip("/")
    api_key = os.getenv("OPENAI_API_KEY", "")

    if kind == "openai":
        return OpenAiCompatibleProvider(
            name="openai",
            base_url=base_url or "https://api.openai.com/v1",
            model=os.getenv("AI_MODEL", "gpt-4o-mini"),
            api_key=api_key,
            json_mode=True,
        )
    if kind in ("llama", "ollama", "llamacpp", "lmstudio"):

        return OpenAiCompatibleProvider(
            name="llama",
            base_url=base_url or "http://localhost:11434/v1",
            model=os.getenv("AI_MODEL", "llama3.2"),
            api_key=api_key or "ollama",
            json_mode=False,
        )
    return RuleBasedProvider()


SYSTEM_PROMPT = (
    "You are SpendIQ's personal finance analyst. Given a structured monthly "
    "spending snapshot you produce actionable insights for a student budget. "
    'Respond with JSON only, three keys:\n'
    '- "insights": array of {"type","title","summary","severity","suggestion"} '
    'where severity is one of "danger"|"warning"|"positive"|"info", summary is '
    "1-2 sentences carrying the real numbers from the snapshot, and suggestion "
    "is exactly one next action.\n"
    '- "explanation": one short paragraph describing how you reached your '
    "conclusions (what you compared, which trends you used).\n"
    '- "recommendations": 3-4 short, actionable recommendations.\n'
    "Never invent numbers that are not in the snapshot. Use ₹ and Indian "
    "number formatting."
)


def build_llm_prompt(engine):
    ctx = engine["context"]
    lines = [
        "Analyze this personal finance snapshot and respond as instructed.",
        f"Currency: {ctx['currency']}. Monthly budget: ₹{ctx['budget']:,.0f}.",
        f"Month progress: day {ctx['days_elapsed']} of {ctx['days_in']}. "
        f"Spent so far: ₹{ctx['spent']:,.0f}. Income this month: ₹{ctx['income']:,.0f}.",
        f"Savings rate so far: {ctx['savings_rate']}%.",
        "Spending by category: " + ", ".join(
            f"{cat} ₹{v:,.0f}" for cat, v in ctx["categories"].items()
        ) or "no category data yet.",
    ]
    if ctx["rule_findings"]:
        lines.append(
            "Statistical findings already computed (reference them, don't repeat verbatim): "
            + "; ".join(ctx["rule_findings"])
        )
    if ctx["segments"]:
        lines.append(
            "K-Means spending segments: "
            + "; ".join(
                f"{s['label']} ({s['count']} txns, avg ₹{s['avg']:,.0f})"
                for s in ctx["segments"]
            )
        )
    return "\n".join(lines)


def normalize_llm_response(content):


    text = (content or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:

        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            obj = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    insights = []
    for item in obj.get("insights", []):
        if not isinstance(item, dict):
            continue
        summary = str(item.get("summary", "")).strip()
        if not summary:
            continue
        severity = str(item.get("severity", "info")).lower()
        insights.append({
            "type": str(item.get("type", "llm")),
            "title": str(item.get("title", "AI insight")),
            "summary": summary,
            "severity": severity if severity in SEVERITIES else "info",
            "suggestion": str(item.get("suggestion", "")),
        })

    explanation = str(obj.get("explanation", "")).strip()
    recommendations = [
        str(r).strip() for r in obj.get("recommendations", []) if str(r).strip()
    ]

    if not insights and not explanation:
        return None
    return {
        "insights": insights,
        "explanation": explanation,
        "recommendations": recommendations,
    }





def symbol(currency):
    return CURRENCY_SYMBOLS.get(currency, "₹")


def money(value, currency):
    return f"{symbol(currency)}{value:,.0f}"


def as_dataframe(month_payload):

    rows = [
        {"amount": e["amount"], "category": e["category"], "date": e["date"]}
        for e in month_payload.get("expenses", [])
    ]
    if not rows:
        return pd.DataFrame(columns=["amount", "category", "date"])
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = df["amount"].astype(float)
    return df


def insight(type_, title, summary, severity, suggestion=""):

    return {
        "type": type_,
        "title": title,
        "summary": summary,
        "severity": severity,
        "suggestion": suggestion,
    }


def parse_snapshot(payload):

    currency = payload.get("currency", "INR")
    budget = float(payload.get("monthlyBudget") or 0)
    months = payload.get("months", [])
    current = next((m for m in months if m.get("offset") == 0), None)
    if current is None:
        return None
    df = as_dataframe(current)
    spent = float(df["amount"].sum()) if not df.empty else 0.0
    income = float(sum(i.get("amount", 0) for i in current.get("incomes", [])))


    now = pd.Timestamp(payload.get("now") or datetime.now())
    days_in = calendar.monthrange(int(now.year), int(now.month))[1]
    days_elapsed = max(int(now.day), 1)
    return {
        "currency": currency,
        "budget": budget,
        "months": months,
        "df": df,
        "spent": spent,
        "income": income,
        "now": now,
        "days_in": days_in,
        "days_elapsed": days_elapsed,
    }


def compute_segments(df):


    if not HAVE_SKLEARN or not HAVE_NUMPY or len(df) < 6:
        return []

    amounts = df["amount"].to_numpy(dtype=float)
    n_clusters = min(3, max(2, len(pd.unique(amounts))))
    km = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = km.fit_predict(np.log1p(amounts).reshape(-1, 1))

    labeled = df.assign(seg=labels)
    rank_names = ["Frequent small spends", "Moderate spends", "Larger splurges"]
    segments = []
    for rank, cluster_id in enumerate(np.argsort(km.cluster_centers_.flatten())):
        grp = labeled[labeled["seg"] == cluster_id]
        if grp.empty:
            continue
        segments.append({
            "label": rank_names[rank] if rank < len(rank_names) else f"Segment {rank + 1}",
            "count": int(len(grp)),
            "avg": round(float(grp["amount"].mean()), 2),
            "total": round(float(grp["amount"].sum()), 2),
            "share_pct": round(float(grp["amount"].sum() / amounts.sum() * 100), 1),
            "top_categories": [
                c for c in grp["category"].value_counts().head(2).index
            ],
        })
    return segments






def compute_rules(snap, with_segments=True):
    df, spent, income = snap["df"], snap["spent"], snap["income"]
    now, days_in, days_elapsed = snap["now"], snap["days_in"], snap["days_elapsed"]
    currency, budget = snap["currency"], snap["budget"]
    results = []


    if not df.empty and budget > 0:
        projected = spent / days_elapsed * days_in
        over = projected > budget
        ratio = projected / budget
        severity = "danger" if over else ("warning" if ratio >= BUDGET_LIMIT else "info")
        verb = "over" if over else "under"
        results.append(
            insight(
                "projection",
                "Month-end projection",
                f"At this pace you'll spend {money(projected, currency)} by day {days_in} — "
                f"{money(abs(projected - budget), currency)} {verb} your {money(budget, currency)} budget.",
                severity,
                "If the trend holds, trim discretionary spending in the coming weeks."
                if over
                else "You're within budget — keep the current pattern.",
            )
        )


    if len(df) >= 5:
        arr = df["amount"].to_numpy(dtype=float)
        mean = float(np.mean(arr)) if HAVE_NUMPY else float(df["amount"].mean())
        std = float(np.std(arr, ddof=1)) if HAVE_NUMPY else float(df["amount"].std())
        if std > 0:
            outliers = df[df["amount"] >= mean + 2.5 * std].sort_values(
                "amount", ascending=False
            )
            if not outliers.empty:
                pieces = [
                    f"{money(r.amount, currency)} {r.category} ({pd.Timestamp(r.date).strftime('%d %b')})"
                    for r in outliers.itertuples()
                ]
                results.append(
                    insight(
                        "outliers",
                        "Outlier transactions",
                        f"{len(outliers)} transaction(s) stood far above your usual spend: {', '.join(pieces)}.",
                        "warning",
                        "Check whether these were planned purchases or impulses.",
                    )
                )


    history = []
    for m in snap["months"]:
        mdf = as_dataframe(m)
        if mdf.empty:
            continue
        totals = mdf.groupby("category")["amount"].sum()
        for cat, val in totals.items():
            history.append({"offset": m.get("offset", 0), "category": cat, "amount": float(val)})

    if history:
        hdf = pd.DataFrame(history)
        pivoted = hdf.pivot_table(
            index="category", columns="offset", values="amount", aggfunc="sum"
        ).sort_index(axis=1)
        if -2 in pivoted.columns and 0 in pivoted.columns:
            trend = pivoted[0] - pivoted[-2]
            growing = trend[trend > 0].sort_values(ascending=False)
            if not growing.empty:
                cat, delta = growing.index[0], growing.iloc[0]
                base = float(pivoted.loc[cat, -2])
                if base > 0:
                    growth_pct = delta / base * 100
                    if growth_pct >= 20:
                        results.append(
                            insight(
                                "trend",
                                "Fastest-growing category",
                                f"{cat} spending grew {growth_pct:.0f}% over the last 3 months "
                                f"({money(base, currency)} → {money(float(pivoted.loc[cat, 0]), currency)}).",
                                "warning" if growth_pct >= 40 else "info",
                                "Review this category to see if it's a habit or a one-off.",
                            )
                        )


    if not df.empty:
        last_cutoff = now - pd.Timedelta(days=7)
        prev_cutoff = now - pd.Timedelta(days=14)
        last_7 = df[df["date"] > last_cutoff]["amount"].sum()
        prev_7 = df[(df["date"] <= last_cutoff) & (df["date"] > prev_cutoff)]["amount"].sum()
        if prev_7 > 0 and last_7 >= prev_7 * 1.3:
            results.append(
                insight(
                    "ramp",
                    "Spending is accelerating",
                    f"You spent {money(last_7, currency)} in the last 7 days vs {money(prev_7, currency)} "
                    f"the week before — up {last_7 / prev_7 * 100:.0f}%.",
                    "warning",
                    "A sharp ramp often precedes overspending. Set a soft limit for the coming week.",
                )
            )


    if not df.empty and len(df) >= 4:
        df["weekday"] = df["date"].dt.day_name()
        by_day = df.groupby("weekday")["amount"].agg(["sum", "count"])
        top_day = by_day["sum"].idxmax()
        top_sum = float(by_day.loc[top_day, "sum"])
        if len(by_day) > 1:
            others = [d for d in by_day.index if d != top_day]
            avg_other = float(by_day.loc[others, "sum"].mean())
            if top_sum > avg_other * 1.3:
                results.append(
                    insight(
                        "weekday",
                        "Weekday pattern",
                        f"Your biggest spending days are {top_day}s — {money(top_sum, currency)} total, "
                        f"compared with ~{money(avg_other, currency)} on other days.",
                        "info",
                        "If weekends dominate, plan cheaper weekend activities.",
                    )
                )


    if income > 0:
        projected_spend = spent / days_elapsed * days_in if not df.empty else 0.0
        projected_savings = income - projected_spend
        if projected_savings >= 0:
            results.append(
                insight(
                    "savings",
                    "Savings pace",
                    f"Your income this month is {money(income, currency)}. After your projected spend "
                    f"of {money(projected_spend, currency)}, you'd save about {money(projected_savings, currency)}.",
                    "positive",
                    "Redirect part of this surplus to a savings goal.",
                )
            )
        else:
            results.append(
                insight(
                    "savings",
                    "Savings pace",
                    f"Your income this month is {money(income, currency)}, but projected spend of "
                    f"{money(projected_spend, currency)} would exceed it by {money(abs(projected_savings), currency)}.",
                    "danger",
                    "You'd dip into last month's savings. Cut variable spending now.",
                )
            )


    segments = compute_segments(df) if with_segments else []
    if segments:
        summary_parts = "; ".join(
            f"{s['label']} — {s['count']} txns at ₹{s['avg']:,.0f} avg ({s['share_pct']}% of spend)"
            for s in segments
        )
        results.append(
            insight(
                "segments",
                "Spending segments (K-Means)",
                f"Your {len(df)} transactions this month cluster into {len(segments)} natural groups: "
                f"{summary_parts}.",
                "info",
                "Shrink the 'Larger splurges' cluster to save the most with the least effort.",
            )
        )

    return results, segments





@app.post("/analyze")
def analyze():
    payload = request.get_json(force=True) or {}
    snap = parse_snapshot(payload)
    if snap is None:
        return jsonify(
            {"success": True, "insights": [], "meta": {"computed": False}}
        )

    rules, segments = compute_rules(snap)
    savings_rate = (
        (snap["income"] - snap["spent"]) / snap["income"] * 100
        if snap["income"] > 0 else 0.0
    )
    categories = (
        snap["df"].groupby("category")["amount"].sum().round(0).astype(int).to_dict()
        if not snap["df"].empty else {}
    )
    context = {
        **snap,
        "savings_rate": round(savings_rate, 1),
        "categories": categories,
        "segments": segments,
        "rule_findings": [r["title"] for r in rules],
    }

    provider = build_provider()
    meta = {
        "computed": True,
        "service": "python-flask-pandas",
        "provider": provider.name,
        "daysElapsed": snap["days_elapsed"],
        "daysInMonth": snap["days_in"],
        "spent": round(snap["spent"], 2),
        "income": round(snap["income"], 2),
    }
    if provider.name != "rules":
        meta["model"] = provider.model

    generated = provider.generate({"insights": rules, "context": context})


    if provider.name == "rules":
        return jsonify({"success": True, "meta": meta, "insights": rules})

    if generated is None:
        meta["fallback"] = "rules"
        print("[ai] LLM provider failed — serving rule-based insights.")
        return jsonify({"success": True, "meta": meta, "insights": rules})

    response = {
        "success": True,
        "meta": meta,
        "insights": generated["insights"],
    }
    if generated["explanation"]:
        response["explanation"] = generated["explanation"]
    if generated["recommendations"]:
        response["recommendations"] = generated["recommendations"]
    return jsonify(response)


@app.post("/segment")
def segment():

    payload = request.get_json(force=True) or {}
    snap = parse_snapshot(payload)
    if snap is None:
        return jsonify({"success": True, "segments": []})
    segments = compute_segments(snap["df"])
    return jsonify({
        "success": True,
        "meta": {
            "service": "python-flask-pandas",
            "provider": "sklearn-kmeans" if HAVE_SKLEARN else "unavailable",
            "numpy": HAVE_NUMPY,
        },
        "segments": segments,
    })


@app.post("/forecast")
def forecast():







    payload = request.get_json(force=True) or {}
    currency = payload.get("currency", "INR")
    budget = float(payload.get("monthlyBudget") or 0)
    months = payload.get("months", [])

    results = {}
    total_forecast = 0.0
    per_category = []

    history = []
    for m in months:
        mdf = as_dataframe(m)
        if mdf.empty:
            continue
        totals = mdf.groupby("category")["amount"].sum()
        for cat, val in totals.items():
            history.append({"offset": m.get("offset", 0), "category": cat, "amount": float(val)})

    if history:
        hdf = pd.DataFrame(history)
        pivoted = hdf.pivot_table(
            index="category", columns="offset", values="amount", aggfunc="sum"
        ).sort_index(axis=1)

        for cat in pivoted.index:
            series = pivoted.loc[cat].dropna()
            if series.empty:
                continue
            baseline = float(series.mean())
            if len(series) >= 2:
                first = float(series.iloc[0])
                last = float(series.iloc[-1])
                trend = (last - first) / first if first > 0 else 0.0
            else:
                trend = 0.0
            forecast_val = baseline * (1 + max(-0.1, min(0.1, trend)))
            forecast_val = max(0.0, forecast_val)
            total_forecast += forecast_val
            per_category.append({
                "category": cat,
                "baseline": round(baseline, 2),
                "trend": round(trend * 100, 1),
                "forecast": round(forecast_val, 2),
            })

    budget_status = (
        "over" if budget > 0 and total_forecast > budget
        else "within" if budget > 0
        else "no_budget"
    )
    percent_of_budget = round(total_forecast / budget * 100, 1) if budget > 0 else None

    over_avg = [p for p in per_category if p["trend"] > 15]
    over_avg.sort(key=lambda p: p["trend"], reverse=True)

    result = {
        "success": True,
        "meta": {
            "service": "python-flask-pandas",
            "method": "weighted-average-plus-trend",
        },
        "totalForecast": round(total_forecast, 2),
        "budgetStatus": budget_status,
        "percentOfBudget": percent_of_budget,
        "categories": per_category,
        "advice": [],
    }

    if budget > 0 and total_forecast > 0:
        if budget_status == "over":
            result["advice"].append(
                f"Your forecast ({money(total_forecast, currency)}) exceeds your budget "
                f"({money(budget, currency)}) by {money(total_forecast - budget, currency)}."
            )
        elif percent_of_budget >= 80:
            result["advice"].append(
                f"Your forecast ({money(total_forecast, currency)}) will use about "
                f"{percent_of_budget:.0f}% of your {money(budget, currency)} budget."
            )
    if over_avg:
        names = ", ".join(p["category"] for p in over_avg[:3])
        result["advice"].append(
            f"Fast-growing categories to watch next month: {names}."
        )

    return jsonify(result)


if __name__ == "__main__":
    kind = os.getenv("AI_PROVIDER", "rules")
    print(f"SpendIQ AI Insights service on http://localhost:5020  (provider={kind})")
    print(f"  numpy={HAVE_NUMPY} sklearn={HAVE_SKLEARN}")
    app.run(host="localhost", port=5020, debug=True, use_reloader=False)